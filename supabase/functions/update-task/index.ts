import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateTaskRequest {
  id: string;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  status?: string;
  assignee?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key to bypass RLS for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user using anon client first
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: { user }, error: userError } = await anonClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.log('User verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: UpdateTaskRequest = await req.json();
    
    if (!body.id) {
      return new Response(
        JSON.stringify({ error: 'Task ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Looking for task with ID:', body.id);

    // Get the current task to capture old values for audit
    const { data: currentTask, error: fetchError } = await supabaseClient
      .from('project_tasks')
      .select('*')
      .eq('id', body.id)
      .single();

    if (fetchError) {
      console.log('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Task not found', details: fetchError.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!currentTask) {
      console.log('No task found with ID:', body.id);
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found task:', currentTask.task_title);

    // Update the task
    const updateData: any = {};
    if (body.planned_start !== undefined) updateData.planned_start = body.planned_start;
    if (body.planned_end !== undefined) updateData.planned_end = body.planned_end;
    if (body.actual_start !== undefined) updateData.actual_start = body.actual_start;
    if (body.actual_end !== undefined) updateData.actual_end = body.actual_end;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.assignee !== undefined) updateData.assignee = body.assignee;

    console.log('Updating task with:', updateData);

    const { error: updateError } = await supabaseClient
      .from('project_tasks')
      .update(updateData)
      .eq('id', body.id);

    if (updateError) {
      console.log('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create audit log entries for each changed field
    const auditPromises = [];
    for (const [field, newValue] of Object.entries(updateData)) {
      const oldValue = currentTask[field];
      if (oldValue !== newValue) {
        auditPromises.push(
          supabaseClient.from('audit_logs').insert({
            entity_type: 'project_task',
            entity_id: body.id,
            field: field,
            old_value: oldValue,
            new_value: newValue,
            actor: user.id
          })
        );
      }
    }

    await Promise.all(auditPromises);

    console.log('Task updated successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
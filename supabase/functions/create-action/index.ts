import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateActionRequest {
  project_task_id: string;
  title: string;
  details?: string;
  assignee?: string;
  planned_date?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Create action function called');
    
    // Create client for user verification (anon key)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Create service client for database operations (bypasses RLS)
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('User verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User verified:', user.id);

    const body: CreateActionRequest = await req.json();
    console.log('Request body:', body);
    
    if (!body.project_task_id || !body.title) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Task ID and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to the project (security check)
    const { data: projectAccess, error: accessError } = await supabaseServiceClient
      .from('project_tasks')
      .select(`
        project_id,
        projects!inner(
          company_id,
          project_members!inner(user_id)
        )
      `)
      .eq('id', body.project_task_id)
      .single();

    if (accessError || !projectAccess) {
      console.error('Project access verification failed:', accessError);
      return new Response(
        JSON.stringify({ error: 'Project task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is internal or project member
    const isProjectMember = projectAccess.projects.project_members.some(
      (member: any) => member.user_id === user.id
    );
    
    const { data: userProfile } = await supabaseServiceClient
      .from('profiles')
      .select('is_internal')
      .eq('user_id', user.id)
      .single();

    const isInternal = userProfile?.is_internal || false;

    if (!isInternal && !isProjectMember) {
      console.error('User lacks permission to create actions for this project');
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the action using service client (bypasses RLS)
    console.log('Creating action...');
    const { data: action, error: createError } = await supabaseServiceClient
      .from('actions')
      .insert({
        project_task_id: body.project_task_id,
        title: body.title,
        details: body.details || null,
        assignee: body.assignee || null,
        planned_date: body.planned_date || null,
        notes: body.notes || null,
        status: 'Open'
      })
      .select()
      .single();

    if (createError) {
      console.error('Action creation failed:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Action created successfully:', action.id);

    // Create audit log with service role key for permissions
    try {
      await supabaseServiceClient.from('audit_logs').insert({
        entity_type: 'action',
        entity_id: action.id,
        field: 'created',
        old_value: null,
        new_value: action,
        actor: user.id
      });
      console.log('Audit log created');
    } catch (auditError) {
      console.error('Audit log creation failed (non-critical):', auditError);
      // Don't fail the whole request if audit log fails
    }

    return new Response(
      JSON.stringify({ success: true, action }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
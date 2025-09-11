import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteProjectRequest {
  projectId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is internal admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_internal, role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile || !profile.is_internal || profile.role !== 'internal_admin') {
      console.error('Authorization error:', profileError, profile)
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only internal admins can delete projects' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { projectId }: DeleteProjectRequest = await req.json()

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starting deletion of project ${projectId}`)

    // Delete in order to respect foreign key constraints
    // 1. Delete attachments
    const { error: attachmentsError } = await supabaseClient
      .from('attachments')
      .delete()
      .in('action_id', 
        supabaseClient
          .from('actions')
          .select('id')
          .eq('project_id', projectId)
      )
    
    if (attachmentsError) {
      console.error('Error deleting attachments:', attachmentsError)
    }

    // 2. Delete actions
    const { error: actionsError } = await supabaseClient
      .from('actions')
      .delete()
      .eq('project_id', projectId)
    
    if (actionsError) {
      console.error('Error deleting actions:', actionsError)
    }

    // 3. Delete subtasks
    const { error: subtasksError } = await supabaseClient
      .from('subtasks')
      .delete()
      .in('task_id',
        supabaseClient
          .from('project_tasks')
          .select('id')
          .eq('project_id', projectId)
      )
    
    if (subtasksError) {
      console.error('Error deleting subtasks:', subtasksError)
    }

    // 4. Delete project tasks
    const { error: tasksError } = await supabaseClient
      .from('project_tasks')
      .delete()
      .eq('project_id', projectId)
    
    if (tasksError) {
      console.error('Error deleting project tasks:', tasksError)
    }

    // 5. Delete event attendees
    const { error: attendeesError } = await supabaseClient
      .from('event_attendees')
      .delete()
      .in('event_id',
        supabaseClient
          .from('project_events')
          .select('id')
          .eq('project_id', projectId)
      )
    
    if (attendeesError) {
      console.error('Error deleting event attendees:', attendeesError)
    }

    // 6. Delete project events
    const { error: eventsError } = await supabaseClient
      .from('project_events')
      .delete()
      .eq('project_id', projectId)
    
    if (eventsError) {
      console.error('Error deleting project events:', eventsError)
    }

    // 7. Delete vision models
    const { error: visionModelsError } = await supabaseClient
      .from('vision_models')
      .delete()
      .eq('project_id', projectId)
    
    if (visionModelsError) {
      console.error('Error deleting vision models:', visionModelsError)
    }

    // 8. Delete cameras and IoT devices
    const { error: camerasError } = await supabaseClient
      .from('cameras')
      .delete()
      .in('equipment_id',
        supabaseClient
          .from('equipment')
          .select('id')
          .in('line_id',
            supabaseClient
              .from('lines')
              .select('id')
              .eq('project_id', projectId)
          )
      )
    
    if (camerasError) {
      console.error('Error deleting cameras:', camerasError)
    }

    const { error: iotError } = await supabaseClient
      .from('iot_devices')
      .delete()
      .in('equipment_id',
        supabaseClient
          .from('equipment')
          .select('id')
          .in('line_id',
            supabaseClient
              .from('lines')
              .select('id')
              .eq('project_id', projectId)
          )
      )
    
    if (iotError) {
      console.error('Error deleting IoT devices:', iotError)
    }

    // 9. Delete equipment titles
    const { error: equipmentTitlesError } = await supabaseClient
      .from('equipment_titles')
      .delete()
      .in('equipment_id',
        supabaseClient
          .from('equipment')
          .select('id')
          .in('line_id',
            supabaseClient
              .from('lines')
              .select('id')
              .eq('project_id', projectId)
          )
      )
    
    if (equipmentTitlesError) {
      console.error('Error deleting equipment titles:', equipmentTitlesError)
    }

    // 10. Delete equipment
    const { error: equipmentError } = await supabaseClient
      .from('equipment')
      .delete()
      .in('line_id',
        supabaseClient
          .from('lines')
          .select('id')
          .eq('project_id', projectId)
      )
    
    if (equipmentError) {
      console.error('Error deleting equipment:', equipmentError)
    }

    // 11. Delete position titles
    const { error: positionTitlesError } = await supabaseClient
      .from('position_titles')
      .delete()
      .in('position_id',
        supabaseClient
          .from('positions')
          .select('id')
          .in('line_id',
            supabaseClient
              .from('lines')
              .select('id')
              .eq('project_id', projectId)
          )
      )
    
    if (positionTitlesError) {
      console.error('Error deleting position titles:', positionTitlesError)
    }

    // 12. Delete positions
    const { error: positionsError } = await supabaseClient
      .from('positions')
      .delete()
      .in('line_id',
        supabaseClient
          .from('lines')
          .select('id')
          .eq('project_id', projectId)
      )
    
    if (positionsError) {
      console.error('Error deleting positions:', positionsError)
    }

    // 13. Delete lines
    const { error: linesError } = await supabaseClient
      .from('lines')
      .delete()
      .eq('project_id', projectId)
    
    if (linesError) {
      console.error('Error deleting lines:', linesError)
    }

    // 14. Delete project members
    const { error: membersError } = await supabaseClient
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
    
    if (membersError) {
      console.error('Error deleting project members:', membersError)
    }

    // 15. Finally, delete the project
    const { error: projectError } = await supabaseClient
      .from('projects')
      .delete()
      .eq('id', projectId)
    
    if (projectError) {
      console.error('Error deleting project:', projectError)
      throw projectError
    }

    console.log(`Successfully deleted project ${projectId}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Project deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-project function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
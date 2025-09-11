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

    // First, get all the IDs we need for deletion
    // Get all actions for this project
    const { data: actions } = await supabaseClient
      .from('actions')
      .select('id')
      .eq('project_id', projectId)
    
    const actionIds = actions?.map(a => a.id) || []

    // Get all project tasks for this project
    const { data: projectTasks } = await supabaseClient
      .from('project_tasks')
      .select('id')
      .eq('project_id', projectId)
    
    const taskIds = projectTasks?.map(t => t.id) || []

    // Get all project events for this project
    const { data: projectEvents } = await supabaseClient
      .from('project_events')
      .select('id')
      .eq('project_id', projectId)
    
    const eventIds = projectEvents?.map(e => e.id) || []

    // Get all lines for this project
    const { data: lines } = await supabaseClient
      .from('lines')
      .select('id')
      .eq('project_id', projectId)
    
    const lineIds = lines?.map(l => l.id) || []

    // Get all equipment for these lines
    const { data: equipment } = await supabaseClient
      .from('equipment')
      .select('id')
      .in('line_id', lineIds.length > 0 ? lineIds : ['no-ids'])
    
    const equipmentIds = equipment?.map(e => e.id) || []

    // Get all positions for these lines
    const { data: positions } = await supabaseClient
      .from('positions')
      .select('id')
      .in('line_id', lineIds.length > 0 ? lineIds : ['no-ids'])
    
    const positionIds = positions?.map(p => p.id) || []

    // Delete in order to respect foreign key constraints
    // 1. Delete attachments
    if (actionIds.length > 0) {
      const { error: attachmentsError } = await supabaseClient
        .from('attachments')
        .delete()
        .in('action_id', actionIds)
      
      if (attachmentsError) {
        console.error('Error deleting attachments:', attachmentsError)
      }
    }

    // 2. Delete actions
    if (actionIds.length > 0) {
      const { error: actionsError } = await supabaseClient
        .from('actions')
        .delete()
        .in('id', actionIds)
      
      if (actionsError) {
        console.error('Error deleting actions:', actionsError)
      }
    }

    // 3. Delete subtasks
    if (taskIds.length > 0) {
      const { error: subtasksError } = await supabaseClient
        .from('subtasks')
        .delete()
        .in('task_id', taskIds)
      
      if (subtasksError) {
        console.error('Error deleting subtasks:', subtasksError)
      }
    }

    // 4. Delete project tasks
    if (taskIds.length > 0) {
      const { error: tasksError } = await supabaseClient
        .from('project_tasks')
        .delete()
        .in('id', taskIds)
      
      if (tasksError) {
        console.error('Error deleting project tasks:', tasksError)
      }
    }

    // 5. Delete event attendees
    if (eventIds.length > 0) {
      const { error: attendeesError } = await supabaseClient
        .from('event_attendees')
        .delete()
        .in('event_id', eventIds)
      
      if (attendeesError) {
        console.error('Error deleting event attendees:', attendeesError)
      }
    }

    // 6. Delete project events
    if (eventIds.length > 0) {
      const { error: eventsError } = await supabaseClient
        .from('project_events')
        .delete()
        .in('id', eventIds)
      
      if (eventsError) {
        console.error('Error deleting project events:', eventsError)
      }
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
    if (equipmentIds.length > 0) {
      const { error: camerasError } = await supabaseClient
        .from('cameras')
        .delete()
        .in('equipment_id', equipmentIds)
      
      if (camerasError) {
        console.error('Error deleting cameras:', camerasError)
      }

      const { error: iotError } = await supabaseClient
        .from('iot_devices')
        .delete()
        .in('equipment_id', equipmentIds)
      
      if (iotError) {
        console.error('Error deleting IoT devices:', iotError)
      }

      // 9. Delete equipment titles
      const { error: equipmentTitlesError } = await supabaseClient
        .from('equipment_titles')
        .delete()
        .in('equipment_id', equipmentIds)
      
      if (equipmentTitlesError) {
        console.error('Error deleting equipment titles:', equipmentTitlesError)
      }

      // 10. Delete equipment
      const { error: equipmentError } = await supabaseClient
        .from('equipment')
        .delete()
        .in('id', equipmentIds)
      
      if (equipmentError) {
        console.error('Error deleting equipment:', equipmentError)
      }
    }

    // 11. Delete position titles and positions
    if (positionIds.length > 0) {
      const { error: positionTitlesError } = await supabaseClient
        .from('position_titles')
        .delete()
        .in('position_id', positionIds)
      
      if (positionTitlesError) {
        console.error('Error deleting position titles:', positionTitlesError)
      }

      const { error: positionsError } = await supabaseClient
        .from('positions')
        .delete()
        .in('id', positionIds)
      
      if (positionsError) {
        console.error('Error deleting positions:', positionsError)
      }
    }

    // 12. Delete lines
    if (lineIds.length > 0) {
      const { error: linesError } = await supabaseClient
        .from('lines')
        .delete()
        .in('id', lineIds)
      
      if (linesError) {
        console.error('Error deleting lines:', linesError)
      }
    }

    // 13. Delete project members
    const { error: membersError } = await supabaseClient
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
    
    if (membersError) {
      console.error('Error deleting project members:', membersError)
    }

    // 14. Finally, delete the project
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
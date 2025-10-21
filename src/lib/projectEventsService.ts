import { supabase } from "@/integrations/supabase/client";

export interface ProjectEvent {
  id: string;
  project_id?: string;
  solutions_project_id?: string;
  project_type?: 'implementation' | 'solutions';
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  is_critical?: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
  attendees?: { user_id: string }[];
}

export const projectEventsService = {
  async getProjectEvents(
    projectId: string,
    projectType: 'implementation' | 'solutions' = 'implementation'
  ): Promise<ProjectEvent[]> {
    const column = projectType === 'solutions' ? 'solutions_project_id' : 'project_id';
    
    const { data, error } = await supabase
      .from('project_events')
      .select(`
        *,
        event_attendees(user_id)
      `)
      .eq(column, projectId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('[ProjectEvents] Fetch error:', error);
      throw error;
    }

    return (data || []).map(event => ({
      ...event,
      attendees: event.event_attendees || []
    }));
  },

  async createEvent(
    event: {
      project_id?: string;
      solutions_project_id?: string;
      project_type: 'implementation' | 'solutions';
      title: string;
      description?: string | null;
      start_date: string;
      end_date: string;
      is_critical?: boolean;
      created_by: string;
    },
    attendeeIds?: string[]
  ) {
    const { data, error } = await supabase
      .from('project_events')
      .insert(event)
      .select()
      .single();

    if (error) {
      console.error('[ProjectEvents] Create error:', error);
      throw error;
    }

    // Add attendees if provided
    if (attendeeIds && attendeeIds.length > 0 && data) {
      const attendeeRecords = attendeeIds.map(userId => ({
        event_id: data.id,
        user_id: userId,
      }));

      const { error: attendeesError } = await supabase
        .from('event_attendees')
        .insert(attendeeRecords);

      if (attendeesError) {
        console.error('[ProjectEvents] Attendees error:', attendeesError);
      }
    }

    return data;
  },

  async updateEvent(eventId: string, updates: Partial<ProjectEvent>) {
    const { data, error } = await supabase
      .from('project_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('[ProjectEvents] Update error:', error);
      throw error;
    }

    return data;
  },

  async deleteEvent(eventId: string) {
    const { error } = await supabase
      .from('project_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('[ProjectEvents] Delete error:', error);
      throw error;
    }
  },

  async updateAttendees(eventId: string, userIds: string[]) {
    // Delete existing attendees
    await supabase
      .from('event_attendees')
      .delete()
      .eq('event_id', eventId);

    // Add new attendees
    if (userIds.length > 0) {
      const attendeeRecords = userIds.map(userId => ({
        event_id: eventId,
        user_id: userId,
      }));

      const { error } = await supabase
        .from('event_attendees')
        .insert(attendeeRecords);

      if (error) {
        console.error('[ProjectEvents] Update attendees error:', error);
        throw error;
      }
    }
  },
};

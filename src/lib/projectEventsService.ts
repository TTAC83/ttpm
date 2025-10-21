import { supabase } from "@/integrations/supabase/client";

export interface ProjectEvent {
  id: string;
  project_id?: string;
  solutions_project_id?: string;
  project_type: 'implementation' | 'solutions';
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_critical: boolean;
  created_by: string;
  created_at: string;
  attendees: { id: string; user_id: string; profiles?: { name: string | null } }[];
}

export const projectEventsService = {
  async getProjectEvents(
    projectId: string,
    projectType: 'implementation' | 'solutions' = 'implementation'
  ): Promise<ProjectEvent[]> {
    const column = projectType === 'solutions' ? 'solutions_project_id' : 'project_id';
    
    const { data: eventsData, error: eventsError } = await supabase
      .from('project_events')
      .select('*')
      .eq(column, projectId)
      .order('start_date');

    if (eventsError) throw eventsError;

    const eventsWithAttendees = await Promise.all(
      (eventsData || []).map(async (event) => {
        const { data: attendeesData, error: attendeesError } = await supabase
          .from('event_attendees')
          .select('id, user_id')
          .eq('event_id', event.id);

        if (attendeesError) {
          console.error('Error fetching attendees for event:', event.id, attendeesError);
          return { ...event, attendees: [] };
        }

        const attendeesWithProfiles = await Promise.all(
          (attendeesData || []).map(async (attendee) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('name')
              .eq('user_id', attendee.user_id)
              .single();

            return {
              ...attendee,
              profiles: profileData || null
            };
          })
        );

        return { ...event, attendees: attendeesWithProfiles };
      })
    );

    return eventsWithAttendees as ProjectEvent[];
  },

  async getCriticalEvents(
    projectId: string,
    projectType: 'implementation' | 'solutions' = 'implementation'
  ) {
    const column = projectType === 'solutions' ? 'solutions_project_id' : 'project_id';
    
    const { data, error } = await supabase
      .from("project_events")
      .select("id, title, start_date, end_date")
      .eq(column, projectId)
      .eq("is_critical", true);

    if (error) throw error;
    return data || [];
  },

  async createEvent(event: {
    project_id?: string;
    solutions_project_id?: string;
    project_type: 'implementation' | 'solutions';
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    is_critical: boolean;
    created_by: string;
    attendees: string[];
  }) {
    const { attendees, ...eventData } = event;

    const insertData: any = eventData;

    const { data: eventRecord, error: eventError } = await supabase
      .from('project_events')
      .insert([insertData])
      .select()
      .single();

    if (eventError) throw eventError;

    if (attendees.length > 0) {
      const attendeesToInsert = attendees.map(userId => ({
        event_id: eventRecord.id,
        user_id: userId
      }));

      const { error: attendeeError } = await supabase
        .from('event_attendees')
        .insert(attendeesToInsert);

      if (attendeeError) throw attendeeError;
    }

    return eventRecord;
  },

  async updateEvent(eventId: string, updates: {
    title?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    is_critical?: boolean;
    attendees?: string[];
  }) {
    const { attendees, ...eventUpdates } = updates;

    const { error: eventError } = await supabase
      .from('project_events')
      .update(eventUpdates)
      .eq('id', eventId);

    if (eventError) throw eventError;

    if (attendees !== undefined) {
      const { error: deleteError } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId);

      if (deleteError) throw deleteError;

      if (attendees.length > 0) {
        const attendeesToInsert = attendees.map(userId => ({
          event_id: eventId,
          user_id: userId
        }));

        const { error: attendeeError } = await supabase
          .from('event_attendees')
          .insert(attendeesToInsert);

        if (attendeeError) throw attendeeError;
      }
    }
  },

  async deleteEvent(eventId: string) {
    const { error } = await supabase
      .from('project_events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  }
};

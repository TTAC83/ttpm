import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { CalendarIcon, Plus, Edit, Trash2, Users } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectCalendarProps {
  projectId: string;
}

interface ProjectEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  attendees: EventAttendee[];
}

interface EventAttendee {
  id: string;
  user_id: string;
  profiles?: {
    name: string | null;
  } | null;
}

interface ProjectMember {
  user_id: string;
  profiles: {
    name: string | null;
  } | null;
}

const ProjectCalendar = ({ projectId }: ProjectCalendarProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProjectEvent | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    selectedAttendees: [] as string[]
  });

  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchEvents();
    fetchProjectMembers();
  }, [projectId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // First fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('project_events')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date');

      if (eventsError) throw eventsError;

      // Then fetch attendees for each event
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

          // Fetch profile names separately
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
      
      setEvents(eventsWithAttendees);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch calendar events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectMembers = async () => {
    try {
      console.log('Fetching project members for project:', projectId);
      
      // First, try to get project members from the project_members table
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select(`
          user_id,
          profiles (
            name
          )
        `)
        .eq('project_id', projectId);

      console.log('Project members data:', membersData);
      console.log('Project members error:', membersError);
      
      // If no project members found, fallback to getting team assignments from the project
      if (!membersData || membersData.length === 0) {
        console.log('No project members found, checking team assignments...');
        
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select(`
            customer_project_lead,
            implementation_lead,
            ai_iot_engineer,
            technical_project_lead,
            project_coordinator
          `)
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        
        // Collect unique user IDs from team assignments
        const teamUserIds = new Set();
        if (projectData.customer_project_lead) teamUserIds.add(projectData.customer_project_lead);
        if (projectData.implementation_lead) teamUserIds.add(projectData.implementation_lead);
        if (projectData.ai_iot_engineer) teamUserIds.add(projectData.ai_iot_engineer);
        if (projectData.technical_project_lead) teamUserIds.add(projectData.technical_project_lead);
        if (projectData.project_coordinator) teamUserIds.add(projectData.project_coordinator);

        console.log('Team user IDs:', Array.from(teamUserIds));

        // Fetch profiles for these users
        if (teamUserIds.size > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, name')
            .in('user_id', Array.from(teamUserIds) as string[]);

          if (!profilesError && profilesData) {
            const formattedMembers = profilesData.map(profile => ({
              user_id: profile.user_id,
              profiles: { name: profile.name }
            }));
            setProjectMembers(formattedMembers);
            return;
          }
        }
      }
      
      if (membersError) throw membersError;
      setProjectMembers(membersData || []);
    } catch (error) {
      console.error('Error fetching project members:', error);
    }
  };

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (dates && dates.length > 0) {
      setSelectedDates(dates);
      const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
      setFormData(prev => ({
        ...prev,
        start_date: format(sortedDates[0], 'yyyy-MM-dd'),
        end_date: format(sortedDates[sortedDates.length - 1], 'yyyy-MM-dd')
      }));
    }
  };

  const openEventDialog = (event?: ProjectEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        start_date: event.start_date,
        end_date: event.end_date,
        selectedAttendees: event.attendees.map(a => a.user_id)
      });
      const startDate = parseISO(event.start_date);
      const endDate = parseISO(event.end_date);
      const eventDates = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        eventDates.push(new Date(d));
      }
      setSelectedDates(eventDates);
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        selectedAttendees: []
      });
      setSelectedDates([]);
    }
    setShowEventDialog(true);
  };

  const handleSaveEvent = async () => {
    if (!formData.title || !formData.start_date || !formData.end_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingEvent) {
        // Update existing event
        const { error: eventError } = await supabase
          .from('project_events')
          .update({
            title: formData.title,
            description: formData.description || null,
            start_date: formData.start_date,
            end_date: formData.end_date
          })
          .eq('id', editingEvent.id);

        if (eventError) throw eventError;

        // Delete existing attendees
        const { error: deleteError } = await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', editingEvent.id);

        if (deleteError) throw deleteError;

        // Add new attendees
        if (formData.selectedAttendees.length > 0) {
          const attendeesToInsert = formData.selectedAttendees.map(userId => ({
            event_id: editingEvent.id,
            user_id: userId
          }));

          const { error: attendeeError } = await supabase
            .from('event_attendees')
            .insert(attendeesToInsert);

          if (attendeeError) throw attendeeError;
        }
      } else {
        // Create new event
        const { data: eventData, error: eventError } = await supabase
          .from('project_events')
          .insert({
            project_id: projectId,
            title: formData.title,
            description: formData.description || null,
            start_date: formData.start_date,
            end_date: formData.end_date,
            created_by: profile?.user_id || ''
          })
          .select()
          .single();

        if (eventError) throw eventError;

        // Add attendees
        if (formData.selectedAttendees.length > 0) {
          const attendeesToInsert = formData.selectedAttendees.map(userId => ({
            event_id: eventData.id,
            user_id: userId
          }));

          const { error: attendeeError } = await supabase
            .from('event_attendees')
            .insert(attendeesToInsert);

          if (attendeeError) throw attendeeError;
        }
      }

      toast({
        title: "Success",
        description: `Event ${editingEvent ? 'updated' : 'created'} successfully`,
      });

      setShowEventDialog(false);
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingEvent ? 'update' : 'create'} event`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('project_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully",
      });

      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const startDate = parseISO(event.start_date);
      const endDate = parseISO(event.end_date);
      return date >= startDate && date <= endDate;
    });
  };

  const renderCalendarDay = (date: Date) => {
    const dayEvents = getEventsForDate(date);
    return (
      <div className="relative w-full h-full">
        <span className={cn(
          "text-sm",
          dayEvents.length > 0 && "font-bold"
        )}>
          {date.getDate()}
        </span>
        {dayEvents.length > 0 && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="w-1 h-1 bg-primary rounded-full"></div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Calendar</h2>
          <p className="text-muted-foreground">Schedule and manage project events</p>
        </div>
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => openEventDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </DialogTitle>
              <DialogDescription>
                {editingEvent ? 'Update event details' : 'Add a new event to the project calendar'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter event title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter event description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Select Dates *</Label>
                <div className="border rounded-lg p-4">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={handleDateSelect}
                    className="pointer-events-auto"
                  />
                </div>
                {selectedDates.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {format(selectedDates[0], 'PPP')}
                    {selectedDates.length > 1 && ` - ${format(selectedDates[selectedDates.length - 1], 'PPP')}`}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Attendees</Label>
                <div className="border rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto bg-background">
                  {projectMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No project members found. Members need to be assigned to this project first.</p>
                  ) : (
                    projectMembers.map((member) => (
                      <div key={member.user_id} className="flex items-center space-x-2">
                        <Checkbox
                          id={member.user_id}
                          checked={formData.selectedAttendees.includes(member.user_id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({
                                ...prev,
                                selectedAttendees: [...prev.selectedAttendees, member.user_id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                selectedAttendees: prev.selectedAttendees.filter(id => id !== member.user_id)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={member.user_id} className="text-sm">
                          {member.profiles?.name || 'Unnamed User'}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEvent}>
                {editingEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>Select dates to view events</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={(date) => date && setCalendarDate(date)}
              className="pointer-events-auto"
              components={{
                Day: ({ date }) => renderCalendarDay(date)
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Events for {format(calendarDate, 'PPP')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getEventsForDate(calendarDate).map((event) => (
                <div key={event.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3 w-3" />
                        {formatDateUK(event.start_date)}
                        {event.start_date !== event.end_date && ` - ${formatDateUK(event.end_date)}`}
                      </div>
                      {event.attendees.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {event.attendees.map(a => a.profiles?.name || 'Unknown').join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEventDialog(event)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {getEventsForDate(calendarDate).length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  No events scheduled for this date
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>Complete list of project events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{event.title}</h4>
                      <Badge variant="outline">
                        {formatDateUK(event.start_date)}
                        {event.start_date !== event.end_date && ` - ${formatDateUK(event.end_date)}`}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                    {event.attendees.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div className="flex gap-1">
                          {event.attendees.map((attendee) => (
                            <Badge key={attendee.id} variant="secondary" className="text-xs">
                              {attendee.profiles?.name || 'Unknown'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEventDialog(event)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No events created yet. Click "Add Event" to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectCalendar;
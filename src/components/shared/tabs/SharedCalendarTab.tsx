import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { CalendarIcon, Plus, Edit, Trash2, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { projectEventsService, ProjectEvent } from '@/lib/projectEventsService';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';

interface SharedCalendarTabProps {
  projectId: string;
  projectType: 'implementation' | 'solutions';
}

interface ProjectMember {
  user_id: string;
  profiles: {
    name: string | null;
  } | null;
}

export function SharedCalendarTab({ projectId, projectType }: SharedCalendarTabProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [criticalEvents, setCriticalEvents] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProjectEvent | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    selectedAttendees: [] as string[],
    is_critical: false
  });

  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  useEffect(() => {
    fetchEvents();
    fetchCriticalEvents();
    fetchProjectMembers();
  }, [projectId, projectType]);

  useEffect(() => {
    const highlightEventId = searchParams.get('highlightEvent');
    
    if (highlightEventId && events.length > 0 && !loading) {
      const eventToEdit = events.find(event => event.id === highlightEventId);
      
      if (eventToEdit) {
        openEventDialog(eventToEdit);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('highlightEvent');
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  }, [events, searchParams, setSearchParams, loading]);

  const fetchCriticalEvents = async () => {
    try {
      const data = await projectEventsService.getCriticalEvents(projectId, projectType);
      setCriticalEvents(data || []);
    } catch (error) {
      console.error("Error fetching critical events:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await projectEventsService.getProjectEvents(projectId, projectType);
      setEvents(data);
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
      const tableName = projectType === 'solutions' ? 'solutions_projects' : 'projects';
      const { data: projectData, error: projectError } = await supabase
        .from(tableName)
        .select(`
          salesperson,
          solutions_consultant,
          customer_project_lead
        `)
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      
      const teamUserIds = new Set<string>();
      if (projectData.salesperson) teamUserIds.add(projectData.salesperson);
      if (projectData.solutions_consultant) teamUserIds.add(projectData.solutions_consultant);
      if (projectData.customer_project_lead) teamUserIds.add(projectData.customer_project_lead);

      if (teamUserIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', Array.from(teamUserIds));

        if (!profilesError && profilesData) {
          const formattedMembers = profilesData.map(profile => ({
            user_id: profile.user_id,
            profiles: { name: profile.name }
          }));
          setProjectMembers(formattedMembers);
        }
      }
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
        selectedAttendees: event.attendees.map(a => a.user_id),
        is_critical: event.is_critical || false
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
        selectedAttendees: [],
        is_critical: false
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
        await projectEventsService.updateEvent(editingEvent.id, {
          title: formData.title,
          description: formData.description || undefined,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_critical: formData.is_critical,
          attendees: formData.selectedAttendees
        });
      } else {
        const eventData: any = {
          project_type: projectType,
          title: formData.title,
          description: formData.description || undefined,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_critical: formData.is_critical,
          created_by: profile?.user_id || '',
          attendees: formData.selectedAttendees
        };

        if (projectType === 'solutions') {
          eventData.solutions_project_id = projectId;
        } else {
          eventData.project_id = projectId;
        }

        await projectEventsService.createEvent(eventData);
      }

      toast({
        title: "Success",
        description: `Event ${editingEvent ? 'updated' : 'created'} successfully`,
      });

      setShowEventDialog(false);
      fetchEvents();
      fetchCriticalEvents();
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
      await projectEventsService.deleteEvent(eventId);
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_critical"
                  checked={formData.is_critical}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, is_critical: checked as boolean }))
                  }
                />
                <Label htmlFor="is_critical" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Mark as critical event
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Select Dates *</Label>
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={handleDateSelect}
                  className="rounded-md border"
                />
                {formData.start_date && formData.end_date && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {formatDateUK(formData.start_date)} to {formatDateUK(formData.end_date)}
                  </p>
                )}
              </div>

              {projectMembers.length > 0 && (
                <div className="space-y-2">
                  <Label>Attendees</Label>
                  <div className="space-y-2">
                    {projectMembers.map(member => (
                      <div key={member.user_id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`attendee-${member.user_id}`}
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
                        <Label htmlFor={`attendee-${member.user_id}`} className="text-sm font-normal">
                          {member.profiles?.name || 'Unknown User'}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEvent}>
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No events scheduled for this project.
            </div>
          ) : (
            <div className="space-y-4">
              {events.map(event => (
                <div key={event.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        {formatDateUK(event.start_date)} to {formatDateUK(event.end_date)}
                      </p>
                      {event.attendees.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {event.attendees.map(a => a.profiles?.name).filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEventDialog(event)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

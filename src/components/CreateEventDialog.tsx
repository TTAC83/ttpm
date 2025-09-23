import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';

interface ProjectMember {
  user_id: string;
  profiles: {
    name: string | null;
  } | null;
}

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  prefilledTitle?: string;
  onEventCreated?: () => void;
}

const CreateEventDialog = ({ 
  open, 
  onOpenChange, 
  projectId, 
  prefilledTitle = '', 
  onEventCreated 
}: CreateEventDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: prefilledTitle,
    description: '',
    start_date: '',
    end_date: '',
    selectedAttendees: [] as string[],
    is_critical: false
  });


  useEffect(() => {
    if (open) {
      fetchProjectMembers();
      setFormData(prev => ({ ...prev, title: prefilledTitle }));
    }
  }, [open, prefilledTitle]);

  const fetchProjectMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          profiles!inner (
            name
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      setProjectMembers(data || []);
    } catch (error) {
      console.error('Error fetching project members:', error);
    }
  };

  const handleDateSelect = (field: 'start_date' | 'end_date', date: Date | undefined) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      setFormData(prev => ({ ...prev, [field]: dateString }));
    }
  };

  const handleAttendeeToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedAttendees: prev.selectedAttendees.includes(userId)
        ? prev.selectedAttendees.filter(id => id !== userId)
        : [...prev.selectedAttendees, userId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create events",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title || !formData.start_date || !formData.end_date) {
      toast({
        title: "Error", 
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create the event
      const { data: eventData, error: eventError } = await supabase
        .from('project_events')
        .insert({
          project_id: projectId,
          title: formData.title,
          description: formData.description || null,
          start_date: formData.start_date,
          end_date: formData.end_date,
          created_by: user.id,
          is_critical: formData.is_critical
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Add attendees
      if (formData.selectedAttendees.length > 0) {
        const attendeeInserts = formData.selectedAttendees.map(userId => ({
          event_id: eventData.id,
          user_id: userId
        }));

        const { error: attendeeError } = await supabase
          .from('event_attendees')
          .insert(attendeeInserts);

        if (attendeeError) throw attendeeError;
      }

      toast({
        title: "Event Created",
        description: "Calendar event has been created successfully",
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        selectedAttendees: [],
        is_critical: false
      });

      onOpenChange(false);
      onEventCreated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Calendar Event</DialogTitle>
          <DialogDescription>
            Add a new event to the project calendar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_critical"
                checked={formData.is_critical}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_critical: !!checked }))}
              />
              <Label htmlFor="is_critical">Critical Event</Label>
            </div>
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <DatePicker
                value={formData.start_date ? new Date(formData.start_date) : null}
                onChange={(date) => handleDateSelect('start_date', date)}
                placeholder="Select start date"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <DatePicker
                value={formData.end_date ? new Date(formData.end_date) : null}
                onChange={(date) => handleDateSelect('end_date', date)}
                placeholder="Select end date"
                required
              />
            </div>
          </div>

          {projectMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Attendees</Label>
              <div className="grid gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                {projectMembers.map((member) => (
                  <div key={member.user_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`attendee-${member.user_id}`}
                      checked={formData.selectedAttendees.includes(member.user_id)}
                      onCheckedChange={() => handleAttendeeToggle(member.user_id)}
                    />
                    <Label htmlFor={`attendee-${member.user_id}`} className="text-sm">
                      {member.profiles?.name || 'Unknown User'}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;
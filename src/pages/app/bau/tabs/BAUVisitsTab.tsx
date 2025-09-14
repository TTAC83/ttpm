import { useState, useEffect } from 'react';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getBauVisits, createBauVisit, getInternalUsers, BAUVisit } from '@/lib/bauService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BAUVisitsTabProps {
  customerId: string;
}

interface InternalUser {
  user_id: string;
  name: string;
}

export const BAUVisitsTab = ({ customerId }: BAUVisitsTabProps) => {
  const [visits, setVisits] = useState<BAUVisit[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newVisit, setNewVisit] = useState({
    visit_date: new Date(),
    visit_type: 'Onsite' as BAUVisit['visit_type'],
    attendee: '',
    summary: '',
    next_actions: '',
  });
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [visitsData, usersData] = await Promise.all([
        getBauVisits(customerId),
        getInternalUsers(),
      ]);
      setVisits(visitsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load visits data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [customerId]);

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisit.visit_date) return;

    try {
      await createBauVisit({
        bau_customer_id: customerId,
        visit_date: format(newVisit.visit_date, 'yyyy-MM-dd'),
        visit_type: newVisit.visit_type,
        attendee: newVisit.attendee || undefined,
        summary: newVisit.summary || undefined,
        next_actions: newVisit.next_actions || undefined,
      });

      toast({
        title: "Success",
        description: "Visit logged successfully",
      });

      setCreateDialogOpen(false);
      setNewVisit({
        visit_date: new Date(),
        visit_type: 'Onsite',
        attendee: '',
        summary: '',
        next_actions: '',
      });
      loadData();
    } catch (error) {
      console.error('Error creating visit:', error);
      toast({
        title: "Error",
        description: "Failed to log visit",
        variant: "destructive",
      });
    }
  };

  const getVisitTypeColor = (type: BAUVisit['visit_type']) => {
    switch (type) {
      case 'Onsite': return 'bg-blue-500';
      case 'Remote': return 'bg-green-500';
      case 'Review': return 'bg-yellow-500';
      case 'Training': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Visits ({visits.length})</CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Log Visit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Log New Visit</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateVisit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visit_date">Visit Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !newVisit.visit_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newVisit.visit_date ? format(newVisit.visit_date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newVisit.visit_date}
                          onSelect={(date) => date && setNewVisit(prev => ({ ...prev, visit_date: date }))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visit_type">Visit Type</Label>
                    <Select 
                      value={newVisit.visit_type} 
                      onValueChange={(value) => setNewVisit(prev => ({ ...prev, visit_type: value as BAUVisit['visit_type'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Onsite">Onsite</SelectItem>
                        <SelectItem value="Remote">Remote</SelectItem>
                        <SelectItem value="Review">Review</SelectItem>
                        <SelectItem value="Training">Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attendee">Attendee</Label>
                  <Select 
                    value={newVisit.attendee} 
                    onValueChange={(value) => setNewVisit(prev => ({ ...prev, attendee: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select attendee" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    id="summary"
                    value={newVisit.summary}
                    onChange={(e) => setNewVisit(prev => ({ ...prev, summary: e.target.value }))}
                    placeholder="Summary of the visit"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="next_actions">Next Actions</Label>
                  <Textarea
                    id="next_actions"
                    value={newVisit.next_actions}
                    onChange={(e) => setNewVisit(prev => ({ ...prev, next_actions: e.target.value }))}
                    placeholder="Follow-up actions required"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Log Visit</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visits.map((visit) => (
              <Card key={visit.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getVisitTypeColor(visit.visit_type)} text-white`}>
                          {visit.visit_type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(visit.visit_date), 'MMMM d, yyyy')}
                        </span>
                      </div>
                      
                      {visit.summary && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Summary</div>
                          <p className="text-sm">{visit.summary}</p>
                        </div>
                      )}
                      
                      {visit.next_actions && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Next Actions</div>
                          <p className="text-sm">{visit.next_actions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {visits.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No visits logged yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
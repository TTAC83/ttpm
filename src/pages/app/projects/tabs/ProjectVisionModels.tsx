import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { Plus, Pencil, Trash2, Eye, AlertCircle, Calendar as CalendarIcon, Table as TableIcon } from 'lucide-react';
import { VisionModelDialog } from '@/components/VisionModelDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths } from 'date-fns';

interface VisionModel {
  id: string;
  project_id: string;
  line_name: string;
  position: string;
  equipment: string;
  product_sku: string;
  product_title: string;
  use_case: string;
  start_date: string | null;
  end_date: string | null;
  product_run_start: string | null;
  product_run_end: string | null;
  status: 'Footage Required' | 'Model Training' | 'Model Validation' | 'Complete';
  created_at: string;
  updated_at: string;
}

interface ProjectVisionModelsProps {
  projectId: string;
}

export default function ProjectVisionModels({ projectId }: ProjectVisionModelsProps) {
  const [models, setModels] = useState<VisionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<VisionModel | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'edit' | 'create'>('create');
  const [activeView, setActiveView] = useState('table');
  const [showProductRunDates, setShowProductRunDates] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchModels();
  }, [projectId]);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vision_models')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModels((data || []) as VisionModel[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch vision models",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (model: VisionModel) => {
    try {
      const { error } = await supabase
        .from('vision_models')
        .delete()
        .eq('id', model.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vision model deleted successfully",
      });
      
      fetchModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete vision model",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Footage Required': return 'destructive';
      case 'Model Training': return 'default';
      case 'Model Validation': return 'secondary';
      case 'Complete': return 'default'; // Using 'default' instead of 'success'
      default: return 'outline';
    }
  };

  const handleOpenDialog = (mode: 'view' | 'edit' | 'create', model?: VisionModel) => {
    setViewMode(mode);
    setSelectedModel(model || null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedModel(null);
    fetchModels();
  };

  // Calendar helper functions
  const isDateInRange = (date: Date, startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return date >= start && date <= end;
  };

  const getModelsForDate = (date: Date) => {
    return models.filter(model => {
      if (showProductRunDates) {
        return isDateInRange(date, model.product_run_start, model.product_run_end);
      } else {
        return isDateInRange(date, model.start_date, model.end_date);
      }
    });
  };

  const CalendarView = () => {
    const currentDate = new Date();
    const nextMonth = addMonths(currentDate, 1);
    
    const renderCalendar = (monthDate: Date) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {format(monthDate, 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: monthStart.getDay() }).map((_, index) => (
                <div key={`empty-${index}`} className="h-24"></div>
              ))}
              {days.map(day => {
                const dayModels = getModelsForDate(day);
                const isCurrentMonth = isSameMonth(day, monthDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={`h-24 p-1 border rounded-md ${
                      isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                    } ${isToday ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className={`text-sm ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1 mt-1">
                      {dayModels.slice(0, 3).map((model, index) => (
                        <div
                          key={`${model.id}-${index}`}
                          className="text-xs p-1 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20"
                          onClick={() => handleOpenDialog('view', model)}
                          title={`${model.product_title} (${model.line_name})`}
                        >
                          {model.product_title}
                        </div>
                      ))}
                      {dayModels.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayModels.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Label htmlFor="date-toggle">Show Product Run Dates</Label>
            <Switch
              id="date-toggle"
              checked={showProductRunDates}
              onCheckedChange={setShowProductRunDates}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {showProductRunDates ? 'Showing product run dates' : 'Showing regular start/end dates'}
          </p>
        </div>
        
        <div className="space-y-6">
          {renderCalendar(currentDate)}
          {renderCalendar(nextMonth)}
        </div>
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
          <h2 className="text-2xl font-bold tracking-tight">Vision Models</h2>
          <p className="text-muted-foreground">Manage vision models for this project</p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={activeView} onValueChange={setActiveView}>
            <TabsList>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <TableIcon className="h-4 w-4" />
                Table
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => handleOpenDialog('create')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Model
          </Button>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
        <TabsContent value="table" className="space-y-4">
          {models.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  No Vision Models
                </CardTitle>
                <CardDescription>
                  Get started by creating your first vision model for this project.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => handleOpenDialog('create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Model
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Models ({models.length})</CardTitle>
                <CardDescription>
                  Manage and track vision models for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Line</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Product SKU</TableHead>
                      <TableHead>Product Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">{model.line_name}</TableCell>
                        <TableCell>{model.position}</TableCell>
                        <TableCell>{model.equipment}</TableCell>
                        <TableCell>{model.product_sku}</TableCell>
                        <TableCell>{model.product_title}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(model.status)}>
                            {model.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {model.start_date ? formatDateUK(model.start_date) : 'Not set'}
                        </TableCell>
                        <TableCell>
                          {model.end_date ? formatDateUK(model.end_date) : 'Not set'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog('view', model)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog('edit', model)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Vision Model</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this vision model? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(model)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <CalendarView />
        </TabsContent>
      </Tabs>

      <VisionModelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClose={handleDialogClose}
        projectId={projectId}
        model={selectedModel}
        mode={viewMode}
      />
    </div>
  );
}
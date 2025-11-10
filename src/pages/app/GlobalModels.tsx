import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths } from 'date-fns';
import { VisionModelDialog } from '@/components/vision-models/VisionModelDialog';

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
  status: 'Footage Required' | 'Annotation Required' | 'Processing Required' | 'Deployment Required' | 'Validation Required' | 'Complete';
  created_at: string;
  updated_at: string;
  // Enriched fields for display
  project_name?: string;
  company_name?: string;
}

interface Company {
  id: string;
  name: string;
}

export default function GlobalModels() {
  const [models, setModels] = useState<VisionModel[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [showProductRunDates, setShowProductRunDates] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<VisionModel | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
    fetchModels();
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching companies:', error);
        // Don't throw on company fetch error, just log it
        return;
      }
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchModels = async () => {
    setLoading(true);
    try {
      // If filtering by company, first collect project IDs for that company
      let projectFilterIds: string[] | null = null;
      if (selectedCompany !== 'all') {
        const { data: projIds, error: projErr } = await supabase
          .from('projects')
          .select('id')
          .eq('company_id', selectedCompany);
        if (projErr) {
          console.error('Error fetching projects for company filter:', projErr);
          setModels([]);
          setLoading(false);
          return;
        }
        projectFilterIds = (projIds?.map((p: any) => p.id) ?? []);
        if (!projectFilterIds.length) {
          setModels([]);
          setLoading(false);
          return;
        }
      }

      // Fetch raw models
      let modelsQuery = supabase
        .from('vision_models')
        .select('*')
        .order('created_at', { ascending: false });
      if (projectFilterIds) {
        modelsQuery = modelsQuery.in('project_id', projectFilterIds);
      }
      const { data: modelsData, error: modelsErr } = await modelsQuery;
      if (modelsErr) {
        console.error('Error fetching vision models:', modelsErr);
        // Show toast but don't throw to avoid auth issues
        toast({
          title: "Access Error",
          description: "Unable to load vision models. You may not have access to this data.",
          variant: "destructive",
        });
        setModels([]);
        setLoading(false);
        return;
      }

      // Enrich with project and company names
      const uniqueProjectIds = Array.from(new Set((modelsData ?? []).map((m: any) => m.project_id))).filter(Boolean) as string[];
      const projectMap = new Map<string, { name: string; company_id: string | null }>();
      const companyMap = new Map<string, { name: string }>();

      if (uniqueProjectIds.length) {
        const { data: projectsData, error: projectsErr } = await supabase
          .from('projects')
          .select('id, name, company_id')
          .in('id', uniqueProjectIds);
        if (projectsErr) {
          console.error('Error fetching project names:', projectsErr);
          // Continue without enrichment if projects fail
        } else {
          projectsData?.forEach((p: any) => projectMap.set(p.id, { name: p.name, company_id: p.company_id }));

          const uniqueCompanyIds = Array.from(new Set((projectsData ?? []).map((p: any) => p.company_id).filter(Boolean)));
          if (uniqueCompanyIds.length) {
            const { data: companiesData, error: companiesErr } = await supabase
              .from('companies')
              .select('id, name')
              .in('id', uniqueCompanyIds as string[]);
            if (companiesErr) {
              console.error('Error fetching company names:', companiesErr);
              // Continue without company enrichment if companies fail
            } else {
              companiesData?.forEach((c: any) => companyMap.set(c.id, { name: c.name }));
            }
          }
        }
      }

      const enriched = (modelsData ?? []).map((m: any) => {
        const p = projectMap.get(m.project_id);
        const cName = p?.company_id ? companyMap.get(p.company_id)?.name : undefined;
        return { ...m, project_name: p?.name, company_name: cName } as VisionModel;
      });

      setModels(enriched as any);
      console.log('All loaded models:', enriched.length, enriched.map(m => ({
        id: m.id,
        project_name: m.project_name,
        company_name: m.company_name,
        start_date: m.start_date,
        end_date: m.end_date,
        product_run_start: m.product_run_start,
        product_run_end: m.product_run_end
      })));
    } catch (error: any) {
      console.error('Error fetching models:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vision models",
        variant: "destructive",
      });
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Footage Required': return 'destructive';
      case 'Model Training': return 'default';
      case 'Model Validation': return 'secondary';
      case 'Complete': return 'default';
      default: return 'outline';
    }
  };

  // Calendar helper functions
  const isDateInRange = (date: Date, startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return date >= start && date <= end;
  };

  const getModelsForDate = (date: Date) => {
    const filteredModels = models.filter(model => {
      if (showProductRunDates) {
        const inRange = isDateInRange(date, model.product_run_start, model.product_run_end);
        if (inRange) {
          console.log(`Model ${model.id} appears on ${date.toDateString()} (product run dates)`);
        }
        return inRange;
      } else {
        const inRange = isDateInRange(date, model.start_date, model.end_date);
        if (inRange) {
          console.log(`Model ${model.id} appears on ${date.toDateString()} (regular dates)`);
        }
        return inRange;
      }
    });
    
    if (filteredModels.length > 0) {
      console.log(`Date ${date.toDateString()} has ${filteredModels.length} models:`, filteredModels.map(m => m.id));
    }
    
    return filteredModels;
  };

  const handleModelClick = (model: VisionModel) => {
    setSelectedModel(model);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedModel(null);
    fetchModels();
  };

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
                  className={`h-32 p-1 border rounded-md ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className={`text-sm ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1 mt-1">
                    {dayModels.slice(0, 2).map((model, index) => {
                      console.log('Model data:', {
                        company_name: model.company_name,
                        line_name: model.line_name,
                        product_title: model.product_title,
                        full_model: model
                      });
                      return (
                        <div
                          key={`${model.id}-${index}`}
                          className="text-xs p-1 rounded bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 border border-primary/20"
                          onClick={() => handleModelClick(model)}
                          title={`${model.product_title} (${model.line_name}) - ${model.company_name}`}
                        >
                          <div className="font-medium truncate">{model.company_name || 'Unknown Customer'}</div>
                          <div className="truncate text-primary/80">{model.line_name || 'No Line'}</div>
                          <div className="truncate text-primary/60">{model.product_title || 'No Product'}</div>
                        </div>
                      );
                    })}
                    {dayModels.length > 2 && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-1 rounded">
                        +{dayModels.length - 2} more models
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentDate = new Date();
  const nextMonth = addMonths(currentDate, 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Vision Models</h1>
          <p className="text-muted-foreground">View vision models across all projects</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-4">
            <Label htmlFor="company-filter">Filter by Company</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-4">
            <Label htmlFor="date-toggle">Show Product Run Dates</Label>
            <Switch
              id="date-toggle"
              checked={showProductRunDates}
              onCheckedChange={setShowProductRunDates}
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {models.length} models found • {showProductRunDates ? 'Product run dates' : 'Regular dates'}
        </div>
      </div>

      <div className="space-y-6">
        {renderCalendar(currentDate)}
        {renderCalendar(nextMonth)}
      </div>

      {selectedModel && (
        <VisionModelDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onClose={handleDialogClose}
          projectId={selectedModel.project_id}
          model={selectedModel}
          mode="view"
        />
      )}
    </div>
  );
}
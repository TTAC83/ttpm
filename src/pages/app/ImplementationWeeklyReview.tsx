import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ensureWeeks, listWeeks, listImplCompanies, loadOverdueTasks, loadOpenActions, loadEventsAroundWeek, loadReview, saveReview, loadWeeklyStats, loadOpenVisionModels, VisionModelRow } from "@/lib/implementationWeekly";
import { productGapsService } from "@/lib/productGapsService";
import { ProductGapDrawer } from "@/components/ProductGapDrawer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Plus, Smile, Frown, CheckCircle, AlertCircle, Save, X, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { computeTaskStatus } from "@/lib/taskStatus";
import { supabase } from "@/integrations/supabase/client";
import CreateEventDialog from "@/components/CreateEventDialog";
import { VisionModelDialog } from "@/components/VisionModelDialog";
import { BlockerDrawer } from "@/components/BlockerDrawer";
import { blockersService } from "@/lib/blockersService";

type Company = { company_id: string; company_name: string };
type CompanyWithHealth = { company_id: string; company_name: string; customer_health?: "green" | "red" | null; project_status?: "on_track" | "off_track" | null; churn_risk?: "Certain" | "High" | "Medium" | "Low" | null };
type Week = { week_start: string; week_end: string; available_at: string };
type Profile = { user_id: string; name: string };
type TaskRow = {
  id: string;
  task_title: string;
  step_name: string;
  assignee: string;
  planned_start: string;
  planned_end: string;
  actual_start: string;
  actual_end: string;
  status: string;
  project_id: string;
};

function formatWeekLabel(w: Week) {
  return new Date(w.week_start + "T00:00:00").toLocaleDateString('en-GB', { 
    weekday: "short", 
    day: "2-digit", 
    month: "short",
    timeZone: 'Europe/London'
  });
}

export default function ImplementationWeeklyReviewPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Stats query for selected week
  const statsQ = useQuery({
    queryKey: ["impl-stats", selectedWeek],
    queryFn: () => selectedWeek ? loadWeeklyStats(selectedWeek) : Promise.resolve(null),
    enabled: !!selectedWeek,
    staleTime: 5 * 60 * 1000,
  });

  // Ensure weeks exist (current + next)
  useEffect(() => { 
    ensureWeeks().catch((error) => {
      console.error("Failed to ensure weeks:", error);
    }); 
  }, []);

  const weeksQ = useQuery({
    queryKey: ["impl-weeks"],
    queryFn: listWeeks,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set default week to the second highest date available (current week)
  useEffect(() => {
    if (weeksQ.data && !selectedWeek) {
      // Since weeks are ordered descending, the second item is the current week
      if (weeksQ.data.length >= 2) {
        setSelectedWeek(weeksQ.data[1].week_start);
      } else if (weeksQ.data.length > 0) {
        // Fallback to first available week if less than 2 weeks
        setSelectedWeek(weeksQ.data[0].week_start);
      }
    }
  }, [weeksQ.data, selectedWeek]);

  const companiesQ = useQuery({
    queryKey: ["impl-companies"],
    queryFn: listImplCompanies,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query to get health status for all companies for the selected week
  const companiesHealthQ = useQuery({
    queryKey: ["impl-companies-health", selectedWeek],
    queryFn: async () => {
      if (!selectedWeek) return [];
      
      const { data, error } = await supabase
        .from('impl_weekly_reviews')
        .select('company_id, customer_health, project_status, churn_risk')
        .eq('week_start', selectedWeek);
      
      if (error) {
        console.error('Error fetching companies health:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!selectedWeek,
    staleTime: 5 * 60 * 1000,
  });

  // Fallback: if only one week exists, default to that single week
  useEffect(() => {
    if (!selectedWeek && weeksQ.data && weeksQ.data.length === 1) {
      setSelectedWeek(weeksQ.data[0].week_start);
    }
  }, [weeksQ.data, selectedWeek]);

  useEffect(() => {
    if (!selectedCompanyId && companiesQ.data && companiesQ.data.length > 0) {
      setSelectedCompanyId(companiesQ.data[0].company_id);
    }
  }, [companiesQ.data, selectedCompanyId]);

  const filteredCompanies = useMemo(() => {
    const list = companiesQ.data ?? [];
    const healthData = companiesHealthQ.data ?? [];
    
    // Merge companies with their health status and project status
    const companiesWithHealth: CompanyWithHealth[] = list.map(company => {
      const healthInfo = healthData.find(h => h.company_id === company.company_id);
      return {
        ...company,
        customer_health: healthInfo?.customer_health || null,
        project_status: healthInfo?.project_status || null,
        churn_risk: healthInfo?.churn_risk || null
      };
    });
    
    if (!search) return companiesWithHealth;
    const q = search.toLowerCase();
    return companiesWithHealth.filter(c => c.company_name.toLowerCase().includes(q));
  }, [companiesQ.data, companiesHealthQ.data, search]);

  return (
    <div className="p-4 space-y-4">
      {/* Debug Information */}
      {(weeksQ.isLoading || companiesQ.isLoading || companiesHealthQ.isLoading) && (
        <Card className="p-3 bg-blue-50">
          <div>Loading data...</div>
        </Card>
      )}
      
      {(weeksQ.error || companiesQ.error || companiesHealthQ.error) && (
        <Card className="p-3 bg-red-50">
          <div>Error loading data:</div>
          {weeksQ.error && <div>Weeks: {(weeksQ.error as Error).message}</div>}
          {companiesQ.error && <div>Companies: {(companiesQ.error as Error).message}</div>}
          {companiesHealthQ.error && <div>Health Data: {(companiesHealthQ.error as Error).message}</div>}
        </Card>
      )}


      {/* Header */}
      <Card className="p-3 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex gap-3 items-center flex-wrap">
          <h1 className="text-lg font-semibold">Implementation — Weekly Review</h1>
          <div className="ml-auto flex gap-2 items-center">
            {/* Week selector */}
            <select
              className="border rounded px-2 py-1"
              value={selectedWeek ?? ""}
              onChange={(e) => setSelectedWeek(e.target.value || null)}
            >
              <option value="">Select a week...</option>
              {(weeksQ.data ?? []).map(w => (
                <option key={w.week_start} value={w.week_start}>
                  {formatWeekLabel(w)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Stats Banner */}
      {selectedWeek && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {statsQ.data?.total_companies || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Companies</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg">
                <span className="text-green-600 font-semibold">
                  {statsQ.data?.on_track || 0}
                </span>
                {" / "}
                <span className="text-red-600 font-semibold">
                  {statsQ.data?.off_track || 0}
                </span>
                {" / "}
                <span className="text-gray-500">
                  {statsQ.data?.no_status || 0}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">On Track / Off Track / No Status</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg">
                <span className="text-green-600 font-semibold">
                  {statsQ.data?.green_health || 0}
                </span>
                {" / "}
                <span className="text-red-600 font-semibold">
                  {statsQ.data?.red_health || 0}
                </span>
                {" / "}
                <span className="text-gray-500">
                  {statsQ.data?.no_health || 0}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">Green Health / Red Health / No Health</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg">
                <span className="text-green-600 font-semibold">
                  {statsQ.data ? (() => { const assigned = (statsQ.data.green_health + statsQ.data.red_health); return assigned > 0 ? Math.round((statsQ.data.green_health / assigned) * 100) : 0; })() : 0}%
                </span>
              </div>
              <div className="text-sm text-muted-foreground">Overall Health</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg">
                <span className="text-green-600 font-semibold">
                  {statsQ.data ? (() => { const assigned = (statsQ.data.on_track + statsQ.data.off_track); return assigned > 0 ? Math.round((statsQ.data.on_track / assigned) * 100) : 0; })() : 0}%
                </span>
              </div>
              <div className="text-sm text-muted-foreground">Projects on Track</div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* LEFT: Companies */}
        <div className="col-span-12 md:col-span-3">
          <Card className="p-3 space-y-3">
            <Input placeholder="Search customers…" value={search} onChange={(e)=>setSearch(e.target.value)} />
            <div className="max-h-[70vh] overflow-auto space-y-1">
              {(filteredCompanies ?? []).map((c: CompanyWithHealth) => (
                <button
                  key={c.company_id}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md hover:opacity-90",
                    selectedCompanyId === c.company_id ? "ring-1" : "opacity-80"
                  )}
                  onClick={()=>setSelectedCompanyId(c.company_id)}
                >
                  <div className="flex items-center gap-2">
                    <div className="font-medium flex-1">{c.company_name}</div>
                    <div className="flex items-center gap-1">
                      {c.customer_health === "green" && (
                        <Smile className="h-4 w-4 text-green-600" />
                      )}
                      {c.customer_health === "red" && (
                        <Frown className="h-4 w-4 text-red-600" />
                      )}
                      {c.project_status === "on_track" && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {c.project_status === "off_track" && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      {c.churn_risk === "Low" && (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      )}
                      {c.churn_risk === "Medium" && (
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                      )}
                      {c.churn_risk === "High" && (
                        <TrendingUp className="h-4 w-4 text-red-600" />
                      )}
                      {c.churn_risk === "Certain" && (
                        <TrendingUp className="h-4 w-4 text-black" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT: Panels */}
        <div className="col-span-12 md:col-span-9 space-y-4">
          {selectedCompanyId && selectedWeek ? (
            <CompanyWeeklyPanel companyId={selectedCompanyId} weekStart={selectedWeek} />
          ) : (
            <Card className="p-6">Select a week and a customer to begin.</Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CompanyWeeklyPanel({ companyId, weekStart }: { companyId: string; weekStart: string }) {
  const qc = useQueryClient();
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [createActionDialogOpen, setCreateActionDialogOpen] = useState(false);
  const [editActionDialogOpen, setEditActionDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<any>(null);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [blockerDrawerOpen, setBlockerDrawerOpen] = useState(false);
  const [editingBlocker, setEditingBlocker] = useState<any>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [createVisionModelDialogOpen, setCreateVisionModelDialogOpen] = useState(false);
  const [productGapDrawerOpen, setProductGapDrawerOpen] = useState(false);
  const [editingProductGap, setEditingProductGap] = useState<any>(null);

  const overdueQ = useQuery({
    queryKey: ["impl-overdue", companyId],
    queryFn: () => loadOverdueTasks(companyId),
  });

  const actionsQ = useQuery({
    queryKey: ["impl-actions", companyId],
    queryFn: () => loadOpenActions(companyId),
  });

  const visionModelsQ = useQuery({
    queryKey: ["impl-vision-models", companyId],
    queryFn: () => loadOpenVisionModels(companyId),
  });

  const productGapsQ = useQuery({
    queryKey: ["impl-product-gaps", companyId],
    queryFn: async () => {
      if (!projectId) return [];
      return await productGapsService.getProjectProductGaps(projectId);
    },
    enabled: !!projectId,
  });

  const blockersQ = useQuery({
    queryKey: ["impl-blockers", companyId],
    queryFn: async () => {
      // Get projects for this company
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('company_id', companyId)
        .in('domain', ['IoT', 'Vision', 'Hybrid']);
      
      if (!projects?.length) return [];
      
      // Get blockers for these projects
      const { data: blockers } = await supabase
        .from('implementation_blockers')
        .select(`
          *,
          project:projects(name, company:companies(name)),
          owner_profile:profiles!implementation_blockers_owner_fkey(name)
        `)
        .in('project_id', projects.map(p => p.id))
        .eq('status', 'Live')
        .order('raised_at', { ascending: false });
      
      return blockers?.map(blocker => ({
        ...blocker,
        project_name: blocker.project?.name,
        customer_name: blocker.project?.company?.name,
        owner_name: blocker.owner_profile?.name,
        age_days: Math.floor((new Date().getTime() - new Date(blocker.raised_at).getTime()) / (1000 * 60 * 60 * 24)),
        is_overdue: blocker.estimated_complete_date && new Date() > new Date(blocker.estimated_complete_date)
      })) || [];
    },
  });

  // Get project ID by querying the projects for this company
  useEffect(() => {
    const getProjectId = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id')
          .eq('company_id', companyId)
          .in('domain', ['IoT', 'Vision', 'Hybrid'])
          .limit(1);
        
        if (error) {
          console.error('Error fetching project ID:', error);
          return;
        }
        
        if (data && data.length > 0) {
          setProjectId(data[0].id);
        }
      } catch (error) {
        console.error('Error getting project ID:', error);
      }
    };

    if (companyId) {
      getProjectId();
    }
  }, [companyId]);

  // Extract project ID from the first action as fallback
  useEffect(() => {
    if (!projectId && actionsQ.data && actionsQ.data.length > 0) {
      setProjectId(actionsQ.data[0].project_id);
    }
  }, [actionsQ.data, projectId]);

  const eventsQ = useQuery({
    queryKey: ["impl-events", companyId, weekStart],
    queryFn: () => loadEventsAroundWeek(companyId, weekStart),
  });

  const reviewQ = useQuery({
    queryKey: ["impl-review", companyId, weekStart],
    queryFn: () => loadReview(companyId, weekStart),
  });

  // Load profiles for task assignment
  useEffect(() => {
    const loadProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .order('name');
      
      if (error) {
        console.error('Error loading profiles:', error);
        return;
      }
      
      setProfiles(data || []);
    };
    
    loadProfiles();
  }, []);

  const [projectStatus, setProjectStatus] = useState<"on_track"|"off_track"|null>(null);
  const [customerHealth, setCustomerHealth] = useState<"green"|"red"|null>(null);
  const [reasonCode, setReasonCode] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [churnRisk, setChurnRisk] = useState<"Certain"|"High"|"Medium"|"Low"|null>(null);
  const [churnRiskReason, setChurnRiskReason] = useState<string>("");
  const [statusTouched, setStatusTouched] = useState(false);
  const [healthTouched, setHealthTouched] = useState(false);

  // Reset states immediately when companyId or weekStart changes
  useEffect(() => {
    setProjectStatus(null);
    setCustomerHealth(null);
    setNotes("");
    setReasonCode("");
    setChurnRisk(null);
    setChurnRiskReason("");
    setStatusTouched(false);
    setHealthTouched(false);
  }, [companyId, weekStart]);

  // Load saved data when reviewQ.data changes
  useEffect(() => {
    if (reviewQ.data) {
      setProjectStatus(reviewQ.data.project_status ?? null);
      setCustomerHealth(reviewQ.data.customer_health ?? null);
      setNotes(reviewQ.data.notes ?? "");
      setReasonCode(reviewQ.data.reason_code ?? "");
      setChurnRisk(reviewQ.data.churn_risk ?? null);
      setChurnRiskReason(reviewQ.data.churn_risk_reason ?? "");
    }
  }, [reviewQ.data]);

  const autoSaveMutation = useMutation({
    mutationFn: (params: { projectStatus: "on_track"|"off_track"|null, customerHealth: "green"|"red"|null, notes: string, reasonCode: string, churnRisk: "Certain"|"High"|"Medium"|"Low"|null, churnRiskReason: string }) => 
      saveReview({
        companyId,
        weekStartISO: weekStart,
        projectStatus: params.projectStatus,
        customerHealth: params.customerHealth,
        notes: params.notes,
        reasonCode: params.reasonCode,
        churnRisk: params.churnRisk,
        churnRiskReason: params.churnRiskReason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["impl-review", companyId, weekStart] });
      qc.invalidateQueries({ queryKey: ["impl-stats", weekStart] });
      qc.invalidateQueries({ queryKey: ["impl-companies-health", weekStart] });
    },
    onError: (e: any) => {
      console.error('Auto-save failed:', e);
      toast.error("Auto-save failed: " + (e.message ?? "Unknown error"));
    },
    retry: 1, // Only retry once
    retryDelay: 1000, // 1 second delay before retry
  });

  // Auto-save functionality
  const autoSave = useCallback(
    async (projectStatusValue: "on_track"|"off_track"|null, customerHealthValue: "green"|"red"|null, notesValue: string, reasonCodeValue: string, churnRiskValue: "Certain"|"High"|"Medium"|"Low"|null, churnRiskReasonValue: string) => {
      // Don't auto-save if another save is already in progress
      if (autoSaveMutation.isPending) return;
      
      if (!projectStatusValue || !customerHealthValue) return; // Don't save if required fields are missing

      // Validate required fields when health is red
      if (customerHealthValue === 'red' && !reasonCodeValue.trim()) {
        return; // Don't save if validation fails
      }

      // Validate churn risk reason when churn risk is high
      if (churnRiskValue && ['Certain', 'High', 'Medium'].includes(churnRiskValue) && !churnRiskReasonValue.trim()) {
        return; // Don't save if validation fails
      }

      try {
        await autoSaveMutation.mutateAsync({
          projectStatus: projectStatusValue,
          customerHealth: customerHealthValue,
          notes: notesValue,
          reasonCode: reasonCodeValue,
          churnRisk: churnRiskValue,
          churnRiskReason: churnRiskReasonValue,
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    },
    [autoSaveMutation]
  );

  // Debounced auto-save for text fields
  const debouncedAutoSave = useRef<NodeJS.Timeout>();
  const triggerAutoSave = useCallback(
    (projectStatusValue: "on_track"|"off_track"|null, customerHealthValue: "green"|"red"|null, notesValue: string, reasonCodeValue: string, churnRiskValue: "Certain"|"High"|"Medium"|"Low"|null, churnRiskReasonValue: string) => {
      if (debouncedAutoSave.current) {
        clearTimeout(debouncedAutoSave.current);
      }
      debouncedAutoSave.current = setTimeout(() => {
        autoSave(projectStatusValue, customerHealthValue, notesValue, reasonCodeValue, churnRiskValue, churnRiskReasonValue);
      }, 1000); // 1 second delay for text fields
    },
    [autoSave]
  );

  // Auto-save when project status changes (immediate)
  useEffect(() => {
    if (projectStatus && customerHealth) {
      autoSave(projectStatus, customerHealth, notes, reasonCode, churnRisk, churnRiskReason);
    }
  }, [projectStatus]);

  // Auto-save when customer health changes (immediate)
  useEffect(() => {
    if (projectStatus && customerHealth) {
      autoSave(projectStatus, customerHealth, notes, reasonCode, churnRisk, churnRiskReason);
    }
  }, [customerHealth]);

  // Auto-save when reason code changes (immediate, since it's a select)
  useEffect(() => {
    if (projectStatus && customerHealth && reasonCode) {
      autoSave(projectStatus, customerHealth, notes, reasonCode, churnRisk, churnRiskReason);
    }
  }, [reasonCode]);

  // Auto-save when notes change (debounced)
  useEffect(() => {
    if (projectStatus && customerHealth) {
      triggerAutoSave(projectStatus, customerHealth, notes, reasonCode, churnRisk, churnRiskReason);
    }
  }, [notes]);

  // Auto-save when churn risk changes (immediate)
  useEffect(() => {
    if (projectStatus && customerHealth && churnRisk) {
      autoSave(projectStatus, customerHealth, notes, reasonCode, churnRisk, churnRiskReason);
    }
  }, [churnRisk]);

  // Auto-save when churn risk reason changes (debounced)
  useEffect(() => {
    if (projectStatus && customerHealth && churnRisk && ['Certain', 'High', 'Medium'].includes(churnRisk)) {
      triggerAutoSave(projectStatus, customerHealth, notes, reasonCode, churnRisk, churnRiskReason);
    }
  }, [churnRiskReason]);

  const handleEditTask = (task: TaskRow) => {
    setEditingTask(task);
  };

  const handleSaveTask = async (taskData: Partial<TaskRow>) => {
    if (!editingTask) return;

    try {
      // Sanitize payload: convert empty strings to null for nullable fields
      const payload: any = {
        id: editingTask.id,
        task_title: taskData.task_title,
        status: taskData.status,
        assignee: taskData.assignee && taskData.assignee !== '' ? taskData.assignee : null,
        planned_start: taskData.planned_start || null,
        planned_end: taskData.planned_end || null,
        actual_start: taskData.actual_start || null,
        actual_end: taskData.actual_end || null,
      };

      const { error } = await supabase.functions.invoke('update-task', {
        body: payload,
      });

      if (error) throw error;

      toast.success("Task updated successfully");
      setEditingTask(null);
      qc.invalidateQueries({ queryKey: ["impl-overdue", companyId] });
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error("Failed to update task");
    }
  };

  const handleCreateAction = async (actionData: any) => {
    try {
      const { error } = await supabase.functions.invoke('create-action', {
        body: {
          ...actionData,
          project_id: projectId
        },
      });

      if (error) throw error;

      toast.success("Action created successfully");
      setCreateActionDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["impl-actions", companyId] });
    } catch (error) {
      console.error('Error creating action:', error);
      toast.error("Failed to create action");
    }
  };

  const handleCreateVisionModel = () => {
    setCreateVisionModelDialogOpen(false);
    qc.invalidateQueries({ queryKey: ["impl-vision-models", companyId] });
  };

  const handleEditAction = (action: any) => {
    setEditingAction(action);
    setEditActionDialogOpen(true);
  };

  const handleSaveEditedAction = async (actionData: any) => {
    try {
      const { error } = await supabase.functions.invoke('create-action', {
        body: {
          ...actionData,
          id: editingAction.id,
          isUpdate: true
        },
      });

      if (error) throw error;

      toast.success("Action updated successfully");
      setEditActionDialogOpen(false);
      setEditingAction(null);
      qc.invalidateQueries({ queryKey: ["impl-actions", companyId] });
    } catch (error) {
      console.error('Error updating action:', error);
      toast.error("Failed to update action");
    }
  };

  const handleEditBlocker = (blocker: any) => {
    setEditingBlocker(blocker);
    setBlockerDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Gaps & Escalations */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Escalations</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-75">{blockersQ.data?.length ?? 0} open escalations</span>
            {projectId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setBlockerDrawerOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Escalation
              </Button>
            )}
          </div>
        </div>
        <Separator className="my-3" />
        {blockersQ.isLoading ? (
          <div>Loading escalations...</div>
        ) : (blockersQ.data?.length ?? 0) === 0 ? (
          <div>No open escalations</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
               <thead>
                 <tr className="text-left">
                   <th className="py-2 pr-3">Project</th>
                   <th className="py-2 pr-3">Title</th>
                   <th className="py-2 pr-3">Owner</th>
                   <th className="py-2 pr-3">Est. Complete</th>
                   <th className="py-2 pr-3">Age (days)</th>
                   <th className="py-2 pr-3">Reason Code</th>
                   <th className="py-2 pr-3"></th>
                 </tr>
               </thead>
              <tbody>
                {blockersQ.data!.map(blocker => {
                  const getRowClassName = () => {
                    // Critical items get dark red background regardless of dates or completion
                    if (blocker.is_critical) return "bg-red-200 dark:bg-red-900/50";
                    
                    // Overdue non-closed items get pale red background
                    if (blocker.is_overdue) return "bg-red-50 dark:bg-red-950/20";
                    
                    return "";
                  };

                  const getStatusBadge = () => {
                    if (blocker.is_overdue && blocker.is_critical) {
                      return <Badge variant="destructive" className="bg-red-600">Critical Overdue</Badge>;
                    }
                    if (blocker.is_critical) {
                      return <Badge variant="destructive" className="bg-red-600">Critical</Badge>;
                    }
                    if (blocker.is_overdue) {
                      return <Badge variant="destructive">Overdue</Badge>;
                    }
                    return <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">Live</Badge>;
                  };

                  return (
                    <tr key={blocker.id} className={`border-t ${getRowClassName()}`}>
                      <td className="py-2 pr-3">{blocker.project_name}</td>
                      <td className="py-2 pr-3 font-medium">{blocker.title}</td>
                      <td className="py-2 pr-3">{blocker.owner_name}</td>
                      <td className="py-2 pr-3">
                        {blocker.estimated_complete_date ? new Date(blocker.estimated_complete_date).toLocaleDateString('en-GB') : '-'}
                      </td>
                       <td className={`py-2 pr-3 ${blocker.is_overdue ? 'text-red-600 font-medium' : ''}`}>
                         {blocker.age_days}
                       </td>
                       <td className="py-2 pr-3">{blocker.reason_code || '-'}</td>
                      <td className="py-2 pr-3">
                        <Button variant="outline" size="sm" onClick={() => handleEditBlocker(blocker)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Overdue Tasks */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Overdue Tasks</h2>
          <span className="text-sm opacity-75">{overdueQ.data?.length ?? 0} items</span>
        </div>
        <Separator className="my-3" />
        {overdueQ.isLoading ? (
          <div>Loading…</div>
        ) : (overdueQ.data?.length ?? 0) === 0 ? (
          <div>No overdue tasks 🎉</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 pr-3">Task</th>
                  <th className="py-2 pr-3">Step</th>
                  <th className="py-2 pr-3">Assignee</th>
                  <th className="py-2 pr-3">Computed Status</th>
                  <th className="py-2 pr-3">Planned Start</th>
                  <th className="py-2 pr-3">Planned End</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {overdueQ.data!.map((t) => {
                  const computedStatus = computeTaskStatus({
                    planned_start: t.planned_start,
                    planned_end: t.planned_end,
                    actual_start: t.actual_start,
                    actual_end: t.actual_end
                  });
                  
                  // Map status colors to available Badge variants
                  const badgeVariant = computedStatus.color === 'success' ? 'default' : 
                                     computedStatus.color === 'warning' ? 'secondary' : 
                                     computedStatus.color as "default" | "destructive" | "outline" | "secondary";
                  
                  return (
                    <>
                      <tr key={t.id} className="border-t">
                        <td className="py-2 pr-3">{t.task_title ?? "-"}</td>
                        <td className="py-2 pr-3">{t.step_name ?? "-"}</td>
                        <td className="py-2 pr-3">{t.assignee ?? "-"}</td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className="bg-red-500 text-black border-red-600 font-medium">
                            {computedStatus.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3">{t.planned_start ?? "-"}</td>
                        <td className="py-2 pr-3">{t.planned_end ?? "-"}</td>
                        <td className="py-2 pr-3">
                          <Button variant="outline" onClick={() => handleEditTask(t)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                      {/* Display subtasks */}
                      {t.subtasks && t.subtasks.length > 0 && t.subtasks.map((subtask: any) => (
                        <tr key={`subtask-${subtask.id}`} className="border-t bg-muted/30">
                          <td className="py-2 pr-3 pl-6 text-sm opacity-75">
                            ↳ {subtask.title}
                          </td>
                          <td className="py-2 pr-3 text-sm opacity-75">-</td>
                          <td className="py-2 pr-3 text-sm opacity-75">{subtask.assignee ?? "-"}</td>
                          <td className="py-2 pr-3 text-sm opacity-75">
                            <Badge variant="outline" className="text-xs">
                              {subtask.status ?? "Not Started"}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 text-sm opacity-75">{subtask.planned_start ?? "-"}</td>
                          <td className="py-2 pr-3 text-sm opacity-75">{subtask.planned_end ?? "-"}</td>
                          <td className="py-2 pr-3"></td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Action Review */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Actions (Open / In Progress)</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-75">{actionsQ.data?.length ?? 0} items</span>
            {projectId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCreateActionDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Action
              </Button>
            )}
          </div>
        </div>
        <Separator className="my-3" />
        {actionsQ.isLoading ? (
          <div>Loading…</div>
        ) : (actionsQ.data?.length ?? 0) === 0 ? (
          <div>No open actions</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Assignee</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Planned Date</th>
                  <th className="py-2 pr-3">Critical</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {actionsQ.data!.map(a => {
                  // Check if action is overdue (open/in progress and planned date < today)
                  const today = new Date();
                  const plannedDate = a.planned_date ? new Date(a.planned_date) : null;
                  const isOverdue = plannedDate && 
                    plannedDate < today && 
                    (a.status === 'open' || a.status === 'in_progress');
                  
                  return (
                    <tr 
                      key={a.id} 
                      className={`border-t ${isOverdue ? 'bg-red-50' : ''} ${a.is_critical ? 'border-2 border-red-500' : ''}`}
                    >
                      <td className="py-2 pr-3">{a.title ?? "-"}</td>
                      <td className="py-2 pr-3">{a.profiles?.name ?? "-"}</td>
                      <td className="py-2 pr-3">{a.status ?? "-"}</td>
                      <td className="py-2 pr-3">{a.planned_date ?? "-"}</td>
                      <td className="py-2 pr-3">{a.is_critical ? "Yes" : "No"}</td>
                      <td className="py-2 pr-3">
                        <Button variant="outline" size="sm" onClick={() => handleEditAction(a)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Events Window */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Events (±7 days)</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-75">{eventsQ.data?.length ?? 0} items</span>
            {projectId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCreateEventDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            )}
          </div>
        </div>
        <Separator className="my-3" />
        {eventsQ.isLoading ? (
          <div>Loading…</div>
        ) : (eventsQ.data?.length ?? 0) === 0 ? (
          <div>No events in window</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Start</th>
                  <th className="py-2 pr-3">End</th>
                  <th className="py-2 pr-3">Critical</th>
                  <th className="py-2 pr-3">Created By</th>
                </tr>
              </thead>
              <tbody>
                {eventsQ.data!.map(e => (
                  <tr 
                    key={e.id} 
                    className={`border-t ${e.is_critical ? 'border-2 border-red-500' : ''}`}
                  >
                    <td className="py-2 pr-3">{e.title ?? "-"}</td>
                    <td className="py-2 pr-3">{e.start_date ?? "-"}</td>
                    <td className="py-2 pr-3">{e.end_date ?? "-"}</td>
                    <td className="py-2 pr-3">{e.is_critical ? "Yes" : "No"}</td>
                    <td className="py-2 pr-3">{e.creator_profile?.name ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Vision Models */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Vision Models (Open)</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-75">{visionModelsQ.data?.length ?? 0} items</span>
            {projectId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCreateVisionModelDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Model
              </Button>
            )}
          </div>
        </div>
        <Separator className="my-3" />
        {visionModelsQ.isLoading ? (
          <div>Loading…</div>
        ) : (visionModelsQ.data?.length ?? 0) === 0 ? (
          <div>No open vision models</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 pr-3">Product Title</th>
                  <th className="py-2 pr-3">Line</th>
                  <th className="py-2 pr-3">Position</th>
                  <th className="py-2 pr-3">Use Case</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Start Date</th>
                  <th className="py-2 pr-3">End Date</th>
                </tr>
              </thead>
              <tbody>
                {visionModelsQ.data!.map(vm => (
                  <tr key={vm.id} className="border-t">
                    <td className="py-2 pr-3">{vm.product_title ?? "-"}</td>
                    <td className="py-2 pr-3">{vm.line_name ?? "-"}</td>
                    <td className="py-2 pr-3">{vm.position ?? "-"}</td>
                    <td className="py-2 pr-3">{vm.use_case ?? "-"}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline">
                        {vm.status}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3">{vm.start_date ?? "-"}</td>
                    <td className="py-2 pr-3">{vm.end_date ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Product Gaps */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Product Gaps (Live)</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-75">{productGapsQ.data?.filter(gap => gap.status === 'Live').length ?? 0} items</span>
            {projectId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setEditingProductGap(null);
                  setProductGapDrawerOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Product Gap
              </Button>
            )}
          </div>
        </div>
        <Separator className="my-3" />
        {productGapsQ.isLoading ? (
          <div>Loading…</div>
        ) : (productGapsQ.data?.filter(gap => gap.status === 'Live').length ?? 0) === 0 ? (
          <div>No live product gaps</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Assigned To</th>
                  <th className="py-2 pr-3">Critical</th>
                  <th className="py-2 pr-3">Est. Complete</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {productGapsQ.data!.filter(gap => gap.status === 'Live').map(gap => (
                  <tr key={gap.id} className="border-t">
                    <td className="py-2 pr-3 font-medium">{gap.title}</td>
                    <td className="py-2 pr-3">{gap.description ?? "-"}</td>
                    <td className="py-2 pr-3">{gap.assigned_to_name ?? "-"}</td>
                    <td className="py-2 pr-3">
                      {gap.is_critical && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Critical
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3">{gap.estimated_complete_date ?? "-"}</td>
                    <td className="py-2 pr-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingProductGap(gap);
                          setProductGapDrawerOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Weekly Review Controls */}
      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">Weekly Review</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm mb-1">Project Status</div>
            <div className="flex gap-2">
              <Button 
                variant={projectStatus === "on_track" ? "default" : "outline"}
                className={
                  projectStatus === "on_track" ? "bg-green-600 hover:bg-green-700 text-white" : ""
                }
                onClick={() => { setProjectStatus("on_track"); setStatusTouched(true); }}
              >
                On track
              </Button>
              <Button 
                variant={projectStatus === "off_track" ? "default" : "outline"}
                className={
                  projectStatus === "off_track" ? "bg-red-600 hover:bg-red-700 text-white" : ""
                }
                onClick={() => { setProjectStatus("off_track"); setStatusTouched(true); }}
              >
                Off track
              </Button>
            </div>
          </div>
          <div>
            <div className="text-sm mb-1">Customer Health</div>
            <div className="flex gap-2">
              <Button 
                variant={customerHealth === "green" ? "default" : "outline"} 
                className={
                  customerHealth === "green" ? "bg-green-600 hover:bg-green-700 text-white" : ""
                }
                onClick={() => { setCustomerHealth("green"); setHealthTouched(true); }}
              >
                Green
              </Button>
              <Button 
                variant={customerHealth === "red" ? "default" : "outline"} 
                className={
                  customerHealth === "red" ? "bg-red-600 hover:bg-red-700 text-white" : ""
                }
                onClick={() => { setCustomerHealth("red"); setHealthTouched(true); }}
              >
                Red
              </Button>
            </div>
          </div>
          
          {/* Reason Code for Red Health */}
          {customerHealth === "red" && (
            <div>
              <div className="text-sm mb-1">
                Reason Code <span className="text-destructive">*</span>
              </div>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason code..." />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover text-popover-foreground shadow-md">
                  <SelectItem value="data-inaccuracy">Data Inaccuracy</SelectItem>
                  <SelectItem value="feature-product-gap">Feature/Product Gap</SelectItem>
                  <SelectItem value="implementation-delay-tt">Implementations Delay - TT</SelectItem>
                  <SelectItem value="implementation-delay-customer">Implementation Delay - Customer</SelectItem>
                  <SelectItem value="portal-issues">Portal Issues</SelectItem>
                  <SelectItem value="hardware-issue">Hardware Issue</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Churn Risk */}
          <div>
            <div className="text-sm mb-1">Churn Risk</div>
            <Select value={churnRisk || "unselected"} onValueChange={(value: string) => setChurnRisk(value === "unselected" ? null : value as "Certain"|"High"|"Medium"|"Low")}>
              <SelectTrigger>
                <SelectValue placeholder="Select churn risk..." />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground shadow-md">
                <SelectItem value="unselected">
                  <span className="text-muted-foreground">Not selected</span>
                </SelectItem>
                <SelectItem value="Low">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    Low
                  </div>
                </SelectItem>
                <SelectItem value="Medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    Medium
                  </div>
                </SelectItem>
                <SelectItem value="High">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    High
                  </div>
                </SelectItem>
                <SelectItem value="Certain">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-black"></div>
                    Certain
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Churn Risk Reason for High Risk */}
          {churnRisk && ['Certain', 'High', 'Medium'].includes(churnRisk) && (
            <div className="md:col-span-3">
              <div className="text-sm mb-1">
                Churn Risk Reason <span className="text-destructive">*</span>
              </div>
              <Textarea 
                value={churnRiskReason} 
                onChange={(e) => setChurnRiskReason(e.target.value)} 
                placeholder="Explain the reason for the churn risk..."
                className="min-h-[80px]"
              />
            </div>
          )}
          
          <div className="md:col-span-3">
            <div className="text-sm mb-1">Notes / Escalation (optional)</div>
            <textarea className="w-full border rounded px-2 py-1 min-h-[90px]" value={notes} onChange={(e)=>setNotes(e.target.value)} />
          </div>
        </div>

        {/* Auto-save indicator */}
        {autoSaveMutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin h-3 w-3 border border-primary rounded-full border-t-transparent"></div>
            Auto-saving...
          </div>
        )}
      </Card>

    {/* Edit Task Dialog */}
    {editingTask && (
      <TaskEditDialog
        task={editingTask}
        profiles={profiles}
        onSave={handleSaveTask}
        onClose={() => setEditingTask(null)}
      />
    )}
    {/* Create Action Dialog */}
    {createActionDialogOpen && projectId && (
      <Dialog open={createActionDialogOpen} onOpenChange={setCreateActionDialogOpen}>
        <DialogContent>
          <CreateActionDialog
            profiles={profiles}
            onSave={handleCreateAction}
            onClose={() => setCreateActionDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    )}
    
    {/* Create Event Dialog */}
    {createEventDialogOpen && projectId && (
      <CreateEventDialog
        open={createEventDialogOpen}
        onOpenChange={setCreateEventDialogOpen}
        projectId={projectId}
        onEventCreated={() => {
          setCreateEventDialogOpen(false);
          qc.invalidateQueries({ queryKey: ["impl-events", companyId, weekStart] });
        }}
      />
    )}

    {/* Create Vision Model Dialog */}
    {createVisionModelDialogOpen && projectId && (
      <VisionModelDialog
        open={createVisionModelDialogOpen}
        onOpenChange={setCreateVisionModelDialogOpen}
        onClose={handleCreateVisionModel}
        projectId={projectId}
        mode="create"
      />
    )}

    {/* Blocker Drawer */}
    {projectId && (
      <BlockerDrawer
        open={blockerDrawerOpen}
        onOpenChange={(open) => {
          setBlockerDrawerOpen(open);
          if (!open) {
            setEditingBlocker(null);
          }
        }}
        projectId={projectId}
        blocker={editingBlocker}
        onSuccess={() => {
          setBlockerDrawerOpen(false);
          setEditingBlocker(null);
          qc.invalidateQueries({ queryKey: ["impl-blockers", companyId] });
        }}
      />
    )}

    {/* Edit Action Dialog */}
    {editActionDialogOpen && editingAction && (
      <Dialog open={editActionDialogOpen} onOpenChange={setEditActionDialogOpen}>
        <DialogContent>
          <EditActionDialog
            action={editingAction}
            profiles={profiles}
            onSave={handleSaveEditedAction}
            onClose={() => {
              setEditActionDialogOpen(false);
              setEditingAction(null);
            }}
          />
        </DialogContent>
      </Dialog>
    )}

    {/* Product Gap Drawer */}
    {projectId && (
      <ProductGapDrawer
        open={productGapDrawerOpen}
        onOpenChange={(open) => {
          setProductGapDrawerOpen(open);
          if (!open) {
            setEditingProductGap(null);
            qc.invalidateQueries({ queryKey: ["impl-product-gaps", companyId] });
          }
        }}
        projectId={projectId}
        productGap={editingProductGap}
      />
    )}
  </div>
);
}

// Task Edit Dialog Component
const TaskEditDialog = ({ 
  task, 
  profiles, 
  onSave, 
  onClose 
}: {
  task: TaskRow;
  profiles: Profile[];
  onSave: (data: Partial<TaskRow>) => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    task_title: task.task_title,
    planned_start: task.planned_start || '',
    planned_end: task.planned_end || '',
    actual_start: task.actual_start || '',
    actual_end: task.actual_end || '',
    status: task.status,
    assignee: task.assignee || '',
  });

  const [datePopoverOpen, setDatePopoverOpen] = useState({
    planned_start: false,
    planned_end: false,
    actual_start: false,
    actual_end: false,
  });

  const handleDateSelect = (field: string, date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        [field]: date.toISOString().split('T')[0]
      }));
    }
    setDatePopoverOpen(prev => ({ ...prev, [field]: false }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return "Pick a date";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task_title">Task Title</Label>
              <Input
                id="task_title"
                value={formData.task_title}
                onChange={(e) => setFormData(prev => ({ ...prev, task_title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select value={formData.assignee} onValueChange={(value) => setFormData(prev => ({ ...prev, assignee: value === "unassigned" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {profiles
                    .filter((profile) => profile.user_id && profile.user_id.trim() !== '')
                    .map((profile) => (
                      <SelectItem key={profile.user_id} value={profile.user_id}>
                        {profile.name || 'Unnamed User'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Planned Start Date */}
            <div className="space-y-2">
              <Label>Planned Start</Label>
              <Popover open={datePopoverOpen.planned_start} onOpenChange={(open) => setDatePopoverOpen(prev => ({ ...prev, planned_start: open }))}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.planned_start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateForDisplay(formData.planned_start)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.planned_start ? new Date(formData.planned_start) : undefined}
                    onSelect={(date) => handleDateSelect('planned_start', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Planned End Date */}
            <div className="space-y-2">
              <Label>Planned End</Label>
              <Popover open={datePopoverOpen.planned_end} onOpenChange={(open) => setDatePopoverOpen(prev => ({ ...prev, planned_end: open }))}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.planned_end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateForDisplay(formData.planned_end)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.planned_end ? new Date(formData.planned_end) : undefined}
                    onSelect={(date) => handleDateSelect('planned_end', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Actual Start Date */}
            <div className="space-y-2">
              <Label>Actual Start</Label>
              <Popover open={datePopoverOpen.actual_start} onOpenChange={(open) => setDatePopoverOpen(prev => ({ ...prev, actual_start: open }))}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.actual_start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateForDisplay(formData.actual_start)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.actual_start ? new Date(formData.actual_start) : undefined}
                    onSelect={(date) => handleDateSelect('actual_start', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Actual End Date */}
            <div className="space-y-2">
              <Label>Actual End</Label>
              <Popover open={datePopoverOpen.actual_end} onOpenChange={(open) => setDatePopoverOpen(prev => ({ ...prev, actual_end: open }))}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.actual_end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateForDisplay(formData.actual_end)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.actual_end ? new Date(formData.actual_end) : undefined}
                    onSelect={(date) => handleDateSelect('actual_end', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Update Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Create Action Dialog Component  
const CreateActionDialog = ({ 
  profiles, 
  onSave, 
  onClose 
}: {
  profiles: Profile[];
  onSave: (data: any) => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    title: '',
    details: '',
    assignee: '',
    planned_date: undefined as Date | undefined,
    notes: '',
    is_critical: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        await onSave({
          title: formData.title,
          details: formData.details || null,
          assignee: formData.assignee || null,
          planned_date: formData.planned_date ? formData.planned_date.toISOString().split('T')[0] : null,
          notes: formData.notes || null,
          is_critical: formData.is_critical,
        });
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (date: Date | undefined) => {
    if (!date) return "Pick a date";
    return date.toLocaleDateString();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Action</DialogTitle>
        <DialogDescription>
          Add a new action item for this project
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="details">Details</Label>
          <Textarea
            id="details"
            value={formData.details}
            onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <Select
              value={formData.assignee}
              onValueChange={(value) => setFormData(prev => ({ ...prev, assignee: value === "unassigned" ? "" : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.user_id} value={profile.user_id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Planned Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.planned_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDateForDisplay(formData.planned_date)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.planned_date}
                  onSelect={(date) => setFormData(prev => ({ ...prev, planned_date: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_critical"
            checked={formData.is_critical}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_critical: checked === true }))}
          />
          <Label htmlFor="is_critical">Mark as critical</Label>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !formData.title}>
            {loading ? "Creating..." : "Create Action"}
          </Button>
        </div>
      </form>
    </>
  );
};

// Edit Action Dialog Component
const EditActionDialog = ({ 
  action,
  profiles, 
  onSave, 
  onClose 
}: {
  action: any;
  profiles: Profile[];
  onSave: (data: any) => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    title: action.title,
    details: action.details || '',
    assignee: action.assignee || '',
    planned_date: action.planned_date ? new Date(action.planned_date) : undefined as Date | undefined,
    notes: action.notes || '',
    status: action.status,
    is_critical: action.is_critical,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSave({
        title: formData.title,
        details: formData.details || null,
        assignee: formData.assignee || null,
        planned_date: formData.planned_date ? formData.planned_date.toISOString().split('T')[0] : null,
        notes: formData.notes || null,
        status: formData.status,
        is_critical: formData.is_critical,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Action</DialogTitle>
        <DialogDescription>
          Update action details and status
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Title *</Label>
          <Input
            id="edit-title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter action title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-details">Details</Label>
          <Textarea
            id="edit-details"
            value={formData.details}
            onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
            placeholder="Enter action details"
            rows={3}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assignee *</Label>
            <Select 
              value={formData.assignee} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, assignee: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee (required)" />
              </SelectTrigger>
              <SelectContent>
                {profiles
                  .filter((profile) => profile.user_id && profile.user_id.trim() !== '')
                  .map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.name || 'Unnamed User'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Planned Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.planned_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.planned_date ? new Date(formData.planned_date).toLocaleDateString('en-GB') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.planned_date}
                onSelect={(date) => setFormData(prev => ({ ...prev, planned_date: date }))}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit_is_critical"
              checked={formData.is_critical}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_critical: checked as boolean }))}
            />
            <Label htmlFor="edit_is_critical" className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Mark as Critical
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">Critical actions will appear at the top of the actions list</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-notes">Notes</Label>
          <Textarea
            id="edit-notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes"
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading || !formData.title || !formData.assignee}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Updating...' : 'Update Action'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
};
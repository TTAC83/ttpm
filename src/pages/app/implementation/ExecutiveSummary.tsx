import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { fetchExecutiveSummaryData } from "@/lib/executiveSummaryService";
import { blockersService, ImplementationBlocker } from "@/lib/blockersService";
import { productGapsService, ProductGap } from "@/lib/productGapsService";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smile, Frown, Bug, TrendingUp, TrendingDown, AlertTriangle, Hammer, GraduationCap, Rocket } from "lucide-react";
import { format } from "date-fns";
import { BlockerDrawer } from "@/components/BlockerDrawer";
import { ProductGapDrawer } from "@/components/ProductGapDrawer";
import { EditActionDialog } from "@/components/EditActionDialog";
import { formatDateUK } from "@/lib/dateUtils";

export default function ExecutiveSummary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Drawer states
  const [selectedEscalation, setSelectedEscalation] = useState<ImplementationBlocker | undefined>();
  const [escalationDrawerOpen, setEscalationDrawerOpen] = useState(false);
  const [selectedProductGap, setSelectedProductGap] = useState<ProductGap | undefined>();
  const [productGapDrawerOpen, setProductGapDrawerOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const { data: summaryData = [], isLoading } = useQuery({
    queryKey: ['executive-summary'],
    queryFn: fetchExecutiveSummaryData,
  });

  // Fetch escalations (Live only)
  const { data: escalations = [], isLoading: escalationsLoading } = useQuery({
    queryKey: ['executive-escalations'],
    queryFn: () => blockersService.getAllBlockers({ status: 'Live' }),
  });

  // Fetch product gaps (Live only)
  const { data: productGaps = [], isLoading: productGapsLoading } = useQuery({
    queryKey: ['executive-product-gaps'],
    queryFn: async () => {
      const allGaps = await productGapsService.getAllProductGaps();
      return allGaps.filter(g => g.status === 'Live');
    },
  });

  // Fetch actions (critical or overdue)
  const { data: actions = [], isLoading: actionsLoading } = useQuery({
    queryKey: ['executive-actions'],
    queryFn: async () => {
      const ukToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
          profiles:assignee(name),
          projects:project_id(name, companies:company_id(name))
        `)
        .or(`is_critical.eq.true,and(planned_date.lt.${ukToday})`)
        .neq('status', 'Done')
        .order('is_critical', { ascending: false })
        .order('planned_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles for action editing
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Handle action save
  const handleActionSave = async (actionData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-action', {
        body: {
          id: selectedAction?.id,
          ...actionData,
          isUpdate: true,
        },
      });
      if (error) throw error;
      setActionDialogOpen(false);
      setSelectedAction(null);
      queryClient.invalidateQueries({ queryKey: ['executive-actions'] });
    } catch (error) {
      console.error('Error updating action:', error);
    }
  };

  // Filter data based on search
  const filteredData = summaryData.filter(row => 
    row.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.project_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute stats from summary data
  const stats = useMemo(() => {
    const total = summaryData.length;
    const greenHealth = summaryData.filter(r => r.customer_health === 'green').length;
    const redHealth = summaryData.filter(r => r.customer_health === 'red').length;
    const noHealth = total - greenHealth - redHealth;
    
    const onTrack = summaryData.filter(r => r.project_on_track === 'on_track').length;
    const offTrack = summaryData.filter(r => r.project_on_track === 'off_track').length;
    const noStatus = total - onTrack - offTrack;
    
    const installation = summaryData.filter(r => r.phase_installation).length;
    const onboarding = summaryData.filter(r => r.phase_onboarding).length;
    const live = summaryData.filter(r => r.phase_live).length;
    
    const productGapsCritical = summaryData.filter(r => r.product_gaps_status === 'critical').length;
    const productGapsNonCritical = summaryData.filter(r => r.product_gaps_status === 'non_critical').length;
    
    const escalationsCritical = summaryData.filter(r => r.escalation_status === 'critical').length;
    const escalationsActive = summaryData.filter(r => r.escalation_status === 'active').length;
    
    return {
      total,
      greenHealth,
      redHealth,
      noHealth,
      onTrack,
      offTrack,
      noStatus,
      installation,
      onboarding,
      live,
      productGapsCritical,
      productGapsNonCritical,
      escalationsCritical,
      escalationsActive
    };
  }, [summaryData]);

  // Sort data
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Default sort: escalation status priority, then planned go-live date
  const getEscalationPriority = (status: 'none' | 'active' | 'critical') => {
    if (status === 'critical') return 0;
    if (status === 'active') return 1;
    return 2;
  };

  const sortedData = [...filteredData].sort((a, b) => {
    // If user clicked a column header, use that sorting
    if (sortColumn) {
      let aVal: any = a[sortColumn as keyof typeof a];
      let bVal: any = b[sortColumn as keyof typeof b];

      // Handle null values
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      // String comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }

    // Default sort: escalation priority first, then go-live date ascending
    const escPriorityA = getEscalationPriority(a.escalation_status);
    const escPriorityB = getEscalationPriority(b.escalation_status);

    if (escPriorityA !== escPriorityB) {
      return escPriorityA - escPriorityB;
    }

    // Within same escalation priority, sort by planned go-live date ascending
    const dateA = a.planned_go_live_date ? new Date(a.planned_go_live_date).getTime() : Infinity;
    const dateB = b.planned_go_live_date ? new Date(b.planned_go_live_date).getTime() : Infinity;
    return dateA - dateB;
  });

  // Create a project order map for sorting the sub-tables in same sequence as summary
  const projectOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedData.forEach((row, index) => {
      map.set(row.project_id, index);
    });
    return map;
  }, [sortedData]);

  const handleRowClick = (projectId: string) => {
    navigate(`/app/projects/${projectId}`);
  };

  const renderHealthIcon = (health: 'green' | 'red' | null) => {
    if (health === 'green') {
      return <Smile className="h-6 w-6 text-green-600" />;
    }
    if (health === 'red') {
      return <Frown className="h-6 w-6 text-red-600" />;
    }
    return null;
  };

  const renderOnTrackIcon = (status: 'on_track' | 'off_track' | null) => {
    if (status === 'on_track') {
      return <TrendingUp className="h-6 w-6 text-green-600" />;
    }
    if (status === 'off_track') {
      return <TrendingDown className="h-6 w-6 text-red-600" />;
    }
    return null;
  };

  const renderProductGapsIcon = (status: 'none' | 'non_critical' | 'critical') => {
    if (status === 'none') return null;
    if (status === 'critical') {
      return <Bug className="h-6 w-6 text-red-600" />;
    }
    return <Bug className="h-6 w-6 text-green-600" />;
  };

  const renderEscalationIcon = (status: 'none' | 'active' | 'critical') => {
    if (status === 'none') return null;
    if (status === 'critical') {
      return <AlertTriangle className="h-6 w-6 text-red-600" />;
    }
    return <AlertTriangle className="h-6 w-6 text-foreground" />;
  };

  const renderPhaseIcon = (phase: 'installation' | 'onboarding' | 'live', isActive: boolean | null) => {
    if (!isActive) return null;
    
    switch (phase) {
      case 'installation':
        return <Hammer className="h-5 w-5 text-orange-500" />;
      case 'onboarding':
        return <GraduationCap className="h-5 w-5 text-blue-500" />;
      case 'live':
        return <Rocket className="h-5 w-5 text-green-500" />;
    }
  };


  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading executive summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Executive Summary</h1>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search by customer or project..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* KPI Stats Banner */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {stats.total}
            </div>
            <div className="text-sm text-muted-foreground">Total Projects</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg">
              <span className="text-green-600 font-semibold">{stats.greenHealth}</span>
              {" / "}
              <span className="text-red-600 font-semibold">{stats.redHealth}</span>
              {" / "}
              <span className="text-muted-foreground">{stats.noHealth}</span>
            </div>
            <div className="text-sm text-muted-foreground">Health (G/R/–)</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg">
              <span className="text-green-600 font-semibold">{stats.onTrack}</span>
              {" / "}
              <span className="text-red-600 font-semibold">{stats.offTrack}</span>
              {" / "}
              <span className="text-muted-foreground">{stats.noStatus}</span>
            </div>
            <div className="text-sm text-muted-foreground">On Track (Y/N/–)</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg flex justify-center gap-2">
              <span className="flex items-center gap-1">
                <Hammer className="h-4 w-4 text-orange-500" />
                <span className="font-semibold">{stats.installation}</span>
              </span>
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                <span className="font-semibold">{stats.onboarding}</span>
              </span>
              <span className="flex items-center gap-1">
                <Rocket className="h-4 w-4 text-green-500" />
                <span className="font-semibold">{stats.live}</span>
              </span>
            </div>
            <div className="text-sm text-muted-foreground">Phases</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg">
              <span className="text-red-600 font-semibold">{stats.productGapsCritical}</span>
              {" / "}
              <span className="text-green-600 font-semibold">{stats.productGapsNonCritical}</span>
            </div>
            <div className="text-sm text-muted-foreground">Product Gaps (Crit/Non)</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg">
              <span className="text-red-600 font-semibold">{stats.escalationsCritical}</span>
              {" / "}
              <span className="text-foreground font-semibold">{stats.escalationsActive}</span>
            </div>
            <div className="text-sm text-muted-foreground">Escalations (Crit/Active)</div>
          </div>
        </div>
      </Card>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            {/* Group header row */}
            <TableRow className="bg-muted/30 border-b-0">
              <TableHead 
                colSpan={3} 
                className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r"
              >
                Project Details
              </TableHead>
              <TableHead 
                colSpan={2}
                className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r"
              >
                Escalations
              </TableHead>
              <TableHead 
                colSpan={3} 
                className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r"
              >
                Weekly Review
              </TableHead>
              <TableHead 
                colSpan={3} 
                className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground border-r"
              >
                Status
              </TableHead>
              <TableHead 
                className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Product Gaps
              </TableHead>
            </TableRow>
            {/* Column header row */}
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 border-r-0"
                onClick={() => handleSort('customer_name')}
              >
                Customer {sortColumn === 'customer_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('project_name')}
              >
                Project {sortColumn === 'project_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 border-r"
                onClick={() => handleSort('planned_go_live_date')}
              >
                Go Live {sortColumn === 'planned_go_live_date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('escalation_status')}
              >
                {sortColumn === 'escalation_status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="border-r">Reason</TableHead>
              <TableHead className="text-center">Health</TableHead>
              <TableHead className="text-center">On Track</TableHead>
              <TableHead className="border-r">Reason</TableHead>
              <TableHead className="text-center">
                <Hammer className="h-4 w-4 mx-auto text-orange-500" />
              </TableHead>
              <TableHead className="text-center">
                <GraduationCap className="h-4 w-4 mx-auto text-blue-500" />
              </TableHead>
              <TableHead className="text-center border-r">
                <Rocket className="h-4 w-4 mx-auto text-green-500" />
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('product_gaps_status')}
              >
                {sortColumn === 'product_gaps_status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  No implementation projects found.
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row) => (
                <TableRow
                  key={row.project_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(row.project_id)}
                >
                  <TableCell className="font-medium">{row.customer_name}</TableCell>
                  <TableCell>{row.project_name}</TableCell>
                  <TableCell className="border-r">
                    {row.planned_go_live_date ? format(new Date(row.planned_go_live_date), 'dd MMM yy') : ''}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderEscalationIcon(row.escalation_status)}
                  </TableCell>
                  <TableCell className="border-r text-sm">
                    {escalations
                      .filter(e => e.project_id === row.project_id)
                      .map(e => e.reason_code)
                      .filter(Boolean)
                      .join(', ')}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderHealthIcon(row.customer_health)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderOnTrackIcon(row.project_on_track)}
                  </TableCell>
                  <TableCell className="border-r">{row.reason_code || ''}</TableCell>
                  <TableCell className="text-center">
                    {renderPhaseIcon('installation', row.phase_installation)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderPhaseIcon('onboarding', row.phase_onboarding)}
                  </TableCell>
                  <TableCell className="text-center border-r">
                    {renderPhaseIcon('live', row.phase_live)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderProductGapsIcon(row.product_gaps_status)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Escalations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Escalations ({escalations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {escalationsLoading ? (
            <div className="p-4 text-muted-foreground">Loading escalations...</div>
          ) : escalations.length === 0 ? (
            <div className="p-4 text-muted-foreground">No live escalations.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Est. Complete</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {[...escalations]
                .sort((a, b) => {
                  const orderA = projectOrderMap.get(a.project_id || '') ?? Infinity;
                  const orderB = projectOrderMap.get(b.project_id || '') ?? Infinity;
                  return orderA - orderB;
                })
                .map((esc) => (
                  <TableRow 
                    key={esc.id}
                    className={esc.is_critical ? "bg-red-100 dark:bg-red-950/30 border-l-4 border-l-red-500" : ""}
                  >
                    <TableCell className="font-medium">{esc.customer_name}</TableCell>
                    <TableCell>{esc.project_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{esc.title}</span>
                        {esc.is_critical && <Badge variant="destructive" className="text-xs">CRITICAL</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{esc.owner_name}</TableCell>
                    <TableCell>{formatDateUK(esc.raised_at)}</TableCell>
                    <TableCell>{esc.estimated_complete_date ? formatDateUK(esc.estimated_complete_date) : '-'}</TableCell>
                    <TableCell className={esc.is_overdue ? "text-red-600 font-medium" : ""}>{esc.age_days}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedEscalation(esc);
                          setEscalationDrawerOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Actions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Actions - Critical & Overdue ({actions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {actionsLoading ? (
            <div className="p-4 text-muted-foreground">Loading actions...</div>
          ) : actions.length === 0 ? (
            <div className="p-4 text-muted-foreground">No critical or overdue actions.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...actions]
                  .sort((a, b) => {
                    const orderA = projectOrderMap.get(a.project_id || '') ?? Infinity;
                    const orderB = projectOrderMap.get(b.project_id || '') ?? Infinity;
                    return orderA - orderB;
                  })
                  .map((action) => {
                  const ukToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
                  const isOverdue = action.planned_date && action.planned_date < ukToday;
                  return (
                    <TableRow 
                      key={action.id}
                      className={action.is_critical ? "bg-red-100 dark:bg-red-950/30 border-l-4 border-l-red-500" : isOverdue ? "bg-amber-50 dark:bg-amber-950/20" : ""}
                    >
                      <TableCell className="font-medium">{action.projects?.companies?.name || '-'}</TableCell>
                      <TableCell>{action.projects?.name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{action.title}</span>
                          {action.is_critical && <Badge variant="destructive" className="text-xs">CRITICAL</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{action.profiles?.name || '-'}</TableCell>
                      <TableCell className={isOverdue ? "text-red-600 font-medium" : ""}>
                        {action.planned_date ? formatDateUK(action.planned_date) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={action.status === 'Done' ? 'default' : 'secondary'}>
                          {action.status?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedAction(action);
                            setActionDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Product Gaps Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Product Gaps ({productGaps.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {productGapsLoading ? (
            <div className="p-4 text-muted-foreground">Loading product gaps...</div>
          ) : productGaps.length === 0 ? (
            <div className="p-4 text-muted-foreground">No live product gaps.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Product Gap</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Est. Complete</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...productGaps]
                  .sort((a, b) => {
                    const orderA = projectOrderMap.get(a.project_id || '') ?? Infinity;
                    const orderB = projectOrderMap.get(b.project_id || '') ?? Infinity;
                    return orderA - orderB;
                  })
                  .map((gap) => (
                  <TableRow 
                    key={gap.id}
                    className={gap.is_critical ? "bg-red-100 dark:bg-red-950/30 border-l-4 border-l-red-500" : ""}
                  >
                    <TableCell className="font-medium">{gap.company_name}</TableCell>
                    <TableCell>{gap.project_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{gap.title}</span>
                        {gap.is_critical && <Badge variant="destructive" className="text-xs">CRITICAL</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{gap.assigned_to_name || '-'}</TableCell>
                    <TableCell>
                      {gap.estimated_complete_date ? formatDateUK(gap.estimated_complete_date) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={gap.is_critical ? "destructive" : "default"}>
                        {gap.is_critical ? "Critical" : "Live"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedProductGap(gap);
                          setProductGapDrawerOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Drawers */}
      {selectedEscalation && (
        <BlockerDrawer
          open={escalationDrawerOpen}
          onOpenChange={setEscalationDrawerOpen}
          projectId={selectedEscalation.project_id || ''}
          blocker={selectedEscalation}
          onSuccess={() => {
            setEscalationDrawerOpen(false);
            setSelectedEscalation(undefined);
            queryClient.invalidateQueries({ queryKey: ['executive-escalations'] });
            queryClient.invalidateQueries({ queryKey: ['executive-summary'] });
          }}
        />
      )}

      <ProductGapDrawer
        open={productGapDrawerOpen}
        onOpenChange={setProductGapDrawerOpen}
        productGap={selectedProductGap}
        onSuccess={() => {
          setProductGapDrawerOpen(false);
          setSelectedProductGap(undefined);
          queryClient.invalidateQueries({ queryKey: ['executive-product-gaps'] });
          queryClient.invalidateQueries({ queryKey: ['executive-summary'] });
        }}
      />

      {selectedAction && (
        <EditActionDialog
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          action={selectedAction}
          profiles={profiles}
          onSave={handleActionSave}
        />
      )}
    </div>
  );
}

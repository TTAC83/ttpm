import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchExecutiveSummaryData } from "@/lib/executiveSummaryService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Smile, Frown, Bug, TrendingUp, TrendingDown, AlertTriangle, Hammer, GraduationCap, Rocket } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function ExecutiveSummary() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: summaryData = [], isLoading } = useQuery({
    queryKey: ['executive-summary'],
    queryFn: fetchExecutiveSummaryData,
  });

  // Filter data based on search
  const filteredData = summaryData.filter(row => 
    row.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.project_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('customer_name')}
              >
                Customer Name {sortColumn === 'customer_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('project_name')}
              >
                Project {sortColumn === 'project_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="text-center">Customer Health</TableHead>
              <TableHead>Reason Code</TableHead>
              <TableHead className="text-center">Project On Track</TableHead>
              <TableHead className="text-center">Installation</TableHead>
              <TableHead className="text-center">Onboarding</TableHead>
              <TableHead className="text-center">Live</TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('product_gaps_status')}
              >
                Product Gaps {sortColumn === 'product_gaps_status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('escalation_status')}
              >
                Escalations {sortColumn === 'escalation_status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('planned_go_live_date')}
              >
                Planned Go Live {sortColumn === 'planned_go_live_date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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
                  <TableCell className="text-center">
                    {renderHealthIcon(row.customer_health)}
                  </TableCell>
                  <TableCell>{row.reason_code || ''}</TableCell>
                  <TableCell className="text-center">
                    {renderOnTrackIcon(row.project_on_track)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderPhaseIcon('installation', row.phase_installation)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderPhaseIcon('onboarding', row.phase_onboarding)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderPhaseIcon('live', row.phase_live)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderProductGapsIcon(row.product_gaps_status)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderEscalationIcon(row.escalation_status)}
                  </TableCell>
                  <TableCell>
                    {row.planned_go_live_date ? format(new Date(row.planned_go_live_date), 'dd MMM yyyy') : ''}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

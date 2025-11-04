import { useState, useEffect } from "react";
import { Search, Filter, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BlockerDrawer } from "@/components/BlockerDrawer";
import { blockersService, ImplementationBlocker } from "@/lib/blockersService";
import { formatDateUK } from "@/lib/dateUtils";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

export default function ImplementationEscalations() {
  const [escalations, setEscalations] = useState<ImplementationBlocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    customer: "",
    project: "",
    status: "Live" as 'Live' | 'Closed' | 'All',
    overdue: false,
    dateFrom: "",
    dateTo: "",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState<ImplementationBlocker | undefined>();

  useEffect(() => {
    loadEscalations();
  }, [filters]);

  const loadEscalations = async () => {
    setLoading(true);
    try {
      const data = await blockersService.getAllBlockers(filters);
      // Sort alphabetically by customer name
      const sortedData = data.sort((a, b) => {
        const customerA = (a.customer_name || '').toLowerCase();
        const customerB = (b.customer_name || '').toLowerCase();
        return customerA.localeCompare(customerB);
      });
      setEscalations(sortedData);
    } catch (error) {
      console.error("Failed to load escalations:", error);
      toast.error("Failed to load escalations");
    } finally {
      setLoading(false);
    }
  };

  const handleEditEscalation = (escalation: ImplementationBlocker) => {
    setSelectedEscalation(escalation);
    setDrawerOpen(true);
  };

  const getStatusBadge = (gapEscalation: ImplementationBlocker) => {
    if (gapEscalation.status === 'Closed') {
      return <Badge variant="secondary">Closed</Badge>;
    }
    if (gapEscalation.is_overdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">Live</Badge>;
  };

  const getRowClassName = (gapEscalation: ImplementationBlocker) => {
    if (gapEscalation.is_critical) {
      return "bg-red-100 dark:bg-red-950/30 border-l-4 border-l-red-500";
    }
    if (gapEscalation.status === 'Closed') return "";
    if (gapEscalation.is_overdue) return "bg-red-50 dark:bg-red-950/20";
    return "";
  };

  const handleExportToExcel = () => {
    try {
      const exportData = escalations.map(esc => ({
        'Customer': esc.customer_name || '',
        'Project': esc.project_name || '',
        'Title': esc.title,
        'Description': esc.description || '',
        'Owner': esc.owner_name,
        'Account Manager': esc.account_manager_name || '',
        'Status': esc.status,
        'Critical': esc.is_critical ? 'Yes' : 'No',
        'Raised': formatDateUK(esc.raised_at),
        'Est. Complete': esc.estimated_complete_date ? formatDateUK(esc.estimated_complete_date) : '',
        'Age (days)': esc.age_days,
        'Overdue': esc.is_overdue ? 'Yes' : 'No',
        'Reason Code': esc.reason_code || '',
        'Resolution Notes': esc.resolution_notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Escalations');
      
      const fileName = `escalations_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Escalations exported to Excel');
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export escalations');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Escalations</h1>
          <p className="text-muted-foreground">
            View escalations across all projects. To add new ones, go to the specific project.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleExportToExcel}
            disabled={escalations.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Button 
            variant={filters.status === 'Live' ? 'default' : 'outline'}
            onClick={() => setFilters(prev => ({ 
              ...prev, 
              status: prev.status === 'Live' ? 'All' : 'Live' 
            }))}
          >
            {filters.status === 'Live' ? 'Show All' : 'Show Open Only'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                placeholder="Filter by customer..."
                value={filters.customer}
                onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="project">Project</Label>
              <Input
                id="project"
                placeholder="Filter by project..."
                value={filters.project}
                onChange={(e) => setFilters(prev => ({ ...prev, project: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={filters.status} 
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Live">Live</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overdue"
                  checked={filters.overdue}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, overdue: checked as boolean }))
                  }
                />
                <Label htmlFor="overdue">Overdue only</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Escalations ({escalations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading escalations...</p>
            </div>
          ) : escalations.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No escalations found</h3>
              <p className="text-muted-foreground">
                No escalations match your current filter criteria.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Account Manager</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Est. Complete</TableHead>
                  <TableHead>Age (days)</TableHead>
                  <TableHead>Reason Code</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalations.map((escalation) => (
                  <TableRow
                    key={escalation.id}
                    className={getRowClassName(escalation)}
                  >
                    <TableCell className="font-medium">
                      {escalation.customer_name}
                    </TableCell>
                    <TableCell>{escalation.project_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{escalation.title}</p>
                            {escalation.is_critical && (
                              <Badge variant="destructive" className="text-xs">
                                CRITICAL
                              </Badge>
                            )}
                          </div>
                          {escalation.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {escalation.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{escalation.owner_name}</TableCell>
                    <TableCell>{escalation.account_manager_name || '-'}</TableCell>
                    <TableCell>{formatDateUK(escalation.raised_at)}</TableCell>
                    <TableCell>
                      {escalation.estimated_complete_date
                        ? formatDateUK(escalation.estimated_complete_date)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span className={escalation.is_overdue ? "text-red-600 font-medium" : ""}>
                        {escalation.age_days}
                      </span>
                    </TableCell>
                    <TableCell>{escalation.reason_code || '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditEscalation(escalation)}
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

      {selectedEscalation && (
        <BlockerDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          projectId={selectedEscalation.project_id}
          blocker={selectedEscalation}
          onSuccess={() => {
            setDrawerOpen(false);
            setSelectedEscalation(undefined);
            loadEscalations();
          }}
        />
      )}
    </div>
  );
}
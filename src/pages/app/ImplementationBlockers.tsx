import { useState, useEffect } from "react";
import { Search, Filter, AlertTriangle } from "lucide-react";
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

export default function ImplementationGapsEscalations() {
  const [gapsEscalations, setGapsEscalations] = useState<ImplementationBlocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    customer: "",
    project: "",
    status: "All" as 'Live' | 'Closed' | 'All',
    overdue: false,
    dateFrom: "",
    dateTo: "",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedGapEscalation, setSelectedGapEscalation] = useState<ImplementationBlocker | undefined>();

  useEffect(() => {
    loadGapsEscalations();
  }, [filters]);

  const loadGapsEscalations = async () => {
    setLoading(true);
    try {
      const data = await blockersService.getAllBlockers(filters);
      setGapsEscalations(data);
    } catch (error) {
      console.error("Failed to load gaps & escalations:", error);
      toast.error("Failed to load gaps & escalations");
    } finally {
      setLoading(false);
    }
  };

  const handleEditGapEscalation = (gapEscalation: ImplementationBlocker) => {
    setSelectedGapEscalation(gapEscalation);
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
    if (gapEscalation.status === 'Closed') return "";
    if (gapEscalation.is_overdue) return "bg-red-50 dark:bg-red-950/20";
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gaps & Escalations</h1>
          <p className="text-muted-foreground">
            View gaps & escalations across all projects. To add new ones, go to the specific project.
          </p>
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
            Gaps & Escalations ({gapsEscalations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading gaps & escalations...</p>
            </div>
          ) : gapsEscalations.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No gaps & escalations found</h3>
              <p className="text-muted-foreground">
                No gaps & escalations match your current filter criteria.
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
                  <TableHead>Raised</TableHead>
                  <TableHead>Est. Complete</TableHead>
                  <TableHead>Age (days)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gapsEscalations.map((gapEscalation) => (
                  <TableRow
                    key={gapEscalation.id}
                    className={getRowClassName(gapEscalation)}
                  >
                    <TableCell className="font-medium">
                      {gapEscalation.customer_name}
                    </TableCell>
                    <TableCell>{gapEscalation.project_name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{gapEscalation.title}</p>
                        {gapEscalation.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {gapEscalation.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{gapEscalation.owner_name}</TableCell>
                    <TableCell>{formatDateUK(gapEscalation.raised_at)}</TableCell>
                    <TableCell>
                      {gapEscalation.estimated_complete_date
                        ? formatDateUK(gapEscalation.estimated_complete_date)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span className={gapEscalation.is_overdue ? "text-red-600 font-medium" : ""}>
                        {gapEscalation.age_days}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(gapEscalation)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditGapEscalation(gapEscalation)}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedGapEscalation && (
        <BlockerDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          projectId={selectedGapEscalation.project_id}
          blocker={selectedGapEscalation}
          onSuccess={() => {
            setDrawerOpen(false);
            setSelectedGapEscalation(undefined);
            loadGapsEscalations();
          }}
        />
      )}
    </div>
  );
}
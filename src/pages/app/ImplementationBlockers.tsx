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

export default function ImplementationBlockers() {
  const [blockers, setBlockers] = useState<ImplementationBlocker[]>([]);
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
  const [selectedBlocker, setSelectedBlocker] = useState<ImplementationBlocker | undefined>();

  useEffect(() => {
    loadBlockers();
  }, [filters]);

  const loadBlockers = async () => {
    setLoading(true);
    try {
      const data = await blockersService.getAllBlockers(filters);
      setBlockers(data);
    } catch (error) {
      console.error("Failed to load blockers:", error);
      toast.error("Failed to load blockers");
    } finally {
      setLoading(false);
    }
  };

  const handleEditBlocker = (blocker: ImplementationBlocker) => {
    setSelectedBlocker(blocker);
    setDrawerOpen(true);
  };

  const getStatusBadge = (blocker: ImplementationBlocker) => {
    if (blocker.status === 'Closed') {
      return <Badge variant="secondary">Closed</Badge>;
    }
    if (blocker.is_overdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">Live</Badge>;
  };

  const getRowClassName = (blocker: ImplementationBlocker) => {
    if (blocker.status === 'Closed') return "";
    if (blocker.is_overdue) return "bg-red-50 dark:bg-red-950/20";
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Implementation Blockers</h1>
          <p className="text-muted-foreground">
            View and manage all implementation blockers across projects
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
            Blockers ({blockers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading blockers...</p>
            </div>
          ) : blockers.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No blockers found</h3>
              <p className="text-muted-foreground">
                No blockers match your current filter criteria.
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
                {blockers.map((blocker) => (
                  <TableRow
                    key={blocker.id}
                    className={getRowClassName(blocker)}
                  >
                    <TableCell className="font-medium">
                      {blocker.customer_name}
                    </TableCell>
                    <TableCell>{blocker.project_name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{blocker.title}</p>
                        {blocker.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {blocker.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{blocker.owner_name}</TableCell>
                    <TableCell>{formatDateUK(blocker.raised_at)}</TableCell>
                    <TableCell>
                      {blocker.estimated_complete_date
                        ? formatDateUK(blocker.estimated_complete_date)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span className={blocker.is_overdue ? "text-red-600 font-medium" : ""}>
                        {blocker.age_days}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(blocker)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBlocker(blocker)}
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

      <BlockerDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        projectId={selectedBlocker?.project_id || ""}
        blocker={selectedBlocker}
        onSuccess={loadBlockers}
      />
    </div>
  );
}
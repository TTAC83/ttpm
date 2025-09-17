import { useState, useEffect } from "react";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ProjectBlockersProps {
  projectId: string;
}

export function ProjectBlockers({ projectId }: ProjectBlockersProps) {
  const [blockers, setBlockers] = useState<ImplementationBlocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'Live' | 'Closed' | 'All'>('Live');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBlocker, setSelectedBlocker] = useState<ImplementationBlocker | undefined>();

  useEffect(() => {
    loadBlockers();
  }, [projectId, statusFilter]);

  const loadBlockers = async () => {
    setLoading(true);
    try {
      const data = await blockersService.getProjectBlockers(projectId, statusFilter);
      setBlockers(data);
    } catch (error) {
      console.error("Failed to load blockers:", error);
      toast.error("Failed to load blockers");
    } finally {
      setLoading(false);
    }
  };

  const filteredBlockers = blockers.filter(blocker =>
    blocker.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blocker.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddBlocker = () => {
    setSelectedBlocker(undefined);
    setDrawerOpen(true);
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
          <h2 className="text-2xl font-bold tracking-tight">Implementation Blockers</h2>
          <p className="text-muted-foreground">
            Track and manage blockers for this implementation project
          </p>
        </div>
        <Button onClick={handleAddBlocker}>
          <Plus className="h-4 w-4 mr-2" />
          Add Blocker
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Live">Live</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="All">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blockers Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading blockers...</p>
            </div>
          ) : filteredBlockers.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No blockers found</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter === 'Live' 
                  ? "No active blockers for this project. Great work!"
                  : searchTerm
                  ? "No blockers match your search criteria."
                  : "No blockers yet. Add the first one."}
              </p>
              {statusFilter === 'Live' && !searchTerm && (
                <Button onClick={handleAddBlocker}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Blocker
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                {filteredBlockers.map((blocker) => (
                  <TableRow
                    key={blocker.id}
                    className={getRowClassName(blocker)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{blocker.title}</p>
                        {blocker.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
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
        projectId={projectId}
        blocker={selectedBlocker}
        onSuccess={loadBlockers}
      />
    </div>
  );
}
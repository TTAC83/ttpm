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
  const [gapsEscalations, setGapsEscalations] = useState<ImplementationBlocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'Live' | 'Closed' | 'All'>('Live');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedGapEscalation, setSelectedGapEscalation] = useState<ImplementationBlocker | undefined>();

  useEffect(() => {
    loadGapsEscalations();
  }, [projectId, statusFilter]);

  const loadGapsEscalations = async () => {
    setLoading(true);
    try {
      const data = await blockersService.getProjectBlockers(projectId, statusFilter);
      setGapsEscalations(data);
    } catch (error) {
      console.error("Failed to load gaps & escalations:", error);
      toast.error("Failed to load gaps & escalations");
    } finally {
      setLoading(false);
    }
  };

  const filteredGapsEscalations = gapsEscalations.filter(gapEscalation =>
    gapEscalation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gapEscalation.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddGapEscalation = () => {
    setSelectedGapEscalation(undefined);
    setDrawerOpen(true);
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
          <h2 className="text-2xl font-bold tracking-tight">Gaps & Escalations</h2>
          <p className="text-muted-foreground">
            Track and manage gaps & escalations for this implementation project
          </p>
        </div>
        <Button onClick={handleAddGapEscalation}>
          <Plus className="h-4 w-4 mr-2" />
          Add Gap/Escalation
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

      {/* Gaps & Escalations Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading gaps & escalations...</p>
            </div>
          ) : filteredGapsEscalations.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No gaps & escalations found</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter === 'Live' 
                  ? "No active gaps & escalations for this project. Great work!"
                  : searchTerm
                  ? "No gaps & escalations match your search criteria."
                  : "No gaps & escalations yet. Add the first one."}
              </p>
              {statusFilter === 'Live' && !searchTerm && (
                <Button onClick={handleAddGapEscalation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Gap/Escalation
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
                {filteredGapsEscalations.map((gapEscalation) => (
                  <TableRow
                    key={gapEscalation.id}
                    className={getRowClassName(gapEscalation)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{gapEscalation.title}</p>
                        {gapEscalation.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
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

      <BlockerDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        projectId={projectId}
        blocker={selectedGapEscalation}
        onSuccess={() => {
          setDrawerOpen(false);
          setSelectedGapEscalation(undefined);
          loadGapsEscalations();
        }}
      />
    </div>
  );
}
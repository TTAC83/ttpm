import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, AlertCircle, Calendar } from "lucide-react";
import { BlockerDrawer } from "@/components/BlockerDrawer";
import { blockersService, ImplementationBlocker } from "@/lib/blockersService";
import { formatDateUK } from "@/lib/dateUtils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SharedBlockersTabProps {
  projectId: string;
  projectType: 'implementation' | 'solutions';
}

export function SharedBlockersTab({ projectId, projectType }: SharedBlockersTabProps) {
  const [blockers, setBlockers] = useState<ImplementationBlocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'Live' | 'Closed' | 'All'>('Live');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBlocker, setSelectedBlocker] = useState<ImplementationBlocker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBlockers();
  }, [projectId, statusFilter, projectType]);

  const loadBlockers = async () => {
    try {
      setLoading(true);
      const data = await blockersService.getProjectBlockers(projectId, statusFilter, projectType);
      setBlockers(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load escalations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBlockers = blockers.filter(blocker =>
    blocker.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blocker.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddBlocker = () => {
    setSelectedBlocker(null);
    setDrawerOpen(true);
  };

  const handleEditBlocker = (blocker: ImplementationBlocker) => {
    setSelectedBlocker(blocker);
    setDrawerOpen(true);
  };

  const getStatusBadge = (status: string) => {
    return status === 'Live' ? (
      <Badge variant="destructive">Live</Badge>
    ) : (
      <Badge variant="secondary">Closed</Badge>
    );
  };

  const getRowClassName = (blocker: ImplementationBlocker) => {
    if (blocker.is_critical) {
      return "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20";
    }
    if (blocker.is_overdue && blocker.status === 'Live') {
      return "bg-yellow-50/50 dark:bg-yellow-950/20";
    }
    return "";
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Escalations</CardTitle>
              <CardDescription>
                Track and manage implementation blockers
              </CardDescription>
            </div>
            <Button onClick={handleAddBlocker}>
              <Plus className="h-4 w-4 mr-2" />
              Add Escalation
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search escalations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Live">Live</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="All">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredBlockers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No escalations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Est. Complete</TableHead>
                  <TableHead>Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBlockers.map((blocker) => (
                  <TableRow
                    key={blocker.id}
                    className={cn("cursor-pointer", getRowClassName(blocker))}
                    onClick={() => handleEditBlocker(blocker)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{blocker.title}</p>
                          {blocker.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {blocker.description}
                            </p>
                          )}
                        </div>
                        {blocker.is_critical && (
                          <Badge variant="destructive" className="text-xs">
                            Critical
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(blocker.status)}</TableCell>
                    <TableCell>{blocker.owner_name || 'Unassigned'}</TableCell>
                    <TableCell>{formatDateUK(blocker.raised_at)}</TableCell>
                    <TableCell>
                      {blocker.estimated_complete_date ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDateUK(blocker.estimated_complete_date)}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {blocker.age_days ? `${blocker.age_days} days` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <BlockerDrawer
        blocker={selectedBlocker}
        projectId={projectId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSuccess={loadBlockers}
      />
    </div>
  );
}

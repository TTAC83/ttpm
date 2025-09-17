import { useState, useEffect } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { blockersService } from "@/lib/blockersService";
import { formatDateUK } from "@/lib/dateUtils";

interface DashboardBlocker {
  id: string;
  project_id: string;
  project_name: string;
  customer_name: string;
  title: string;
  estimated_complete_date?: string;
  age_days: number;
  is_overdue: boolean;
  status: string;
}

export function BlockersDashboardCard() {
  const [blockers, setBlockers] = useState<DashboardBlocker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardBlockers();
  }, []);

  const loadDashboardBlockers = async () => {
    try {
      const data = await blockersService.getDashboardBlockers();
      setBlockers(data);
    } catch (error) {
      console.error("Failed to load dashboard blockers:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (blocker: DashboardBlocker) => {
    if (blocker.is_overdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">Live</Badge>;
  };

  const getRowClassName = (blocker: DashboardBlocker) => {
    return blocker.is_overdue ? "bg-red-50 dark:bg-red-950/20" : "";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Escalations
        </CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/blockers">
            View All <ExternalLink className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Loading blockers...</p>
          </div>
        ) : blockers.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2 text-green-700">No Active Escalations</h3>
            <p className="text-muted-foreground">
              All implementation projects are running smoothly!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {blockers.length} most urgent escalation{blockers.length !== 1 ? 's' : ''}
              </p>
              {blockers.some(b => b.is_overdue) && (
                <Badge variant="destructive" className="text-xs">
                  {blockers.filter(b => b.is_overdue).length} Overdue
                </Badge>
              )}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Escalation</TableHead>
                    <TableHead>Est. Complete</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableCell>
                        <Link 
                          to={`/app/projects/${blocker.project_id}?tab=blockers`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {blocker.project_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium line-clamp-1">{blocker.title}</p>
                      </TableCell>
                      <TableCell>
                        {blocker.estimated_complete_date
                          ? formatDateUK(blocker.estimated_complete_date)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <span className={blocker.is_overdue ? "text-red-600 font-medium" : ""}>
                          {blocker.age_days}d
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(blocker)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
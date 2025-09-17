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
import { productGapsService, DashboardProductGap } from "@/lib/productGapsService";
import { formatDateUK } from "@/lib/dateUtils";
import { BlockerDrawer } from "@/components/BlockerDrawer";

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
  reason_code?: string;
  is_critical: boolean;
  raised_at: string;
  owner: string;
  created_by?: string;
  updated_at?: string;
  description?: string;
  closed_at?: string;
  resolution_notes?: string;
}

type DashboardItem = (DashboardBlocker & { type: 'blocker' }) | (DashboardProductGap & { type: 'product_gap', customer_name: string, is_overdue: boolean });

export function BlockersDashboardCard() {
  const [blockers, setBlockers] = useState<DashboardBlocker[]>([]);
  const [productGaps, setProductGaps] = useState<DashboardProductGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBlocker, setSelectedBlocker] = useState<DashboardBlocker | undefined>();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [blockersData, productGapsData] = await Promise.all([
        blockersService.getDashboardBlockers(),
        productGapsService.getDashboardProductGaps()
      ]);
      
      setBlockers(blockersData.sort((a, b) => {
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        return b.age_days - a.age_days;
      }) as DashboardBlocker[]);
      
      setProductGaps(productGapsData.sort((a, b) => {
        const aOverdue = a.estimated_complete_date && new Date(a.estimated_complete_date) < new Date();
        const bOverdue = b.estimated_complete_date && new Date(b.estimated_complete_date) < new Date();
        
        if (a.is_critical && !b.is_critical) return -1;
        if (!a.is_critical && b.is_critical) return 1;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return b.age_days - a.age_days;
      }));
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBlocker = (blocker: DashboardBlocker) => {
    setSelectedBlocker(blocker);
    setDrawerOpen(true);
  };


  const getProductGapStatusBadge = (gap: DashboardProductGap) => {
    const isOverdue = gap.estimated_complete_date && new Date(gap.estimated_complete_date) < new Date();
    
    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    return (
      <Badge variant={gap.is_critical ? "destructive" : "default"}>
        {gap.is_critical ? "Critical" : "Live"}
      </Badge>
    );
  };

  const getRowClassName = (isOverdue: boolean) => {
    return isOverdue ? "bg-red-50 dark:bg-red-950/20" : "";
  };

  return (
    <div className="space-y-6">
      {/* Escalations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Escalations
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{blockers.length}</span> total escalations
            {blockers.filter(b => b.is_critical).length > 0 && (
              <span className="ml-2">
                • <span className="font-medium text-red-600">{blockers.filter(b => b.is_critical).length}</span> critical
              </span>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/implementation/blockers">
              View All <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Loading escalations...</p>
            </div>
          ) : blockers.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2 text-green-700">No Active Escalations</h3>
              <p className="text-muted-foreground">
                No escalations requiring attention!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {blockers.length} escalation{blockers.length !== 1 ? 's' : ''}
                </p>
                {blockers.some(blocker => blocker.is_overdue) && (
                  <Badge variant="destructive" className="text-xs">
                    {blockers.filter(blocker => blocker.is_overdue).length} Overdue
                  </Badge>
                )}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Est. Complete</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Reason Code</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockers.map((blocker) => (
                      <TableRow
                        key={`blocker-${blocker.id}`}
                        className={`${getRowClassName(blocker.is_overdue)} cursor-pointer hover:bg-muted/50 transition-colors`}
                        onClick={() => handleEditBlocker(blocker)}
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
                        <TableCell>
                          <span className="text-sm">
                            {blocker.reason_code || "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Gaps Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Product Gaps
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/product-gaps">
              View All <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Loading product gaps...</p>
            </div>
          ) : productGaps.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2 text-green-700">No Product Gaps</h3>
              <p className="text-muted-foreground">
                No product gaps requiring attention!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {productGaps.length} product gap{productGaps.length !== 1 ? 's' : ''}
                </p>
                {productGaps.some(gap => gap.estimated_complete_date && new Date(gap.estimated_complete_date) < new Date()) && (
                  <Badge variant="destructive" className="text-xs">
                    {productGaps.filter(gap => gap.estimated_complete_date && new Date(gap.estimated_complete_date) < new Date()).length} Overdue
                  </Badge>
                )}
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Est. Complete</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productGaps.map((gap) => {
                      const isOverdue = gap.estimated_complete_date && new Date(gap.estimated_complete_date) < new Date();
                      return (
                        <TableRow
                          key={`product-gap-${gap.id}`}
                          className={getRowClassName(!!isOverdue)}
                        >
                          <TableCell className="font-medium">
                            {gap.company_name}
                          </TableCell>
                          <TableCell>
                            <Link 
                              to={`/app/projects/${gap.project_id}?tab=product-gaps`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {gap.project_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium line-clamp-1">{gap.title}</p>
                          </TableCell>
                          <TableCell>
                            {gap.estimated_complete_date
                              ? formatDateUK(gap.estimated_complete_date)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                              {gap.age_days}d
                            </span>
                          </TableCell>
                          <TableCell>{getProductGapStatusBadge(gap)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Blocker Edit Drawer */}
      {selectedBlocker && (
        <BlockerDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          projectId={selectedBlocker.project_id}
          blocker={{
            ...selectedBlocker,
            status: selectedBlocker.status as 'Live' | 'Closed',
            created_by: selectedBlocker.created_by || '',
            updated_at: selectedBlocker.updated_at || new Date().toISOString()
          }}
          onSuccess={() => {
            setDrawerOpen(false);
            setSelectedBlocker(undefined);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
}
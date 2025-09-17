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

type DashboardItem = (DashboardBlocker & { type: 'blocker' }) | (DashboardProductGap & { type: 'product_gap', customer_name: string, is_overdue: boolean });

export function BlockersDashboardCard() {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [blockersData, productGapsData] = await Promise.all([
        blockersService.getDashboardBlockers(),
        productGapsService.getDashboardProductGaps()
      ]);
      
      // Combine and transform data
      const combinedItems: DashboardItem[] = [
        ...blockersData.map(blocker => ({ ...blocker, type: 'blocker' as const })),
        ...productGapsData.map(gap => {
          const isOverdue = gap.estimated_complete_date && new Date(gap.estimated_complete_date) < new Date();
          return {
            ...gap,
            type: 'product_gap' as const,
            customer_name: gap.company_name,
            is_overdue: !!isOverdue
          };
        })
      ].sort((a, b) => {
        // Sort by critical first, then by overdue, then by age
        const aCritical = a.type === 'product_gap' ? a.is_critical : false;
        const bCritical = b.type === 'product_gap' ? b.is_critical : false;
        
        if (aCritical && !bCritical) return -1;
        if (!aCritical && bCritical) return 1;
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        return b.age_days - a.age_days;
      });
      
      setItems(combinedItems);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (item: DashboardItem) => {
    if (item.is_overdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    if (item.type === 'product_gap') {
      return (
        <Badge variant={item.is_critical ? "destructive" : "default"}>
          {item.is_critical ? "Critical Gap" : "Product Gap"}
        </Badge>
      );
    }
    
    return <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">Live</Badge>;
  };

  const getRowClassName = (item: DashboardItem) => {
    return item.is_overdue ? "bg-red-50 dark:bg-red-950/20" : "";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Escalations & Product Gaps
        </CardTitle>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/app/blockers">
              Escalations <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/product-gaps">
              Product Gaps <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Loading blockers...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2 text-green-700">No Active Items</h3>
            <p className="text-muted-foreground">
              No escalations or product gaps requiring attention!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {items.length} most urgent item{items.length !== 1 ? 's' : ''}
              </p>
              {items.some(item => item.is_overdue) && (
                <Badge variant="destructive" className="text-xs">
                  {items.filter(item => item.is_overdue).length} Overdue
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
                  {items.map((item) => (
                    <TableRow
                      key={`${item.type}-${item.id}`}
                      className={getRowClassName(item)}
                    >
                      <TableCell className="font-medium">
                        {item.customer_name}
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={`/app/projects/${item.project_id}?tab=${item.type === 'product_gap' ? 'product-gaps' : 'blockers'}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {item.project_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium line-clamp-1">{item.title}</p>
                      </TableCell>
                      <TableCell>
                        {item.estimated_complete_date
                          ? formatDateUK(item.estimated_complete_date)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <span className={item.is_overdue ? "text-red-600 font-medium" : ""}>
                          {item.age_days}d
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(item)}</TableCell>
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
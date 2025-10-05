import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchExpansionReport } from "@/lib/expansionReportService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Smile, Frown, CheckCircle, AlertCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

type SortField = 'customerName' | 'projectName' | 'projectType' | 'goLiveDate';
type SortDirection = 'asc' | 'desc';

const ExpansionReport = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('customerName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: expansionItems, isLoading } = useQuery({
    queryKey: ['expansion-report'],
    queryFn: fetchExpansionReport,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSorted = expansionItems
    ?.filter(item => 
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.projectName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const handleRowClick = (item: any) => {
    if (item.projectType === 'Implementation') {
      navigate(`/app/projects/${item.id}`);
    } else if (item.projectType === 'BAU') {
      navigate(`/app/bau/${item.id}`);
    } else if (item.projectType === 'Solutions Consulting') {
      navigate(`/app/solutions/${item.id}`);
    }
  };

  const getProjectTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      'Implementation': 'default',
      'BAU': 'secondary',
      'Solutions Consulting': 'outline'
    };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  const renderHealthIcon = (health: string | null | undefined) => {
    if (!health) return <span className="text-muted-foreground text-sm">-</span>;
    
    if (health === 'Good' || health === 'green') {
      return (
        <div className="flex items-center gap-1">
          <Smile className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-600">Healthy</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1">
          <Frown className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-600">At Risk</span>
        </div>
      );
    }
  };

  const renderProjectStatusIcon = (status: string | null | undefined) => {
    if (!status) return <span className="text-muted-foreground text-sm">-</span>;
    
    if (status === 'on_track') {
      return (
        <div className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-600">On Track</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-600">Off Track</span>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expansion Report</h1>
        <p className="text-muted-foreground">
          All customers and projects with expansion opportunities
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expansion Opportunities</CardTitle>
          <CardDescription>
            Click on any row to view project/customer details
          </CardDescription>
          <div className="mt-4">
            <Input
              placeholder="Search by customer or project name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('customerName')}
                      className="flex items-center gap-2"
                    >
                      Customer Name
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('projectName')}
                      className="flex items-center gap-2"
                    >
                      Project/Site Name
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('projectType')}
                      className="flex items-center gap-2"
                    >
                      Type
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('goLiveDate')}
                      className="flex items-center gap-2"
                    >
                      Go Live Date
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Project Status</TableHead>
                  <TableHead className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    Expansion
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted && filteredAndSorted.length > 0 ? (
                  filteredAndSorted.map((item) => (
                    <TableRow
                      key={`${item.projectType}-${item.id}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(item)}
                    >
                      <TableCell className="font-medium">{item.customerName}</TableCell>
                      <TableCell>{item.projectName}</TableCell>
                      <TableCell>{getProjectTypeBadge(item.projectType)}</TableCell>
                      <TableCell>
                        {item.goLiveDate ? new Date(item.goLiveDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {renderHealthIcon(item.health)}
                      </TableCell>
                      <TableCell>
                        {renderProjectStatusIcon(item.projectStatus)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="text-sm">{item.expansionOpportunity}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No expansion opportunities found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpansionReport;

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchExecutiveSummaryData } from "@/lib/executiveSummaryService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Smile, Frown, Bug, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function BoardSummary() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: summaryData = [], isLoading } = useQuery({
    queryKey: ['executive-summary'],
    queryFn: fetchExecutiveSummaryData,
  });

  // Filter data based on search
  const filteredData = summaryData.filter(row => 
    row.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    row.project_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort data
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;

    let aVal: any = a[sortColumn as keyof typeof a];
    let bVal: any = b[sortColumn as keyof typeof b];

    // Handle null values
    if (aVal === null) return 1;
    if (bVal === null) return -1;

    // String comparison
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleRowClick = (projectId: string) => {
    navigate(`/app/projects/${projectId}`);
  };

  const renderHealthIcon = (health: 'green' | 'red' | null) => {
    if (health === 'green') {
      return <Smile className="h-6 w-6 text-green-600" />;
    }
    if (health === 'red') {
      return <Frown className="h-6 w-6 text-red-600" />;
    }
    return null;
  };

  const renderOnTrackIcon = (status: 'on_track' | 'off_track' | null) => {
    if (status === 'on_track') {
      return <TrendingUp className="h-6 w-6 text-green-600" />;
    }
    if (status === 'off_track') {
      return <TrendingDown className="h-6 w-6 text-red-600" />;
    }
    return null;
  };

  const renderProductGapsIcon = (status: 'none' | 'non_critical' | 'critical') => {
    if (status === 'none') return null;
    if (status === 'critical') {
      return <Bug className="h-6 w-6 text-red-600" />;
    }
    return <Bug className="h-6 w-6 text-green-600" />;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading board summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Board Summary</h1>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search by customer or project..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('customer_name')}
              >
                Customer Name {sortColumn === 'customer_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('project_name')}
              >
                Project {sortColumn === 'project_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="text-center">Customer Health</TableHead>
              <TableHead className="text-center">Project On Track</TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('product_gaps_status')}
              >
                Product Gaps {sortColumn === 'product_gaps_status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('segment')}
              >
                Segment {sortColumn === 'segment' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('expansion_opportunity')}
              >
                Expansion {sortColumn === 'expansion_opportunity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('reference_status')}
              >
                Reference {sortColumn === 'reference_status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('planned_go_live_date')}
              >
                Planned Go Live {sortColumn === 'planned_go_live_date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('current_status')}
              >
                Current Status {sortColumn === 'current_status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No implementation projects found.
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row) => (
                <TableRow
                  key={row.project_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(row.project_id)}
                >
                  <TableCell className="font-medium">{row.customer_name}</TableCell>
                  <TableCell>{row.project_name}</TableCell>
                  <TableCell className="text-center">
                    {renderHealthIcon(row.customer_health)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderOnTrackIcon(row.project_on_track)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderProductGapsIcon(row.product_gaps_status)}
                  </TableCell>
                  <TableCell>{row.segment || '-'}</TableCell>
                  <TableCell>{row.expansion_opportunity || '-'}</TableCell>
                  <TableCell className="text-center">
                    {row.reference_status || '-'}
                  </TableCell>
                  <TableCell>
                    {row.planned_go_live_date ? format(new Date(row.planned_go_live_date), 'dd MMM yyyy') : ''}
                  </TableCell>
                  <TableCell>
                    {row.current_status || ''}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Filter, FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { 
  FeatureRequestWithProfile, 
  FeatureRequestStatus, 
  FeatureRequestFilters,
  featureRequestsService 
} from "@/lib/featureRequestsService";
import { FeatureRequestDialog } from "@/components/FeatureRequestDialog";

export default function FeatureRequests() {
  const [featureRequests, setFeatureRequests] = useState<FeatureRequestWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequestWithProfile | null>(null);
  const [filters, setFilters] = useState<FeatureRequestFilters>({
    search: '',
    statuses: [],
    mineOnly: false,
    page: 0,
    pageSize: 20
  });
  const [sortColumn, setSortColumn] = useState<string>('product_gaps_critical');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const statusOptions: FeatureRequestStatus[] = ['Requested', 'Rejected', 'In Design', 'In Dev', 'Complete'];

  const loadFeatureRequests = async () => {
    setIsLoading(true);
    try {
      const data = await featureRequestsService.getFeatureRequests(filters);
      setFeatureRequests(data);
    } catch (error) {
      console.error('Error loading feature requests:', error);
      toast.error("Failed to load feature requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeatureRequests();
  }, [filters]);

  const handleNewRequest = () => {
    setSelectedRequest(null);
    setDialogOpen(true);
  };

  const handleEditRequest = (request: FeatureRequestWithProfile) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    loadFeatureRequests();
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, page: 0 }));
  };

  const handleStatusFilter = (selectedStatuses: string[]) => {
    setFilters(prev => ({ 
      ...prev, 
      statuses: selectedStatuses as FeatureRequestStatus[], 
      page: 0 
    }));
  };

  const handleMineOnlyChange = (checked: boolean) => {
    setFilters(prev => ({ ...prev, mineOnly: checked, page: 0 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      statuses: [],
      mineOnly: false,
      page: 0,
      pageSize: 20
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedRequests = [...featureRequests].sort((a, b) => {
    let aVal: any = a[sortColumn as keyof FeatureRequestWithProfile];
    let bVal: any = b[sortColumn as keyof FeatureRequestWithProfile];

    // Handle null/undefined values
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    // Handle dates
    if (sortColumn === 'complete_date' && aVal && bVal) {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    // Handle strings
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(16);
    doc.text('Feature Requests', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Exported: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 22);
    
    const headers = ['Title', 'Status', 'Product Gaps', 'Release Date'];
    
    const data = sortedRequests.map(request => [
      request.title,
      request.status,
      request.product_gaps_total 
        ? `${request.product_gaps_total} total${request.product_gaps_critical ? `, ${request.product_gaps_critical} critical` : ''}`
        : '-',
      request.complete_date ? format(new Date(request.complete_date), 'dd MMM yyyy') : '-'
    ]);
    
    let y = 30;
    const lineHeight = 7;
    const colWidths = [80, 30, 40, 30];
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    let x = 14;
    headers.forEach((header, i) => {
      doc.text(header, x, y);
      x += colWidths[i];
    });
    
    y += lineHeight;
    doc.setFont(undefined, 'normal');
    
    data.forEach((row) => {
      x = 14;
      row.forEach((cell, i) => {
        const text = String(cell || '');
        doc.text(text.substring(0, 40), x, y);
        x += colWidths[i];
      });
      y += lineHeight;
      
      if (y > 190) {
        doc.addPage();
        y = 15;
      }
    });
    
    doc.save(`feature-requests-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    const data = sortedRequests.map(request => ({
      'Title': request.title,
      'Status': request.status,
      'Product Gaps Total': request.product_gaps_total || 0,
      'Product Gaps Critical': request.product_gaps_critical || 0,
      'Release Date': request.complete_date ? format(new Date(request.complete_date), 'dd MMM yyyy') : ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Feature Requests');
    
    const colWidths = [
      { wch: 50 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 }
    ];
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, `feature-requests-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Requests</h1>
          <p className="text-muted-foreground">
            Suggest new features and improvements for the platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button onClick={handleNewRequest}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search title, problem statement, or user story..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.statuses?.length ? filters.statuses.join(',') : 'all'}
                onValueChange={(value) => handleStatusFilter(value === 'all' ? [] : value.split(','))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="mine-only"
                checked={filters.mineOnly}
                onCheckedChange={handleMineOnlyChange}
              />
              <Label htmlFor="mine-only">Show only my requests</Label>
            </div>
            
            {(filters.search || filters.statuses?.length || filters.mineOnly) && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading feature requests...</p>
            </div>
          ) : featureRequests.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.statuses?.length || filters.mineOnly
                  ? "No feature requests match your filters."
                  : "No feature requests yet — create the first one."}
              </p>
              {!filters.search && !filters.statuses?.length && !filters.mineOnly && (
                <Button onClick={handleNewRequest}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Request
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('title')}
                  >
                    Title {sortColumn === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('status')}
                  >
                    Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('product_gaps_critical')}
                  >
                    Product Gaps {sortColumn === 'product_gaps_critical' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('complete_date')}
                  >
                    Release Date {sortColumn === 'complete_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEditRequest(request)}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold">{request.title}</p>
                        {request.problem_statement && (
                          <p className="text-sm text-muted-foreground truncate max-w-md">
                            {request.problem_statement}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={featureRequestsService.getStatusBadgeVariant(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.product_gaps_total ? (
                        <div className="flex gap-2 items-center">
                          <Badge variant="outline">
                            {request.product_gaps_total} total
                          </Badge>
                          {request.product_gaps_critical ? (
                            <Badge variant="destructive">
                              {request.product_gaps_critical} critical
                            </Badge>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.complete_date ? (
                        <span className="text-sm">
                          {new Date(request.complete_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FeatureRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        featureRequest={selectedRequest}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
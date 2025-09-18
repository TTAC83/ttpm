import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Filter,
  SortAsc,
  SortDesc,
  Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { featureDashboardService, type FeatureRequestDashboardItem, type DashboardStats } from "@/lib/featureDashboardService";
import { format } from "date-fns";

const PRIORITY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

export default function FeatureDashboard() {
  const [featureRequests, setFeatureRequests] = useState<FeatureRequestDashboardItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'customers'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequestDashboardItem | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [requests, stats] = await Promise.all([
        featureDashboardService.getFeatureRequestsDashboard(),
        featureDashboardService.getDashboardStats()
      ]);
      setFeatureRequests(requests);
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedRequests = featureRequests
    .filter(request => {
      const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.problem_statement?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'priority':
          comparison = a.priority_score - b.priority_score;
          break;
        case 'date':
          const dateA = a.required_date ? new Date(a.required_date).getTime() : 0;
          const dateB = b.required_date ? new Date(b.required_date).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'customers':
          comparison = a.affected_customers - b.affected_customers;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Chart data preparation
  const statusData = featureRequests.reduce((acc, request) => {
    acc[request.status] = (acc[request.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(statusData).map(([status, count]) => ({
    status,
    count,
    fill: status === 'Complete' ? '#22c55e' : 
          status === 'In Dev' ? '#3b82f6' :
          status === 'In Design' ? '#f59e0b' :
          status === 'Requested' ? '#6b7280' : '#ef4444'
  }));

  const priorityDistribution = featureRequests.reduce((acc, request) => {
    const bucket = request.priority_score >= 20 ? 'Critical' :
                   request.priority_score >= 10 ? 'High' :
                   request.priority_score >= 5 ? 'Medium' : 'Low';
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityChartData = Object.entries(priorityDistribution).map(([priority, count], index) => ({
    priority,
    count,
    fill: PRIORITY_COLORS[index % PRIORITY_COLORS.length]
  }));

  const handleRowClick = (request: FeatureRequestDashboardItem) => {
    setSelectedRequest(request);
  };

  const handleNavigateToProductGap = (projectId: string) => {
    navigate(`/app/projects/${projectId}`);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    return format(new Date(dateStr), 'MMM dd, yyyy');
  };

  const getCompletionIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'on_time': return <Clock className="h-4 w-4 text-blue-600" />;
      default: return <Calendar className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Dashboard</h1>
          <p className="text-muted-foreground">
            Prioritize and track feature requests based on customer impact and product gaps
          </p>
        </div>
        <Button onClick={() => navigate('/app/feature-requests')}>
          View All Requests
        </Button>
      </div>

      {/* Stats Cards */}
      {dashboardStats && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.total_requests}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{dashboardStats.in_progress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{dashboardStats.overdue}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed (Q)</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{dashboardStats.completed_this_quarter}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Gaps</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{dashboardStats.critical_gaps_count}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers Affected</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{dashboardStats.customers_affected}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ 
              count: { label: "Count", color: "hsl(var(--chart-1))" } 
            }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{
              count: { label: "Count", color: "hsl(var(--chart-2))" }
            }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priorityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Feature Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search feature requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Requested">Requested</SelectItem>
                <SelectItem value="In Design">In Design</SelectItem>
                <SelectItem value="In Dev">In Development</SelectItem>
                <SelectItem value="Complete">Complete</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority Score</SelectItem>
                <SelectItem value="date">Due Date</SelectItem>
                <SelectItem value="customers">Customer Count</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>

          {/* Feature Requests Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority Score</TableHead>
                  <TableHead>Product Gaps</TableHead>
                  <TableHead>Customers</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedRequests.map((request) => (
                  <TableRow 
                    key={request.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(request)}
                  >
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>
                      <Badge variant={featureDashboardService.getStatusBadgeVariant(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${featureDashboardService.getPriorityColor(request.priority_score)}`}>
                        {request.priority_score}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{request.total_product_gaps}</span>
                        {request.critical_product_gaps > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {request.critical_product_gaps} critical
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{request.affected_customers}</TableCell>
                    <TableCell>{formatDate(request.required_date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCompletionIcon(request.completion_status)}
                        {request.days_overdue && (
                          <span className="text-xs text-red-600">
                            {request.days_overdue}d overdue
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6">
                {/* Overview */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                    <Badge variant={featureDashboardService.getStatusBadgeVariant(selectedRequest.status)}>
                      {selectedRequest.status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Priority Score</h4>
                    <span className={`text-lg font-bold ${featureDashboardService.getPriorityColor(selectedRequest.priority_score)}`}>
                      {selectedRequest.priority_score}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Due Date</h4>
                    <p>{formatDate(selectedRequest.required_date)}</p>
                  </div>
                </div>

                <Separator />

                {/* Problem Statement */}
                {selectedRequest.problem_statement && (
                  <div>
                    <h4 className="font-medium mb-2">Problem Statement</h4>
                    <p className="text-muted-foreground">{selectedRequest.problem_statement}</p>
                  </div>
                )}

                {/* Customer Impact */}
                <div>
                  <h4 className="font-medium mb-3">Customer Impact</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{selectedRequest.total_product_gaps}</div>
                        <p className="text-xs text-muted-foreground">Total Product Gaps</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-red-600">{selectedRequest.critical_product_gaps}</div>
                        <p className="text-xs text-muted-foreground">Critical Gaps</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{selectedRequest.affected_customers}</div>
                        <p className="text-xs text-muted-foreground">Customers Affected</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Customer Details */}
                  {selectedRequest.customer_details.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Affected Customers & Product Gaps</h5>
                      <div className="space-y-2">
                        {selectedRequest.customer_details.map((detail) => (
                          <div key={detail.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{detail.customer_name}</div>
                              <div className="text-sm text-muted-foreground">{detail.project_name}</div>
                              <div className="text-sm">{detail.title}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {detail.is_critical && (
                                <Badge variant="destructive" className="text-xs">Critical</Badge>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleNavigateToProductGap(detail.project_id)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
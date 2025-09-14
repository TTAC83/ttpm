import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { getBauCustomers, BAUCustomer } from '@/lib/bauService';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export const BAU = () => {
  const [customers, setCustomers] = useState<BAUCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const pageSize = 20;

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, count } = await getBauCustomers(page, pageSize, search);
      setCustomers(data);
      setTotalCount(count);
    } catch (error) {
      console.error('Error loading BAU customers:', error);
      toast({
        title: "Error",
        description: "Failed to load BAU customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, search]);

  const getHealthColor = (health: BAUCustomer['health']) => {
    switch (health) {
      case 'Excellent': return 'bg-green-500';
      case 'Good': return 'bg-blue-500';
      case 'Watch': return 'bg-yellow-500';
      case 'AtRisk': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">BAU Customers</h1>
        <Button onClick={() => navigate('/app/bau/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New BAU Customer
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers, sites, or companies..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>BAU Customers ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Devices</TableHead>
                  <TableHead>Open Tickets</TableHead>
                  <TableHead>Go Live</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow 
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/app/bau/${customer.id}`)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        {customer.site_name && (
                          <div className="text-sm text-muted-foreground">{customer.site_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{customer.company_name}</TableCell>
                    <TableCell>
                      <Badge className={`${getHealthColor(customer.health)} text-white`}>
                        {customer.health}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.subscription_plan || '-'}</TableCell>
                    <TableCell>{customer.devices_deployed || '-'}</TableCell>
                    <TableCell>
                      {customer.open_tickets > 0 ? (
                        <Badge variant="destructive">{customer.open_tickets}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.go_live_date 
                        ? format(new Date(customer.go_live_date), 'MMM d, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {customers.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No BAU customers found.</p>
            </div>
          )}

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} customers
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page * pageSize >= totalCount}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
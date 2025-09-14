import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, Users, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getBauCustomer, updateBauHealth, BAUCustomer } from '@/lib/bauService';
import { BAUOverviewTab } from './bau/tabs/BAUOverviewTab';
import { BAUTicketsTab } from './bau/tabs/BAUTicketsTab';
import { BAUVisitsTab } from './bau/tabs/BAUVisitsTab';
import { BAUChangesTab } from './bau/tabs/BAUChangesTab';
import { BAUContactsTab } from './bau/tabs/BAUContactsTab';
import { BAUExpensesTab } from './bau/tabs/BAUExpensesTab';
import { BAUAuditTab } from './bau/tabs/BAUAuditTab';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export const BAUDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<BAUCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const isInternal = user?.user_metadata?.is_internal || false;

  const loadCustomer = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await getBauCustomer(id);
      setCustomer(data);
    } catch (error) {
      console.error('Error loading BAU customer:', error);
      toast({
        title: "Error",
        description: "Failed to load BAU customer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const handleHealthChange = async (newHealth: BAUCustomer['health']) => {
    if (!customer || !isInternal) return;

    try {
      await updateBauHealth(customer.id, newHealth);
      setCustomer(prev => prev ? { ...prev, health: newHealth } : null);
      toast({
        title: "Success",
        description: "Health status updated",
      });
    } catch (error) {
      console.error('Error updating health:', error);
      toast({
        title: "Error",
        description: "Failed to update health status",
        variant: "destructive",
      });
    }
  };

  const getHealthColor = (health: BAUCustomer['health']) => {
    switch (health) {
      case 'Excellent': return 'bg-green-500';
      case 'Good': return 'bg-blue-500';
      case 'Watch': return 'bg-yellow-500';
      case 'AtRisk': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-semibold mb-2">BAU Customer Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The BAU customer you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/app/bau')}>
              Back to BAU
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/app/bau')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to BAU
        </Button>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">{customer.name}</h1>
              {customer.site_name && (
                <p className="text-muted-foreground">{customer.site_name}</p>
              )}
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Building2 className="h-4 w-4" />
                  <span>{customer.companies?.name}</span>
                </div>
                {customer.go_live_date && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Go Live: {format(new Date(customer.go_live_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Health Status</div>
                {isInternal ? (
                  <Select value={customer.health} onValueChange={handleHealthChange}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Watch">Watch</SelectItem>
                      <SelectItem value="AtRisk">At Risk</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`${getHealthColor(customer.health)} text-white`}>
                    {customer.health}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="changes">Changes</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <BAUOverviewTab customer={customer} />
        </TabsContent>

        <TabsContent value="tickets">
          <BAUTicketsTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="visits">
          <BAUVisitsTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="changes">
          <BAUChangesTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="contacts">
          <BAUContactsTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="expenses">
          <BAUExpensesTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="audit">
          <BAUAuditTab customerId={customer.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
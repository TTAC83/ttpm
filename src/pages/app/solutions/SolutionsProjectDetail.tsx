import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Building, Calendar, MapPin, Factory } from 'lucide-react';
import { HardwareQuantityInput } from '@/components/HardwareQuantityInput';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SolutionsLines } from './tabs/SolutionsLines';

interface SolutionsProject {
  id: string;
  company_name: string;
  domain: string;
  site_name: string;
  site_address?: string;
  salesperson?: string;
  solutions_consultant?: string;
  customer_lead?: string;
  servers_required?: number;
  gateways_required?: number;
  tv_display_devices_required?: number;
  receivers_required?: number;
  lines_required?: number;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
}

export const SolutionsProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [project, setProject] = useState<SolutionsProject | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [factoryData, setFactoryData] = useState({
    servers_required: 0,
    gateways_required: 0,
    tv_display_devices_required: 0,
    receivers_required: 0,
    lines_required: 0,
  });

  const fetchProject = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('solutions_projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
      
      // Set factory data from project
      if (data) {
        setFactoryData({
          servers_required: data.servers_required || 0,
          gateways_required: data.gateways_required || 0,
          tv_display_devices_required: data.tv_display_devices_required || 0,
          receivers_required: data.receivers_required || 0,
          lines_required: data.lines_required || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching solutions project:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch solutions project',
        variant: 'destructive',
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_all_users_with_profiles');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProject(), fetchUsers()]);
      setLoading(false);
    };

    loadData();
  }, [id]);

  useEffect(() => {
    // Handle URL parameters to set active tab
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'factory', 'lines'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    return user?.name || user?.email || 'Unknown User';
  };

  const getDomainBadgeVariant = (domain: string) => {
    switch (domain) {
      case 'Vision':
        return 'default';
      case 'IoT':
        return 'secondary';
      case 'Hybrid':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleFactoryUpdate = async (field: string, value: number) => {
    if (!project) return;

    try {
      const { error } = await supabase
        .from('solutions_projects')
        .update({ [field]: value })
        .eq('id', project.id);

      if (error) throw error;

      setFactoryData(prev => ({ ...prev, [field]: value }));
      toast({
        title: 'Success',
        description: 'Factory requirement updated successfully',
      });
    } catch (error) {
      console.error('Error updating factory requirement:', error);
      toast({
        title: 'Error',
        description: 'Failed to update factory requirement',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Solutions project not found</p>
        <Button onClick={() => navigate('/app/solutions')} className="mt-4">
          Back to Solutions
        </Button>
      </div>
    );
  }

  const SolutionsOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Company Name</label>
            <p className="font-medium">{project.company_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Domain</label>
            <div className="flex items-center gap-2">
              <Badge variant={getDomainBadgeVariant(project.domain)}>
                {project.domain}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Site Name</label>
            <p className="font-medium">{project.site_name}</p>
          </div>
          {project.site_address && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Site Address</label>
              <p className="font-medium">{project.site_address}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Created</label>
            <p className="font-medium">{new Date(project.created_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Salesperson</label>
            <p className="font-medium">
              {project.salesperson ? getUserName(project.salesperson) : 'Not assigned'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Solutions Consultant</label>
            <p className="font-medium">
              {project.solutions_consultant ? getUserName(project.solutions_consultant) : 'Not assigned'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Customer Lead</label>
            <p className="font-medium">
              {project.customer_lead ? getUserName(project.customer_lead) : 'Not assigned'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const FactoryRequirements = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="h-5 w-5" />
          Factory Requirements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HardwareQuantityInput
            label="Servers Required"
            value={factoryData.servers_required}
            onChange={(value) => handleFactoryUpdate('servers_required', value)}
            tableName="servers_master"
            id="servers"
          />
          
          <HardwareQuantityInput
            label="Gateways Required"
            value={factoryData.gateways_required}
            onChange={(value) => handleFactoryUpdate('gateways_required', value)}
            tableName="gateways_master"
            id="gateways"
          />
          
          <HardwareQuantityInput
            label="TV Display Devices Required"
            value={factoryData.tv_display_devices_required}
            onChange={(value) => handleFactoryUpdate('tv_display_devices_required', value)}
            tableName="tv_displays_master"
            id="tvdisplays"
          />
          
          <HardwareQuantityInput
            label="Receivers Required"
            value={factoryData.receivers_required}
            onChange={(value) => handleFactoryUpdate('receivers_required', value)}
            tableName="receivers_master"
            id="receivers"
          />
          
          <div className="space-y-2">
            <Label htmlFor="lines">Lines Required</Label>
            <Input
              id="lines"
              type="number"
              min="0"
              value={factoryData.lines_required}
              onChange={(e) => handleFactoryUpdate('lines_required', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/solutions')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Solutions
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.company_name}</h1>
              <Badge variant={getDomainBadgeVariant(project.domain)}>
                {project.domain}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" />
              Solutions Project
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Site</p>
                  <p className="text-sm text-muted-foreground">{project.site_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Domain</p>
                  <p className="text-sm text-muted-foreground">{project.domain}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="factory">Factory</TabsTrigger>
          <TabsTrigger value="lines">Lines</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <SolutionsOverview />
        </TabsContent>

        <TabsContent value="factory" className="space-y-4">
          <FactoryRequirements />
        </TabsContent>

        <TabsContent value="lines" className="space-y-4">
          <SolutionsLines solutionsProjectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
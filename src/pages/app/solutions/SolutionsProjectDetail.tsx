import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SolutionsLines } from './tabs/SolutionsLines';
import { OverviewTab } from '@/components/shared/OverviewTab';
import { ContractInformationTab } from '@/components/shared/ContractInformationTab';
import { TeamTab } from '@/components/shared/TeamTab';
import { AccountInfoTab } from '@/components/shared/AccountInfoTab';
import { FactoryConfigurationTab } from '@/components/shared/FactoryConfigurationTab';
import { ProjectHardware } from '../projects/tabs/ProjectHardware';
import ProjectGantt from '../projects/tabs/ProjectGantt';
import ProjectTasks from '../projects/tabs/ProjectTasks';

interface SolutionsProject {
  id: string;
  company_id: string;
  domain: string;
  site_name: string;
  site_address?: string;
  salesperson?: string;
  solutions_consultant?: string;
  customer_lead?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_job_title?: string;
  servers_required?: number;
  gateways_required?: number;
  tv_display_devices_required?: number;
  receivers_required?: number;
  lines_required?: number;
  created_at: string;
  updated_at: string;
  companies?: {
    name: string;
  };
}

export const SolutionsProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [project, setProject] = useState<SolutionsProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchProject = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('solutions_projects')
        .select('*, companies(name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching solutions project:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch solutions project',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchProject();
      setLoading(false);
    };

    loadData();
  }, [id]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'contract', 'team', 'account', 'hardware', 'factory', 'lines', 'wbs'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/app/solutions')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{project.companies?.name || 'N/A'}</h1>
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

          <div className="grid gap-4 md:grid-cols-3 mt-6">
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-8 lg:w-auto">
          <TabsTrigger value="overview">Customer Overview</TabsTrigger>
          <TabsTrigger value="contract">Contract Info</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="account">Account Info</TabsTrigger>
          <TabsTrigger value="hardware">Hardware</TabsTrigger>
          <TabsTrigger value="factory">Factory</TabsTrigger>
          <TabsTrigger value="lines">Lines</TabsTrigger>
          <TabsTrigger value="wbs">WBS</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab data={project} onUpdate={fetchProject} type="solutions" />
        </TabsContent>

        <TabsContent value="contract" className="space-y-4">
          <ContractInformationTab data={project} onUpdate={fetchProject} type="solutions" />
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <TeamTab data={project} onUpdate={fetchProject} type="solutions" />
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <AccountInfoTab data={project} onUpdate={fetchProject} type="solutions" />
        </TabsContent>

        <TabsContent value="hardware" className="space-y-4">
          <ProjectHardware projectId={project.id} type="solutions" />
        </TabsContent>

        <TabsContent value="factory" className="space-y-4">
          <FactoryConfigurationTab projectId={project.id} type="solutions" projectDomain={project.domain} onUpdate={fetchProject} />
        </TabsContent>

        <TabsContent value="lines" className="space-y-4">
          <SolutionsLines solutionsProjectId={project.id} />
        </TabsContent>

        <TabsContent value="wbs" className="space-y-4">
          <ProjectGantt solutionsProjectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

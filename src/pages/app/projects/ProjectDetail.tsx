import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { ArrowLeft, Building, Calendar, MapPin, Users, Smile, Frown, CheckCircle, AlertCircle, TrendingDown, TrendingUp, Minus, MessageSquareQuote, Phone, Eye, FileText } from 'lucide-react';

// Tab components
import ProjectOverview from './tabs/ProjectOverview';
import { ProjectLines } from './tabs/ProjectLines';
import ProjectTasks from './tabs/ProjectTasks';
import ProjectGantt from './tabs/ProjectGantt';
import ProjectActions from './tabs/ProjectActions';
import ProjectAudit from './tabs/ProjectAudit';
import ProjectCalendar from './tabs/ProjectCalendar';
import ProjectVisionModels from './tabs/ProjectVisionModels';
import { ProjectBlockers } from './tabs/ProjectBlockers';
import { ProjectProductGaps } from './tabs/ProjectProductGaps';
import WBS from '../implementation/WBS';

interface Project {
  id: string;
  name: string;
  site_name: string | null;
  site_address: string | null;
  domain: string;
  contract_signed_date: string;
  created_at: string;
  customer_project_lead: string | null;
  implementation_lead: string | null;
  ai_iot_engineer: string | null;
  technical_project_lead: string | null;
  project_coordinator: string | null;
  line_description: string | null;
  product_description: string | null;
  company_id: string;
  testimonial: boolean;
  reference_call: boolean;
  site_visit: boolean;
  case_study: boolean;
  companies: {
    name: string;
  } | null;
}

export const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Get current week for health status
  const { data: currentWeek } = useQuery({
    queryKey: ['current-week'],
    queryFn: async () => {
      const { data: weeksData } = await supabase
        .from('impl_weekly_weeks')
        .select('week_start, week_end')
        .order('week_start', { ascending: false });
      
      if (weeksData && weeksData.length >= 2) {
        return weeksData[1].week_start; // Current week (second from top)
      } else if (weeksData && weeksData.length > 0) {
        return weeksData[0].week_start; // Fallback to first available week
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Get health status for this project's company
  const { data: healthStatus } = useQuery({
    queryKey: ['project-health', project?.company_id, currentWeek],
    queryFn: async () => {
      if (!project?.company_id || !currentWeek) return null;
      
      const { data, error } = await supabase
        .from('impl_weekly_reviews')
        .select('customer_health, project_status, churn_risk')
        .eq('company_id', project.company_id)
        .eq('week_start', currentWeek)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching health status:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!project?.company_id && !!currentWeek,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  useEffect(() => {
    // Handle URL parameters to set active tab
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'lines', 'tasks', 'gantt', 'actions', 'calendar', 'vision-models', 'audit', 'blockers'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchProject = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          companies (
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch project details",
        variant: "destructive",
      });
      navigate('/app/projects');
    } finally {
      setLoading(false);
    }
  };

  const getDomainBadgeVariant = (domain: string) => {
    switch (domain) {
      case 'IoT': return 'default';
      case 'Vision': return 'secondary';
      case 'Hybrid': return 'outline';
      default: return 'outline';
    }
  };

  const handleHealthIconClick = () => {
    if (project?.company_id) {
      navigate('/app/implementation/weekly-review');
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
        <p className="text-muted-foreground">Project not found</p>
        <Button onClick={() => navigate('/app/projects')} className="mt-4">
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/projects')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge variant={getDomainBadgeVariant(project.domain)}>
                {project.domain}
              </Badge>
              {/* Health Status Icons */}
              <div className="flex items-center gap-2">
                {healthStatus?.customer_health === "green" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHealthIconClick}
                    className="h-8 w-8 p-0 hover:bg-green-100"
                    title="Customer Health: Green - Click to view weekly review"
                  >
                    <Smile className="h-5 w-5 text-green-600" />
                  </Button>
                )}
                {healthStatus?.customer_health === "red" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHealthIconClick}
                    className="h-8 w-8 p-0 hover:bg-red-100"
                    title="Customer Health: Red - Click to view weekly review"
                  >
                    <Frown className="h-5 w-5 text-red-600" />
                  </Button>
                )}
                {healthStatus?.project_status === "on_track" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHealthIconClick}
                    className="h-8 w-8 p-0 hover:bg-green-100"
                    title="Project Status: On Track - Click to view weekly review"
                  >
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </Button>
                )}
                {healthStatus?.project_status === "off_track" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHealthIconClick}
                    className="h-8 w-8 p-0 hover:bg-red-100"
                    title="Project Status: Off Track - Click to view weekly review"
                  >
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </Button>
                )}
                {healthStatus?.churn_risk === "Certain" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHealthIconClick}
                    className="h-8 w-8 p-0 hover:bg-red-100"
                    title="Churn Risk: Certain - Click to view weekly review"
                  >
                    <TrendingDown className="h-5 w-5 text-red-700" />
                  </Button>
                )}
                {healthStatus?.churn_risk === "High" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHealthIconClick}
                    className="h-8 w-8 p-0 hover:bg-red-100"
                    title="Churn Risk: High - Click to view weekly review"
                  >
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </Button>
                )}
                {healthStatus?.churn_risk === "Medium" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHealthIconClick}
                    className="h-8 w-8 p-0 hover:bg-yellow-100"
                    title="Churn Risk: Medium - Click to view weekly review"
                  >
                    <TrendingUp className="h-5 w-5 text-yellow-600" />
                  </Button>
                )}
                {healthStatus?.churn_risk === "Low" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHealthIconClick}
                    className="h-8 w-8 p-0 hover:bg-green-100"
                    title="Churn Risk: Low - Click to view weekly review"
                  >
                    <Minus className="h-5 w-5 text-green-600" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" />
              {project.companies?.name}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {project.site_name && (
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
          )}
          
          {project.site_address && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Site Address</p>
                    <p className="text-sm text-muted-foreground">{project.site_address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Testimonial</p>
                  <p className="text-sm text-muted-foreground">
                    {project.testimonial ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Reference Call</p>
                  <p className="text-sm text-muted-foreground">
                    {project.reference_call ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Site Visit</p>
                  <p className="text-sm text-muted-foreground">
                    {project.site_visit ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Case Study</p>
                  <p className="text-sm text-muted-foreground">
                    {project.case_study ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Contract Signed</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateUK(project.contract_signed_date)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateUK(project.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="space-y-2">
          {/* First row of tabs */}
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="lines">Lines</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="gantt">Gantt</TabsTrigger>
            <TabsTrigger value="wbs">WBS</TabsTrigger>
          </TabsList>
          
          {/* Second row of tabs */}
          <TabsList
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${3 + (profile?.is_internal ? (2 + (['IoT', 'Vision', 'Hybrid'].includes(project.domain) ? 1 : 0)) : 0)}, minmax(0, 1fr))`,
            }}
          >
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="vision-models">Vision Models</TabsTrigger>
            {profile?.is_internal && (
              <TabsTrigger value="audit">Audit</TabsTrigger>
            )}
            {profile?.is_internal && (
              <TabsTrigger value="product-gaps">Product Gaps</TabsTrigger>
            )}
            {profile?.is_internal && ['IoT', 'Vision', 'Hybrid'].includes(project.domain) && (
              <TabsTrigger value="blockers">Escalations</TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <ProjectOverview project={project} onUpdate={fetchProject} />
        </TabsContent>

        <TabsContent value="lines" className="space-y-4">
          <ProjectLines projectId={project.id} />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <ProjectTasks projectId={project.id} />
        </TabsContent>

        <TabsContent value="gantt" className="space-y-4">
          <ProjectGantt projectId={project.id} />
        </TabsContent>

        <TabsContent value="wbs" className="space-y-4">
          <WBS projectId={project.id} />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <ProjectActions projectId={project.id} />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <ProjectCalendar projectId={project.id} />
        </TabsContent>

        <TabsContent value="vision-models" className="space-y-4">
          <ProjectVisionModels projectId={project.id} />
        </TabsContent>

        {profile?.is_internal && (
          <TabsContent value="audit" className="space-y-4">
            <ProjectAudit projectId={project.id} />
          </TabsContent>
        )}

        {profile?.is_internal && ['IoT', 'Vision', 'Hybrid'].includes(project.domain) && (
          <TabsContent value="blockers" className="space-y-4">
            <ProjectBlockers projectId={project.id} />
          </TabsContent>
        )}

        {profile?.is_internal && (
          <TabsContent value="product-gaps" className="space-y-4">
            <ProjectProductGaps projectId={project.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ProjectDetail;
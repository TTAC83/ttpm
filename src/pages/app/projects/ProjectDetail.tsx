import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { ArrowLeft, Building, Calendar, MapPin, Users } from 'lucide-react';

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
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${profile?.is_internal && ['IoT', 'Vision', 'Hybrid'].includes(project.domain) ? '9' : profile?.is_internal ? '8' : '7'}, minmax(0, 1fr))` }}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lines">Lines</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="vision-models">Vision Models</TabsTrigger>
          {profile?.is_internal && (
            <TabsTrigger value="audit">Audit</TabsTrigger>
          )}
          {profile?.is_internal && ['IoT', 'Vision', 'Hybrid'].includes(project.domain) && (
            <TabsTrigger value="blockers">Gaps & Escalations</TabsTrigger>
          )}
        </TabsList>

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
      </Tabs>
    </div>
  );
};

export default ProjectDetail;
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building, Calendar, MapPin, Check, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SolutionsLines } from './tabs/SolutionsLines';
import { SolutionsHardwareSummary } from './tabs/SolutionsHardwareSummary';
import { OverviewTab } from '@/components/shared/OverviewTab';
import { ProjectContacts } from '@/pages/app/projects/tabs/ProjectContacts';
import { ContractInformationTab } from '@/components/shared/ContractInformationTab';
import { TeamTab } from '@/components/shared/TeamTab';
import { AccountInfoTab } from '@/components/shared/AccountInfoTab';
import { SolutionsFactoryConfig } from '@/components/factory-config/SolutionsFactoryConfig';
import { ProjectHardware } from '../projects/tabs/ProjectHardware';
import ProjectGantt from '../projects/tabs/ProjectGantt';
import ProjectTasks from '../projects/tabs/ProjectTasks';
import { SharedActionsTab } from '@/components/shared/tabs/SharedActionsTab';
import { SharedCalendarTab } from '@/components/shared/tabs/SharedCalendarTab';
import { SharedVisionModelsTab } from '@/components/shared/tabs/SharedVisionModelsTab';
import { SharedAuditTab } from '@/components/shared/tabs/SharedAuditTab';
import { SharedProductGapsTab } from '@/components/shared/tabs/SharedProductGapsTab';
import { SharedBlockersTab } from '@/components/shared/tabs/SharedBlockersTab';
import { GanttChart } from '@/features/gantt/components/GanttChart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTabCompleteness } from './hooks/useTabCompleteness';

interface SolutionsProject {
  id: string;
  company_id: string;
  domain: string;
  site_name: string;
  site_address?: string;
  segment?: string;
  salesperson?: string;
  solutions_consultant?: string;
  customer_lead?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_job_title?: string;
  line_description?: string;
  product_description?: string;
  project_goals?: string;
  servers_required?: number;
  gateways_required?: number;
  tv_display_devices_required?: number;
  receivers_required?: number;
  lines_required?: number;
  final_scoping_complete?: boolean;
  contract_signed?: boolean;
  implementation_handover?: boolean;
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
  const completeness = useTabCompleteness(project);

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
    if (tab && ['overview', 'contract', 'team', 'account', 'hardware', 'factory', 'lines', 'wbs', 'hardware-summary'].includes(tab)) {
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex items-center justify-center h-6 w-6 rounded-full ${project.final_scoping_complete ? 'bg-green-500' : 'bg-muted'}`}>
                        {project.final_scoping_complete ? (
                          <Check className="h-4 w-4 text-white" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Final Scoping {project.final_scoping_complete ? 'Complete' : 'Incomplete'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex items-center justify-center h-6 w-6 rounded-full ${project.contract_signed ? 'bg-blue-500' : 'bg-muted'}`}>
                        {project.contract_signed ? (
                          <Check className="h-4 w-4 text-white" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Contract {project.contract_signed ? 'Signed' : 'Not Signed'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex items-center justify-center h-6 w-6 rounded-full ${project.implementation_handover ? 'bg-purple-500' : 'bg-muted'}`}>
                        {project.implementation_handover ? (
                          <Check className="h-4 w-4 text-white" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Implementation {project.implementation_handover ? 'Handed Over' : 'Not Handed Over'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
        <div className="space-y-2">
          {/* Row 1 - Feasibility Gate */}
          <TabsList className="w-full justify-start h-auto flex-wrap gap-1.5 p-1">
            <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white select-none ${
              completeness.overview && completeness.contacts && completeness.factory && completeness.lines && completeness.hardwareSummary
                ? 'bg-green-600' : 'bg-red-600'
            }`}>
              Feasibility Gate
            </span>
            <TabsTrigger value="overview">
              Customer Overview
              <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.overview ? 'bg-green-500' : 'bg-red-500'}`} />
            </TabsTrigger>
            <TabsTrigger value="contacts">
              Contacts
              <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.contacts ? 'bg-green-500' : 'bg-red-500'}`} />
            </TabsTrigger>
            <TabsTrigger value="factory">
              Factory
              <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.factory ? 'bg-green-500' : 'bg-red-500'}`} />
            </TabsTrigger>
            <TabsTrigger value="lines">
              Lines
              <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.lines ? 'bg-green-500' : 'bg-red-500'}`} />
            </TabsTrigger>
            <TabsTrigger value="hardware">Factory Hardware</TabsTrigger>
            <TabsTrigger value="hardware-summary">
              Hardware Summary
              <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.hardwareSummary ? 'bg-green-500' : 'bg-red-500'}`} />
            </TabsTrigger>
            <TabsTrigger value="product-gaps">
              Feature Requirements
              {completeness.featureRequirements ? (
                <Check className="h-3.5 w-3.5 ml-1.5 text-green-500" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 ml-1.5 text-amber-500" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Row 2 - Project Management */}
          <TabsList className="w-full justify-start h-auto flex-wrap gap-1.5 p-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted-foreground/10 select-none">
              Project Management
            </span>
            <TabsTrigger value="contract">Contract Info</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="account">Account Info</TabsTrigger>
            <TabsTrigger value="wbs">WBS Gantt</TabsTrigger>
            <TabsTrigger value="wbs-v2">Gantt (Beta)</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          {/* Row 3 - Technical */}
          <TabsList className="w-full justify-start h-auto flex-wrap gap-1.5 p-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted-foreground/10 select-none">
              Technical
            </span>
            <TabsTrigger value="vision-models">Vision Models</TabsTrigger>
            <TabsTrigger value="blockers">Escalations</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>
        </div>

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

        <TabsContent value="contacts" className="space-y-4">
          <ProjectContacts 
            projectId={project.id} 
            projectType="solutions"
            companyId={project.company_id}
            companyName={project.companies?.name || 'Unknown'}
          />
        </TabsContent>

        <TabsContent value="hardware" className="space-y-4">
          <ProjectHardware projectId={project.id} type="solutions" />
        </TabsContent>

        <TabsContent value="factory" className="space-y-4">
          <SolutionsFactoryConfig projectId={project.id} />
        </TabsContent>

        <TabsContent value="lines" className="space-y-4">
          <SolutionsLines solutionsProjectId={project.id} />
        </TabsContent>

        <TabsContent value="wbs" className="space-y-4">
          <ProjectGantt solutionsProjectId={project.id} />
        </TabsContent>

        <TabsContent value="wbs-v2" className="space-y-4">
          <GanttChart projectId={project.id} projectType="solutions" />
        </TabsContent>

        <TabsContent value="hardware-summary" className="space-y-4">
          <SolutionsHardwareSummary solutionsProjectId={project.id} />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <SharedActionsTab projectId={project.id} projectType="solutions" />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <SharedCalendarTab projectId={project.id} projectType="solutions" />
        </TabsContent>

        <TabsContent value="vision-models" className="space-y-4">
          <SharedVisionModelsTab projectId={project.id} projectType="solutions" />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <SharedAuditTab projectId={project.id} projectType="solutions" />
        </TabsContent>

        <TabsContent value="product-gaps" className="space-y-4">
          <SharedProductGapsTab projectId={project.id} projectType="solutions" />
        </TabsContent>

        <TabsContent value="blockers" className="space-y-4">
          <SharedBlockersTab projectId={project.id} projectType="solutions" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

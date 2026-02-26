import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building, Calendar, MapPin, Check, X, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
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
import { FactoryConfigurationTab } from '@/components/shared/FactoryConfigurationTab';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { SolutionsSOW } from './tabs/SolutionsSOW';
import { SolutionsInfrastructure } from './tabs/SolutionsInfrastructure';
import { ProjectHardwareStatus } from '../projects/tabs/ProjectHardwareStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTabCompleteness } from './hooks/useTabCompleteness';
import { FeasibilityGateDialog } from '@/components/FeasibilityGateDialog';

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

const SkuCountCard = ({ projectId, initialValue, onUpdate }: { projectId: string; initialValue?: number | null; onUpdate: () => void }) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(initialValue ? String(initialValue) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(initialValue ? String(initialValue) : '');
  }, [initialValue]);

  const handleSave = async () => {
    const num = parseInt(value, 10);
    if (!value || isNaN(num) || num < 1) {
      toast({ title: 'Validation Error', description: 'SKU Count must be at least 1', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('solutions_projects').update({ sow_sku_count: num } as any).eq('id', projectId);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to save SKU count', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'SKU count updated' });
      setEditing(false);
      onUpdate();
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Label htmlFor="sku-count" className="text-sm font-medium">SKU Count</Label>
            {editing ? (
              <Input
                id="sku-count"
                type="number"
                min={1}
                className="w-32"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
              />
            ) : (
              <span className="text-sm">{initialValue ?? <span className="text-muted-foreground italic">Not set</span>}</span>
            )}
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setEditing(false); setValue(initialValue ? String(initialValue) : ''); }}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Save
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const SolutionsProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [project, setProject] = useState<SolutionsProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [gateDialogOpen, setGateDialogOpen] = useState(false);
  const [hwCompleteness, setHwCompleteness] = useState<{ iot: boolean; vision: boolean } | null>(null);
  const [completenessRefreshKey, setCompletenessRefreshKey] = useState(0);
  const completeness = useTabCompleteness(project, completenessRefreshKey);

  const allTabsGreen = completeness.overview && completeness.contacts && completeness.factory && completeness.factoryConfig && completeness.lines && completeness.infrastructure;
  const feasibilitySignedOff = (project as any)?.feasibility_signed_off ?? false;
  const feasibilitySignedOffBy = (project as any)?.feasibility_signed_off_by ?? null;
  const feasibilitySignedOffAt = (project as any)?.feasibility_signed_off_at ?? null;

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
    if (tab && ['overview', 'contract', 'team', 'account', 'hardware', 'factory', 'lines', 'wbs', 'hardware-summary', 'hardware-status'].includes(tab)) {
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

      <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); setCompletenessRefreshKey(k => k + 1); }} className="space-y-4">
        <div className="space-y-2">
          {/* Row 1 - Feasibility Gate */}
          <TabsList className="w-full justify-start h-auto flex-wrap gap-1.5 p-1">
            <button
              type="button"
              onClick={() => setGateDialogOpen(true)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white select-none cursor-pointer transition-colors ${
                feasibilitySignedOff
                  ? 'bg-green-600 hover:bg-green-700'
                  : allTabsGreen
                    ? 'bg-amber-500 hover:bg-amber-600 animate-pulse'
                    : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {feasibilitySignedOff && <ShieldCheck className="h-3.5 w-3.5" />}
              Feasibility Gate
            </button>
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
              <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${(completeness.factory && completeness.factoryConfig) ? 'bg-green-500' : 'bg-red-500'}`} />
            </TabsTrigger>
            <TabsTrigger value="lines">
              Lines
              <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.lines ? 'bg-green-500' : 'bg-red-500'}`} />
            </TabsTrigger>
            <TabsTrigger value="infrastructure">
              Infrastructure
              <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.infrastructure ? 'bg-green-500' : 'bg-red-500'}`} />
            </TabsTrigger>
            <TabsTrigger value="hardware">
              Factory Hardware
              <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${(hwCompleteness ? (hwCompleteness.iot && hwCompleteness.vision) : completeness.factoryHardware) ? 'bg-green-500' : 'bg-red-500'}`} />
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

          {/* Row 2 - Sale & Launch Gate */}
          <TabsList className="w-full justify-start h-auto flex-wrap gap-1.5 p-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted-foreground/10 select-none">
              Sale &amp; Launch Gate
            </span>
            <TabsTrigger value="hardware-summary">Hardware Summary <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.hardwareSummary ? 'bg-green-500' : 'bg-red-500'}`} /></TabsTrigger>
            <TabsTrigger value="contract">Contract Info <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.contract ? 'bg-green-500' : 'bg-red-500'}`} /></TabsTrigger>
            <TabsTrigger value="account">Account Info</TabsTrigger>
            <TabsTrigger value="team">Team <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.team ? 'bg-green-500' : 'bg-red-500'}`} /></TabsTrigger>
            <TabsTrigger value="sow">Generate SOW</TabsTrigger>
            <TabsTrigger value="launch">Launch</TabsTrigger>
          </TabsList>

          {/* Row 3 - Readiness Gate */}
          <TabsList className="w-full justify-start h-auto flex-wrap gap-1.5 p-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted-foreground/10 select-none">
              Readiness Gate
            </span>
            <TabsTrigger value="hardware-status">Hardware Status</TabsTrigger>
          </TabsList>

          {/* Row 4 - Go Live Gate */}
          <TabsList className="w-full justify-start h-auto flex-wrap gap-1.5 p-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted-foreground/10 select-none">
              Go Live Gate
            </span>
            <TabsTrigger value="vision-models">Vision Models</TabsTrigger>
          </TabsList>

          {/* Row 5 - Project Management */}
          <TabsList className="w-full justify-start h-auto flex-wrap gap-1.5 p-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted-foreground/10 select-none">
              Project Management
            </span>
            <TabsTrigger value="wbs">WBS Gantt</TabsTrigger>
            <TabsTrigger value="wbs-v2">Gantt (Beta)</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
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

        <TabsContent value="infrastructure" className="space-y-4">
          <SolutionsInfrastructure projectId={project.id} projectData={project} onUpdate={fetchProject} />
        </TabsContent>

        <TabsContent value="hardware" className="space-y-4">
          <ProjectHardware projectId={project.id} type="solutions" onCompletenessChange={setHwCompleteness} />
        </TabsContent>

        <TabsContent value="factory" className="space-y-4">
          <SolutionsFactoryConfig projectId={project.id} />
          <SkuCountCard projectId={project.id} initialValue={(project as any).sow_sku_count} onUpdate={() => { fetchProject(); setCompletenessRefreshKey(k => k + 1); }} />
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
          <SolutionsHardwareSummary solutionsProjectId={project.id} salespersonId={project.salesperson ?? null} />
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

        <TabsContent value="sow" className="space-y-4">
          <SolutionsSOW projectId={project.id} projectData={project} />
        </TabsContent>

        <TabsContent value="launch" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Launch tab — coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hardware-status" className="space-y-4">
          <ProjectHardwareStatus />
        </TabsContent>
      </Tabs>
      <FeasibilityGateDialog
        open={gateDialogOpen}
        onOpenChange={setGateDialogOpen}
        projectId={project.id}
        solutionsConsultantId={project.solutions_consultant ?? null}
        allTabsGreen={allTabsGreen}
        signedOff={feasibilitySignedOff}
        signedOffBy={feasibilitySignedOffBy}
        signedOffAt={feasibilitySignedOffAt}
        onSignedOff={fetchProject}
        completeness={{
          overview: completeness.overview,
          contacts: completeness.contacts,
          factory: completeness.factory && completeness.factoryConfig,
          lines: completeness.lines,
          infrastructure: completeness.infrastructure,
          factoryConfig: completeness.factoryConfig,
        }}
        projectData={project}
      />
    </div>
  );
};

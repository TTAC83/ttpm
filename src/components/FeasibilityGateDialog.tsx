import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ShieldCheck, Layers, Camera, Cpu, Eye, Lock, CheckCircle2, Globe, Factory, FolderOpen, Cable, Cloud, Server, Radio, Wifi, MonitorSmartphone, AlertTriangle, Lightbulb, Monitor, ChevronRight, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface FeasibilityGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  solutionsConsultantId: string | null;
  allTabsGreen: boolean;
  signedOff: boolean;
  signedOffBy: string | null;
  signedOffAt: string | null;
  onSignedOff: () => void;
  completeness?: {
    overview: boolean;
    contacts: boolean;
    factory: boolean;
    lines: boolean;
  };
  projectData?: {
    site_address?: string;
    segment?: string;
    project_goals?: string;
    line_description?: string;
    product_description?: string;
    final_scoping_complete?: boolean;
    contract_signed?: boolean;
    implementation_handover?: boolean;
  };
}

interface HierarchyLine { id: string; name: string; solution_type: string; }
interface HierarchyGroup { id: string; name: string; lines: HierarchyLine[]; }
interface HierarchyFactory { id: string; name: string; groups: HierarchyGroup[]; }

interface NetworkCamera { id: string; mac_address: string; camera_type: string; plc_attached: boolean; }
interface NetworkIoTDevice { id: string; name: string | null; }
interface NetworkReceiver { id: string; name: string | null; devices: NetworkIoTDevice[]; }
interface NetworkServer { id: string; name: string | null; cameras: NetworkCamera[]; }
interface NetworkGateway { id: string; name: string | null; receivers: NetworkReceiver[]; }

// Line Detail types
interface CameraDetailData {
  id: string;
  mac_address: string;
  camera_model: string;
  use_cases: string[];
  attributes: { title: string; description: string }[];
  light: { required: boolean; model?: string } | null;
  plc: { attached: boolean; model?: string; outputCount: number } | null;
  hmi: { required: boolean; model?: string } | null;
}

interface IoTDeviceDetailData {
  id: string;
  name: string;
  hardware_model: string;
}

interface EquipmentDetailData {
  id: string;
  name: string;
  type: string;
  cameras: CameraDetailData[];
  iotDevices: IoTDeviceDetailData[];
}

interface PositionDetailData {
  id: string;
  name: string;
  equipment: EquipmentDetailData[];
}

interface LineDetailData {
  id: string;
  name: string;
  positions: PositionDetailData[];
}

interface SummaryData {
  lineCount: number;
  cameraCount: number;
  iotDeviceCount: number;
  useCases: string[];
  portal: { url: string } | null;
  factories: HierarchyFactory[];
  servers: NetworkServer[];
  gateways: NetworkGateway[];
  unassignedCameras: NetworkCamera[];
  unassignedDevices: NetworkIoTDevice[];
  lineDetails: LineDetailData[];
}

const emptySummary: SummaryData = {
  lineCount: 0, cameraCount: 0, iotDeviceCount: 0, useCases: [],
  portal: null, factories: [], servers: [], gateways: [],
  unassignedCameras: [], unassignedDevices: [], lineDetails: [],
};

export const FeasibilityGateDialog = ({
  open, onOpenChange, projectId, solutionsConsultantId,
  allTabsGreen, signedOff, signedOffBy, signedOffAt, onSignedOff,
  completeness, projectData,
}: FeasibilityGateDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [summary, setSummary] = useState<SummaryData>(emptySummary);
  const [consultantName, setConsultantName] = useState<string | null>(null);
  const [signedOffByName, setSignedOffByName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const isConsultant = user?.id === solutionsConsultantId;

  useEffect(() => {
    if (!open) return;
    setPassword('');
    fetchSummary();
    if (solutionsConsultantId) fetchProfileName(solutionsConsultantId, setConsultantName);
    if (signedOff && signedOffBy) fetchProfileName(signedOffBy, setSignedOffByName);
  }, [open, projectId]);

  const fetchProfileName = async (userId: string, setter: (n: string) => void) => {
    const { data } = await supabase.from('profiles').select('name').eq('user_id', userId).single();
    if (data?.name) setter(data.name);
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      // ── KPI counts ──
      const { data: lines } = await supabase.from('solutions_lines').select('id, line_name').eq('solutions_project_id', projectId);
      const lineRows = (lines ?? []).map(l => ({ id: l.id, name: l.line_name }));
      const lineIds = lineRows.map(l => l.id);
      const lineCount = lineIds.length;
      let cameraCount = 0, iotDeviceCount = 0;
      const useCaseSet = new Set<string>();

      // Shared position/equipment chain
      let positionRows: { id: string; name: string; solutions_line_id: string }[] = [];
      let equipmentRows: { id: string; name: string; equipment_type: string; position_id: string }[] = [];
      let equipmentIds: string[] = [];

      if (lineIds.length > 0) {
        const { data: positions } = await supabase
          .from('positions')
          .select('id, name, solutions_line_id')
          .in('solutions_line_id', lineIds);
        positionRows = (positions ?? []) as typeof positionRows;
        const positionIds = positionRows.map(p => p.id);

        if (positionIds.length > 0) {
          const { data: equipment } = await supabase
            .from('equipment')
            .select('id, name, equipment_type, position_id')
            .in('position_id', positionIds);
          equipmentRows = (equipment ?? []) as typeof equipmentRows;
          equipmentIds = equipmentRows.map(e => e.id);

          if (equipmentIds.length > 0) {
            const [{ count: camCount }, { count: iotCount }] = await Promise.all([
              supabase.from('cameras').select('id', { count: 'exact', head: true }).in('equipment_id', equipmentIds),
              supabase.from('iot_devices').select('id', { count: 'exact', head: true }).in('equipment_id', equipmentIds),
            ]);
            cameraCount = camCount ?? 0;
            iotDeviceCount = iotCount ?? 0;
            if (iotDeviceCount > 0) useCaseSet.add('IoT');
          }
        }
      }

      // ── Fetch all cameras & IoT devices with full detail ──
      let allCameras: any[] = [];
      let allIoTDevices: any[] = [];
      let cameraUseCases: any[] = [];
      let cameraAttributes: any[] = [];
      let cameraPlcOutputs: any[] = [];

      if (equipmentIds.length > 0) {
        const [camRes, iotRes] = await Promise.all([
          supabase.from('cameras').select('id, mac_address, camera_type, equipment_id, light_required, light_id, plc_attached, plc_master_id, hmi_required, hmi_master_id').in('equipment_id', equipmentIds),
          supabase.from('iot_devices').select('id, name, hardware_master_id, equipment_id').in('equipment_id', equipmentIds),
        ]);
        allCameras = camRes.data ?? [];
        allIoTDevices = iotRes.data ?? [];

        const cameraIds = allCameras.map((c: any) => c.id);
        if (cameraIds.length > 0) {
          const [ucRes, attrRes, plcOutRes] = await Promise.all([
            supabase.from('camera_use_cases').select('camera_id, vision_use_case_id').in('camera_id', cameraIds),
            supabase.from('camera_attributes').select('camera_id, title, description').in('camera_id', cameraIds),
            supabase.from('camera_plc_outputs').select('camera_id, id').in('camera_id', cameraIds),
          ]);
          cameraUseCases = ucRes.data ?? [];
          cameraAttributes = attrRes.data ?? [];
          cameraPlcOutputs = plcOutRes.data ?? [];

          // Populate useCaseSet for summary
          const ucIds = [...new Set(cameraUseCases.map((c: any) => c.vision_use_case_id))];
          if (ucIds.length > 0) {
            const { data: ucNames } = await supabase.from('vision_use_cases_master').select('id, name').in('id', ucIds);
            (ucNames ?? []).forEach((u: any) => useCaseSet.add(u.name));
          }
        }
      }

      // ── Resolve all hardware master IDs in bulk ──
      const hwIdsToResolve = new Set<string>();
      allCameras.forEach((c: any) => {
        if (c.camera_type) hwIdsToResolve.add(c.camera_type);
        if (c.light_id) hwIdsToResolve.add(c.light_id);
        if (c.plc_master_id) hwIdsToResolve.add(c.plc_master_id);
        if (c.hmi_master_id) hwIdsToResolve.add(c.hmi_master_id);
      });
      allIoTDevices.forEach((d: any) => {
        if (d.hardware_master_id) hwIdsToResolve.add(d.hardware_master_id);
      });

      let hwMasterMap: Record<string, string> = {};
      const hwIdArr = [...hwIdsToResolve].filter(Boolean);
      if (hwIdArr.length > 0) {
        const { data: hwNames } = await supabase.from('hardware_master').select('id, product_name, sku_no').in('id', hwIdArr);
        (hwNames ?? []).forEach((h: any) => {
          hwMasterMap[h.id] = `${h.product_name} ${h.sku_no}`.trim();
        });
      }

      // Resolve vision use case IDs to names
      const allUcIds = [...new Set(cameraUseCases.map((c: any) => c.vision_use_case_id))];
      let ucNameMap: Record<string, string> = {};
      if (allUcIds.length > 0) {
        const { data: ucNames } = await supabase.from('vision_use_cases_master').select('id, name').in('id', allUcIds);
        (ucNames ?? []).forEach((u: any) => { ucNameMap[u.id] = u.name; });
      }

      // ── Build Line Detail hierarchy ──
      const lineDetails: LineDetailData[] = lineRows.map(line => {
        const linePositions = positionRows.filter(p => p.solutions_line_id === line.id);
        return {
          id: line.id,
          name: line.name,
          positions: linePositions.map(pos => {
            const posEquipment = equipmentRows.filter(e => e.position_id === pos.id);
            return {
              id: pos.id,
              name: pos.name,
              equipment: posEquipment.map(eq => {
                const eqCameras = allCameras.filter((c: any) => c.equipment_id === eq.id);
                const eqIoT = allIoTDevices.filter((d: any) => d.equipment_id === eq.id);
                return {
                  id: eq.id,
                  name: eq.name,
                  type: eq.equipment_type || 'Unknown',
                  cameras: eqCameras.map((cam: any): CameraDetailData => {
                    const camUcIds = cameraUseCases.filter((uc: any) => uc.camera_id === cam.id).map((uc: any) => uc.vision_use_case_id);
                    const camAttrs = cameraAttributes.filter((a: any) => a.camera_id === cam.id);
                    const camPlcOutputCount = cameraPlcOutputs.filter((o: any) => o.camera_id === cam.id).length;
                    return {
                      id: cam.id,
                      mac_address: cam.mac_address,
                      camera_model: hwMasterMap[cam.camera_type] || 'Unknown',
                      use_cases: camUcIds.map((id: string) => ucNameMap[id] || id),
                      attributes: camAttrs.map((a: any) => ({ title: a.title, description: a.description || '' })),
                      light: cam.light_required != null ? { required: !!cam.light_required, model: cam.light_id ? hwMasterMap[cam.light_id] : undefined } : null,
                      plc: cam.plc_attached != null ? { attached: !!cam.plc_attached, model: cam.plc_master_id ? hwMasterMap[cam.plc_master_id] : undefined, outputCount: camPlcOutputCount } : null,
                      hmi: cam.hmi_required != null ? { required: !!cam.hmi_required, model: cam.hmi_master_id ? hwMasterMap[cam.hmi_master_id] : undefined } : null,
                    };
                  }),
                  iotDevices: eqIoT.map((dev: any): IoTDeviceDetailData => ({
                    id: dev.id,
                    name: dev.name || 'Device',
                    hardware_model: dev.hardware_master_id ? (hwMasterMap[dev.hardware_master_id] || 'Unknown') : 'Unknown',
                  })),
                };
              }),
            };
          }),
        };
      });

      // ── Factory hierarchy ──
      const { data: portalData } = await supabase.from('solution_portals').select('id, url').eq('solutions_project_id', projectId).maybeSingle();
      let factoryHierarchy: HierarchyFactory[] = [];
      if (portalData) {
        const { data: factoriesData } = await supabase.from('solution_factories').select('id, name').eq('portal_id', portalData.id).order('created_at');
        if (factoriesData && factoriesData.length > 0) {
          const factoryIds = factoriesData.map(f => f.id);
          const { data: allGroups } = await supabase.from('factory_groups').select('id, name, factory_id').in('factory_id', factoryIds).order('created_at');
          const groupIds = (allGroups ?? []).map(g => g.id);
          let allLines: { id: string; name: string; group_id: string; solution_type: string }[] = [];
          if (groupIds.length > 0) {
            const { data: linesData } = await supabase.from('factory_group_lines').select('id, name, group_id, solution_type').in('group_id', groupIds).order('created_at');
            allLines = (linesData ?? []) as typeof allLines;
          }
          factoryHierarchy = factoriesData.map(f => ({
            id: f.id, name: f.name,
            groups: (allGroups ?? []).filter(g => g.factory_id === f.id).map(g => ({
              id: g.id, name: g.name,
              lines: allLines.filter(l => l.group_id === g.id).map(l => ({ id: l.id, name: l.name, solution_type: l.solution_type })),
            })),
          }));
        }
      }

      // ── Network topology ──
      const { data: allHw } = await supabase
        .from('project_iot_requirements')
        .select('id, name, hardware_type')
        .eq('solutions_project_id', projectId);

      const hwList = allHw ?? [];
      const serverRows = hwList.filter(h => h.hardware_type === 'server');
      const gatewayRows = hwList.filter(h => h.hardware_type === 'gateway');
      const receiverRows = hwList.filter(h => h.hardware_type === 'receiver');

      const serverIds = serverRows.map(s => s.id);
      const gatewayIds = gatewayRows.map(g => g.id);
      const receiverIds = receiverRows.map(r => r.id);

      const [camAssignRes, recGwRes, devRecRes] = await Promise.all([
        serverIds.length > 0
          ? supabase.from('camera_server_assignments').select('camera_id, server_requirement_id').in('server_requirement_id', serverIds)
          : Promise.resolve({ data: [] as any[] }),
        gatewayIds.length > 0
          ? supabase.from('receiver_gateway_assignments').select('receiver_requirement_id, gateway_requirement_id').in('gateway_requirement_id', gatewayIds)
          : Promise.resolve({ data: [] as any[] }),
        receiverIds.length > 0
          ? supabase.from('device_receiver_assignments').select('iot_device_id, receiver_requirement_id').in('receiver_requirement_id', receiverIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const camAssigns = (camAssignRes as any).data ?? [];
      const recGwAssigns = (recGwRes as any).data ?? [];
      const devRecAssigns = (devRecRes as any).data ?? [];

      const mapCam = (cam: any): NetworkCamera => ({
        id: cam.id,
        mac_address: cam.mac_address,
        camera_type: hwMasterMap[cam.camera_type] || cam.camera_type || 'Unknown',
        plc_attached: !!cam.plc_attached,
      });

      const assignedCameraIds = new Set(camAssigns.map((a: any) => a.camera_id));
      const assignedDeviceIds = new Set(devRecAssigns.map((a: any) => a.iot_device_id));

      const servers: NetworkServer[] = serverRows.map(s => ({
        id: s.id, name: s.name,
        cameras: camAssigns
          .filter((a: any) => a.server_requirement_id === s.id)
          .map((a: any) => { const cam = allCameras.find((c: any) => c.id === a.camera_id); return cam ? mapCam(cam) : null; })
          .filter(Boolean) as NetworkCamera[],
      }));

      const gateways: NetworkGateway[] = gatewayRows.map(g => ({
        id: g.id, name: g.name,
        receivers: recGwAssigns
          .filter((a: any) => a.gateway_requirement_id === g.id)
          .map((a: any) => {
            const rec = receiverRows.find(r => r.id === a.receiver_requirement_id);
            return {
              id: a.receiver_requirement_id, name: rec?.name ?? null,
              devices: devRecAssigns
                .filter((d: any) => d.receiver_requirement_id === a.receiver_requirement_id)
                .map((d: any) => { const dev = allIoTDevices.find((dd: any) => dd.id === d.iot_device_id); return { id: d.iot_device_id, name: dev?.name ?? null }; }),
            };
          }),
      }));

      const unassignedCameras: NetworkCamera[] = allCameras.filter((c: any) => !assignedCameraIds.has(c.id)).map(mapCam);
      const unassignedDevices: NetworkIoTDevice[] = allIoTDevices.filter((d: any) => !assignedDeviceIds.has(d.id)).map((d: any) => ({ id: d.id, name: d.name }));

      setSummary({
        lineCount, cameraCount, iotDeviceCount, useCases: [...useCaseSet].sort(),
        portal: portalData ? { url: portalData.url } : null, factories: factoryHierarchy,
        servers, gateways, unassignedCameras, unassignedDevices, lineDetails,
      });
    } catch (e) {
      console.error('Error fetching summary:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOff = async () => {
    if (!user?.email || !password) return;
    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (authError) {
        toast({ title: 'Authentication Failed', description: 'Incorrect password.', variant: 'destructive' });
        return;
      }
      const { error: updateError } = await supabase
        .from('solutions_projects')
        .update({ feasibility_signed_off: true, feasibility_signed_off_by: user.id, feasibility_signed_off_at: new Date().toISOString() } as any)
        .eq('id', projectId);
      if (updateError) throw updateError;
      toast({ title: 'Feasibility Signed Off', description: 'The feasibility gate has been formally signed off.' });
      onSignedOff();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to sign off', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const solutionTypeBadge = (type: string) => {
    const label = type === 'both' ? 'Vision + IoT' : type === 'iot' ? 'IoT' : 'Vision';
    return <Badge variant={type === 'both' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">{label}</Badge>;
  };

  const hasNetworkData = summary.servers.length > 0 || summary.gateways.length > 0 || summary.unassignedCameras.length > 0 || summary.unassignedDevices.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Feasibility Gate
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : (
          <Tabs defaultValue="summary" className="flex-1 flex flex-col min-h-0">
            {/* Gaps Panel */}
            {!signedOff && (() => {
              const gaps: string[] = [];
              
              // Overview gaps
              if (completeness && !completeness.overview && projectData) {
                const missing: string[] = [];
                if (!projectData.site_address) missing.push('site address');
                if (!projectData.segment) missing.push('segment');
                if (!projectData.project_goals) missing.push('project goals');
                if (!projectData.line_description) missing.push('line description');
                if (!projectData.product_description) missing.push('product description');
                if (!projectData.final_scoping_complete) missing.push('final scoping not confirmed');
                if (!projectData.contract_signed) missing.push('contract not signed');
                if (!projectData.implementation_handover) missing.push('implementation not handed over');
                if (missing.length > 0) gaps.push(`Overview: Missing ${missing.join(', ')}`);
              } else if (completeness && !completeness.overview) {
                gaps.push('Overview: Incomplete fields');
              }

              // Contacts gaps
              if (completeness && !completeness.contacts) {
                gaps.push('Contacts: No contacts linked to this project');
              }

              // Factory gaps
              if (completeness && !completeness.factory) {
                const factoryGaps: string[] = [];
                if (!summary.portal) {
                  factoryGaps.push('No portal URL configured');
                } else {
                  if (summary.factories.length === 0) {
                    factoryGaps.push('No factories configured');
                  } else {
                    summary.factories.forEach(f => {
                      if (f.groups.length === 0) factoryGaps.push(`Factory "${f.name}" has no groups`);
                      f.groups.forEach(g => {
                        if (g.lines.length === 0) factoryGaps.push(`Group "${g.name}" has no lines`);
                      });
                    });
                  }
                }
                if (factoryGaps.length > 0) {
                  gaps.push(`Factory: ${factoryGaps.join('; ')}`);
                } else {
                  gaps.push('Factory: Configuration incomplete');
                }
              }

              // Lines gaps
              if (completeness && !completeness.lines) {
                gaps.push('Lines: No lines configured');
              }

              if (gaps.length === 0 && allTabsGreen) {
                return (
                  <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 mb-3 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">All sections complete — ready for sign-off below</p>
                  </div>
                );
              }

              if (gaps.length > 0) {
                return (
                  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Gaps to Complete ({gaps.length} remaining)</p>
                        <ul className="mt-1.5 space-y-1">
                          {gaps.map((gap, i) => (
                            <li key={i} className="text-sm text-amber-700/80 dark:text-amber-400/80 flex items-start gap-1.5">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                              {gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })()}

            <TabsList className="w-full justify-start shrink-0">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="line-detail">Line Detail</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 pr-3 mt-2">
              {/* ── Summary Tab ── */}
              <TabsContent value="summary" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Project Summary</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Card><CardContent className="pt-4 pb-3 text-center">
                        <Layers className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-2xl font-bold">{summary.lineCount}</p>
                        <p className="text-xs text-muted-foreground">Lines</p>
                      </CardContent></Card>
                      <Card><CardContent className="pt-4 pb-3 text-center">
                        <Camera className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-2xl font-bold">{summary.cameraCount}</p>
                        <p className="text-xs text-muted-foreground">Cameras</p>
                      </CardContent></Card>
                      <Card><CardContent className="pt-4 pb-3 text-center">
                        <Cpu className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-2xl font-bold">{summary.iotDeviceCount}</p>
                        <p className="text-xs text-muted-foreground">IoT Devices</p>
                      </CardContent></Card>
                    </div>
                  </div>

                  {summary.useCases.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> Use Cases
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {summary.useCases.map(uc => (
                          <Badge key={uc} variant="secondary" className="text-xs">{uc}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Site Structure Tree */}
                  {summary.portal && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Site Structure</p>
                      <div className="rounded-md border p-3 bg-muted/30">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Globe className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{summary.portal.url || 'Portal'}</span>
                        </div>
                        {summary.factories.length > 0 ? (
                          <div className="ml-2 mt-1 border-l-2 border-border pl-4 space-y-1">
                            {summary.factories.map(factory => (
                              <div key={factory.id}>
                                <div className="flex items-center gap-2 text-sm py-0.5">
                                  <Factory className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="font-medium">{factory.name}</span>
                                </div>
                                {factory.groups.length > 0 ? (
                                  <div className="ml-2 border-l-2 border-border pl-4 space-y-0.5">
                                    {factory.groups.map(group => (
                                      <div key={group.id}>
                                        <div className="flex items-center gap-2 text-sm py-0.5">
                                          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                          <span>{group.name}</span>
                                        </div>
                                        {group.lines.length > 0 && (
                                          <div className="ml-2 border-l-2 border-border pl-4 space-y-0.5">
                                            {group.lines.map(line => (
                                              <div key={line.id} className="flex items-center gap-2 text-sm py-0.5">
                                                <Cable className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <span className="text-muted-foreground">{line.name}</span>
                                                {solutionTypeBadge(line.solution_type)}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="ml-6 text-xs text-muted-foreground italic">No groups</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="ml-6 mt-1 text-xs text-muted-foreground italic">No factories configured</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Line Detail Tab ── */}
              <TabsContent value="line-detail" className="mt-0">
                {summary.lineDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No lines configured</p>
                ) : (
                  <div className="space-y-2">
                    {summary.lineDetails.map(line => (
                      <LineDetailCard key={line.id} line={line} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── Network Tab ── */}
              <TabsContent value="network" className="mt-0">
                {!hasNetworkData ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No network hardware configured</p>
                ) : (
                  <div className="rounded-md border p-3 bg-muted/30">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Cloud className="h-4 w-4 text-primary shrink-0" />
                      <span>Cloud</span>
                    </div>
                    <div className="ml-2 mt-1 border-l-2 border-border pl-4 space-y-1.5">
                      {summary.servers.map(server => (
                        <div key={server.id}>
                          <div className="flex items-center gap-2 text-sm py-0.5">
                            <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium">{server.name || 'Server'}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {server.cameras.length} cam{server.cameras.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          {server.cameras.length > 0 && (
                            <div className="ml-2 border-l-2 border-border pl-4 space-y-0.5">
                              {server.cameras.map(cam => (
                                <div key={cam.id} className="flex items-center gap-2 text-sm py-0.5">
                                  <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">{cam.mac_address}</span>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{cam.camera_type}</Badge>
                                  {cam.plc_attached && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                                      <Cpu className="h-2.5 w-2.5" /> PLC
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {summary.gateways.map(gateway => (
                        <div key={gateway.id}>
                          <div className="flex items-center gap-2 text-sm py-0.5">
                            <Wifi className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium">{gateway.name || 'Gateway'}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {gateway.receivers.length} recv
                            </Badge>
                          </div>
                          {gateway.receivers.length > 0 && (
                            <div className="ml-2 border-l-2 border-border pl-4 space-y-0.5">
                              {gateway.receivers.map(recv => (
                                <div key={recv.id}>
                                  <div className="flex items-center gap-2 text-sm py-0.5">
                                    <Radio className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground">{recv.name || 'Receiver'}</span>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {recv.devices.length} dev
                                    </Badge>
                                  </div>
                                  {recv.devices.length > 0 && (
                                    <div className="ml-2 border-l-2 border-border pl-4 space-y-0.5">
                                      {recv.devices.map(dev => (
                                        <div key={dev.id} className="flex items-center gap-2 text-sm py-0.5">
                                          <MonitorSmartphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                          <span className="text-muted-foreground">{dev.name || 'Device'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {(summary.unassignedCameras.length > 0 || summary.unassignedDevices.length > 0) && (
                        <div>
                          <div className="flex items-center gap-2 text-sm py-0.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="font-medium text-amber-600 dark:text-amber-400">Unassigned</span>
                          </div>
                          <div className="ml-2 border-l-2 border-amber-300 dark:border-amber-700 pl-4 space-y-0.5">
                            {summary.unassignedCameras.map(cam => (
                              <div key={cam.id} className="flex items-center gap-2 text-sm py-0.5">
                                <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">{cam.mac_address}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{cam.camera_type}</Badge>
                                {cam.plc_attached && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                                    <Cpu className="h-2.5 w-2.5" /> PLC
                                  </Badge>
                                )}
                              </div>
                            ))}
                            {summary.unassignedDevices.map(dev => (
                              <div key={dev.id} className="flex items-center gap-2 text-sm py-0.5">
                                <MonitorSmartphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">{dev.name || 'Device'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}

        {/* Sign-off Section - always visible below tabs */}
        {!loading && (
          <div className="shrink-0 pt-2">
            {signedOff ? (
              <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4 space-y-1">
                <p className="text-sm font-medium flex items-center gap-1.5 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Signed Off
                </p>
                <p className="text-xs text-muted-foreground">
                  By {signedOffByName || 'Unknown'} on {signedOffAt ? new Date(signedOffAt).toLocaleString() : ''}
                </p>
              </div>
            ) : allTabsGreen ? (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  By signing off, you confirm the feasibility assessment is complete.
                </p>
                {consultantName && (
                  <p className="text-sm">Solutions Consultant: <span className="font-medium">{consultantName}</span></p>
                )}
                {isConsultant ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" /> Enter your password to confirm
                    </div>
                    <Input type="password" placeholder="Password" value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && password) handleSignOff(); }} />
                    <Button onClick={handleSignOff} disabled={!password || submitting} className="w-full">
                      {submitting ? 'Verifying…' : 'Sign Off'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Only the assigned Solutions Consultant can sign off.
                  </p>
                )}
              </div>
            ) : (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  All feasibility tabs must be complete (green) before sign-off is available.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Line Detail Card Component ──
function LineDetailCard({ line }: { line: LineDetailData }) {
  const [open, setOpen] = useState(true);
  const totalCameras = line.positions.reduce((sum, p) => sum + p.equipment.reduce((s, e) => s + e.cameras.length, 0), 0);
  const totalIoT = line.positions.reduce((sum, p) => sum + p.equipment.reduce((s, e) => s + e.iotDevices.length, 0), 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-md border">
        <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors">
          <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
          <Cable className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium text-sm flex-1 text-left">{line.name}</span>
          <div className="flex items-center gap-2">
            {totalCameras > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                <Camera className="h-2.5 w-2.5" /> {totalCameras}
              </Badge>
            )}
            {totalIoT > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                <Zap className="h-2.5 w-2.5" /> {totalIoT}
              </Badge>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-1">
            {line.positions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-6">No positions</p>
            ) : (
              line.positions.map(pos => (
                <div key={pos.id} className="ml-2 border-l-2 border-border pl-4">
                  <p className="text-sm font-medium text-muted-foreground py-0.5">{pos.name}</p>
                  {pos.equipment.map(eq => (
                    <div key={eq.id} className="ml-2 border-l-2 border-border pl-4 py-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{eq.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{eq.type}</Badge>
                      </div>

                      {/* Cameras */}
                      {eq.cameras.map(cam => (
                        <div key={cam.id} className="ml-2 border-l-2 border-green-300 dark:border-green-700 pl-3 mt-1 space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Camera className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                            <span className="text-muted-foreground">{cam.mac_address}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{cam.camera_model}</Badge>
                          </div>

                          {cam.use_cases.length > 0 && (
                            <div className="flex items-start gap-1.5 pl-5">
                              <Eye className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                              <div className="flex flex-wrap gap-1">
                                {cam.use_cases.map(uc => (
                                  <Badge key={uc} variant="secondary" className="text-[10px] px-1.5 py-0">{uc}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {cam.attributes.length > 0 && (
                            <div className="flex items-start gap-1.5 pl-5">
                              <Eye className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                              <div className="flex flex-wrap gap-1">
                                {cam.attributes.map(attr => (
                                  <Badge key={attr.title} variant="outline" className="text-[10px] px-1.5 py-0">{attr.title}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-3 pl-5 text-xs text-muted-foreground">
                            {cam.light && (
                              <span className="flex items-center gap-1">
                                <Lightbulb className={`h-3 w-3 ${cam.light.required ? 'text-yellow-500' : 'text-muted-foreground/40'}`} />
                                {cam.light.required ? (cam.light.model || 'Yes') : 'No'}
                              </span>
                            )}
                            {cam.plc && (
                              <span className="flex items-center gap-1">
                                <Cpu className={`h-3 w-3 ${cam.plc.attached ? 'text-purple-500' : 'text-muted-foreground/40'}`} />
                                {cam.plc.attached ? `${cam.plc.model || 'Yes'}${cam.plc.outputCount > 0 ? ` · ${cam.plc.outputCount} output${cam.plc.outputCount !== 1 ? 's' : ''}` : ''}` : 'No'}
                              </span>
                            )}
                            {cam.hmi && (
                              <span className="flex items-center gap-1">
                                <Monitor className={`h-3 w-3 ${cam.hmi.required ? 'text-orange-500' : 'text-muted-foreground/40'}`} />
                                {cam.hmi.required ? (cam.hmi.model || 'Yes') : 'No'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* IoT Devices */}
                      {eq.iotDevices.map(dev => (
                        <div key={dev.id} className="ml-2 border-l-2 border-blue-300 dark:border-blue-700 pl-3 mt-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Zap className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="text-muted-foreground">{dev.name}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{dev.hardware_model}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

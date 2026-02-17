import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Layers, Camera, Cpu, Eye, Lock, CheckCircle2, Globe, Factory, FolderOpen, Cable, Cloud, Server, Radio, Wifi, MonitorSmartphone } from 'lucide-react';
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
}

interface HierarchyLine { id: string; name: string; solution_type: string; }
interface HierarchyGroup { id: string; name: string; lines: HierarchyLine[]; }
interface HierarchyFactory { id: string; name: string; groups: HierarchyGroup[]; }

interface NetworkCamera { id: string; mac_address: string; camera_type: string; plc_attached: boolean; }
interface NetworkIoTDevice { id: string; name: string | null; }
interface NetworkReceiver { id: string; name: string | null; devices: NetworkIoTDevice[]; }
interface NetworkServer { id: string; name: string | null; cameras: NetworkCamera[]; }
interface NetworkGateway { id: string; name: string | null; receivers: NetworkReceiver[]; }

interface SummaryData {
  lineCount: number;
  cameraCount: number;
  iotDeviceCount: number;
  useCases: string[];
  portal: { url: string } | null;
  factories: HierarchyFactory[];
  servers: NetworkServer[];
  gateways: NetworkGateway[];
}

const emptySummary: SummaryData = {
  lineCount: 0, cameraCount: 0, iotDeviceCount: 0, useCases: [],
  portal: null, factories: [], servers: [], gateways: [],
};

export const FeasibilityGateDialog = ({
  open, onOpenChange, projectId, solutionsConsultantId,
  allTabsGreen, signedOff, signedOffBy, signedOffAt, onSignedOff,
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
      // ── KPI counts (existing logic) ──
      const { data: lines } = await supabase.from('solutions_lines').select('id').eq('solutions_project_id', projectId);
      const lineIds = (lines ?? []).map(l => l.id);
      const lineCount = lineIds.length;
      let cameraCount = 0, iotDeviceCount = 0;
      const useCaseSet = new Set<string>();

      if (lineIds.length > 0) {
        const { data: positions } = await supabase.from('positions').select('id').in('solutions_line_id', lineIds);
        const positionIds = (positions ?? []).map(p => p.id);
        if (positionIds.length > 0) {
          const { data: equipment } = await supabase.from('equipment').select('id').in('position_id', positionIds);
          const equipmentIds = (equipment ?? []).map(e => e.id);
          if (equipmentIds.length > 0) {
            const [{ count: camCount }, { count: iotCount }] = await Promise.all([
              supabase.from('cameras').select('id', { count: 'exact', head: true }).in('equipment_id', equipmentIds),
              supabase.from('iot_devices').select('id', { count: 'exact', head: true }).in('equipment_id', equipmentIds),
            ]);
            cameraCount = camCount ?? 0;
            iotDeviceCount = iotCount ?? 0;
            if (iotDeviceCount > 0) useCaseSet.add('IoT');
            if (cameraCount > 0) {
              const { data: cameras } = await supabase.from('cameras').select('id').in('equipment_id', equipmentIds);
              const cameraIds = (cameras ?? []).map(c => c.id);
              if (cameraIds.length > 0) {
                const { data: caseLinks } = await supabase.from('camera_use_cases').select('vision_use_case_id').in('camera_id', cameraIds);
                const ucIds = [...new Set((caseLinks ?? []).map(c => c.vision_use_case_id))];
                if (ucIds.length > 0) {
                  const { data: ucNames } = await supabase.from('vision_use_cases_master').select('name').in('id', ucIds);
                  (ucNames ?? []).forEach(u => useCaseSet.add(u.name));
                }
              }
            }
          }
        }
      }

      // ── Factory hierarchy (existing logic) ──
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

      // Fetch assignments in parallel
      const serverIds = serverRows.map(s => s.id);
      const gatewayIds = gatewayRows.map(g => g.id);
      const receiverIds = receiverRows.map(r => r.id);

      const [camAssignRes, recGwRes, devRecRes] = await Promise.all([
        serverIds.length > 0
          ? supabase.from('camera_server_assignments').select('camera_id, server_requirement_id').in('server_requirement_id', serverIds)
          : Promise.resolve({ data: [] as { camera_id: string; server_requirement_id: string }[] }),
        gatewayIds.length > 0
          ? supabase.from('receiver_gateway_assignments').select('receiver_requirement_id, gateway_requirement_id').in('gateway_requirement_id', gatewayIds)
          : Promise.resolve({ data: [] as { receiver_requirement_id: string; gateway_requirement_id: string }[] }),
        receiverIds.length > 0
          ? supabase.from('device_receiver_assignments').select('iot_device_id, receiver_requirement_id').in('receiver_requirement_id', receiverIds)
          : Promise.resolve({ data: [] as { iot_device_id: string; receiver_requirement_id: string }[] }),
      ]);

      const camAssigns = (camAssignRes as any).data ?? [];
      const recGwAssigns = (recGwRes as any).data ?? [];
      const devRecAssigns = (devRecRes as any).data ?? [];

      // Fetch camera details for assigned cameras
      const assignedCameraIds = camAssigns.map((a: any) => a.camera_id);
      let cameraDetails: { id: string; mac_address: string; camera_type: string; plc_attached: boolean | null }[] = [];
      if (assignedCameraIds.length > 0) {
        const { data } = await supabase.from('cameras').select('id, mac_address, camera_type, plc_attached').in('id', assignedCameraIds);
        cameraDetails = data ?? [];
      }

      // Fetch IoT device details
      const assignedDeviceIds = devRecAssigns.map((a: any) => a.iot_device_id);
      let deviceDetails: { id: string; name: string | null }[] = [];
      if (assignedDeviceIds.length > 0) {
        const { data } = await supabase.from('iot_devices').select('id, name').in('id', assignedDeviceIds);
        deviceDetails = data ?? [];
      }

      // Build server topology
      const servers: NetworkServer[] = serverRows.map(s => ({
        id: s.id,
        name: s.name,
        cameras: camAssigns
          .filter((a: any) => a.server_requirement_id === s.id)
          .map((a: any) => {
            const cam = cameraDetails.find(c => c.id === a.camera_id);
            return cam ? { id: cam.id, mac_address: cam.mac_address, camera_type: cam.camera_type, plc_attached: !!cam.plc_attached } : null;
          })
          .filter(Boolean) as NetworkCamera[],
      }));

      // Build gateway topology
      const gateways: NetworkGateway[] = gatewayRows.map(g => ({
        id: g.id,
        name: g.name,
        receivers: recGwAssigns
          .filter((a: any) => a.gateway_requirement_id === g.id)
          .map((a: any) => {
            const rec = receiverRows.find(r => r.id === a.receiver_requirement_id);
            return {
              id: a.receiver_requirement_id,
              name: rec?.name ?? null,
              devices: devRecAssigns
                .filter((d: any) => d.receiver_requirement_id === a.receiver_requirement_id)
                .map((d: any) => {
                  const dev = deviceDetails.find(dd => dd.id === d.iot_device_id);
                  return { id: d.iot_device_id, name: dev?.name ?? null };
                }),
            };
          }),
      }));

      setSummary({
        lineCount, cameraCount, iotDeviceCount, useCases: [...useCaseSet].sort(),
        portal: portalData ? { url: portalData.url } : null, factories: factoryHierarchy,
        servers, gateways,
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

  const hasNetworkData = summary.servers.length > 0 || summary.gateways.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Feasibility Gate
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4">
            {/* KPI Cards */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Project Summary</p>
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                </div>
              ) : (
                <>
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

                  {summary.useCases.length > 0 && (
                    <div className="mt-3">
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
                    <div className="mt-4">
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

                  {/* Network Topology */}
                  {hasNetworkData && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Network Topology</p>
                      <div className="rounded-md border p-3 bg-muted/30">
                        {/* Cloud root */}
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Cloud className="h-4 w-4 text-primary shrink-0" />
                          <span>Cloud</span>
                        </div>

                        <div className="ml-2 mt-1 border-l-2 border-border pl-4 space-y-1.5">
                          {/* Servers */}
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

                          {/* Gateways */}
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
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sign-off Section */}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { checkAllLinesComplete } from './lineCompletenessCheck';

interface TabCompleteness {
  overview: boolean;
  contacts: boolean;
  factory: boolean;
  lines: boolean;
  featureRequirements: boolean;
  factoryHardware: boolean;
  infrastructure: boolean;
  factoryConfig: boolean;
}

interface ProjectData {
  id: string;
  company_id: string;
  domain: string;
  site_name: string;
  site_address?: string;
  segment?: string;
  line_description?: string;
  product_description?: string;
  project_goals?: string;
  final_scoping_complete?: boolean;
  contract_signed?: boolean;
  implementation_handover?: boolean;
  servers_required?: number;
  gateways_required?: number;
  tv_display_devices_required?: number;
  receivers_required?: number;
  lines_required?: number;
  companies?: { name: string };
}

export const useTabCompleteness = (project: ProjectData | null, refreshKey?: number) => {
  const [completeness, setCompleteness] = useState<TabCompleteness>({
    overview: false,
    contacts: false,
    factory: false,
    lines: false,
    featureRequirements: false,
    factoryHardware: false,
    infrastructure: false,
    factoryConfig: false,
  });

  useEffect(() => {
    if (!project) return;

    // Overview: ALL displayed fields must be complete
    const overviewComplete = !!(
      project.companies?.name &&
      project.domain &&
      project.site_name &&
      project.site_address &&
      project.segment &&
      project.line_description &&
      project.product_description &&
      project.project_goals &&
      project.line_description &&
      project.product_description
    );

    // Infrastructure: cable spec + at least one bandwidth field + customer confirmation
    const infraComplete = !!(project as any).infra_cable_spec &&
      (!!((project as any).infra_internet_speed_mbps) || !!((project as any).infra_lan_speed_gbps) || !!((project as any).infra_switch_uplink_gbps)) &&
      !!(project as any).infra_customer_confirmed;

    // Factory config: SKU count must be set and > 0
    const factoryConfigComplete = ((project as any).sow_sku_count ?? 0) > 0;

    setCompleteness(prev => ({
      ...prev,
      overview: overviewComplete,
      infrastructure: infraComplete,
      factoryConfig: factoryConfigComplete,
    }));

    // Async checks
    const checkAsync = async () => {
      const [contactsRes, portalRes, linesRes, productGapsRes] = await Promise.all([
        supabase
          .from('contact_solutions_projects')
          .select('id', { count: 'exact', head: true })
          .eq('solutions_project_id', project.id),
        supabase
          .from('solution_portals')
          .select('id, url')
          .eq('solutions_project_id', project.id)
          .maybeSingle(),
        supabase
          .from('solutions_lines')
          .select('id', { count: 'exact', head: true })
          .eq('solutions_project_id', project.id),
        supabase
          .from('product_gaps')
          .select('id', { count: 'exact', head: true })
          .eq('solutions_project_id', project.id)
          .is('resolved_at', null),
      ]);

      const contactsComplete = (contactsRes.count ?? 0) > 0;

      // Factory complete: portal URL, every factory has ≥1 shift + ≥1 group, every group has ≥1 line
      let factoryComplete = false;
      if (portalRes.data?.url) {
        const portalId = portalRes.data.id;
        const { data: factories } = await supabase
          .from('solution_factories' as any)
          .select('id')
          .eq('portal_id', portalId);

        const factoryList = (factories as any[] | null) ?? [];
        if (factoryList.length > 0) {
          const factoryIds = factoryList.map((f: any) => f.id);

          const [shiftsRes, groupsRes] = await Promise.all([
            supabase.from('factory_shifts' as any).select('factory_id').in('factory_id', factoryIds),
            supabase.from('factory_groups' as any).select('id, factory_id').in('factory_id', factoryIds),
          ]);

          const shiftsData = (shiftsRes.data as any[] | null) ?? [];
          const groupsData = (groupsRes.data as any[] | null) ?? [];

          const allFactoriesHaveShifts = factoryIds.every((fid: string) =>
            shiftsData.some((s: any) => s.factory_id === fid)
          );
          const allFactoriesHaveGroups = factoryIds.every((fid: string) =>
            groupsData.some((g: any) => g.factory_id === fid)
          );

          if (allFactoriesHaveShifts && allFactoriesHaveGroups && groupsData.length > 0) {
            const groupIds = groupsData.map((g: any) => g.id);
            const { data: glLines } = await supabase
              .from('factory_group_lines' as any)
              .select('group_id')
              .in('group_id', groupIds);

            const linesData = (glLines as any[] | null) ?? [];
            const allGroupsHaveLines = groupIds.every((gid: string) =>
              linesData.some((l: any) => l.group_id === gid)
            );
            factoryComplete = allGroupsHaveLines;
          }
        }
      }

      const linesComplete = (linesRes.count ?? 0) > 0
        ? await checkAllLinesComplete(project.id)
        : false;
      const featureRequirementsComplete = (productGapsRes.count ?? 0) === 0;

      // Factory Hardware completeness check
      let factoryHardwareComplete = true;
      // Get solutions lines for this project
      const { data: solLines } = await supabase
        .from('solutions_lines')
        .select('id')
        .eq('solutions_project_id', project.id);
      const solLineIds = (solLines || []).map(l => l.id);

      if (solLineIds.length > 0) {
        const posQuery = supabase.from('positions').select('id');
        const { data: posData } = await (posQuery as any).in('solutions_line_id', solLineIds);
        const posIds: string[] = ((posData as any[]) || []).map((p: any) => p.id);

        if (posIds.length > 0) {
          const { data: eq } = await supabase
            .from('equipment')
            .select('id')
            .in('position_id', posIds);
          const eqIds = (eq || []).map(e => e.id);

          if (eqIds.length > 0) {
            // Check cameras and IoT devices
            const [camerasRes, iotRes] = await Promise.all([
              supabase.from('cameras').select('id').in('equipment_id', eqIds),
              supabase.from('iot_devices').select('id').in('equipment_id', eqIds),
            ]);

            const cameraIds = (camerasRes.data || []).map(c => c.id);
            const iotDeviceIds = (iotRes.data || []).map(d => d.id);

            // Get hardware requirements for this project
            const { data: hwReqs } = await supabase
              .from('project_iot_requirements')
              .select('id, hardware_type')
              .eq('solutions_project_id', project.id);
            const reqList = hwReqs || [];
            const serverIds = reqList.filter(r => r.hardware_type === 'server').map(r => r.id);
            const receiverIds = reqList.filter(r => r.hardware_type === 'receiver').map(r => r.id);
            const gatewayIds = reqList.filter(r => r.hardware_type === 'gateway').map(r => r.id);

            // Vision: all cameras assigned to servers
            if (cameraIds.length > 0) {
              if (serverIds.length === 0) {
                factoryHardwareComplete = false;
              } else {
                const { data: camAssigns } = await supabase
                  .from('camera_server_assignments')
                  .select('camera_id')
                  .in('server_requirement_id', serverIds);
                const assignedCamIds = new Set((camAssigns || []).map((a: any) => a.camera_id));
                if (cameraIds.some(id => !assignedCamIds.has(id))) {
                  factoryHardwareComplete = false;
                }
              }
            }

            // IoT: all devices assigned to receivers
            if (factoryHardwareComplete && iotDeviceIds.length > 0) {
              if (receiverIds.length === 0) {
                factoryHardwareComplete = false;
              } else {
                const { data: devAssigns } = await supabase
                  .from('device_receiver_assignments')
                  .select('iot_device_id')
                  .in('receiver_requirement_id', receiverIds);
                const assignedDevIds = new Set((devAssigns || []).map((a: any) => a.iot_device_id));
                if (iotDeviceIds.some(id => !assignedDevIds.has(id))) {
                  factoryHardwareComplete = false;
                }
              }
            }

            // IoT: all receivers assigned to gateways
            if (factoryHardwareComplete && receiverIds.length > 0) {
              if (gatewayIds.length === 0) {
                factoryHardwareComplete = false;
              } else {
                const { data: recAssigns } = await supabase
                  .from('receiver_gateway_assignments')
                  .select('receiver_requirement_id')
                  .in('gateway_requirement_id', gatewayIds);
                const assignedRecIds = new Set((recAssigns || []).map((a: any) => a.receiver_requirement_id));
                if (receiverIds.some(id => !assignedRecIds.has(id))) {
                  factoryHardwareComplete = false;
                }
              }
            }
          }
        }
      }

      setCompleteness(prev => ({
        ...prev,
        overview: overviewComplete,
        contacts: contactsComplete,
        factory: factoryComplete,
        lines: linesComplete,
        featureRequirements: featureRequirementsComplete,
        factoryHardware: factoryHardwareComplete,
      }));
    };

    checkAsync();
  }, [project, refreshKey]);

  return completeness;
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { checkAllLinesComplete } from './lineCompletenessCheck';

export interface MissingItem {
  key: string;
  label: string;
  count?: number;
}

export type TabKey =
  | 'overview' | 'contacts' | 'factory' | 'lines' | 'featureRequirements'
  | 'factoryHardware' | 'infrastructure' | 'factoryConfig' | 'team'
  | 'hardwareSummary' | 'contract' | 'portalConfig' | 'attributes';

interface TabCompleteness {
  overview: boolean;
  contacts: boolean;
  factory: boolean;
  lines: boolean;
  featureRequirements: boolean;
  factoryHardware: boolean;
  infrastructure: boolean;
  factoryConfig: boolean;
  team: boolean;
  hardwareSummary: boolean;
  contract: boolean;
  portalConfig: boolean;
  attributes: boolean;
  missing: Record<TabKey, MissingItem[]>;
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

const emptyMissing = (): Record<TabKey, MissingItem[]> => ({
  overview: [], contacts: [], factory: [], lines: [], featureRequirements: [],
  factoryHardware: [], infrastructure: [], factoryConfig: [], team: [],
  hardwareSummary: [], contract: [], portalConfig: [], attributes: [],
});

const TEAM_LABELS: Record<string, string> = {
  salesperson: 'Salesperson',
  solutions_consultant: 'Solutions Consultant',
  customer_lead: 'Customer Lead',
  implementation_lead: 'Implementation Lead',
  account_manager: 'Account Manager',
  sales_lead: 'Sales Lead',
  ai_iot_engineer: 'AI/IoT Engineer',
  technical_project_lead: 'Technical Project Lead',
  project_coordinator: 'Project Coordinator',
  tech_lead: 'Tech Lead',
  tech_sponsor: 'Tech Sponsor',
  vp_customer_success: 'VP Customer Success',
};

const CONTRACT_LABELS: Record<string, string> = {
  contract_signed_date: 'Contract Signed Date',
  contract_start_date: 'Contract Start Date',
  contract_end_date: 'Contract End Date',
  billing_terms: 'Billing Terms',
  contracted_lines: 'Contracted Lines',
  hardware_fee: 'Hardware Fee',
  capex_fee: 'Capex Fee',
  services_fee: 'Services Fee',
  arr: 'ARR',
  mrr: 'MRR',
  payment_terms_days: 'Payment Terms (days)',
  contracted_days: 'Contracted Days',
};

const INFRA_LABELS: Array<[string, string, 'value' | 'bool']> = [
  ['infra_internet_speed_mbps', 'Internet Speed (Mbps)', 'value'],
  ['infra_lan_speed_gbps', 'LAN Speed (Gbps)', 'value'],
  ['infra_switch_uplink_gbps', 'Switch Uplink (Gbps)', 'value'],
  ['infra_cable_spec', 'Cable Spec', 'value'],
  ['infra_max_cable_distance_m', 'Max Cable Distance (m)', 'value'],
  ['infra_poe_required', 'PoE Required', 'bool'],
  ['infra_dhcp_reservation', 'DHCP Reservation', 'bool'],
  ['infra_remote_access_method', 'Remote Access Method', 'value'],
  ['infra_server_mounting', 'Server Mounting', 'value'],
  ['infra_server_power_supply', 'Server Power Supply', 'value'],
  ['infra_customer_confirmed', 'Customer Confirmed', 'bool'],
];

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
    team: false,
    hardwareSummary: false,
    contract: false,
    portalConfig: false,
    attributes: false,
    missing: emptyMissing(),
  });

  useEffect(() => {
    if (!project) return;
    const p = project as any;
    const missing = emptyMissing();

    // Overview
    const overviewChecks: Array<[any, string, string]> = [
      [project.companies?.name, 'company', 'Company'],
      [project.domain, 'domain', 'Domain'],
      [project.site_name, 'site_name', 'Site Name'],
      [project.site_address, 'site_address', 'Site Address'],
      [project.segment, 'segment', 'Segment'],
      [project.line_description, 'line_description', 'Line Description'],
      [project.product_description, 'product_description', 'Product Description'],
      [project.project_goals, 'project_goals', 'Project Goals'],
    ];
    overviewChecks.forEach(([v, key, label]) => {
      if (!v) missing.overview.push({ key, label });
    });
    const overviewComplete = missing.overview.length === 0;

    // Infrastructure
    INFRA_LABELS.forEach(([key, label, kind]) => {
      const v = p[key];
      const empty = kind === 'bool'
        ? (v === null || v === undefined)
        : !v;
      if (empty) missing.infrastructure.push({ key, label });
    });
    const infraComplete = missing.infrastructure.length === 0;

    // Factory config
    const factoryConfigComplete = (p.sow_sku_count ?? 0) > 0;
    if (!factoryConfigComplete) {
      missing.factoryConfig.push({ key: 'sow_sku_count', label: 'SKU Count' });
    }

    // Team
    Object.entries(TEAM_LABELS).forEach(([field, label]) => {
      if (!p[field]) missing.team.push({ key: field, label });
    });
    const teamComplete = missing.team.length === 0;

    // Contract
    const isCapex = !!p.capex;
    const contractFields = [
      'contract_signed_date', 'contract_start_date', 'contract_end_date',
      'billing_terms', 'contracted_lines',
      isCapex ? 'capex_fee' : 'hardware_fee',
      'services_fee', 'arr', 'mrr', 'payment_terms_days', 'contracted_days',
    ];
    contractFields.forEach(field => {
      const val = p[field];
      if (val === null || val === undefined || val === '') {
        missing.contract.push({ key: field, label: CONTRACT_LABELS[field] || field });
      }
    });
    if (p.break_clause_enabled) {
      if (!p.break_clause_project_date) {
        missing.contract.push({ key: 'break_clause_project_date', label: 'Break Clause Project Date' });
      }
      if (!p.break_clause_key_points_md?.trim()) {
        missing.contract.push({ key: 'break_clause_key_points_md', label: 'Break Clause Key Points' });
      }
    }
    if (p.standard_terms === false && !p.deviation_of_terms?.trim()) {
      missing.contract.push({ key: 'deviation_of_terms', label: 'Deviation of Terms' });
    }
    const contractComplete = missing.contract.length === 0;

    setCompleteness(prev => ({
      ...prev,
      overview: overviewComplete,
      infrastructure: infraComplete,
      factoryConfig: factoryConfigComplete,
      team: teamComplete,
      contract: contractComplete,
      missing: { ...prev.missing, overview: missing.overview, infrastructure: missing.infrastructure, factoryConfig: missing.factoryConfig, team: missing.team, contract: missing.contract },
    }));

    // Async checks
    const checkAsync = async () => {
      const asyncMissing = emptyMissing();
      const isVisionOrHybrid = project.domain === 'Vision' || project.domain === 'Hybrid';

      const baseQueries = [
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
          .is('closed_at', null),
        supabase
          .from('portal_config_tasks')
          .select('id, title, is_complete')
          .eq('solutions_project_id', project.id),
      ] as const;

      const attributesQuery = isVisionOrHybrid
        ? supabase
            .from('project_attributes')
            .select('id', { count: 'exact', head: true })
            .eq('solutions_project_id', project.id)
        : null;

      const [contactsRes, portalRes, linesRes, productGapsRes, portalConfigRes] = await Promise.all(baseQueries);
      const attributesRes = attributesQuery ? await attributesQuery : null;

      const contactsComplete = (contactsRes.count ?? 0) > 0;
      if (!contactsComplete) {
        asyncMissing.contacts.push({ key: 'contacts', label: 'Add at least one contact' });
      }

      // Factory complete
      let factoryComplete = false;
      if (!portalRes.data?.url) {
        asyncMissing.factory.push({ key: 'portal_url', label: 'Portal URL' });
      }
      if (portalRes.data?.url) {
        const portalId = portalRes.data.id;
        const { data: factories } = await supabase
          .from('solution_factories' as any)
          .select('id, name')
          .eq('portal_id', portalId);

        const factoryList = (factories as any[] | null) ?? [];
        if (factoryList.length === 0) {
          asyncMissing.factory.push({ key: 'factories', label: 'Add at least one factory' });
        } else {
          const factoryIds = factoryList.map((f: any) => f.id);

          const [shiftsRes, groupsRes] = await Promise.all([
            supabase.from('factory_shifts' as any).select('factory_id').in('factory_id', factoryIds),
            supabase.from('factory_groups' as any).select('id, factory_id').in('factory_id', factoryIds),
          ]);

          const shiftsData = (shiftsRes.data as any[] | null) ?? [];
          const groupsData = (groupsRes.data as any[] | null) ?? [];

          factoryList.forEach((f: any) => {
            if (!shiftsData.some((s: any) => s.factory_id === f.id)) {
              asyncMissing.factory.push({ key: `shifts_${f.id}`, label: `Shifts for ${f.name || 'factory'}` });
            }
            if (!groupsData.some((g: any) => g.factory_id === f.id)) {
              asyncMissing.factory.push({ key: `groups_${f.id}`, label: `Groups for ${f.name || 'factory'}` });
            }
          });

          if (groupsData.length > 0) {
            const groupIds = groupsData.map((g: any) => g.id);
            const { data: glLines } = await supabase
              .from('factory_group_lines' as any)
              .select('group_id')
              .in('group_id', groupIds);

            const linesData = (glLines as any[] | null) ?? [];
            const groupsWithoutLines = groupIds.filter((gid: string) => !linesData.some((l: any) => l.group_id === gid));
            if (groupsWithoutLines.length > 0) {
              asyncMissing.factory.push({ key: 'group_lines', label: 'Lines for every group', count: groupsWithoutLines.length });
            }
          }
          factoryComplete = asyncMissing.factory.length === 0;
        }
      }

      // Lines
      const hasLines = (linesRes.count ?? 0) > 0;
      let linesComplete = false;
      if (!hasLines) {
        asyncMissing.lines.push({ key: 'lines', label: 'Add at least one line' });
      } else {
        linesComplete = await checkAllLinesComplete(project.id);
        if (!linesComplete) {
          asyncMissing.lines.push({ key: 'line_config', label: 'Complete configuration for every line' });
        }
      }

      const openGaps = productGapsRes.count ?? 0;
      const featureRequirementsComplete = openGaps === 0;
      if (!featureRequirementsComplete) {
        asyncMissing.featureRequirements.push({ key: 'open_gaps', label: 'Open product gaps', count: openGaps });
      }

      // Factory Hardware
      let factoryHardwareComplete = true;
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
            const [camerasRes, iotRes] = await Promise.all([
              supabase.from('cameras').select('id').in('equipment_id', eqIds),
              supabase.from('iot_devices').select('id').in('equipment_id', eqIds),
            ]);

            const cameraIds = (camerasRes.data || []).map(c => c.id);
            const iotDeviceIds = (iotRes.data || []).map(d => d.id);

            const { data: hwReqs } = await supabase
              .from('project_iot_requirements')
              .select('id, hardware_type')
              .eq('solutions_project_id', project.id);
            const reqList = hwReqs || [];
            const serverIds = reqList.filter(r => r.hardware_type === 'server').map(r => r.id);
            const receiverIds = reqList.filter(r => r.hardware_type === 'receiver').map(r => r.id);
            const gatewayIds = reqList.filter(r => r.hardware_type === 'gateway').map(r => r.id);

            if (cameraIds.length > 0) {
              if (serverIds.length === 0) {
                asyncMissing.factoryHardware.push({ key: 'servers', label: 'Add at least one server' });
                factoryHardwareComplete = false;
              } else {
                const { data: camAssigns } = await supabase
                  .from('camera_server_assignments')
                  .select('camera_id')
                  .in('server_requirement_id', serverIds);
                const assignedCamIds = new Set((camAssigns || []).map((a: any) => a.camera_id));
                const unassigned = cameraIds.filter(id => !assignedCamIds.has(id)).length;
                if (unassigned > 0) {
                  asyncMissing.factoryHardware.push({ key: 'unassigned_cameras', label: 'Unassigned cameras (need a server)', count: unassigned });
                  factoryHardwareComplete = false;
                }
              }
            }

            if (iotDeviceIds.length > 0) {
              if (receiverIds.length === 0) {
                asyncMissing.factoryHardware.push({ key: 'receivers', label: 'Add at least one receiver' });
                factoryHardwareComplete = false;
              } else {
                const { data: devAssigns } = await supabase
                  .from('device_receiver_assignments')
                  .select('iot_device_id')
                  .in('receiver_requirement_id', receiverIds);
                const assignedDevIds = new Set((devAssigns || []).map((a: any) => a.iot_device_id));
                const unassigned = iotDeviceIds.filter(id => !assignedDevIds.has(id)).length;
                if (unassigned > 0) {
                  asyncMissing.factoryHardware.push({ key: 'unassigned_iot', label: 'Unassigned IoT devices (need a receiver)', count: unassigned });
                  factoryHardwareComplete = false;
                }
              }
            }

            if (receiverIds.length > 0) {
              if (gatewayIds.length === 0) {
                asyncMissing.factoryHardware.push({ key: 'gateways', label: 'Add at least one gateway' });
                factoryHardwareComplete = false;
              } else {
                const { data: recAssigns } = await supabase
                  .from('receiver_gateway_assignments')
                  .select('receiver_requirement_id')
                  .in('gateway_requirement_id', gatewayIds);
                const assignedRecIds = new Set((recAssigns || []).map((a: any) => a.receiver_requirement_id));
                const unassigned = receiverIds.filter(id => !assignedRecIds.has(id)).length;
                if (unassigned > 0) {
                  asyncMissing.factoryHardware.push({ key: 'unassigned_receivers', label: 'Unassigned receivers (need a gateway)', count: unassigned });
                  factoryHardwareComplete = false;
                }
              }
            }
          }
        }
      }

      // Hardware Summary
      let hardwareSummaryComplete = false;
      const allMasterIds = new Set<string>();

      if (solLineIds.length > 0) {
        const { data: camData } = await supabase
          .from('cameras')
          .select('camera_type, light_id, plc_master_id, hmi_master_id, equipment!inner(solutions_line_id)')
          .in('equipment.solutions_line_id', solLineIds);
        (camData as any[] || []).forEach((c: any) => {
          if (c.camera_type) allMasterIds.add(c.camera_type);
          if (c.light_id) allMasterIds.add(c.light_id);
          if (c.plc_master_id) allMasterIds.add(c.plc_master_id);
          if (c.hmi_master_id) allMasterIds.add(c.hmi_master_id);
        });

        const { data: iotDevData } = await supabase
          .from('iot_devices')
          .select('hardware_master_id, equipment!inner(solutions_line_id)')
          .in('equipment.solutions_line_id', solLineIds);
        (iotDevData as any[] || []).forEach((d: any) => {
          if (d.hardware_master_id) allMasterIds.add(d.hardware_master_id);
        });
      }

      const { data: directReqs } = await supabase
        .from('project_iot_requirements')
        .select('hardware_master_id')
        .eq('solutions_project_id', project.id);
      (directReqs || []).forEach(r => {
        if (r.hardware_master_id) allMasterIds.add(r.hardware_master_id);
      });

      if (allMasterIds.size === 0) {
        asyncMissing.hardwareSummary.push({ key: 'hardware', label: 'No hardware to price yet' });
      } else {
        const { data: pricedRows } = await (supabase as any)
          .from('solutions_hardware_customer_prices')
          .select('hardware_master_id')
          .eq('solutions_project_id', project.id)
          .in('hardware_master_id', [...allMasterIds]);
        const pricedIds = new Set((pricedRows || []).map((r: any) => r.hardware_master_id));
        const unpriced = [...allMasterIds].filter(id => !pricedIds.has(id)).length;
        hardwareSummaryComplete = unpriced === 0;
        if (!hardwareSummaryComplete) {
          asyncMissing.hardwareSummary.push({ key: 'unpriced', label: 'Hardware items missing customer price', count: unpriced });
        }
      }

      // Portal config
      const portalConfigRows = (portalConfigRes.data as any[]) || [];
      const portalConfigComplete = portalConfigRows.length > 0 && portalConfigRows.every((r: any) => r.is_complete);
      if (portalConfigRows.length === 0) {
        asyncMissing.portalConfig.push({ key: 'tasks', label: 'No portal config tasks yet' });
      } else {
        portalConfigRows.filter((r: any) => !r.is_complete).forEach((r: any) => {
          asyncMissing.portalConfig.push({ key: `task_${r.id}`, label: r.title || 'Task' });
        });
      }

      // Attributes
      const attrCount = attributesRes?.count ?? 0;
      const attributesComplete = isVisionOrHybrid ? attrCount > 0 : true;
      if (isVisionOrHybrid && !attributesComplete) {
        asyncMissing.attributes.push({ key: 'attributes', label: 'Add at least one project attribute' });
      }

      setCompleteness(prev => ({
        ...prev,
        contacts: contactsComplete,
        factory: factoryComplete,
        lines: linesComplete,
        featureRequirements: featureRequirementsComplete,
        factoryHardware: factoryHardwareComplete,
        hardwareSummary: hardwareSummaryComplete,
        portalConfig: portalConfigComplete,
        attributes: attributesComplete,
        missing: {
          ...prev.missing,
          contacts: asyncMissing.contacts,
          factory: asyncMissing.factory,
          lines: asyncMissing.lines,
          featureRequirements: asyncMissing.featureRequirements,
          factoryHardware: asyncMissing.factoryHardware,
          hardwareSummary: asyncMissing.hardwareSummary,
          portalConfig: asyncMissing.portalConfig,
          attributes: asyncMissing.attributes,
        },
      }));
    };

    checkAsync().catch(err => {
      console.error('useTabCompleteness async check failed:', err);
    });
  }, [project, refreshKey]);

  return completeness;
};

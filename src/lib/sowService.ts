import { supabase } from '@/integrations/supabase/client';

// ─── Cleaned SOWData interface (no internal IDs, MACs, IPs) ───

export interface SOWData {
  customerLegalName: string;
  siteAddress: string;
  deploymentType: string;
  segment: string;
  processDescription: string;
  productDescription: string;
  projectGoals: string;

  contacts: { role: string; name: string }[];

  portalUrl: string;
  factories: {
    name: string;
    shifts: { day: number; shiftName: string; startTime: string; endTime: string }[];
    groups: { name: string; lines: { name: string; solutionType: string }[] }[];
  }[];

  lines: {
    lineName: string;
    deploymentType: string;
    minSpeed: number;
    maxSpeed: number;
    lineDescription: string;
    productDescription: string;
    numberOfProducts: number | null;
    numberOfArtworks: number | null;
    positions: {
      name: string;
      titles: string[];
      equipment: {
        name: string;
        type: string;
        cameras: {
          cameraType: string;
          lensType: string;
          useCases: string[];
          useCaseDescription: string;
          attributes: { title: string; description: string }[];
          productFlow: string;
          cameraViewDescription: string;
          lightRequired: boolean | null;
          lightModel: string;
          plcAttached: boolean | null;
          plcModel: string;
          relayOutputs: { outputNumber: number; type: string; customName: string }[];
          hmiRequired: boolean | null;
          hmiModel: string;
          placementPositionDescription: string;
          horizontalFov: string;
          workingDistance: string;
        }[];
        iotDevices: {
          name: string;
          hardwareModelName: string;
        }[];
      }[];
    }[];
  }[];

  hardware: {
    servers: { name: string; model: string; assignedCameras: number }[];
    gateways: { name: string; model: string }[];
    receivers: { name: string; model: string }[];
    totalCameras: number;
    totalIotDevices: number;
  };

  // Infrastructure – "Required" | "Not Required"
  infrastructure: {
    networkPorts: string;
    vlan: string;
    staticIp: string;
    tenGbConnection: string;
    mountFabrication: string;
    vpn: string;
    storage: string;
    loadBalancer: string;
  };

  // Performance envelope
  skuCount: number | null;
  complexityTier: string | null;
  detectionAccuracyTarget: number | null;
  falsePositiveRate: number | null;
  productPresentationAssumptions: string | null;
  environmentalStabilityAssumptions: string | null;

  // Model training
  initialTrainingCycle: string | null;
  validationPeriod: string | null;
  retrainingExclusions: string | null;

  // Acceptance & go-live
  goLiveDefinition: string | null;
  acceptanceCriteria: string | null;
  stabilityPeriod: string | null;
  hypercareWindow: string | null;

  // Governance
  feasibilitySignedOff: boolean;
  feasibilitySignedOffBy: string | null;
  feasibilitySignedOffAt: string | null;
  generatedAt: string;
}

// ─── Validation ───

export interface SOWValidationResult {
  ready: boolean;
  missing: string[];
}

const INFRA_FIELDS = [
  { key: 'infra_network_ports', label: 'Network Ports' },
  { key: 'infra_vlan', label: 'VLAN' },
  { key: 'infra_static_ip', label: 'Static IP' },
  { key: 'infra_10gb_connection', label: '10Gb Connection' },
  { key: 'infra_mount_fabrication', label: 'Mount Fabrication' },
  { key: 'infra_vpn', label: 'VPN' },
  { key: 'infra_storage', label: 'Storage' },
  { key: 'infra_load_balancer', label: 'Load Balancer' },
] as const;

export function validateSOWReadiness(project: any, lines: any[]): SOWValidationResult {
  const missing: string[] = [];

  // All deployments
  if (!project.feasibility_signed_off) missing.push('Feasibility Status must be Approved');
  if (!project.sow_acceptance_criteria) missing.push('Acceptance Criteria');

  for (const f of INFRA_FIELDS) {
    const val = project[f.key];
    if (val !== 'Required' && val !== 'Not Required') {
      missing.push(`Infrastructure: ${f.label}`);
    }
  }

  // Vision / Hybrid
  const domain = project.domain as string;
  if (domain === 'Vision' || domain === 'Hybrid') {
    if (!project.sow_sku_count) missing.push('SKU Count');
    if (!project.sow_complexity_tier) missing.push('Complexity Tier');
    if (project.sow_detection_accuracy_target == null) missing.push('Detection Accuracy Target');
    if (project.sow_false_positive_rate == null) missing.push('False Positive Rate');
    if (!project.sow_go_live_definition) missing.push('Go-Live Definition');

    // Check lines have speed
    const hasLineSpeed = lines.length > 0 && lines.every(l => l.min_speed > 0 && l.max_speed > 0);
    if (!hasLineSpeed) missing.push('Throughput Range (all lines must have Min & Max speed)');
  }

  return { ready: missing.length === 0, missing };
}

// ─── Data aggregation ───

export async function aggregateSOWData(projectId: string): Promise<SOWData> {
  const { data: project, error: projErr } = await supabase
    .from('solutions_projects')
    .select('*, companies(name)')
    .eq('id', projectId)
    .single();

  if (projErr || !project) throw new Error('Failed to fetch project');

  // Team member names
  const teamFields = [
    { field: 'salesperson', label: 'Salesperson' },
    { field: 'solutions_consultant', label: 'Solutions Consultant' },
    { field: 'customer_lead', label: 'Customer Project Lead' },
    { field: 'implementation_lead', label: 'Implementation Lead' },
    { field: 'ai_iot_engineer', label: 'AI/IoT Engineer' },
    { field: 'technical_project_lead', label: 'Technical Project Lead' },
    { field: 'project_coordinator', label: 'Project Coordinator' },
    { field: 'sales_lead', label: 'Sales Lead' },
    { field: 'account_manager', label: 'Account Manager' },
    { field: 'tech_lead', label: 'Tech/Dev Lead' },
    { field: 'tech_sponsor', label: 'Tech/Dev Sponsor' },
    { field: 'vp_customer_success', label: 'VP Customer Success' },
  ];

  const userIds = teamFields.map(t => (project as any)[t.field]).filter(Boolean);
  let profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', userIds);
    for (const p of profiles || []) profileMap[p.user_id] = p.name || 'Unknown';
  }

  // Only include assigned contacts (strip userId, skip unassigned)
  const contacts = teamFields
    .filter(t => (project as any)[t.field] && profileMap[(project as any)[t.field]])
    .map(t => ({ role: t.label, name: profileMap[(project as any)[t.field]] }));

  // Factory config
  const { data: portal } = await supabase.from('solution_portals').select('*').eq('solutions_project_id', projectId).maybeSingle();
  let factoriesData: SOWData['factories'] = [];
  if (portal) {
    const { data: factories } = await supabase.from('solution_factories').select('*').eq('portal_id', portal.id).order('created_at');
    if (factories && factories.length > 0) {
      const factoryIds = factories.map(f => f.id);
      const [shiftsRes, groupsRes] = await Promise.all([
        supabase.from('factory_shifts').select('*').in('factory_id', factoryIds).order('day_of_week'),
        supabase.from('factory_groups').select('*').in('factory_id', factoryIds).order('created_at'),
      ]);
      const groupIds = (groupsRes.data || []).map(g => g.id);
      let fgLines: any[] = [];
      if (groupIds.length > 0) {
        const { data: lineData } = await supabase.from('factory_group_lines').select('*').in('group_id', groupIds);
        fgLines = (lineData || []) as any[];
      }
      factoriesData = factories.map(f => ({
        name: f.name,
        shifts: (shiftsRes.data || []).filter(s => s.factory_id === f.id).map(s => ({ day: s.day_of_week, shiftName: s.shift_name, startTime: s.start_time, endTime: s.end_time })),
        groups: (groupsRes.data || []).filter(g => g.factory_id === f.id).map(g => ({
          name: g.name,
          lines: fgLines.filter(l => l.group_id === g.id).map(l => ({ name: l.name, solutionType: l.solution_type || 'both' })),
        })),
      }));
    }
  }

  // Lines
  const { data: solLines } = await supabase.from('solutions_lines').select('*').eq('solutions_project_id', projectId).order('created_at');
  const { data: useCaseMaster } = await supabase.from('vision_use_cases_master').select('id, name');
  const ucMap: Record<string, string> = {};
  for (const uc of useCaseMaster || []) ucMap[uc.id] = uc.name;

  const { data: hwMaster } = await supabase.from('hardware_master').select('id, product_name, sku_no');
  const hwMap: Record<string, string> = {};
  for (const hw of hwMaster || []) hwMap[hw.id] = `${hw.product_name} ${hw.sku_no || ''}`.trim();

  const linesData: SOWData['lines'] = [];
  for (const sl of solLines || []) {
    try {
      const { data: lineFullData } = await supabase.rpc('get_line_full_data', { p_input_line_id: sl.id, p_table_name: 'solutions_lines' });
      const ld = lineFullData as any;
      const matchingFgLine = factoriesData.flatMap(f => f.groups.flatMap(g => g.lines)).find(l => l.name === sl.line_name);

      const positions = (ld?.positions || []).map((pos: any) => ({
        name: pos.name,
        titles: (pos.position_titles || []).map((t: any) => t.title),
        equipment: (pos.equipment || []).map((eq: any) => ({
          name: eq.name,
          type: eq.equipment_type || '',
          cameras: (eq.cameras || []).map((cam: any) => ({
            cameraType: cam.camera_type || '',
            lensType: cam.lens_type || '',
            useCases: (cam.use_case_ids || []).map((uid: string) => ucMap[uid] || '').filter(Boolean),
            useCaseDescription: cam.use_case_description || '',
            attributes: (cam.attributes || []).map((a: any) => ({ title: a.title, description: a.description || '' })),
            productFlow: cam.product_flow || '',
            cameraViewDescription: cam.camera_view_description || '',
            lightRequired: cam.light_required,
            lightModel: cam.light_id ? hwMap[cam.light_id] || '' : '',
            plcAttached: cam.plc_attached,
            plcModel: cam.plc_master_id ? hwMap[cam.plc_master_id] || '' : '',
            relayOutputs: (cam.relay_outputs || []).map((ro: any) => ({ outputNumber: ro.output_number, type: ro.type || '', customName: ro.custom_name || '' })),
            hmiRequired: cam.hmi_required,
            hmiModel: cam.hmi_master_id ? hwMap[cam.hmi_master_id] || '' : '',
            placementPositionDescription: cam.placement_position_description || '',
            horizontalFov: cam.horizontal_fov || '',
            workingDistance: cam.working_distance || '',
          })),
          iotDevices: (eq.iot_devices || []).map((iot: any) => ({
            name: iot.name || '',
            hardwareModelName: iot.hardware_master_id ? hwMap[iot.hardware_master_id] || '' : '',
          })),
        })),
      }));

      linesData.push({
        lineName: sl.line_name || ld?.lineData?.name || '',
        deploymentType: matchingFgLine?.solutionType || 'both',
        minSpeed: ld?.lineData?.min_speed || 0,
        maxSpeed: ld?.lineData?.max_speed || 0,
        lineDescription: ld?.lineData?.line_description || '',
        productDescription: ld?.lineData?.product_description || '',
        numberOfProducts: ld?.lineData?.number_of_products,
        numberOfArtworks: ld?.lineData?.number_of_artworks,
        positions,
      });
    } catch (e) {
      console.error('Error loading line data:', e);
    }
  }

  // Hardware architecture (stripped of IDs)
  const { data: hwReqs } = await supabase.from('project_iot_requirements').select('*').eq('solutions_project_id', projectId);
  const servers = (hwReqs || []).filter(r => r.hardware_type === 'server');
  const gateways = (hwReqs || []).filter(r => r.hardware_type === 'gateway');
  const receivers = (hwReqs || []).filter(r => r.hardware_type === 'receiver');

  let serverAssignments: Record<string, number> = {};
  if (servers.length > 0) {
    const { data: camAssigns } = await supabase.from('camera_server_assignments').select('server_requirement_id').in('server_requirement_id', servers.map(s => s.id));
    for (const a of camAssigns || []) serverAssignments[a.server_requirement_id] = (serverAssignments[a.server_requirement_id] || 0) + 1;
  }

  const totalCameras = linesData.reduce((sum, line) => sum + line.positions.reduce((ps, pos) => ps + pos.equipment.reduce((es, eq) => es + eq.cameras.length, 0), 0), 0);
  const totalIotDevices = linesData.reduce((sum, line) => sum + line.positions.reduce((ps, pos) => ps + pos.equipment.reduce((es, eq) => es + eq.iotDevices.length, 0), 0), 0);

  const feasibilitySignedOffBy = (project as any).feasibility_signed_off_by;
  let feasibilitySignedOffByName = '';
  if (feasibilitySignedOffBy) feasibilitySignedOffByName = profileMap[feasibilitySignedOffBy] || 'Unknown';

  return {
    customerLegalName: project.companies?.name || '',
    siteAddress: project.site_address || '',
    deploymentType: project.domain || '',
    segment: project.segment || '',
    processDescription: project.line_description || '',
    productDescription: project.product_description || '',
    projectGoals: project.project_goals || '',
    contacts,
    portalUrl: portal?.url || '',
    factories: factoriesData,
    lines: linesData,
    hardware: {
      servers: servers.map(s => ({ name: s.name || '', model: s.hardware_master_id ? hwMap[s.hardware_master_id] || '' : '', assignedCameras: serverAssignments[s.id] || 0 })),
      gateways: gateways.map(g => ({ name: g.name || '', model: g.hardware_master_id ? hwMap[g.hardware_master_id] || '' : '' })),
      receivers: receivers.map(r => ({ name: r.name || '', model: r.hardware_master_id ? hwMap[r.hardware_master_id] || '' : '' })),
      totalCameras,
      totalIotDevices,
    },
    infrastructure: {
      networkPorts: (project as any).infra_network_ports || '',
      vlan: (project as any).infra_vlan || '',
      staticIp: (project as any).infra_static_ip || '',
      tenGbConnection: (project as any).infra_10gb_connection || '',
      mountFabrication: (project as any).infra_mount_fabrication || '',
      vpn: (project as any).infra_vpn || '',
      storage: (project as any).infra_storage || '',
      loadBalancer: (project as any).infra_load_balancer || '',
    },
    skuCount: (project as any).sow_sku_count ?? null,
    complexityTier: (project as any).sow_complexity_tier ?? null,
    detectionAccuracyTarget: (project as any).sow_detection_accuracy_target ?? null,
    falsePositiveRate: (project as any).sow_false_positive_rate ?? null,
    productPresentationAssumptions: (project as any).sow_product_presentation_assumptions ?? null,
    environmentalStabilityAssumptions: (project as any).sow_environmental_stability_assumptions ?? null,
    initialTrainingCycle: (project as any).sow_initial_training_cycle ?? null,
    validationPeriod: (project as any).sow_validation_period ?? null,
    retrainingExclusions: (project as any).sow_retraining_exclusions ?? null,
    goLiveDefinition: (project as any).sow_go_live_definition ?? null,
    acceptanceCriteria: (project as any).sow_acceptance_criteria ?? null,
    stabilityPeriod: (project as any).sow_stability_period ?? null,
    hypercareWindow: (project as any).sow_hypercare_window ?? null,
    feasibilitySignedOff: (project as any).feasibility_signed_off ?? false,
    feasibilitySignedOffBy: feasibilitySignedOffByName,
    feasibilitySignedOffAt: (project as any).feasibility_signed_off_at,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Generate / Fetch / History ───

export async function generateSOW(projectId: string, userId: string): Promise<{ sowId: string; version: number }> {
  const sowData = await aggregateSOWData(projectId);

  await supabase.from('sow_versions').update({ is_current: false, status: 'superseded' } as any).eq('solutions_project_id', projectId);

  const { data: existing } = await supabase.from('sow_versions').select('version').eq('solutions_project_id', projectId).order('version', { ascending: false }).limit(1);
  const nextVersion = (existing && existing.length > 0) ? (existing[0] as any).version + 1 : 1;

  const { data: newSow, error } = await supabase.from('sow_versions').insert({
    solutions_project_id: projectId,
    version: nextVersion,
    status: 'current',
    sow_data: sowData as any,
    generated_by: userId,
    is_current: true,
    change_summary: nextVersion === 1 ? 'Initial SOW generation' : 'Regenerated from updated feasibility data',
  } as any).select().single();

  if (error) throw error;
  return { sowId: (newSow as any).id, version: nextVersion };
}

export async function fetchCurrentSOW(projectId: string) {
  const { data, error } = await supabase.from('sow_versions').select('*').eq('solutions_project_id', projectId).eq('is_current', true).maybeSingle();
  if (error) throw error;
  return data as any;
}

export async function fetchSOWHistory(projectId: string) {
  const { data, error } = await supabase.from('sow_versions').select('id, version, status, generated_by, generated_at, change_summary, is_current').eq('solutions_project_id', projectId).order('version', { ascending: false });
  if (error) throw error;

  const userIds = [...new Set((data || []).map((d: any) => d.generated_by).filter(Boolean))];
  let nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', userIds);
    for (const p of profiles || []) nameMap[p.user_id] = p.name || 'Unknown';
  }

  return (data || []).map((d: any) => ({ ...d, generatedByName: nameMap[d.generated_by] || 'Unknown' }));
}

// Helper to fetch lines for validation
export async function fetchSolutionsLines(projectId: string) {
  const { data } = await supabase.from('solutions_lines').select('min_speed, max_speed').eq('solutions_project_id', projectId);
  return data || [];
}

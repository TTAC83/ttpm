import { supabase } from '@/integrations/supabase/client';

export interface SOWData {
  // Customer Information
  customerLegalName: string;
  siteAddress: string;
  deploymentType: string;
  segment: string;
  processDescription: string;
  productDescription: string;
  projectGoals: string;

  // Contacts (from Team tab assignments)
  contacts: {
    role: string;
    name: string;
    userId: string | null;
  }[];

  // Portal Configuration
  portalUrl: string;
  factories: {
    name: string;
    shifts: { day: number; shiftName: string; startTime: string; endTime: string }[];
    groups: {
      name: string;
      lines: { name: string; solutionType: string }[];
    }[];
  }[];

  // Line Configuration
  lines: {
    lineName: string;
    deploymentType: string;
    minSpeed: number;
    maxSpeed: number;
    lineDescription: string;
    productDescription: string;
    numberOfProducts: number | null;
    numberOfArtworks: number | null;
    photosUrl: string;
    positions: {
      name: string;
      titles: string[];
      equipment: {
        name: string;
        type: string;
        cameras: {
          name: string;
          cameraType: string;
          lensType: string;
          cameraIp: string;
          useCases: string[];
          useCaseDescription: string;
          attributes: { title: string; description: string }[];
          productFlow: string;
          cameraViewDescription: string;
          lightRequired: boolean | null;
          lightModel: string;
          plcAttached: boolean | null;
          plcModel: string;
          relayOutputs: { outputNumber: number; type: string; customName: string; notes: string }[];
          hmiRequired: boolean | null;
          hmiModel: string;
          placementCanFit: boolean | null;
          placementFabricationConfirmed: boolean | null;
          placementFovSuitable: boolean | null;
          placementPositionDescription: string;
          horizontalFov: string;
          workingDistance: string;
          smallestText: string;
        }[];
        iotDevices: {
          name: string;
          hardwareMasterId: string;
          hardwareModelName: string;
          receiverMacAddress: string;
        }[];
      }[];
    }[];
  }[];

  // Hardware Architecture
  hardware: {
    servers: { id: string; name: string; model: string; assignedCameras: number }[];
    gateways: { id: string; name: string; model: string; assignedReceivers: number }[];
    receivers: { id: string; name: string; model: string; assignedDevices: number }[];
    totalCameras: number;
    totalIotDevices: number;
  };

  // Infrastructure (stubbed fields)
  infrastructure: {
    requiredPorts: string;
    vlanRequired: string;
    staticIpRequired: string;
    tenGbConnectionRequired: string;
    mountFabricationRequired: string;
    vpn: string;
    storageRequirements: string;
    loadBalancer: string;
  };

  // ERP Integration (stubbed)
  erpIntegration: {
    applicable: boolean;
    erpType: string;
    dataDirection: string;
    dataFields: string;
  };

  // Model & Dataset (stubbed)
  modelDataset: {
    skuCount: string;
    complexityTier: string;
    throughput: string;
    detectionAccuracyTarget: string;
    falsePositiveRate: string;
  };

  // Go-Live Definition (stubbed)
  goLiveDefinition: string;

  // Metadata
  feasibilitySignedOff: boolean;
  feasibilitySignedOffBy: string | null;
  feasibilitySignedOffAt: string | null;
  generatedAt: string;
}

export async function aggregateSOWData(projectId: string): Promise<SOWData> {
  // 1. Fetch project data
  const { data: project, error: projErr } = await supabase
    .from('solutions_projects')
    .select('*, companies(name)')
    .eq('id', projectId)
    .single();

  if (projErr || !project) throw new Error('Failed to fetch project');

  // 2. Fetch team member names
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

  const userIds = teamFields
    .map(t => (project as any)[t.field])
    .filter(Boolean);

  let profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', userIds);
    for (const p of profiles || []) {
      profileMap[p.user_id] = p.name || 'Unknown';
    }
  }

  const contacts = teamFields.map(t => ({
    role: t.label,
    name: profileMap[(project as any)[t.field]] || 'Not assigned',
    userId: (project as any)[t.field] || null,
  }));

  // 3. Fetch factory config
  const { data: portal } = await supabase
    .from('solution_portals')
    .select('*')
    .eq('solutions_project_id', projectId)
    .maybeSingle();

  let factoriesData: SOWData['factories'] = [];
  if (portal) {
    const { data: factories } = await supabase
      .from('solution_factories')
      .select('*')
      .eq('portal_id', portal.id)
      .order('created_at');

    if (factories && factories.length > 0) {
      const factoryIds = factories.map(f => f.id);
      const [shiftsRes, groupsRes] = await Promise.all([
        supabase.from('factory_shifts').select('*').in('factory_id', factoryIds).order('day_of_week'),
        supabase.from('factory_groups').select('*').in('factory_id', factoryIds).order('created_at'),
      ]);

      const groupIds = (groupsRes.data || []).map(g => g.id);
      let fgLines: any[] = [];
      if (groupIds.length > 0) {
        const { data: lineData } = await supabase
          .from('factory_group_lines')
          .select('*')
          .in('group_id', groupIds);
        fgLines = (lineData || []) as any[];
      }

      factoriesData = factories.map(f => ({
        name: f.name,
        shifts: (shiftsRes.data || [])
          .filter(s => s.factory_id === f.id)
          .map(s => ({ day: s.day_of_week, shiftName: s.shift_name, startTime: s.start_time, endTime: s.end_time })),
        groups: (groupsRes.data || [])
          .filter(g => g.factory_id === f.id)
          .map(g => ({
            name: g.name,
            lines: fgLines
              .filter(l => l.group_id === g.id)
              .map(l => ({ name: l.name, solutionType: l.solution_type || 'both' })),
          })),
      }));
    }
  }

  // 4. Fetch solutions lines + full data via RPC
  const { data: solLines } = await supabase
    .from('solutions_lines')
    .select('*')
    .eq('solutions_project_id', projectId)
    .order('created_at');

  // Fetch use case names
  const { data: useCaseMaster } = await supabase
    .from('vision_use_cases_master')
    .select('id, name');
  const ucMap: Record<string, string> = {};
  for (const uc of useCaseMaster || []) {
    ucMap[uc.id] = uc.name;
  }

  // Fetch hardware master names
  const { data: hwMaster } = await supabase
    .from('hardware_master')
    .select('id, product_name, sku_no');
  const hwMap: Record<string, string> = {};
  for (const hw of hwMaster || []) {
    hwMap[hw.id] = `${hw.product_name} ${hw.sku_no || ''}`.trim();
  }

  const linesData: SOWData['lines'] = [];
  for (const sl of solLines || []) {
    try {
      const { data: lineFullData } = await supabase.rpc('get_line_full_data', {
        p_input_line_id: sl.id,
        p_table_name: 'solutions_lines',
      });

      const ld = lineFullData as any;
      const positions = (ld?.positions || []).map((pos: any) => ({
        name: pos.name,
        titles: (pos.position_titles || []).map((t: any) => t.title),
        equipment: (pos.equipment || []).map((eq: any) => ({
          name: eq.name,
          type: eq.equipment_type || '',
          cameras: (eq.cameras || []).map((cam: any) => ({
            name: cam.name || cam.mac_address || '',
            cameraType: cam.camera_type || '',
            lensType: cam.lens_type || '',
            cameraIp: cam.camera_ip || '',
            useCases: (cam.use_case_ids || []).map((uid: string) => ucMap[uid] || uid),
            useCaseDescription: cam.use_case_description || '',
            attributes: (cam.attributes || []).map((a: any) => ({ title: a.title, description: a.description || '' })),
            productFlow: cam.product_flow || '',
            cameraViewDescription: cam.camera_view_description || '',
            lightRequired: cam.light_required,
            lightModel: cam.light_id ? hwMap[cam.light_id] || '' : '',
            plcAttached: cam.plc_attached,
            plcModel: cam.plc_master_id ? hwMap[cam.plc_master_id] || '' : '',
            relayOutputs: (cam.relay_outputs || []).map((ro: any) => ({
              outputNumber: ro.output_number,
              type: ro.type || '',
              customName: ro.custom_name || '',
              notes: ro.notes || '',
            })),
            hmiRequired: cam.hmi_required,
            hmiModel: cam.hmi_master_id ? hwMap[cam.hmi_master_id] || '' : '',
            placementCanFit: cam.placement_camera_can_fit,
            placementFabricationConfirmed: cam.placement_fabrication_confirmed,
            placementFovSuitable: cam.placement_fov_suitable,
            placementPositionDescription: cam.placement_position_description || '',
            horizontalFov: cam.horizontal_fov || '',
            workingDistance: cam.working_distance || '',
            smallestText: cam.smallest_text || '',
          })),
          iotDevices: (eq.iot_devices || []).map((iot: any) => ({
            name: iot.name || '',
            hardwareMasterId: iot.hardware_master_id || '',
            hardwareModelName: iot.hardware_master_id ? hwMap[iot.hardware_master_id] || '' : '',
            receiverMacAddress: iot.receiver_mac_address || '',
          })),
        })),
      }));

      // Determine solution type from factory config
      const matchingFgLine = factoriesData
        .flatMap(f => f.groups.flatMap(g => g.lines))
        .find(l => l.name === sl.line_name);

      linesData.push({
        lineName: sl.line_name || ld?.lineData?.name || '',
        deploymentType: matchingFgLine?.solutionType || 'both',
        minSpeed: ld?.lineData?.min_speed || 0,
        maxSpeed: ld?.lineData?.max_speed || 0,
        lineDescription: ld?.lineData?.line_description || '',
        productDescription: ld?.lineData?.product_description || '',
        numberOfProducts: ld?.lineData?.number_of_products,
        numberOfArtworks: ld?.lineData?.number_of_artworks,
        photosUrl: ld?.lineData?.photos_url || '',
        positions,
      });
    } catch (e) {
      console.error('Error loading line data:', e);
    }
  }

  // 5. Fetch hardware architecture
  const { data: hwReqs } = await supabase
    .from('project_iot_requirements')
    .select('*')
    .eq('solutions_project_id', projectId);

  const servers = (hwReqs || []).filter(r => r.hardware_type === 'server');
  const gateways = (hwReqs || []).filter(r => r.hardware_type === 'gateway');
  const receivers = (hwReqs || []).filter(r => r.hardware_type === 'receiver');

  // Count assignments
  let serverAssignments: Record<string, number> = {};
  if (servers.length > 0) {
    const { data: camAssigns } = await supabase
      .from('camera_server_assignments')
      .select('server_requirement_id')
      .in('server_requirement_id', servers.map(s => s.id));
    for (const a of camAssigns || []) {
      serverAssignments[a.server_requirement_id] = (serverAssignments[a.server_requirement_id] || 0) + 1;
    }
  }

  const totalCameras = linesData.reduce((sum, line) =>
    sum + line.positions.reduce((ps, pos) =>
      ps + pos.equipment.reduce((es, eq) => es + eq.cameras.length, 0), 0), 0);
  const totalIotDevices = linesData.reduce((sum, line) =>
    sum + line.positions.reduce((ps, pos) =>
      ps + pos.equipment.reduce((es, eq) => es + eq.iotDevices.length, 0), 0), 0);

  // Get feasibility sign-off info
  const feasibilitySignedOffBy = (project as any).feasibility_signed_off_by;
  let feasibilitySignedOffByName = '';
  if (feasibilitySignedOffBy) {
    feasibilitySignedOffByName = profileMap[feasibilitySignedOffBy] || 'Unknown';
  }

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
      servers: servers.map(s => ({
        id: s.id,
        name: s.name || '',
        model: s.hardware_master_id ? hwMap[s.hardware_master_id] || '' : '',
        assignedCameras: serverAssignments[s.id] || 0,
      })),
      gateways: gateways.map(g => ({
        id: g.id,
        name: g.name || '',
        model: g.hardware_master_id ? hwMap[g.hardware_master_id] || '' : '',
        assignedReceivers: 0,
      })),
      receivers: receivers.map(r => ({
        id: r.id,
        name: r.name || '',
        model: r.hardware_master_id ? hwMap[r.hardware_master_id] || '' : '',
        assignedDevices: 0,
      })),
      totalCameras,
      totalIotDevices,
    },
    infrastructure: {
      requiredPorts: 'Not configured',
      vlanRequired: 'Not configured',
      staticIpRequired: 'Not configured',
      tenGbConnectionRequired: 'Not configured',
      mountFabricationRequired: 'Not configured',
      vpn: 'Not configured',
      storageRequirements: 'Not configured',
      loadBalancer: 'Not configured',
    },
    erpIntegration: {
      applicable: false,
      erpType: 'Not configured',
      dataDirection: 'Not configured',
      dataFields: 'Not configured',
    },
    modelDataset: {
      skuCount: 'Not configured',
      complexityTier: 'Not configured',
      throughput: 'Not configured',
      detectionAccuracyTarget: 'Not configured',
      falsePositiveRate: 'Not configured',
    },
    goLiveDefinition: 'Not configured',
    feasibilitySignedOff: (project as any).feasibility_signed_off ?? false,
    feasibilitySignedOffBy: feasibilitySignedOffByName,
    feasibilitySignedOffAt: (project as any).feasibility_signed_off_at,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateSOW(projectId: string, userId: string): Promise<{ sowId: string; version: number }> {
  const sowData = await aggregateSOWData(projectId);

  // Mark all existing versions as superseded
  await supabase
    .from('sow_versions')
    .update({ is_current: false, status: 'superseded' } as any)
    .eq('solutions_project_id', projectId);

  // Get next version number
  const { data: existing } = await supabase
    .from('sow_versions')
    .select('version')
    .eq('solutions_project_id', projectId)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = (existing && existing.length > 0) ? (existing[0] as any).version + 1 : 1;

  const { data: newSow, error } = await supabase
    .from('sow_versions')
    .insert({
      solutions_project_id: projectId,
      version: nextVersion,
      status: 'current',
      sow_data: sowData as any,
      generated_by: userId,
      is_current: true,
      change_summary: nextVersion === 1 ? 'Initial SOW generation' : 'Regenerated from updated feasibility data',
    } as any)
    .select()
    .single();

  if (error) throw error;

  return { sowId: (newSow as any).id, version: nextVersion };
}

export async function fetchCurrentSOW(projectId: string) {
  const { data, error } = await supabase
    .from('sow_versions')
    .select('*')
    .eq('solutions_project_id', projectId)
    .eq('is_current', true)
    .maybeSingle();

  if (error) throw error;
  return data as any;
}

export async function fetchSOWHistory(projectId: string) {
  const { data, error } = await supabase
    .from('sow_versions')
    .select('id, version, status, generated_by, generated_at, change_summary, is_current')
    .eq('solutions_project_id', projectId)
    .order('version', { ascending: false });

  if (error) throw error;

  // Resolve user names
  const userIds = [...new Set((data || []).map((d: any) => d.generated_by).filter(Boolean))];
  let nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', userIds);
    for (const p of profiles || []) {
      nameMap[p.user_id] = p.name || 'Unknown';
    }
  }

  return (data || []).map((d: any) => ({
    ...d,
    generatedByName: nameMap[d.generated_by] || 'Unknown',
  }));
}

import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

// ── Types ──────────────────────────────────────────────
export interface ImportConflict {
  id: string;
  type: 'product' | 'vision_project' | 'view' | 'view_attribute';
  identifier: string; // e.g. "PROD001" or "PROD001 / Front Label"
  field: string;
  currentValue: string;
  newValue: string;
  accepted: boolean;
}

export interface ImportValidationError {
  sheet: string;
  row: number;
  message: string;
}

export interface ImportParseResult {
  conflicts: ImportConflict[];
  errors: ImportValidationError[];
  newProducts: ParsedProduct[];
  newVisionProjects: ParsedVisionProject[];
  newViews: ParsedView[];
  newViewAttributes: ParsedViewAttribute[];
  summary: { newProducts: number; updatedProducts: number; newVPs: number; updatedVPs: number; newViews: number; updatedViews: number; newAttrs: number; updatedAttrs: number };
}

interface ParsedProduct {
  product_code: string;
  product_name: string;
  factory: string;
  group: string;
  line: string;
  attributes: string;
  comments: string;
}

interface ParsedVisionProject {
  name: string;
  description: string;
  attributes: string;
}

interface ParsedView {
  product_code: string;
  view_name: string;
  vision_project: string;
  positions: string;
  equipment: string;
}

interface ParsedViewAttribute {
  product_code: string;
  view_name: string;
  attribute_name: string;
  set_or_variable: string;
  value: string;
}

// ── Export ──────────────────────────────────────────────
export async function exportProductsToExcel(projectId: string): Promise<Blob> {
  // 1) Fetch products
  const { data: products } = await supabase
    .from('products')
    .select('id, product_code, product_name, master_artwork_url, comments')
    .eq('solutions_project_id', projectId)
    .order('product_code');
  const prodList = (products || []) as any[];

  // Fetch portal → factories → groups → lines for name resolution
  const { data: portalData } = await supabase
    .from('solution_portals')
    .select('id')
    .eq('solutions_project_id', projectId)
    .single();

  let factoryNameMap: Record<string, string> = {};
  let groupNameMap: Record<string, string> = {};
  let lineNameMap: Record<string, string> = {};

  if (portalData?.id) {
    const { data: factories } = await supabase
      .from('solution_factories' as any)
      .select('id, name')
      .eq('portal_id', portalData.id);
    for (const f of (factories || []) as any[]) factoryNameMap[f.id] = f.name;

    const factIds = Object.keys(factoryNameMap);
    if (factIds.length > 0) {
      const { data: groups } = await supabase
        .from('factory_groups')
        .select('id, name, factory_id')
        .in('factory_id', factIds);
      for (const g of (groups || []) as any[]) groupNameMap[g.id] = g.name;

      const grpIds = Object.keys(groupNameMap);
      if (grpIds.length > 0) {
        const { data: lines } = await supabase
          .from('factory_group_lines')
          .select('id, name, group_id')
          .in('group_id', grpIds);
        for (const l of (lines || []) as any[]) lineNameMap[l.id] = l.name;
      }
    }
  }

  // Fetch product junction links
  const prodIds = prodList.map(p => p.id);
  let factLinks: Record<string, string[]> = {};
  let grpLinks: Record<string, string[]> = {};
  let lineLinks: Record<string, string[]> = {};
  let prodAttrLinks: Record<string, string[]> = {};

  if (prodIds.length > 0) {
    const [flRes, glRes, llRes, paRes] = await Promise.all([
      supabase.from('product_factory_links').select('product_id, factory_id').in('product_id', prodIds),
      supabase.from('product_group_links').select('product_id, group_id').in('product_id', prodIds),
      supabase.from('product_line_links').select('product_id, line_id').in('product_id', prodIds),
      supabase.from('product_attributes').select('product_id, project_attribute_id').in('product_id', prodIds),
    ]);
    for (const r of (flRes.data || []) as any[]) { (factLinks[r.product_id] ||= []).push(r.factory_id); }
    for (const r of (glRes.data || []) as any[]) { (grpLinks[r.product_id] ||= []).push(r.group_id); }
    for (const r of (llRes.data || []) as any[]) { (lineLinks[r.product_id] ||= []).push(r.line_id); }
    for (const r of (paRes.data || []) as any[]) { (prodAttrLinks[r.product_id] ||= []).push(r.project_attribute_id); }
  }

  // Fetch project_attributes → master_attributes name map
  const { data: paAll } = await supabase
    .from('project_attributes')
    .select('id, master_attribute_id')
    .eq('solutions_project_id', projectId);
  const paList = (paAll || []) as any[];
  const masterIds = [...new Set(paList.map(pa => pa.master_attribute_id))];
  let masterNameMap: Record<string, string> = {};
  let paToMasterName: Record<string, string> = {};
  if (masterIds.length > 0) {
    const { data: masters } = await supabase.from('master_attributes').select('id, name').in('id', masterIds);
    for (const m of (masters || []) as any[]) masterNameMap[m.id] = m.name;
  }
  for (const pa of paList) paToMasterName[pa.id] = masterNameMap[pa.master_attribute_id] || '';

  // Build Sheet 1: Products
  const sheet1Data = prodList.map(p => ({
    'Product Code': p.product_code,
    'Product Name': p.product_name,
    'Factory': (factLinks[p.id] || []).map(id => factoryNameMap[id] || '').filter(Boolean).join(', '),
    'Group': (grpLinks[p.id] || []).map(id => groupNameMap[id] || '').filter(Boolean).join(', '),
    'Line': (lineLinks[p.id] || []).map(id => lineNameMap[id] || '').filter(Boolean).join(', '),
    'Attributes': (prodAttrLinks[p.id] || []).map(id => paToMasterName[id] || '').filter(Boolean).join(', '),
    'Comments': p.comments || '',
  }));

  // 2) Fetch vision projects
  const { data: vps } = await supabase
    .from('vision_projects')
    .select('id, name, description')
    .eq('solutions_project_id', projectId)
    .order('name');
  const vpList = (vps || []) as any[];
  const vpIds = vpList.map(v => v.id);

  let vpAttrMap: Record<string, string[]> = {};
  if (vpIds.length > 0) {
    const { data: vpAttrs } = await supabase
      .from('vision_project_attributes')
      .select('vision_project_id, project_attribute_id')
      .in('vision_project_id', vpIds);
    for (const va of (vpAttrs || []) as any[]) {
      (vpAttrMap[va.vision_project_id] ||= []).push(paToMasterName[va.project_attribute_id] || '');
    }
  }

  const sheet2Data = vpList.map(vp => ({
    'Vision Project Name': vp.name,
    'Description': vp.description || '',
    'Attributes': (vpAttrMap[vp.id] || []).filter(Boolean).join(', '),
  }));

  // 3) Fetch views
  const { data: views } = await supabase
    .from('product_views')
    .select('id, product_id, view_name, vision_project_id')
    .in('product_id', prodIds)
    .order('created_at');
  const viewList = (views || []) as any[];

  const vpNameMap = Object.fromEntries(vpList.map(v => [v.id, v.name]));
  const prodCodeMap = Object.fromEntries(prodList.map(p => [p.id, p.product_code]));

  // Fetch view positions, equipment, attributes
  const viewIds = viewList.map(v => v.id);
  let viewPosNames: Record<string, string[]> = {};
  let viewEqNames: Record<string, string[]> = {};

  if (viewIds.length > 0) {
    const [posRes, eqRes] = await Promise.all([
      supabase.from('product_view_positions').select('product_view_id, position_id').in('product_view_id', viewIds),
      supabase.from('product_view_equipment').select('product_view_id, equipment_id').in('product_view_id', viewIds),
    ]);

    const allPosIds = [...new Set((posRes.data || []).map((p: any) => p.position_id))];
    const allEqIds = [...new Set((eqRes.data || []).map((e: any) => e.equipment_id))];

    let posNames: Record<string, string> = {};
    let eqNames: Record<string, string> = {};
    if (allPosIds.length > 0) {
      const { data } = await supabase.from('positions').select('id, name').in('id', allPosIds);
      for (const p of (data || []) as any[]) posNames[p.id] = p.name || 'Unnamed';
    }
    if (allEqIds.length > 0) {
      const { data } = await supabase.from('equipment').select('id, name').in('id', allEqIds);
      for (const e of (data || []) as any[]) eqNames[e.id] = e.name || 'Unnamed';
    }

    for (const p of (posRes.data || []) as any[]) {
      (viewPosNames[p.product_view_id] ||= []).push(posNames[p.position_id] || '');
    }
    for (const e of (eqRes.data || []) as any[]) {
      (viewEqNames[e.product_view_id] ||= []).push(eqNames[e.equipment_id] || '');
    }
  }

  const sheet3Data = viewList.map(v => ({
    'Product Code': prodCodeMap[v.product_id] || '',
    'View Name': v.view_name,
    'Vision Project': v.vision_project_id ? vpNameMap[v.vision_project_id] || '' : '',
    'Positions': (viewPosNames[v.id] || []).filter(Boolean).join(', '),
    'Equipment': (viewEqNames[v.id] || []).filter(Boolean).join(', '),
  }));

  // 4) Fetch view attributes
  let sheet4Data: any[] = [];
  if (viewIds.length > 0) {
    const { data: vaData } = await supabase
      .from('product_view_attributes')
      .select('product_view_id, project_attribute_id, value, is_variable')
      .in('product_view_id', viewIds);

    const viewLookup = Object.fromEntries(viewList.map(v => [v.id, v]));

    sheet4Data = (vaData || []).map((va: any) => {
      const view = viewLookup[va.product_view_id];
      return {
        'Product Code': view ? prodCodeMap[view.product_id] || '' : '',
        'View Name': view?.view_name || '',
        'Attribute Name': paToMasterName[va.project_attribute_id] || '',
        'Set/Variable': va.is_variable ? 'Variable' : 'Set',
        'Value': va.value || '',
      };
    });
  }

  // Build workbook
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data.length > 0 ? sheet1Data : [{ 'Product Code': '', 'Product Name': '', 'Factory': '', 'Group': '', 'Line': '', 'Attributes': '', 'Comments': '' }]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Products');

  const ws2 = XLSX.utils.json_to_sheet(sheet2Data.length > 0 ? sheet2Data : [{ 'Vision Project Name': '', 'Description': '', 'Attributes': '' }]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Vision Projects');

  const ws3 = XLSX.utils.json_to_sheet(sheet3Data.length > 0 ? sheet3Data : [{ 'Product Code': '', 'View Name': '', 'Vision Project': '', 'Positions': '', 'Equipment': '' }]);
  XLSX.utils.book_append_sheet(wb, ws3, 'Views');

  const ws4 = XLSX.utils.json_to_sheet(sheet4Data.length > 0 ? sheet4Data : [{ 'Product Code': '', 'View Name': '', 'Attribute Name': '', 'Set/Variable': '', 'Value': '' }]);
  XLSX.utils.book_append_sheet(wb, ws4, 'View Attributes');

  // Set column widths
  for (const ws of [ws1, ws2, ws3, ws4]) {
    if (!ws['!ref']) continue;
    const range = XLSX.utils.decode_range(ws['!ref']);
    ws['!cols'] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      ws['!cols'].push({ wch: 22 });
    }
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ── Import Parse ───────────────────────────────────────
export async function parseImportFile(file: File, projectId: string): Promise<ImportParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });

  const errors: ImportValidationError[] = [];
  const conflicts: ImportConflict[] = [];

  // Parse sheets
  const parsedProducts = parseSheet<ParsedProduct>(wb, 'Products', ['Product Code', 'Product Name'], row => ({
    product_code: str(row['Product Code']),
    product_name: str(row['Product Name']),
    factory: str(row['Factory']),
    group: str(row['Group']),
    line: str(row['Line']),
    attributes: str(row['Attributes']),
    comments: str(row['Comments']),
  }), errors);

  const parsedVPs = parseSheet<ParsedVisionProject>(wb, 'Vision Projects', ['Vision Project Name'], row => ({
    name: str(row['Vision Project Name']),
    description: str(row['Description']),
    attributes: str(row['Attributes']),
  }), errors);

  const parsedViews = parseSheet<ParsedView>(wb, 'Views', ['Product Code', 'View Name'], row => ({
    product_code: str(row['Product Code']),
    view_name: str(row['View Name']),
    vision_project: str(row['Vision Project']),
    positions: str(row['Positions']),
    equipment: str(row['Equipment']),
  }), errors);

  const parsedViewAttrs = parseSheet<ParsedViewAttribute>(wb, 'View Attributes', ['Product Code', 'View Name', 'Attribute Name'], row => ({
    product_code: str(row['Product Code']),
    view_name: str(row['View Name']),
    attribute_name: str(row['Attribute Name']),
    set_or_variable: str(row['Set/Variable']),
    value: str(row['Value']),
  }), errors);

  // Orphan detection: views must reference products
  const productCodes = new Set(parsedProducts.map(p => p.product_code.toLowerCase()));
  for (let i = 0; i < parsedViews.length; i++) {
    if (!productCodes.has(parsedViews[i].product_code.toLowerCase())) {
      errors.push({ sheet: 'Views', row: i + 2, message: `Product Code "${parsedViews[i].product_code}" not found in Products sheet` });
    }
  }
  // Orphan detection: view attrs must reference views
  const viewKeysSet = new Set(parsedViews.map(v => `${v.product_code.toLowerCase()}|${v.view_name.toLowerCase()}`));
  for (let i = 0; i < parsedViewAttrs.length; i++) {
    const key = `${parsedViewAttrs[i].product_code.toLowerCase()}|${parsedViewAttrs[i].view_name.toLowerCase()}`;
    if (!viewKeysSet.has(key)) {
      errors.push({ sheet: 'View Attributes', row: i + 2, message: `View "${parsedViewAttrs[i].product_code} / ${parsedViewAttrs[i].view_name}" not found in Views sheet` });
    }
  }

  // Check VP references in Views
  const vpNames = new Set(parsedVPs.map(vp => vp.name.toLowerCase()));
  const { data: existingVPs } = await supabase
    .from('vision_projects')
    .select('id, name')
    .eq('solutions_project_id', projectId);
  const existingVPNames = new Set((existingVPs || []).map((v: any) => v.name.toLowerCase()));

  for (let i = 0; i < parsedViews.length; i++) {
    const vpRef = parsedViews[i].vision_project;
    if (vpRef && !vpNames.has(vpRef.toLowerCase()) && !existingVPNames.has(vpRef.toLowerCase())) {
      errors.push({ sheet: 'Views', row: i + 2, message: `Vision Project "${vpRef}" not found in Vision Projects sheet or database` });
    }
  }

  // Duplicate detection
  const seenCodes = new Set<string>();
  for (let i = 0; i < parsedProducts.length; i++) {
    const key = parsedProducts[i].product_code.toLowerCase();
    if (seenCodes.has(key)) {
      errors.push({ sheet: 'Products', row: i + 2, message: `Duplicate Product Code "${parsedProducts[i].product_code}"` });
    }
    seenCodes.add(key);
  }

  // Conflict detection: products
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, product_code, product_name, comments')
    .eq('solutions_project_id', projectId);
  const existProdMap = Object.fromEntries((existingProducts || []).map((p: any) => [p.product_code.toLowerCase(), p]));

  let newProdCount = 0, updProdCount = 0;
  for (const pp of parsedProducts) {
    const existing = existProdMap[pp.product_code.toLowerCase()];
    if (existing) {
      updProdCount++;
      if (existing.product_name !== pp.product_name) {
        conflicts.push({ id: crypto.randomUUID(), type: 'product', identifier: pp.product_code, field: 'Product Name', currentValue: existing.product_name, newValue: pp.product_name, accepted: true });
      }
      if ((existing.comments || '') !== pp.comments) {
        conflicts.push({ id: crypto.randomUUID(), type: 'product', identifier: pp.product_code, field: 'Comments', currentValue: existing.comments || '', newValue: pp.comments, accepted: true });
      }
    } else {
      newProdCount++;
    }
  }

  // Conflict detection: vision projects
  const existVPMap = Object.fromEntries((existingVPs || []).map((v: any) => [v.name.toLowerCase(), v]));
  let newVPCount = 0, updVPCount = 0;
  for (const vp of parsedVPs) {
    const existing = existVPMap[vp.name.toLowerCase()];
    if (existing) {
      updVPCount++;
      // Description change
      if ((existing as any).description !== vp.description) {
        // Fetch full data for comparison
        const { data: fullVP } = await supabase.from('vision_projects').select('description').eq('id', existing.id).single();
        if ((fullVP?.description || '') !== vp.description) {
          conflicts.push({ id: crypto.randomUUID(), type: 'vision_project', identifier: vp.name, field: 'Description', currentValue: fullVP?.description || '', newValue: vp.description, accepted: true });
        }
      }
    } else {
      newVPCount++;
    }
  }

  // Conflict detection: views
  const { data: existingViews } = await supabase
    .from('product_views')
    .select('id, product_id, view_name, vision_project_id')
    .in('product_id', (existingProducts || []).map((p: any) => p.id));
  const existViewMap: Record<string, any> = {};
  for (const v of (existingViews || []) as any[]) {
    const prod = (existingProducts || []).find((p: any) => p.id === v.product_id) as any;
    if (prod) {
      existViewMap[`${prod.product_code.toLowerCase()}|${v.view_name.toLowerCase()}`] = v;
    }
  }

  let newViewCount = 0, updViewCount = 0;
  const vpNameToId = Object.fromEntries((existingVPs || []).map((v: any) => [v.name.toLowerCase(), v.id]));
  for (const pv of parsedViews) {
    const key = `${pv.product_code.toLowerCase()}|${pv.view_name.toLowerCase()}`;
    const existing = existViewMap[key];
    if (existing) {
      updViewCount++;
      const newVpName = pv.vision_project;
      const existVpName = existing.vision_project_id ? (existingVPs || []).find((v: any) => v.id === existing.vision_project_id)?.name || '' : '';
      if (newVpName.toLowerCase() !== existVpName.toLowerCase()) {
        conflicts.push({ id: crypto.randomUUID(), type: 'view', identifier: `${pv.product_code} / ${pv.view_name}`, field: 'Vision Project', currentValue: existVpName, newValue: newVpName, accepted: true });
      }
    } else {
      newViewCount++;
    }
  }

  // View attributes conflicts
  let newAttrCount = 0, updAttrCount = 0;
  if ((existingViews || []).length > 0) {
    const existViewIds = (existingViews || []).map((v: any) => v.id);
    const { data: existAttrs } = await supabase
      .from('product_view_attributes')
      .select('product_view_id, project_attribute_id, value, is_variable')
      .in('product_view_id', existViewIds);

    // Build PA name lookup
    const { data: paData } = await supabase.from('project_attributes').select('id, master_attribute_id').eq('solutions_project_id', projectId);
    const maIds = [...new Set((paData || []).map((pa: any) => pa.master_attribute_id))];
    let maNames: Record<string, string> = {};
    if (maIds.length > 0) {
      const { data: mas } = await supabase.from('master_attributes').select('id, name').in('id', maIds);
      for (const m of (mas || []) as any[]) maNames[m.id] = m.name;
    }
    const paIdToName: Record<string, string> = {};
    for (const pa of (paData || []) as any[]) paIdToName[pa.id] = maNames[pa.master_attribute_id] || '';

    const existAttrMap: Record<string, any> = {};
    for (const ea of (existAttrs || []) as any[]) {
      const view = (existingViews || []).find((v: any) => v.id === ea.product_view_id) as any;
      if (!view) continue;
      const prod = (existingProducts || []).find((p: any) => p.id === view.product_id) as any;
      if (!prod) continue;
      const attrName = paIdToName[ea.project_attribute_id] || '';
      const key = `${prod.product_code.toLowerCase()}|${view.view_name.toLowerCase()}|${attrName.toLowerCase()}`;
      existAttrMap[key] = ea;
    }

    for (const va of parsedViewAttrs) {
      const key = `${va.product_code.toLowerCase()}|${va.view_name.toLowerCase()}|${va.attribute_name.toLowerCase()}`;
      const existing = existAttrMap[key];
      if (existing) {
        updAttrCount++;
        const newIsVar = va.set_or_variable.toLowerCase() === 'variable';
        if (existing.is_variable !== newIsVar || (existing.value || '') !== va.value) {
          conflicts.push({
            id: crypto.randomUUID(),
            type: 'view_attribute',
            identifier: `${va.product_code} / ${va.view_name} / ${va.attribute_name}`,
            field: 'Value',
            currentValue: existing.is_variable ? 'Variable' : `Set: ${existing.value || ''}`,
            newValue: newIsVar ? 'Variable' : `Set: ${va.value}`,
            accepted: true,
          });
        }
      } else {
        newAttrCount++;
      }
    }
  } else {
    newAttrCount = parsedViewAttrs.length;
  }

  return {
    conflicts,
    errors,
    newProducts: parsedProducts,
    newVisionProjects: parsedVPs,
    newViews: parsedViews,
    newViewAttributes: parsedViewAttrs,
    summary: {
      newProducts: newProdCount,
      updatedProducts: updProdCount,
      newVPs: newVPCount,
      updatedVPs: updVPCount,
      newViews: newViewCount,
      updatedViews: updViewCount,
      newAttrs: newAttrCount,
      updatedAttrs: updAttrCount,
    },
  };
}

// ── Apply Import ───────────────────────────────────────
export async function applyImport(
  result: ImportParseResult,
  projectId: string,
): Promise<void> {
  const acceptedConflicts = new Set(result.conflicts.filter(c => c.accepted).map(c => c.id));

  // Build lookup maps
  const { data: portalData } = await supabase
    .from('solution_portals')
    .select('id')
    .eq('solutions_project_id', projectId)
    .single();

  let factoryNameToId: Record<string, string> = {};
  let groupNameToId: Record<string, string> = {};
  let lineNameToId: Record<string, string> = {};

  if (portalData?.id) {
    const { data: factories } = await supabase.from('solution_factories' as any).select('id, name').eq('portal_id', portalData.id);
    for (const f of (factories || []) as any[]) factoryNameToId[f.name.toLowerCase()] = f.id;
    const factIds = Object.values(factoryNameToId);
    if (factIds.length > 0) {
      const { data: groups } = await supabase.from('factory_groups').select('id, name').in('factory_id', factIds);
      for (const g of (groups || []) as any[]) groupNameToId[g.name.toLowerCase()] = g.id;
      const grpIds = Object.values(groupNameToId);
      if (grpIds.length > 0) {
        const { data: lines } = await supabase.from('factory_group_lines').select('id, name').in('group_id', grpIds);
        for (const l of (lines || []) as any[]) lineNameToId[l.name.toLowerCase()] = l.id;
      }
    }
  }

  // Project attributes lookup
  const { data: paAll } = await supabase.from('project_attributes').select('id, master_attribute_id').eq('solutions_project_id', projectId);
  const maIds = [...new Set((paAll || []).map((pa: any) => pa.master_attribute_id))];
  let maNameToId: Record<string, string> = {};
  if (maIds.length > 0) {
    const { data: mas } = await supabase.from('master_attributes').select('id, name').in('id', maIds);
    for (const m of (mas || []) as any[]) maNameToId[m.name.toLowerCase()] = m.id;
  }
  const maIdToPaId: Record<string, string> = {};
  for (const pa of (paAll || []) as any[]) maIdToPaId[pa.master_attribute_id] = pa.id;

  function resolveAttrNameToPaId(name: string): string | null {
    const maId = maNameToId[name.toLowerCase()];
    if (!maId) return null;
    return maIdToPaId[maId] || null;
  }

  // 1) Upsert Vision Projects
  const { data: existingVPs } = await supabase.from('vision_projects').select('id, name, description').eq('solutions_project_id', projectId);
  const vpMap: Record<string, string> = {};
  for (const vp of (existingVPs || []) as any[]) vpMap[vp.name.toLowerCase()] = vp.id;

  for (const vp of result.newVisionProjects) {
    if (!vp.name) continue;
    const existId = vpMap[vp.name.toLowerCase()];
    if (existId) {
      // Check if update accepted
      const descConflict = result.conflicts.find(c => c.type === 'vision_project' && c.identifier.toLowerCase() === vp.name.toLowerCase() && c.field === 'Description');
      if (descConflict && acceptedConflicts.has(descConflict.id)) {
        await supabase.from('vision_projects').update({ description: vp.description || null } as any).eq('id', existId);
      }
      // Sync attributes
      const attrNames = splitComma(vp.attributes);
      const paIds = attrNames.map(n => resolveAttrNameToPaId(n)).filter(Boolean) as string[];
      await supabase.from('vision_project_attributes').delete().eq('vision_project_id', existId);
      if (paIds.length > 0) {
        await supabase.from('vision_project_attributes').insert(paIds.map(paId => ({ vision_project_id: existId, project_attribute_id: paId })) as any);
      }
    } else {
      const { data: inserted } = await supabase
        .from('vision_projects')
        .insert({ solutions_project_id: projectId, name: vp.name, description: vp.description || null } as any)
        .select('id')
        .single();
      if (inserted) {
        vpMap[vp.name.toLowerCase()] = inserted.id;
        const attrNames = splitComma(vp.attributes);
        const paIds = attrNames.map(n => resolveAttrNameToPaId(n)).filter(Boolean) as string[];
        if (paIds.length > 0) {
          await supabase.from('vision_project_attributes').insert(paIds.map(paId => ({ vision_project_id: inserted.id, project_attribute_id: paId })) as any);
        }
      }
    }
  }

  // 2) Upsert Products
  const { data: existingProducts } = await supabase.from('products').select('id, product_code').eq('solutions_project_id', projectId);
  const prodMap: Record<string, string> = {};
  for (const p of (existingProducts || []) as any[]) prodMap[p.product_code.toLowerCase()] = p.id;

  for (const pp of result.newProducts) {
    if (!pp.product_code) continue;
    const existId = prodMap[pp.product_code.toLowerCase()];

    if (existId) {
      // Apply accepted field changes
      const updates: any = {};
      for (const c of result.conflicts.filter(c => c.type === 'product' && c.identifier.toLowerCase() === pp.product_code.toLowerCase())) {
        if (!acceptedConflicts.has(c.id)) continue;
        if (c.field === 'Product Name') updates.product_name = pp.product_name;
        if (c.field === 'Comments') updates.comments = pp.comments || null;
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('products').update(updates as any).eq('id', existId);
      }

      // Sync junctions
      await syncProductJunctions(existId, pp, factoryNameToId, groupNameToId, lineNameToId, resolveAttrNameToPaId);
    } else {
      const { data: inserted } = await supabase
        .from('products')
        .insert({
          solutions_project_id: projectId,
          product_code: pp.product_code,
          product_name: pp.product_name,
          comments: pp.comments || null,
        } as any)
        .select('id')
        .single();
      if (inserted) {
        prodMap[pp.product_code.toLowerCase()] = inserted.id;
        await syncProductJunctions(inserted.id, pp, factoryNameToId, groupNameToId, lineNameToId, resolveAttrNameToPaId);
      }
    }
  }

  // 3) Upsert Views
  // Refresh products for ID lookup
  const { data: allProds } = await supabase.from('products').select('id, product_code').eq('solutions_project_id', projectId);
  const finalProdMap: Record<string, string> = {};
  for (const p of (allProds || []) as any[]) finalProdMap[p.product_code.toLowerCase()] = p.id;

  // Positions & equipment name→id lookups for this project's solutions lines
  const { data: solLines } = await supabase.from('solutions_lines').select('id, line_name').eq('solutions_project_id', projectId);
  const solLineIds = (solLines || []).map((sl: any) => sl.id);
  let posNameToId: Record<string, string> = {};
  let eqNameToId: Record<string, string> = {};

  if (solLineIds.length > 0) {
    const { data: positions } = await supabase.from('positions').select('id, name').in('solutions_line_id', solLineIds);
    for (const p of (positions || []) as any[]) posNameToId[(p.name || '').toLowerCase()] = p.id;
    const posIds = (positions || []).map((p: any) => p.id);
    if (posIds.length > 0) {
      const { data: equip } = await supabase.from('equipment').select('id, name').in('position_id', posIds);
      for (const e of (equip || []) as any[]) eqNameToId[(e.name || '').toLowerCase()] = e.id;
    }
  }

  // Existing views lookup
  const allProdIds = Object.values(finalProdMap);
  const { data: existViews } = allProdIds.length > 0
    ? await supabase.from('product_views').select('id, product_id, view_name, vision_project_id').in('product_id', allProdIds)
    : { data: [] };
  const viewMap: Record<string, string> = {};
  for (const v of (existViews || []) as any[]) {
    const prodCode = Object.entries(finalProdMap).find(([_, id]) => id === v.product_id)?.[0] || '';
    viewMap[`${prodCode}|${v.view_name.toLowerCase()}`] = v.id;
  }

  for (const pv of result.newViews) {
    const prodId = finalProdMap[pv.product_code.toLowerCase()];
    if (!prodId) continue;

    const key = `${pv.product_code.toLowerCase()}|${pv.view_name.toLowerCase()}`;
    const existId = viewMap[key];
    const vpId = pv.vision_project ? vpMap[pv.vision_project.toLowerCase()] || null : null;

    if (existId) {
      // Check conflict acceptance for VP change
      const vpConflict = result.conflicts.find(c => c.type === 'view' && c.identifier.toLowerCase() === `${pv.product_code} / ${pv.view_name}`.toLowerCase());
      if (vpConflict && acceptedConflicts.has(vpConflict.id)) {
        await supabase.from('product_views').update({ vision_project_id: vpId } as any).eq('id', existId);
      }

      // Sync positions & equipment
      await syncViewLinks(existId, pv, posNameToId, eqNameToId);
    } else {
      const { data: inserted } = await supabase
        .from('product_views')
        .insert({
          product_id: prodId,
          view_name: pv.view_name,
          vision_project_id: vpId,
        } as any)
        .select('id')
        .single();
      if (inserted) {
        viewMap[key] = inserted.id;
        await syncViewLinks(inserted.id, pv, posNameToId, eqNameToId);
      }
    }
  }

  // 4) Upsert View Attributes
  // Refresh views
  const { data: finalViews } = allProdIds.length > 0
    ? await supabase.from('product_views').select('id, product_id, view_name').in('product_id', allProdIds)
    : { data: [] };
  const finalViewMap: Record<string, string> = {};
  for (const v of (finalViews || []) as any[]) {
    const prodCode = Object.entries(finalProdMap).find(([_, id]) => id === v.product_id)?.[0] || '';
    finalViewMap[`${prodCode}|${v.view_name.toLowerCase()}`] = v.id;
  }

  for (const va of result.newViewAttributes) {
    const viewId = finalViewMap[`${va.product_code.toLowerCase()}|${va.view_name.toLowerCase()}`];
    if (!viewId) continue;

    const paId = resolveAttrNameToPaId(va.attribute_name);
    if (!paId) continue;

    const isVariable = va.set_or_variable.toLowerCase() === 'variable';
    const value = isVariable ? null : (va.value || null);

    // Check if exists
    const { data: existing } = await supabase
      .from('product_view_attributes')
      .select('id')
      .eq('product_view_id', viewId)
      .eq('project_attribute_id', paId)
      .maybeSingle();

    if (existing) {
      const conflict = result.conflicts.find(c =>
        c.type === 'view_attribute' &&
        c.identifier.toLowerCase() === `${va.product_code} / ${va.view_name} / ${va.attribute_name}`.toLowerCase()
      );
      if (conflict && acceptedConflicts.has(conflict.id)) {
        await supabase.from('product_view_attributes')
          .update({ is_variable: isVariable, value } as any)
          .eq('id', existing.id);
      }
    } else {
      await supabase.from('product_view_attributes').insert({
        product_view_id: viewId,
        project_attribute_id: paId,
        is_variable: isVariable,
        value,
      } as any);
    }
  }
}

// ── Helpers ────────────────────────────────────────────
function str(val: any): string {
  if (val == null) return '';
  return String(val).trim();
}

function splitComma(s: string): string[] {
  return s.split(',').map(v => v.trim()).filter(Boolean);
}

function parseSheet<T>(
  wb: XLSX.WorkBook,
  sheetName: string,
  requiredCols: string[],
  mapFn: (row: any) => T,
  errors: ImportValidationError[],
): T[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    errors.push({ sheet: sheetName, row: 0, message: `Sheet "${sheetName}" not found` });
    return [];
  }
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
  if (rows.length === 0) return [];

  // Validate columns
  const headers = Object.keys(rows[0]);
  for (const col of requiredCols) {
    if (!headers.some(h => h.toLowerCase() === col.toLowerCase())) {
      errors.push({ sheet: sheetName, row: 1, message: `Missing required column "${col}"` });
    }
  }

  const result: T[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Skip blank rows
    const firstReq = requiredCols[0];
    if (!str(row[firstReq])) continue;

    // Validate required fields
    let valid = true;
    for (const col of requiredCols) {
      if (!str(row[col])) {
        errors.push({ sheet: sheetName, row: i + 2, message: `"${col}" is required` });
        valid = false;
      }
    }
    if (valid) result.push(mapFn(row));
  }
  return result;
}

async function syncProductJunctions(
  productId: string,
  pp: ParsedProduct,
  factoryNameToId: Record<string, string>,
  groupNameToId: Record<string, string>,
  lineNameToId: Record<string, string>,
  resolveAttrNameToPaId: (name: string) => string | null,
) {
  // Clear and re-insert
  await Promise.all([
    supabase.from('product_factory_links').delete().eq('product_id', productId),
    supabase.from('product_group_links').delete().eq('product_id', productId),
    supabase.from('product_line_links').delete().eq('product_id', productId),
    supabase.from('product_attributes').delete().eq('product_id', productId),
  ]);

  const fIds = splitComma(pp.factory).map(n => factoryNameToId[n.toLowerCase()]).filter(Boolean);
  const gIds = splitComma(pp.group).map(n => groupNameToId[n.toLowerCase()]).filter(Boolean);
  const lIds = splitComma(pp.line).map(n => lineNameToId[n.toLowerCase()]).filter(Boolean);
  const paIds = splitComma(pp.attributes).map(n => resolveAttrNameToPaId(n)).filter(Boolean) as string[];

  const inserts = [];
  if (fIds.length > 0) inserts.push(supabase.from('product_factory_links').insert(fIds.map(fId => ({ product_id: productId, factory_id: fId })) as any));
  if (gIds.length > 0) inserts.push(supabase.from('product_group_links').insert(gIds.map(gId => ({ product_id: productId, group_id: gId })) as any));
  if (lIds.length > 0) inserts.push(supabase.from('product_line_links').insert(lIds.map(lId => ({ product_id: productId, line_id: lId })) as any));
  if (paIds.length > 0) inserts.push(supabase.from('product_attributes').insert(paIds.map(paId => ({ product_id: productId, project_attribute_id: paId })) as any));
  await Promise.all(inserts);
}

async function syncViewLinks(
  viewId: string,
  pv: ParsedView,
  posNameToId: Record<string, string>,
  eqNameToId: Record<string, string>,
) {
  await Promise.all([
    supabase.from('product_view_positions').delete().eq('product_view_id', viewId),
    supabase.from('product_view_equipment').delete().eq('product_view_id', viewId),
  ]);

  const posIds = splitComma(pv.positions).map(n => posNameToId[n.toLowerCase()]).filter(Boolean);
  const eqIds = splitComma(pv.equipment).map(n => eqNameToId[n.toLowerCase()]).filter(Boolean);

  const inserts = [];
  if (posIds.length > 0) inserts.push(supabase.from('product_view_positions').insert(posIds.map(pId => ({ product_view_id: viewId, position_id: pId })) as any));
  if (eqIds.length > 0) inserts.push(supabase.from('product_view_equipment').insert(eqIds.map(eId => ({ product_view_id: viewId, equipment_id: eId })) as any));
  await Promise.all(inserts);
}

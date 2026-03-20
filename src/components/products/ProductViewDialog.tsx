import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImageDropZone } from '@/components/shared/ImageDropZone';
import { ImageLightbox } from '@/components/shared/ImageLightbox';

const SUPABASE_URL = "https://tjbiyyejofdpwybppxhv.supabase.co";
const BUCKET = 'product-artwork';

function isSupabaseStorageUrl(url: string): boolean {
  return url.includes(SUPABASE_URL) && url.includes(`/storage/v1/object/public/${BUCKET}/`);
}

function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

interface VisionProject {
  id: string;
  name: string;
}

interface VPAttribute {
  project_attribute_id: string;
  master_name: string;
}

interface PositionItem {
  id: string;
  name: string;
  line_name: string;
  solutions_line_id: string;
}

interface EquipmentItem {
  id: string;
  name: string;
  equipment_type: string | null;
  position_id: string;
  position_name: string;
  line_name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  projectId: string;
  visionProjects: VisionProject[];
  editingView?: {
    id: string;
    view_name: string;
    view_image_url: string | null;
    vision_project_id: string | null;
  } | null;
  onSaved: () => void;
}

interface ViewAttrState {
  selected: boolean;
  is_variable: boolean;
  value: string;
}

export function ProductViewDialog({ open, onOpenChange, productId, projectId, visionProjects, editingView, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [viewName, setViewName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [vpId, setVpId] = useState<string>('');
  const [vpAttrs, setVpAttrs] = useState<VPAttribute[]>([]);
  const [viewAttrState, setViewAttrState] = useState<Record<string, ViewAttrState>>({});

  const [availablePositions, setAvailablePositions] = useState<PositionItem[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentItem[]>([]);
  const [selectedPositionIds, setSelectedPositionIds] = useState<Set<string>>(new Set());
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());

  const [artworkMode, setArtworkMode] = useState<'upload' | 'url'>('upload');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [existingUploadUrl, setExistingUploadUrl] = useState<string | null>(null);
  const [urlLightboxOpen, setUrlLightboxOpen] = useState(false);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setViewName(editingView?.view_name || '');
      setVpId(editingView?.vision_project_id || '');
      setViewAttrState({});
      setSelectedPositionIds(new Set());
      setSelectedEquipmentIds(new Set());
      setUploadFile(null);
      setUploadPreview(null);

      const url = editingView?.view_image_url || '';
      if (url && isSupabaseStorageUrl(url)) {
        setArtworkMode('upload');
        setExistingUploadUrl(url);
        setUploadPreview(url);
        setImageUrl('');
      } else {
        setArtworkMode(url ? 'url' : 'upload');
        setExistingUploadUrl(null);
        setImageUrl(url);
      }
    }
  }, [open, editingView]);

  // Fetch positions & equipment via factory_group_lines → solutions_lines bridge
  useEffect(() => {
    if (!open || !productId || !projectId) {
      setAvailablePositions([]);
      setAvailableEquipment([]);
      return;
    }

    const fetchPositionsAndEquipment = async () => {
      // 1) Get product's linked factory_group_line IDs
      const { data: links } = await supabase
        .from('product_line_links')
        .select('line_id')
        .eq('product_id', productId);
      const factoryLineIds = (links || []).map((l: any) => l.line_id).filter(Boolean);
      if (factoryLineIds.length === 0) {
        setAvailablePositions([]);
        setAvailableEquipment([]);
        return;
      }

      // 2) Get factory_group_lines names
      const { data: factoryLines } = await supabase
        .from('factory_group_lines')
        .select('id, name')
        .in('id', factoryLineIds);
      const factoryLineNames = (factoryLines || []).map((fl: any) => fl.name).filter(Boolean);
      if (factoryLineNames.length === 0) {
        setAvailablePositions([]);
        setAvailableEquipment([]);
        return;
      }

      // 3) Resolve to solutions_lines by matching line_name within this project
      const { data: solLines } = await supabase
        .from('solutions_lines')
        .select('id, line_name')
        .eq('solutions_project_id', projectId)
        .in('line_name', factoryLineNames);
      const solLineIds = (solLines || []).map((sl: any) => sl.id);
      const solLineMap = Object.fromEntries((solLines || []).map((sl: any) => [sl.id, sl.line_name]));
      if (solLineIds.length === 0) {
        setAvailablePositions([]);
        setAvailableEquipment([]);
        return;
      }

      // 4) Get positions for these solutions lines
      const { data: positions } = await supabase
        .from('positions')
        .select('id, name, solutions_line_id')
        .in('solutions_line_id', solLineIds);

      const posItems: PositionItem[] = (positions || []).map((p: any) => ({
        id: p.id,
        name: p.name || 'Unnamed',
        line_name: solLineMap[p.solutions_line_id] || 'Unknown',
        solutions_line_id: p.solutions_line_id,
      }));
      setAvailablePositions(posItems);

      if (!positions || positions.length === 0) {
        setAvailableEquipment([]);
        return;
      }

      const posMap = Object.fromEntries(positions.map((p: any) => [p.id, p]));
      const posIds = positions.map((p: any) => p.id);

      // 5) Get equipment for these positions
      const { data: equip } = await supabase
        .from('equipment')
        .select('id, name, equipment_type, position_id')
        .in('position_id', posIds);

      const eqItems: EquipmentItem[] = (equip || []).map((e: any) => {
        const pos = posMap[e.position_id];
        return {
          id: e.id,
          name: e.name || 'Unnamed',
          equipment_type: e.equipment_type,
          position_id: e.position_id,
          position_name: pos?.name || 'Unknown',
          line_name: solLineMap[pos?.solutions_line_id] || 'Unknown',
        };
      });
      setAvailableEquipment(eqItems);
    };

    fetchPositionsAndEquipment();
  }, [open, productId, projectId]);

  // Load existing selections for edit mode
  useEffect(() => {
    if (!open || !editingView?.id) return;
    const loadSelections = async () => {
      const [{ data: posData }, { data: eqData }] = await Promise.all([
        supabase.from('product_view_positions').select('position_id').eq('product_view_id', editingView.id),
        supabase.from('product_view_equipment').select('equipment_id').eq('product_view_id', editingView.id),
      ]);
      setSelectedPositionIds(new Set((posData || []).map((d: any) => d.position_id)));
      setSelectedEquipmentIds(new Set((eqData || []).map((d: any) => d.equipment_id)));
    };
    loadSelections();
  }, [open, editingView?.id]);

  // Fetch VP attributes
  useEffect(() => {
    if (!vpId) { setVpAttrs([]); return; }
    const fetchVpAttrs = async () => {
      const { data } = await supabase
        .from('vision_project_attributes')
        .select('project_attribute_id')
        .eq('vision_project_id', vpId);
      const paIds = (data || []).map((d: any) => d.project_attribute_id);
      if (paIds.length === 0) { setVpAttrs([]); return; }

      const { data: prodAttrs } = await supabase
        .from('product_attributes')
        .select('project_attribute_id')
        .eq('product_id', productId);
      const prodAttrSet = new Set((prodAttrs || []).map((pa: any) => pa.project_attribute_id));
      const configuredPaIds = paIds.filter((id: string) => prodAttrSet.has(id));
      if (configuredPaIds.length === 0) { setVpAttrs([]); return; }

      const { data: paData } = await supabase
        .from('project_attributes')
        .select('id, master_attribute_id')
        .in('id', configuredPaIds);
      const masterIds = (paData || []).map((pa: any) => pa.master_attribute_id);
      const { data: masters } = await supabase
        .from('master_attributes')
        .select('id, name')
        .in('id', masterIds);
      const masterMap = Object.fromEntries((masters || []).map((m: any) => [m.id, m.name]));
      const attrs: VPAttribute[] = (paData || []).map((pa: any) => ({
        project_attribute_id: pa.id,
        master_name: masterMap[pa.master_attribute_id] || 'Unknown',
      }));
      setVpAttrs(attrs);
    };
    fetchVpAttrs();
  }, [vpId, productId]);

  // Load existing attribute values for edit mode
  useEffect(() => {
    if (!open || !editingView?.id || vpAttrs.length === 0) return;
    const load = async () => {
      const { data } = await supabase
        .from('product_view_attributes')
        .select('project_attribute_id, value, is_variable')
        .eq('product_view_id', editingView.id);
      const state: Record<string, ViewAttrState> = {};
      for (const d of (data || []) as any[]) {
        state[d.project_attribute_id] = {
          selected: true,
          is_variable: d.is_variable ?? true,
          value: d.value || '',
        };
      }
      setViewAttrState(state);
    };
    load();
  }, [editingView?.id, vpAttrs.length, open]);

  const handleFileSelect = (file: File) => {
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setExistingUploadUrl(null);
  };

  const clearUpload = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setExistingUploadUrl(null);
  };

  const uploadToStorage = async (viewId: string): Promise<string> => {
    if (!uploadFile) throw new Error('No file selected');
    const ext = uploadFile.name.split('.').pop() || 'jpg';
    const filePath = `views/${viewId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(filePath, uploadFile, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return publicUrl;
  };

  const deleteOldUpload = async (url: string) => {
    const path = extractStoragePath(url);
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }
  };

  const handleSave = async () => {
    if (!viewName.trim()) {
      toast({ title: 'Validation', description: 'View name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);

    try {
      let viewId: string;

      // Determine final image URL
      let finalImageUrl = '';
      if (artworkMode === 'upload') {
        if (uploadFile) {
          // Will upload after we have viewId
        } else if (existingUploadUrl) {
          finalImageUrl = existingUploadUrl;
        }
      } else {
        finalImageUrl = imageUrl.trim();
      }

      const viewPayload: any = {
        view_name: viewName.trim(),
        view_image_url: finalImageUrl || null,
        vision_project_id: vpId || null,
      };

      if (editingView?.id) {
        const { error } = await supabase.from('product_views').update(viewPayload).eq('id', editingView.id);
        if (error) throw error;
        viewId = editingView.id;
      } else {
        const { data, error } = await supabase
          .from('product_views')
          .insert({ ...viewPayload, product_id: productId } as any)
          .select('id')
          .single();
        if (error) throw error;
        viewId = data.id;
      }

      // Handle file upload now that we have viewId
      if (artworkMode === 'upload' && uploadFile) {
        const uploadedUrl = await uploadToStorage(viewId);
        await supabase.from('product_views').update({ view_image_url: uploadedUrl } as any).eq('id', viewId);
        if (existingUploadUrl) {
          await deleteOldUpload(existingUploadUrl);
        }
      } else if (artworkMode === 'url') {
        const oldUrl = editingView?.view_image_url;
        if (oldUrl && isSupabaseStorageUrl(oldUrl)) {
          await deleteOldUpload(oldUrl);
        }
      }

      // Sync attribute values
      await supabase.from('product_view_attributes').delete().eq('product_view_id', viewId);
      const attrInserts = vpAttrs
        .filter(a => viewAttrState[a.project_attribute_id]?.selected)
        .map(a => {
          const s = viewAttrState[a.project_attribute_id];
          return {
            product_view_id: viewId,
            project_attribute_id: a.project_attribute_id,
            is_variable: s.is_variable,
            value: s.is_variable ? null : (s.value?.trim() || null),
          };
        });
      if (attrInserts.length > 0) {
        const { error } = await supabase.from('product_view_attributes').insert(attrInserts as any);
        if (error) throw error;
      }

      // Sync position selections
      await supabase.from('product_view_positions').delete().eq('product_view_id', viewId);
      // Auto-include positions for any selected equipment
      const autoPositionIds = new Set(selectedPositionIds);
      for (const eqId of selectedEquipmentIds) {
        const eq = availableEquipment.find(e => e.id === eqId);
        if (eq) autoPositionIds.add(eq.position_id);
      }
      if (autoPositionIds.size > 0) {
        const posInserts = Array.from(autoPositionIds).map(posId => ({
          product_view_id: viewId,
          position_id: posId,
        }));
        const { error: posErr } = await supabase.from('product_view_positions').insert(posInserts as any);
        if (posErr) throw posErr;
      }

      // Sync equipment selections
      await supabase.from('product_view_equipment').delete().eq('product_view_id', viewId);
      if (selectedEquipmentIds.size > 0) {
        const equipInserts = Array.from(selectedEquipmentIds).map(eqId => ({
          product_view_id: viewId,
          equipment_id: eqId,
        }));
        const { error: eqErr } = await supabase.from('product_view_equipment').insert(equipInserts as any);
        if (eqErr) throw eqErr;
      }

      toast({ title: 'Saved', description: `View "${viewName.trim()}" saved` });
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Group positions and equipment by line for UI
  const groupedByLine = (() => {
    const lineMap: Record<string, { positions: PositionItem[]; equipment: Map<string, EquipmentItem[]> }> = {};
    for (const pos of availablePositions) {
      if (!lineMap[pos.line_name]) lineMap[pos.line_name] = { positions: [], equipment: new Map() };
      lineMap[pos.line_name].positions.push(pos);
      lineMap[pos.line_name].equipment.set(pos.id, []);
    }
    for (const eq of availableEquipment) {
      const lineName = eq.line_name;
      if (!lineMap[lineName]) continue;
      const posEquip = lineMap[lineName].equipment.get(eq.position_id);
      if (posEquip) posEquip.push(eq);
    }
    return lineMap;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingView ? 'Edit View' : 'Add View'}</DialogTitle>
          <DialogDescription>Configure the product view, link it to a vision project, and set attribute values</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>View Name *</Label>
            <Input value={viewName} onChange={e => setViewName(e.target.value)} placeholder="e.g. Front Label" />
          </div>

          {/* View Image: Upload or URL */}
          <div className="space-y-2">
            <Label>View Image</Label>
            <Tabs value={artworkMode} onValueChange={v => setArtworkMode(v as 'upload' | 'url')}>
              <TabsList className="w-full">
                <TabsTrigger value="upload" className="flex-1 gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> Upload
                </TabsTrigger>
                <TabsTrigger value="url" className="flex-1 gap-1.5">
                  <Link className="h-3.5 w-3.5" /> URL
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-3">
                <ImageDropZone
                  preview={uploadPreview}
                  onFileSelect={handleFileSelect}
                  onClear={clearUpload}
                  maxSizeMB={2}
                />
              </TabsContent>
              <TabsContent value="url" className="mt-3 space-y-2">
                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
                {imageUrl && (
                  <div className="border rounded-lg p-2 inline-block">
                    <img
                      src={imageUrl}
                      alt="View preview"
                      className="max-h-24 rounded cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setUrlLightboxOpen(true)}
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
                <ImageLightbox src={imageUrl} open={urlLightboxOpen} onOpenChange={setUrlLightboxOpen} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label>Vision Project</Label>
            <Select value={vpId} onValueChange={setVpId}>
              <SelectTrigger>
                <SelectValue placeholder="Select vision project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {visionProjects.map(vp => (
                  <SelectItem key={vp.id} value={vp.id}>{vp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Positions & Equipment grouped by line */}
          {Object.keys(groupedByLine).length > 0 && (
            <div className="space-y-2">
              <Label>Positions &amp; Equipment</Label>
              <p className="text-xs text-muted-foreground">
                Select positions and equipment from the product's linked lines for this view.
              </p>
              <div className="border rounded-lg p-3 space-y-3 max-h-56 overflow-y-auto">
                {Object.entries(groupedByLine).map(([lineName, { positions, equipment }]) => (
                  <div key={lineName} className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{lineName}</span>
                    {positions.map(pos => {
                      const posEquip = equipment.get(pos.id) || [];
                      return (
                        <div key={pos.id} className="ml-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedPositionIds.has(pos.id)}
                              onCheckedChange={(checked) => {
                                setSelectedPositionIds(prev => {
                                  const next = new Set(prev);
                                  if (checked) next.add(pos.id);
                                  else {
                                    next.delete(pos.id);
                                    // Also deselect equipment under this position
                                    setSelectedEquipmentIds(prevEq => {
                                      const nextEq = new Set(prevEq);
                                      posEquip.forEach(e => nextEq.delete(e.id));
                                      return nextEq;
                                    });
                                  }
                                  return next;
                                });
                              }}
                            />
                            <span className="text-sm font-medium">{pos.name}</span>
                          </div>
                          {posEquip.length > 0 && selectedPositionIds.has(pos.id) && (
                            <div className="ml-6 space-y-1">
                              {posEquip.map(eq => (
                                <div key={eq.id} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedEquipmentIds.has(eq.id)}
                                    onCheckedChange={(checked) => {
                                      setSelectedEquipmentIds(prev => {
                                        const next = new Set(prev);
                                        if (checked) next.add(eq.id);
                                        else next.delete(eq.id);
                                        return next;
                                      });
                                    }}
                                  />
                                  <span className="text-sm">{eq.name}</span>
                                  {eq.equipment_type && (
                                    <span className="text-xs text-muted-foreground">({eq.equipment_type})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attributes from selected VP */}
          {vpAttrs.length > 0 && (
            <div className="space-y-2">
              <Label>Attributes</Label>
              <p className="text-xs text-muted-foreground">
                Select attributes for this view. Set = enter a fixed value here. Variable = value varies (no input needed).
              </p>
              <div className="border rounded-lg p-3 space-y-3">
                {vpAttrs.map(attr => {
                  const state = viewAttrState[attr.project_attribute_id] || { selected: false, is_variable: true, value: '' };
                  const updateAttr = (patch: Partial<ViewAttrState>) =>
                    setViewAttrState(prev => ({ ...prev, [attr.project_attribute_id]: { ...state, ...patch } }));

                  return (
                    <div key={attr.project_attribute_id} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={state.selected}
                          onCheckedChange={(checked) => updateAttr({ selected: !!checked })}
                        />
                        <span className="text-sm font-medium flex-1">{attr.master_name}</span>
                        {state.selected && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{state.is_variable ? 'Variable' : 'Set'}</span>
                            <Switch
                              checked={state.is_variable}
                              onCheckedChange={(checked) => updateAttr({ is_variable: checked })}
                            />
                          </div>
                        )}
                      </div>
                      {state.selected && !state.is_variable && (
                        <Input
                          className="ml-7"
                          placeholder="Enter fixed value"
                          value={state.value}
                          onChange={e => updateAttr({ value: e.target.value })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !viewName.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingView ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

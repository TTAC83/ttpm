import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

interface EquipmentItem {
  id: string;
  name: string;
  equipment_type: string | null;
  position_name: string;
  line_name: string;
  line_id: string;
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

  const [availableEquipment, setAvailableEquipment] = useState<EquipmentItem[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());

  const [artworkMode, setArtworkMode] = useState<'upload' | 'url'>('upload');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [existingUploadUrl, setExistingUploadUrl] = useState<string | null>(null);
  const [urlLightboxOpen, setUrlLightboxOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setViewName(editingView?.view_name || '');
      setVpId(editingView?.vision_project_id || '');
      setViewAttrState({});
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

  // Fetch VP attributes when VP changes, filtered by product_attributes
  useEffect(() => {
    if (!vpId) {
      setVpAttrs([]);
      return;
    }
    const fetchVpAttrs = async () => {
      const { data } = await supabase
        .from('vision_project_attributes')
        .select('project_attribute_id')
        .eq('vision_project_id', vpId);

      const paIds = (data || []).map((d: any) => d.project_attribute_id);
      if (paIds.length === 0) { setVpAttrs([]); return; }

      // Fetch product_attributes to know which are selected on this product
      const { data: prodAttrs } = await supabase
        .from('product_attributes')
        .select('project_attribute_id')
        .eq('product_id', productId);

      const prodAttrSet = new Set((prodAttrs || []).map((pa: any) => pa.project_attribute_id));

      // Only show attributes that are configured on this product
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

        // Delete old uploaded file if replacing
        if (existingUploadUrl) {
          await deleteOldUpload(existingUploadUrl);
        }
      } else if (artworkMode === 'url') {
        // If switching from upload to URL, delete old upload
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

      toast({ title: 'Saved', description: `View "${viewName.trim()}" saved` });
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

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

          {/* Attributes from selected VP (filtered by product-level selection) */}
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

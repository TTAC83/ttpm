import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Upload, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ImageDropZone } from '@/components/shared/ImageDropZone';
import { ImageLightbox } from '@/components/shared/ImageLightbox';

const SUPABASE_URL = "https://tjbiyyejofdpwybppxhv.supabase.co";
const BUCKET = 'product-artwork';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export interface ProductAttributeData {
  project_attribute_id: string;
  is_variable: boolean;
  fixed_value: string;
}

export interface ProductFormData {
  product_code: string;
  product_name: string;
  master_artwork_url: string;
  comments: string;
  factory_ids: string[];
  group_ids: string[];
  line_ids: string[];
  product_attributes: ProductAttributeData[];
}

interface FactoryItem { id: string; name: string; }
interface GroupItem { id: string; name: string; factory_id: string; }
interface LineItem { id: string; name: string; group_id: string; }

interface AvailableAttribute {
  project_attribute_id: string;
  master_name: string;
}

interface ProductAttributeState {
  selected: boolean;
  is_variable: boolean;
  fixed_value: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  initialData?: ProductFormData | null;
  factories: FactoryItem[];
  groups: GroupItem[];
  lines: LineItem[];
  projectId: string;
  productId?: string | null;
}

function isSupabaseStorageUrl(url: string): boolean {
  return url.includes(SUPABASE_URL) && url.includes(`/storage/v1/object/public/${BUCKET}/`);
}

function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

export function ProductDialog({ open, onOpenChange, onSubmit, initialData, factories, groups, lines, projectId, productId }: Props) {
  const [saving, setSaving] = useState(false);
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [comments, setComments] = useState('');
  const [selectedFactories, setSelectedFactories] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);

  const [artworkMode, setArtworkMode] = useState<'upload' | 'url'>('upload');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [existingUploadUrl, setExistingUploadUrl] = useState<string | null>(null);
  const [urlLightboxOpen, setUrlLightboxOpen] = useState(false);

  // Attributes state
  const [availableAttrs, setAvailableAttrs] = useState<AvailableAttribute[]>([]);
  const [productAttrs, setProductAttrs] = useState<Record<string, ProductAttributeState>>({});

  useEffect(() => {
    if (open) {
      setProductCode(initialData?.product_code || '');
      setProductName(initialData?.product_name || '');
      setComments(initialData?.comments || '');
      setSelectedFactories(initialData?.factory_ids || []);
      setSelectedGroups(initialData?.group_ids || []);
      setSelectedLines(initialData?.line_ids || []);
      setUploadFile(null);
      setUploadPreview(null);

      const url = initialData?.master_artwork_url || '';
      if (url && isSupabaseStorageUrl(url)) {
        setArtworkMode('upload');
        setExistingUploadUrl(url);
        setUploadPreview(url);
        setArtworkUrl('');
      } else {
        setArtworkMode(url ? 'url' : 'upload');
        setExistingUploadUrl(null);
        setArtworkUrl(url);
      }
    }
  }, [open, initialData]);

  // Fetch available attributes from project's vision project attributes
  useEffect(() => {
    if (!open || !projectId) { setAvailableAttrs([]); return; }
    const fetchAttrs = async () => {
      // Get all vision_project_attributes for this solutions project
      const { data: vpas } = await supabase
        .from('vision_project_attributes')
        .select('project_attribute_id, vision_projects!inner(solutions_project_id)')
        .eq('vision_projects.solutions_project_id', projectId);

      const paIds = [...new Set((vpas || []).map((v: any) => v.project_attribute_id))];
      if (paIds.length === 0) { setAvailableAttrs([]); return; }

      const { data: paData } = await supabase
        .from('project_attributes')
        .select('id, master_attribute_id')
        .in('id', paIds);

      const masterIds = (paData || []).map((pa: any) => pa.master_attribute_id);
      const { data: masters } = await supabase
        .from('master_attributes')
        .select('id, name')
        .in('id', masterIds);

      const masterMap = Object.fromEntries((masters || []).map((m: any) => [m.id, m.name]));
      setAvailableAttrs((paData || []).map((pa: any) => ({
        project_attribute_id: pa.id,
        master_name: masterMap[pa.master_attribute_id] || 'Unknown',
      })));
    };
    fetchAttrs();
  }, [open, projectId]);

  // Load existing product_attributes when editing
  useEffect(() => {
    if (!open || !productId || availableAttrs.length === 0) {
      if (!productId) setProductAttrs({});
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from('product_attributes')
        .select('project_attribute_id, is_variable, fixed_value')
        .eq('product_id', productId);

      const state: Record<string, ProductAttributeState> = {};
      for (const d of (data || []) as any[]) {
        state[d.project_attribute_id] = {
          selected: true,
          is_variable: d.is_variable,
          fixed_value: d.fixed_value || '',
        };
      }
      setProductAttrs(state);
    };
    load();
  }, [open, productId, availableAttrs.length]);

  const filteredGroups = groups.filter(g => selectedFactories.includes(g.factory_id));
  // Filter lines by selected groups
  const filteredLines = lines.filter(l => selectedGroups.includes(l.group_id));

  // Clean up selections when parent changes
  useEffect(() => {
    setSelectedGroups(prev => prev.filter(gId => filteredGroups.some(g => g.id === gId)));
  }, [selectedFactories.join(',')]);

  useEffect(() => {
    setSelectedLines(prev => prev.filter(lId => filteredLines.some(l => l.id === lId)));
  }, [selectedGroups.join(',')]);

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

  const uploadToStorage = async (productId: string): Promise<string> => {
    if (!uploadFile) throw new Error('No file selected');

    const ext = uploadFile.name.split('.').pop() || 'jpg';
    const filePath = `${productId}/${Date.now()}.${ext}`;

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
    setSaving(true);
    try {
      let finalUrl = '';

      if (artworkMode === 'upload') {
        if (uploadFile) {
          // New file to upload — use a temp ID, the parent will handle the actual product ID
          const tempId = initialData?.product_code || crypto.randomUUID();
          finalUrl = await uploadToStorage(tempId);

          // Delete old uploaded file if replacing
          if (existingUploadUrl) {
            await deleteOldUpload(existingUploadUrl);
          }
        } else if (existingUploadUrl) {
          // Keep existing upload
          finalUrl = existingUploadUrl;
        }
      } else {
        finalUrl = artworkUrl.trim();

        // If switching from upload to URL, delete the old uploaded file
        if (initialData?.master_artwork_url && isSupabaseStorageUrl(initialData.master_artwork_url)) {
          await deleteOldUpload(initialData.master_artwork_url);
        }
      }

      // Build product_attributes from state
      const selectedAttrs: ProductFormData['product_attributes'] = availableAttrs
        .filter(a => productAttrs[a.project_attribute_id]?.selected)
        .map(a => ({
          project_attribute_id: a.project_attribute_id,
          is_variable: productAttrs[a.project_attribute_id]?.is_variable ?? false,
          fixed_value: productAttrs[a.project_attribute_id]?.fixed_value ?? '',
        }));

      await onSubmit({
        product_code: productCode.trim(),
        product_name: productName.trim(),
        master_artwork_url: finalUrl,
        comments: comments.trim(),
        factory_ids: selectedFactories,
        group_ids: selectedGroups,
        line_ids: selectedLines,
        product_attributes: selectedAttrs,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error saving product', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (list: string[], id: string, setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  const hasArtwork = artworkMode === 'upload' ? !!(uploadPreview || existingUploadUrl) : !!artworkUrl.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update product details and factory assignments' : 'Add a new product to this project'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product Code *</Label>
              <Input value={productCode} onChange={e => setProductCode(e.target.value)} placeholder="e.g. SKU-001" />
            </div>
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Orange Juice 1L" />
            </div>
          </div>

          {/* Artwork: Upload or URL */}
          <div className="space-y-2">
            <Label>Master Artwork</Label>
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
                <Input value={artworkUrl} onChange={e => setArtworkUrl(e.target.value)} placeholder="https://..." />
                {artworkUrl && (
                  <div className="border rounded-lg p-2 inline-block">
                    <img
                      src={artworkUrl}
                      alt="Artwork preview"
                      className="max-h-24 rounded cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setUrlLightboxOpen(true)}
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
                <ImageLightbox src={artworkUrl} open={urlLightboxOpen} onOpenChange={setUrlLightboxOpen} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label>Comments</Label>
            <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Optional comments" />
          </div>

          {/* Factory multi-select */}
          <div className="space-y-2">
            <Label>Factories</Label>
            {factories.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No factories configured</p>
            ) : (
              <div className="border rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
                {factories.map(f => (
                  <label key={f.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selectedFactories.includes(f.id)} onCheckedChange={() => toggle(selectedFactories, f.id, setSelectedFactories)} />
                    <span className="text-sm">{f.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Group multi-select (filtered) */}
          {filteredGroups.length > 0 && (
            <div className="space-y-2">
              <Label>Groups</Label>
              <div className="border rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
                {filteredGroups.map(g => (
                  <label key={g.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selectedGroups.includes(g.id)} onCheckedChange={() => toggle(selectedGroups, g.id, setSelectedGroups)} />
                    <span className="text-sm">{g.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Line multi-select (filtered) */}
          {filteredLines.length > 0 && (
            <div className="space-y-2">
              <Label>Lines</Label>
              <div className="border rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
                {filteredLines.map(l => (
                  <label key={l.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selectedLines.includes(l.id)} onCheckedChange={() => toggle(selectedLines, l.id, setSelectedLines)} />
                    <span className="text-sm">{l.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !productCode.trim() || !productName.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VisionProject {
  id: string;
  name: string;
}

interface VPAttribute {
  project_attribute_id: string;
  master_name: string;
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

export function ProductViewDialog({ open, onOpenChange, productId, projectId, visionProjects, editingView, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [viewName, setViewName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [vpId, setVpId] = useState<string>('');
  const [vpAttrs, setVpAttrs] = useState<VPAttribute[]>([]);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setViewName(editingView?.view_name || '');
      setImageUrl(editingView?.view_image_url || '');
      setVpId(editingView?.vision_project_id || '');
      setAttrValues({});
    }
  }, [open, editingView]);

  // Fetch VP attributes when VP changes
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
      const attrs: VPAttribute[] = (paData || []).map((pa: any) => ({
        project_attribute_id: pa.id,
        master_name: masterMap[pa.master_attribute_id] || 'Unknown',
      }));

      setVpAttrs(attrs);
    };
    fetchVpAttrs();
  }, [vpId]);

  // Load existing attribute values for edit mode
  useEffect(() => {
    if (!open || !editingView?.id || vpAttrs.length === 0) return;
    const load = async () => {
      const { data } = await supabase
        .from('product_view_attributes')
        .select('project_attribute_id, value')
        .eq('product_view_id', editingView.id);
      const vals: Record<string, string> = {};
      for (const d of (data || []) as any[]) {
        vals[d.project_attribute_id] = d.value;
      }
      setAttrValues(vals);
    };
    load();
  }, [editingView?.id, vpAttrs.length, open]);

  const handleSave = async () => {
    if (!viewName.trim()) {
      toast({ title: 'Validation', description: 'View name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);

    try {
      let viewId: string;

      const viewPayload: any = {
        view_name: viewName.trim(),
        view_image_url: imageUrl.trim() || null,
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

      // Sync attribute values
      await supabase.from('product_view_attributes').delete().eq('product_view_id', viewId);
      const attrInserts = vpAttrs
        .filter(a => attrValues[a.project_attribute_id]?.trim())
        .map(a => ({
          product_view_id: viewId,
          project_attribute_id: a.project_attribute_id,
          value: attrValues[a.project_attribute_id].trim(),
        }));
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

          <div className="space-y-2">
            <Label>View Image URL</Label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
            {imageUrl && (
              <div className="mt-2 border rounded-lg p-2 inline-block">
                <img src={imageUrl} alt="View" className="max-h-24 rounded" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
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

          {/* Attributes from selected VP */}
          {vpAttrs.length > 0 && (
            <div className="space-y-2">
              <Label>Attribute Values</Label>
              <p className="text-xs text-muted-foreground">Set values for attributes from the selected vision project</p>
              <div className="border rounded-lg p-3 space-y-3">
                {vpAttrs.map(attr => (
                  <div key={attr.project_attribute_id} className="flex items-center gap-3">
                    <span className="text-sm min-w-[120px]">{attr.master_name}</span>
                    <Input
                      className="flex-1"
                      placeholder="Value"
                      value={attrValues[attr.project_attribute_id] || ''}
                      onChange={e => setAttrValues(prev => ({ ...prev, [attr.project_attribute_id]: e.target.value }))}
                    />
                  </div>
                ))}
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

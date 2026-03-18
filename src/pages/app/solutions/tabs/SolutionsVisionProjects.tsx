import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VisionProject {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  attribute_ids: string[];
  views_count: number;
}

interface ProjectAttribute {
  id: string;
  master_attribute_id: string;
  master_name: string;
  master_data_type: string;
}

interface Props {
  projectId: string;
}

export function SolutionsVisionProjects({ projectId }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<VisionProject[]>([]);
  const [projectAttrs, setProjectAttrs] = useState<ProjectAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<VisionProject | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAttrIds, setSelectedAttrIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [vpRes, paRes] = await Promise.all([
      supabase
        .from('vision_projects')
        .select('id, name, description, created_at')
        .eq('solutions_project_id', projectId)
        .order('created_at'),
      supabase
        .from('project_attributes')
        .select('id, master_attribute_id')
        .eq('solutions_project_id', projectId),
    ]);

    // Fetch master attribute names
    const paList = (paRes.data || []) as any[];
    const masterIds = paList.map(pa => pa.master_attribute_id);
    let masterMap: Record<string, { name: string; data_type: string }> = {};
    if (masterIds.length > 0) {
      const { data: masters } = await supabase
        .from('master_attributes')
        .select('id, name, data_type')
        .in('id', masterIds);
      masterMap = Object.fromEntries((masters || []).map((m: any) => [m.id, { name: m.name, data_type: m.data_type }]));
    }

    const attrs: ProjectAttribute[] = paList.map(pa => ({
      id: pa.id,
      master_attribute_id: pa.master_attribute_id,
      master_name: masterMap[pa.master_attribute_id]?.name || 'Unknown',
      master_data_type: masterMap[pa.master_attribute_id]?.data_type || '',
    }));
    setProjectAttrs(attrs);

    // Fetch vision project attributes + views count
    const vpList = (vpRes.data || []) as any[];
    const vpIds = vpList.map(vp => vp.id);

    let vpaMap: Record<string, string[]> = {};
    let viewsMap: Record<string, number> = {};

    if (vpIds.length > 0) {
      const [vpaRes, viewsRes] = await Promise.all([
        supabase.from('vision_project_attributes').select('vision_project_id, project_attribute_id').in('vision_project_id', vpIds),
        supabase.from('product_views').select('id, vision_project_id').in('vision_project_id', vpIds),
      ]);

      for (const vpa of (vpaRes.data || []) as any[]) {
        if (!vpaMap[vpa.vision_project_id]) vpaMap[vpa.vision_project_id] = [];
        vpaMap[vpa.vision_project_id].push(vpa.project_attribute_id);
      }
      for (const pv of (viewsRes.data || []) as any[]) {
        viewsMap[pv.vision_project_id] = (viewsMap[pv.vision_project_id] || 0) + 1;
      }
    }

    const enriched: VisionProject[] = vpList.map(vp => ({
      id: vp.id,
      name: vp.name,
      description: vp.description,
      created_at: vp.created_at,
      attribute_ids: vpaMap[vp.id] || [],
      views_count: viewsMap[vp.id] || 0,
    }));

    setRows(enriched);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setSelectedAttrIds([]);
    setDialogOpen(true);
  };

  const openEdit = (item: VisionProject) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || '');
    setSelectedAttrIds([...item.attribute_ids]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Validation', description: 'Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);

    try {
      let vpId: string;

      if (editingItem) {
        const { error } = await supabase
          .from('vision_projects')
          .update({ name: name.trim(), description: description.trim() || null } as any)
          .eq('id', editingItem.id);
        if (error) throw error;
        vpId = editingItem.id;
      } else {
        const { data, error } = await supabase
          .from('vision_projects')
          .insert({ solutions_project_id: projectId, name: name.trim(), description: description.trim() || null } as any)
          .select('id')
          .single();
        if (error) throw error;
        vpId = data.id;
      }

      // Sync attributes: delete all, re-insert selected
      await supabase.from('vision_project_attributes').delete().eq('vision_project_id', vpId);
      if (selectedAttrIds.length > 0) {
        const inserts = selectedAttrIds.map(paId => ({
          vision_project_id: vpId,
          project_attribute_id: paId,
        }));
        const { error: attrErr } = await supabase.from('vision_project_attributes').insert(inserts as any);
        if (attrErr) throw attrErr;
      }

      toast({ title: editingItem ? 'Updated' : 'Created', description: `Vision project "${name.trim()}" saved` });
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('vision_projects').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Vision project removed' });
      fetchData();
    }
    setDeleteId(null);
  };

  const toggleAttr = (paId: string) => {
    setSelectedAttrIds(prev =>
      prev.includes(paId) ? prev.filter(id => id !== paId) : [...prev, paId]
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vision Projects</h3>
          <p className="text-sm text-muted-foreground">Group product views by vision project and assign attributes</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vision Project
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">No vision projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create a vision project to group product views and assign attributes</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Attributes</TableHead>
                <TableHead>Product Views</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.description || '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.attribute_ids.length === 0 ? (
                        <span className="text-muted-foreground text-sm">None</span>
                      ) : (
                        row.attribute_ids.map(paId => {
                          const attr = projectAttrs.find(a => a.id === paId);
                          return attr ? (
                            <Badge key={paId} variant="secondary" className="text-[10px]">
                              {attr.master_name}
                            </Badge>
                          ) : null;
                        })
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.views_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Vision Project' : 'New Vision Project'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update vision project details and attributes' : 'Create a new vision project and select its attributes'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tesco Orange" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label>Attributes</Label>
              <p className="text-xs text-muted-foreground">Select attributes from the project's attribute list</p>
              {projectAttrs.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-2">No project attributes available. Add attributes in the Attributes tab first.</p>
              ) : (
                <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                  {projectAttrs.map(attr => (
                    <label key={attr.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={selectedAttrIds.includes(attr.id)}
                        onCheckedChange={() => toggleAttr(attr.id)}
                      />
                      <span className="text-sm">{attr.master_name}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px]">{attr.master_data_type}</Badge>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vision Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the vision project and unlink any product views. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

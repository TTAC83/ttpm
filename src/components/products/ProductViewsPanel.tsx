import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Pencil, Trash2, Loader2, ArrowLeft, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductViewDialog } from './ProductViewDialog';

interface ProductView {
  id: string;
  view_name: string;
  view_image_url: string | null;
  vision_project_id: string | null;
  vision_project_name: string | null;
  attributes_count: number;
  positions_count: number;
  equipment_count: number;
  attribute_names: string[];
  position_names: string[];
  equipment_names: string[];
}

interface VisionProject {
  id: string;
  name: string;
}

interface Props {
  productId: string;
  productName: string;
  projectId: string;
  onBack: () => void;
}

export function ProductViewsPanel({ productId, productName, projectId, onBack }: Props) {
  const { toast } = useToast();
  const [views, setViews] = useState<ProductView[]>([]);
  const [visionProjects, setVisionProjects] = useState<VisionProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingView, setEditingView] = useState<ProductView | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [viewsRes, vpRes] = await Promise.all([
      supabase.from('product_views').select('id, view_name, view_image_url, vision_project_id').eq('product_id', productId).order('created_at'),
      supabase.from('vision_projects').select('id, name').eq('solutions_project_id', projectId).order('name'),
    ]);

    const vpList = (vpRes.data || []) as VisionProject[];
    setVisionProjects(vpList);
    const vpMap = Object.fromEntries(vpList.map(vp => [vp.id, vp.name]));

    const viewsList = (viewsRes.data || []) as any[];
    const viewIds = viewsList.map(v => v.id);

    let attrCountMap: Record<string, number> = {};
    let attrNamesMap: Record<string, string[]> = {};
    let posCountMap: Record<string, number> = {};
    let posNamesMap: Record<string, string[]> = {};
    let eqCountMap: Record<string, number> = {};
    let eqNamesMap: Record<string, string[]> = {};

    if (viewIds.length > 0) {
      // Fetch attribute details
      const { data: attrs } = await supabase
        .from('product_view_attributes')
        .select('product_view_id, project_attribute_id')
        .in('product_view_id', viewIds);

      const paIds = [...new Set((attrs || []).map((a: any) => a.project_attribute_id))];
      let masterNameMap: Record<string, string> = {};
      if (paIds.length > 0) {
        const { data: paData } = await supabase.from('project_attributes').select('id, master_attribute_id').in('id', paIds);
        const masterIds = [...new Set((paData || []).map((pa: any) => pa.master_attribute_id))];
        if (masterIds.length > 0) {
          const { data: masters } = await supabase.from('master_attributes').select('id, name').in('id', masterIds);
          const mMap = Object.fromEntries((masters || []).map((m: any) => [m.id, m.name]));
          masterNameMap = Object.fromEntries((paData || []).map((pa: any) => [pa.id, mMap[pa.master_attribute_id] || 'Unknown']));
        }
      }

      for (const a of (attrs || []) as any[]) {
        attrCountMap[a.product_view_id] = (attrCountMap[a.product_view_id] || 0) + 1;
        if (!attrNamesMap[a.product_view_id]) attrNamesMap[a.product_view_id] = [];
        attrNamesMap[a.product_view_id].push(masterNameMap[a.project_attribute_id] || 'Unknown');
      }

      // Fetch position details
      const { data: posLinks } = await supabase
        .from('product_view_positions')
        .select('product_view_id, position_id')
        .in('product_view_id', viewIds);

      const posIds = [...new Set((posLinks || []).map((p: any) => p.position_id))];
      let posNameLookup: Record<string, string> = {};
      if (posIds.length > 0) {
        const { data: positions } = await supabase.from('positions').select('id, name').in('id', posIds);
        posNameLookup = Object.fromEntries((positions || []).map((p: any) => [p.id, p.name || 'Unnamed']));
      }

      for (const p of (posLinks || []) as any[]) {
        posCountMap[p.product_view_id] = (posCountMap[p.product_view_id] || 0) + 1;
        if (!posNamesMap[p.product_view_id]) posNamesMap[p.product_view_id] = [];
        posNamesMap[p.product_view_id].push(posNameLookup[p.position_id] || 'Unknown');
      }

      // Fetch equipment details
      const { data: eqLinks } = await supabase
        .from('product_view_equipment')
        .select('product_view_id, equipment_id')
        .in('product_view_id', viewIds);

      const eqIds = [...new Set((eqLinks || []).map((e: any) => e.equipment_id))];
      let eqNameLookup: Record<string, string> = {};
      if (eqIds.length > 0) {
        const { data: equipment } = await supabase.from('equipment').select('id, name').in('id', eqIds);
        eqNameLookup = Object.fromEntries((equipment || []).map((e: any) => [e.id, e.name || 'Unnamed']));
      }

      for (const e of (eqLinks || []) as any[]) {
        eqCountMap[e.product_view_id] = (eqCountMap[e.product_view_id] || 0) + 1;
        if (!eqNamesMap[e.product_view_id]) eqNamesMap[e.product_view_id] = [];
        eqNamesMap[e.product_view_id].push(eqNameLookup[e.equipment_id] || 'Unknown');
      }
    }

    const enriched: ProductView[] = viewsList.map(v => ({
      id: v.id,
      view_name: v.view_name,
      view_image_url: v.view_image_url,
      vision_project_id: v.vision_project_id,
      vision_project_name: v.vision_project_id ? vpMap[v.vision_project_id] || null : null,
      attributes_count: attrCountMap[v.id] || 0,
      positions_count: posCountMap[v.id] || 0,
      equipment_count: eqCountMap[v.id] || 0,
      attribute_names: attrNamesMap[v.id] || [],
      position_names: posNamesMap[v.id] || [],
      equipment_names: eqNamesMap[v.id] || [],
    }));

    setViews(enriched);
    setLoading(false);
  }, [productId, projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('product_views').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted' });
      fetchData();
    }
    setDeleteId(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Views for {productName}</h3>
          <p className="text-sm text-muted-foreground">Manage product views and link to vision projects</p>
        </div>
        <Button size="sm" onClick={() => { setEditingView(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add View
        </Button>
      </div>

      {views.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No views yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add views to define how this product is inspected</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>View Name</TableHead>
                <TableHead>Vision Project</TableHead>
                <TableHead>Positions</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Attributes</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {views.map(view => (
                <TableRow key={view.id}>
                  <TableCell>
                    {view.view_image_url ? (
                      <img src={view.view_image_url} alt={view.view_name} className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Image className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{view.view_name}</TableCell>
                  <TableCell>
                    {view.vision_project_name ? (
                      <Badge variant="secondary">{view.vision_project_name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <CountBadge count={view.positions_count} names={view.position_names} label="Positions" />
                  </TableCell>
                  <TableCell>
                    <CountBadge count={view.equipment_count} names={view.equipment_names} label="Equipment" />
                  </TableCell>
                  <TableCell>
                    <CountBadge count={view.attributes_count} names={view.attribute_names} label="Attributes" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingView(view); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(view.id)}>
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

      <ProductViewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        productId={productId}
        projectId={projectId}
        visionProjects={visionProjects}
        editingView={editingView}
        onSaved={fetchData}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete View?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the view and its attribute values. This cannot be undone.</AlertDialogDescription>
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

function CountBadge({ count, names, label }: { count: number; names: string[]; label: string }) {
  if (count === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge variant="outline" className="cursor-pointer hover:bg-accent transition-colors">
          {count}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
        <ul className="space-y-1">
          {names.map((name, i) => (
            <li key={i} className="text-sm">• {name}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

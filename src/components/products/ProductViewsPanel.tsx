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
    if (viewIds.length > 0) {
      const { data: attrs } = await supabase
        .from('product_view_attributes')
        .select('product_view_id')
        .in('product_view_id', viewIds);
      for (const a of (attrs || []) as any[]) {
        attrCountMap[a.product_view_id] = (attrCountMap[a.product_view_id] || 0) + 1;
      }
    }

    const enriched: ProductView[] = viewsList.map(v => ({
      id: v.id,
      view_name: v.view_name,
      view_image_url: v.view_image_url,
      vision_project_id: v.vision_project_id,
      vision_project_name: v.vision_project_id ? vpMap[v.vision_project_id] || null : null,
      attributes_count: attrCountMap[v.id] || 0,
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
                    <Badge variant="outline">{view.attributes_count}</Badge>
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

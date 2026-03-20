import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Plus, Pencil, Trash2, Loader2, Eye, Image, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductDialog, type ProductFormData } from '@/components/products/ProductDialog';
import { ProductViewsPanel } from '@/components/products/ProductViewsPanel';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { ProductImportReviewDialog } from '@/components/products/ProductImportReviewDialog';
import { exportProductsToExcel, parseImportFile, applyImport, type ImportParseResult } from '@/lib/productBulkService';

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  master_artwork_url: string | null;
  comments: string | null;
  factory_ids: string[];
  group_ids: string[];
  line_ids: string[];
  views_count: number;
}

interface FactoryItem { id: string; name: string; }
interface GroupItem { id: string; name: string; factory_id: string; }
interface LineItem { id: string; name: string; group_id: string; }

interface Props {
  projectId: string;
}

export function SolutionsProducts({ projectId }: Props) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Import/Export state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importParsing, setImportParsing] = useState(false);
  const [importResult, setImportResult] = useState<ImportParseResult | null>(null);
  const [importReviewOpen, setImportReviewOpen] = useState(false);

  // Factory hierarchy
  const [factories, setFactories] = useState<FactoryItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [lines, setLines] = useState<LineItem[]>([]);

  const fetchHierarchy = useCallback(async () => {
    // First get the portal for this project
    const { data: portalData } = await supabase
      .from('solution_portals')
      .select('id')
      .eq('solutions_project_id', projectId)
      .single();

    if (!portalData?.id) {
      setFactories([]);
      setGroups([]);
      setLines([]);
      return;
    }

    const { data: factoryData } = await supabase
      .from('solution_factories' as any)
      .select('id, name')
      .eq('portal_id', portalData.id)
      .order('name');

    const factList = ((factoryData as any) || []) as FactoryItem[];
    setFactories(factList);

    if (factList.length > 0) {
      const factIds = factList.map(f => f.id);
      const { data: groupData } = await supabase
        .from('factory_groups')
        .select('id, name, factory_id')
        .in('factory_id', factIds)
        .order('name');
      const grpList = (groupData || []) as GroupItem[];
      setGroups(grpList);

      if (grpList.length > 0) {
        const grpIds = grpList.map(g => g.id);
        const { data: lineData } = await supabase
          .from('factory_group_lines')
          .select('id, name, group_id')
          .in('group_id', grpIds)
          .order('name');
        setLines((lineData || []) as LineItem[]);
      }
    }
  }, [projectId]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);

    const { data: prodData } = await supabase
      .from('products')
      .select('id, product_code, product_name, master_artwork_url, comments')
      .eq('solutions_project_id', projectId)
      .order('product_code');

    const prodList = (prodData || []) as any[];
    const prodIds = prodList.map(p => p.id);

    let factLinksMap: Record<string, string[]> = {};
    let grpLinksMap: Record<string, string[]> = {};
    let lineLinksMap: Record<string, string[]> = {};
    let viewsCountMap: Record<string, number> = {};

    if (prodIds.length > 0) {
      const [flRes, glRes, llRes, vRes] = await Promise.all([
        supabase.from('product_factory_links').select('product_id, factory_id').in('product_id', prodIds),
        supabase.from('product_group_links').select('product_id, group_id').in('product_id', prodIds),
        supabase.from('product_line_links').select('product_id, line_id').in('product_id', prodIds),
        supabase.from('product_views').select('id, product_id').in('product_id', prodIds),
      ]);

      for (const fl of (flRes.data || []) as any[]) {
        if (!factLinksMap[fl.product_id]) factLinksMap[fl.product_id] = [];
        factLinksMap[fl.product_id].push(fl.factory_id);
      }
      for (const gl of (glRes.data || []) as any[]) {
        if (!grpLinksMap[gl.product_id]) grpLinksMap[gl.product_id] = [];
        grpLinksMap[gl.product_id].push(gl.group_id);
      }
      for (const ll of (llRes.data || []) as any[]) {
        if (!lineLinksMap[ll.product_id]) lineLinksMap[ll.product_id] = [];
        lineLinksMap[ll.product_id].push(ll.line_id);
      }
      for (const v of (vRes.data || []) as any[]) {
        viewsCountMap[v.product_id] = (viewsCountMap[v.product_id] || 0) + 1;
      }
    }

    const enriched: Product[] = prodList.map(p => ({
      id: p.id,
      product_code: p.product_code,
      product_name: p.product_name,
      master_artwork_url: p.master_artwork_url,
      comments: p.comments,
      factory_ids: factLinksMap[p.id] || [],
      group_ids: grpLinksMap[p.id] || [],
      line_ids: lineLinksMap[p.id] || [],
      views_count: viewsCountMap[p.id] || 0,
    }));

    setProducts(enriched);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchHierarchy();
    fetchProducts();
  }, [fetchHierarchy, fetchProducts]);

  const handleSubmit = async (data: ProductFormData) => {
    try {
      let prodId: string;

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            product_code: data.product_code,
            product_name: data.product_name,
            master_artwork_url: data.master_artwork_url || null,
            comments: data.comments || null,
          } as any)
          .eq('id', editingProduct.id);
        if (error) throw error;
        prodId = editingProduct.id;
      } else {
        const { data: inserted, error } = await supabase
          .from('products')
          .insert({
            solutions_project_id: projectId,
            product_code: data.product_code,
            product_name: data.product_name,
            master_artwork_url: data.master_artwork_url || null,
            comments: data.comments || null,
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        prodId = inserted.id;
      }

      // Sync junction tables
      await Promise.all([
        supabase.from('product_factory_links').delete().eq('product_id', prodId),
        supabase.from('product_group_links').delete().eq('product_id', prodId),
        supabase.from('product_line_links').delete().eq('product_id', prodId),
        supabase.from('product_attributes').delete().eq('product_id', prodId),
      ]);

      const inserts = [];
      if (data.factory_ids.length > 0) {
        inserts.push(supabase.from('product_factory_links').insert(data.factory_ids.map(fId => ({ product_id: prodId, factory_id: fId })) as any));
      }
      if (data.group_ids.length > 0) {
        inserts.push(supabase.from('product_group_links').insert(data.group_ids.map(gId => ({ product_id: prodId, group_id: gId })) as any));
      }
      if (data.line_ids.length > 0) {
        inserts.push(supabase.from('product_line_links').insert(data.line_ids.map(lId => ({ product_id: prodId, line_id: lId })) as any));
      }
      if (data.product_attributes.length > 0) {
        inserts.push(supabase.from('product_attributes').insert(
          data.product_attributes.map(a => ({
            product_id: prodId,
            project_attribute_id: a.project_attribute_id,
          })) as any
        ));
      }
      await Promise.all(inserts);

      toast({ title: editingProduct ? 'Updated' : 'Created', description: `Product "${data.product_name}" saved` });
      fetchProducts();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('products').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted' });
      fetchProducts();
    }
    setDeleteId(null);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportProductsToExcel(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Exported', description: 'Excel file downloaded' });
    } catch (err: any) {
      toast({ title: 'Export Error', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportParsing(true);
    try {
      const result = await parseImportFile(file, projectId);
      setImportResult(result);
      setImportReviewOpen(true);
    } catch (err: any) {
      toast({ title: 'Import Error', description: err.message, variant: 'destructive' });
    } finally {
      setImportParsing(false);
    }
  };

  const handleApplyImport = async (result: ImportParseResult) => {
    try {
      await applyImport(result, projectId);
      toast({ title: 'Import Complete', description: 'Products and views have been updated' });
      fetchHierarchy();
      fetchProducts();
    } catch (err: any) {
      toast({ title: 'Import Error', description: err.message, variant: 'destructive' });
      throw err;
    }
  };

  // If viewing product views
  if (viewingProduct) {
    return (
      <ProductViewsPanel
        productId={viewingProduct.id}
        productName={`${viewingProduct.product_code} - ${viewingProduct.product_name}`}
        projectId={projectId}
        onBack={() => { setViewingProduct(null); fetchProducts(); }}
      />
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const factoryMap = Object.fromEntries(factories.map(f => [f.id, f.name]));
  const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]));
  const lineMap = Object.fromEntries(lines.map(l => [l.id, l.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Products</h3>
          <p className="text-sm text-muted-foreground">Manage products, artwork, and configure views</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importParsing}>
            {importParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import
          </Button>
          <Button size="sm" onClick={() => { setEditingProduct(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">No products yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add products to track what's being inspected on each line</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artwork</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Factories</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(prod => (
                <TableRow key={prod.id}>
                  <TableCell>
                    {prod.master_artwork_url ? (
                      <img
                        src={prod.master_artwork_url}
                        alt={prod.product_name}
                        className="h-10 w-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxSrc(prod.master_artwork_url)}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Image className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{prod.product_code}</TableCell>
                  <TableCell className="font-medium">{prod.product_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {prod.factory_ids.map(fId => (
                        <Badge key={fId} variant="secondary" className="text-[10px]">{factoryMap[fId] || fId}</Badge>
                      ))}
                      {prod.factory_ids.length === 0 && <span className="text-muted-foreground text-sm">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {prod.group_ids.map(gId => (
                        <Badge key={gId} variant="outline" className="text-[10px]">{groupMap[gId] || gId}</Badge>
                      ))}
                      {prod.group_ids.length === 0 && <span className="text-muted-foreground text-sm">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {prod.line_ids.map(lId => (
                        <Badge key={lId} variant="outline" className="text-[10px]">{lineMap[lId] || lId}</Badge>
                      ))}
                      {prod.line_ids.length === 0 && <span className="text-muted-foreground text-sm">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => setViewingProduct(prod)}>
                      <Eye className="h-3.5 w-3.5" />
                      {prod.views_count}
                    </Button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{prod.comments || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(prod); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(prod.id)}>
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

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        initialData={editingProduct ? {
          product_code: editingProduct.product_code,
          product_name: editingProduct.product_name,
          master_artwork_url: editingProduct.master_artwork_url || '',
          comments: editingProduct.comments || '',
          factory_ids: editingProduct.factory_ids,
          group_ids: editingProduct.group_ids,
          line_ids: editingProduct.line_ids,
          product_attributes: [],
        } : null}
        factories={factories}
        groups={groups}
        lines={lines}
        projectId={projectId}
        productId={editingProduct?.id || null}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the product and all its views. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImageLightbox src={lightboxSrc} open={!!lightboxSrc} onOpenChange={(open) => !open && setLightboxSrc(null)} />

      <ProductImportReviewDialog
        open={importReviewOpen}
        onOpenChange={setImportReviewOpen}
        result={importResult}
        onApply={handleApplyImport}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Search, Loader2, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface HardwareItem {
  id: string;
  hardware_type: string;
  sku_no: string;
  type: string;
  product_name: string;
  description?: string;
  price_gbp?: number;
  rrp_gbp?: number;
  minimum_quantity?: number;
  required_optional?: string;
  tags?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

const HARDWARE_TYPES = [
  'Server', 'Camera', 'Light', 'PLC', 'PLC Expansion', 'Storage',
  'VPN', 'TV Device', 'HMI', '10G SFP ADDON', 'Processing Server',
  'Load Balancer', 'Gateway', 'IoT Device', 'IoT Receiver', 'CTs', 'Cloud'
];

const PRODUCT_TYPES = ['TTX-Vision', 'TTX-IOT', 'TTX-Portal'];

export default function HardwareManagement() {
  const { toast } = useToast();
  const [hardware, setHardware] = useState<HardwareItem[]>([]);
  const [filteredHardware, setFilteredHardware] = useState<HardwareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HardwareItem | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    hardware_type: 'Server',
    sku_no: '',
    type: 'TTX-Vision',
    product_name: '',
    description: '',
    price_gbp: '',
    rrp_gbp: '',
    minimum_quantity: '1',
    required_optional: 'Required',
    tags: '',
    comments: '',
  });

  useEffect(() => {
    fetchHardware();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [hardware, filterType, searchQuery]);

  const fetchHardware = async () => {
    try {
      const { data, error } = await supabase
        .from('hardware_master')
        .select('*')
        .order('hardware_type', { ascending: true })
        .order('sku_no', { ascending: true });

      if (error) throw error;
      setHardware(data || []);
    } catch (error) {
      console.error('Error fetching hardware:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch hardware catalog',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...hardware];

    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.hardware_type === filterType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.sku_no.toLowerCase().includes(query) ||
        item.product_name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.tags?.toLowerCase().includes(query)
      );
    }

    setFilteredHardware(filtered);
  };

  const resetForm = () => {
    setFormData({
      hardware_type: 'Server',
      sku_no: '',
      type: 'TTX-Vision',
      product_name: '',
      description: '',
      price_gbp: '',
      rrp_gbp: '',
      minimum_quantity: '1',
      required_optional: 'Required',
      tags: '',
      comments: '',
    });
    setEditingItem(null);
  };

  const handleEdit = (item: HardwareItem) => {
    setEditingItem(item);
    setFormData({
      hardware_type: item.hardware_type,
      sku_no: item.sku_no,
      type: item.type,
      product_name: item.product_name,
      description: item.description || '',
      price_gbp: item.price_gbp?.toString() || '',
      rrp_gbp: item.rrp_gbp?.toString() || '',
      minimum_quantity: item.minimum_quantity?.toString() || '1',
      required_optional: item.required_optional || 'Required',
      tags: item.tags || '',
      comments: item.comments || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.sku_no || !formData.product_name) {
        toast({
          title: 'Validation Error',
          description: 'SKU and Product Name are required',
          variant: 'destructive',
        });
        return;
      }

      const dataToSave = {
        hardware_type: formData.hardware_type,
        sku_no: formData.sku_no,
        type: formData.type,
        product_name: formData.product_name,
        description: formData.description || null,
        price_gbp: formData.price_gbp ? parseFloat(formData.price_gbp) : null,
        rrp_gbp: formData.rrp_gbp ? parseFloat(formData.rrp_gbp) : null,
        minimum_quantity: formData.minimum_quantity ? parseInt(formData.minimum_quantity) : 1,
        required_optional: formData.required_optional,
        tags: formData.tags || null,
        comments: formData.comments || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('hardware_master')
          .update(dataToSave)
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Hardware item updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('hardware_master')
          .insert([dataToSave]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Hardware item created successfully',
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchHardware();
    } catch (error: any) {
      console.error('Error saving hardware:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save hardware item',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('hardware_master')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Hardware item deleted successfully',
      });

      fetchHardware();
    } catch (error) {
      console.error('Error deleting hardware:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete hardware item',
        variant: 'destructive',
      });
    }
  };

  const parseTags = (tags?: string): string[] => {
    if (!tags) return [];
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  };

  const handleExport = () => {
    try {
      const exportData = hardware.map(item => ({
        'Hardware Type': item.hardware_type,
        'SKU Number': item.sku_no,
        'Type': item.type,
        'Product Name': item.product_name,
        'Description': item.description || '',
        'Price (GBP)': item.price_gbp || '',
        'RRP (GBP)': item.rrp_gbp || '',
        'Minimum Quantity': item.minimum_quantity || '',
        'Required/Optional': item.required_optional || '',
        'Tags': item.tags || '',
        'Comments': item.comments || '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hardware Catalog');
      
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `hardware-catalog-${timestamp}.xlsx`);

      toast({
        title: 'Success',
        description: `Exported ${hardware.length} hardware items`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Error',
        description: 'Failed to export hardware catalog',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const [index, row] of jsonData.entries()) {
        try {
          const rowData: any = row;
          
          if (!rowData['SKU Number'] || !rowData['Product Name']) {
            failed++;
            errors.push(`Row ${index + 2}: Missing required fields (SKU Number or Product Name)`);
            continue;
          }

          const itemData = {
            hardware_type: rowData['Hardware Type'] || 'Server',
            sku_no: rowData['SKU Number'],
            type: rowData['Type'] || 'TTX-Vision',
            product_name: rowData['Product Name'],
            description: rowData['Description'] || null,
            price_gbp: rowData['Price (GBP)'] ? parseFloat(rowData['Price (GBP)']) : null,
            rrp_gbp: rowData['RRP (GBP)'] ? parseFloat(rowData['RRP (GBP)']) : null,
            minimum_quantity: rowData['Minimum Quantity'] ? parseInt(rowData['Minimum Quantity']) : 1,
            required_optional: rowData['Required/Optional'] || 'Required',
            tags: rowData['Tags'] || null,
            comments: rowData['Comments'] || null,
          };

          const { error } = await supabase
            .from('hardware_master')
            .upsert(itemData, { onConflict: 'sku_no' });

          if (error) throw error;
          success++;
        } catch (err: any) {
          failed++;
          errors.push(`Row ${index + 2}: ${err.message}`);
        }
      }

      setImportResults({ success, failed, errors: errors.slice(0, 10) });
      
      if (success > 0) {
        fetchHardware();
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${success} items${failed > 0 ? `, ${failed} failed` : ''}`,
        });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to import hardware catalog',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hardware Catalog</h1>
          <p className="text-muted-foreground">Manage ThingTrax hardware SKUs and specifications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Hardware
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Hardware</CardTitle>
          <CardDescription>Search and filter the hardware catalog</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Hardware Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {HARDWARE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search SKU, product name, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hardware Items ({filteredHardware.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHardware.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hardware items found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Price (GBP)</TableHead>
                    <TableHead>RRP (GBP)</TableHead>
                    <TableHead>Min Qty</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHardware.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><Badge variant="outline">{item.hardware_type}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{item.sku_no}</TableCell>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>
                        {item.price_gbp ? `£${item.price_gbp.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {item.rrp_gbp ? `£${item.rrp_gbp.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>{item.minimum_quantity || 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {parseTags(item.tags).slice(0, 2).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {parseTags(item.tags).length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{parseTags(item.tags).length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Hardware</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {item.sku_no}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(item.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Hardware' : 'Add Hardware'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update hardware item details' : 'Add a new hardware item to the catalog'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hardware_type">Hardware Type *</Label>
                <Select value={formData.hardware_type} onValueChange={(value) => setFormData({ ...formData, hardware_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HARDWARE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku_no">SKU Number *</Label>
                <Input
                  id="sku_no"
                  value={formData.sku_no}
                  onChange={(e) => setFormData({ ...formData, sku_no: e.target.value })}
                  placeholder="TTX-AI-GW-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_name">Product Name *</Label>
                <Input
                  id="product_name"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="Ai Vision Server (AE Gen 2)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Technical specifications and details..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_gbp">Price (GBP)</Label>
                <Input
                  id="price_gbp"
                  type="number"
                  step="0.01"
                  value={formData.price_gbp}
                  onChange={(e) => setFormData({ ...formData, price_gbp: e.target.value })}
                  placeholder="2100.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rrp_gbp">RRP (GBP)</Label>
                <Input
                  id="rrp_gbp"
                  type="number"
                  step="0.01"
                  value={formData.rrp_gbp}
                  onChange={(e) => setFormData({ ...formData, rrp_gbp: e.target.value })}
                  placeholder="2500.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimum_quantity">Min Quantity</Label>
                <Input
                  id="minimum_quantity"
                  type="number"
                  value={formData.minimum_quantity}
                  onChange={(e) => setFormData({ ...formData, minimum_quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="required_optional">Required/Optional</Label>
                <Select value={formData.required_optional} onValueChange={(value) => setFormData({ ...formData, required_optional: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Required">Required</SelectItem>
                    <SelectItem value="Optional">Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="ONP-VSN, HYB-VSN, ONP-VSN-CORE"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                placeholder="Deployment notes and additional information..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Hardware Catalog</DialogTitle>
            <DialogDescription>
              Upload an Excel file to import hardware items. Existing items with matching SKU numbers will be updated.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">Select File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImport}
                disabled={importing}
              />
              <p className="text-xs text-muted-foreground">
                Required columns: Hardware Type, SKU Number, Type, Product Name
              </p>
            </div>

            {importing && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Importing...</span>
              </div>
            )}

            {importResults && (
              <div className="space-y-2">
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">✓ Success: {importResults.success}</span>
                  {importResults.failed > 0 && (
                    <span className="text-destructive">✗ Failed: {importResults.failed}</span>
                  )}
                </div>
                {importResults.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Errors:</p>
                    <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                      {importResults.errors.map((error, idx) => (
                        <div key={idx}>{error}</div>
                      ))}
                      {importResults.errors.length === 10 && importResults.failed > 10 && (
                        <div>... and {importResults.failed - 10} more errors</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportResults(null); }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

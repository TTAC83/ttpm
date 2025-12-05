import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useProjectHardwareSummary, type HardwareItem } from '@/hooks/useProjectHardwareSummary';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectHardwareSummaryProps {
  projectId: string;
}

export const ProjectHardwareSummary = ({ projectId }: ProjectHardwareSummaryProps) => {
  const { hardware, loading, refetch } = useProjectHardwareSummary(projectId);
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const handleSavePrice = async (item: HardwareItem) => {
    if (!item.hardware_master_id) {
      setEditingId(null);
      return;
    }

    const numeric = Number(editingValue);
    if (Number.isNaN(numeric) || numeric < 0) {
      toast({
        title: 'Invalid price',
        description: 'Please enter a valid non-negative price.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingId(item.id);
      const { error } = await (supabase
        .from('project_hardware_prices' as any)
        .upsert(
          {
            project_id: projectId,
            hardware_master_id: item.hardware_master_id,
            price_gbp: numeric,
          },
          { onConflict: 'project_id,hardware_master_id' }
        ));

      if (error) throw error;

      toast({
        title: 'Price updated',
        description: 'Project hardware price saved successfully.',
      });

      setEditingId(null);
      await refetch();
    } catch (error) {
      console.error('Error saving hardware price:', error);
      toast({
        title: 'Error saving price',
        description: 'Could not save hardware price. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  const totalPrice = hardware.reduce((sum, item) => {
    const itemPrice = item.effective_price ?? item.price ?? 0;
    const quantity = item.quantity || 1;
    return sum + itemPrice * quantity;
  }, 0);

  const uniqueLines = new Set(hardware.filter(h => h.line_name).map(h => h.line_name));
  const totalLines = uniqueLines.size;

  const categoryCounts = hardware.reduce((acc, item) => {
    const category = item.category || 'Other';
    const quantity = item.quantity || 1;
    acc[category] = (acc[category] || 0) + quantity;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Hardware Summary</span>
          <span className="text-2xl font-bold text-primary">
            £{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </CardTitle>
        <CardDescription>
          All hardware attributed to this project from Factory Hardware and Lines tabs
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-sm text-muted-foreground">Total Lines</div>
            <div className="text-2xl font-bold">{totalLines}</div>
          </div>
          {Object.entries(categoryCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, count]) => (
              <div key={category} className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground">{category}</div>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            ))}
        </div>
        {hardware.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No hardware configured yet</div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Line/Equipment</TableHead>
                  <TableHead>SKU/Model</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Book Price</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hardware.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.category || 'Other'}</TableCell>
                    <TableCell>
                      <Badge variant={item.source === 'line' ? 'default' : 'secondary'}>
                        {item.source === 'line' ? 'Line' : 'Direct'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.quantity || 1}</TableCell>
                    <TableCell>
                      {item.line_name && <div className="text-sm">{item.line_name}</div>}
                      {item.equipment_name && (
                        <div className="text-xs text-muted-foreground">{item.equipment_name}</div>
                      )}
                      {!item.line_name && !item.equipment_name && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{item.model_number || 'N/A'}</TableCell>
                    <TableCell>{item.manufacturer || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate" title={item.description || undefined}>
                      {item.description || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.price != null ? `£${item.price.toLocaleString()}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.hardware_master_id ? (
                        editingId === item.id ? (
                          <div className="flex items-center gap-2">
                            <span>£</span>
                            <input
                              type="number"
                              className="w-24 border rounded px-1 py-0.5 text-right text-sm"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleSavePrice(item)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePrice(item);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={savingId === item.id}
                            onClick={() => {
                              setEditingId(item.id);
                              setEditingValue(
                                (item.override_price ?? item.effective_price ?? item.price ?? 0).toString()
                              );
                            }}
                            className="text-right w-full text-sm text-primary hover:underline disabled:opacity-50"
                          >
                            {item.override_price != null
                              ? `£${item.override_price.toLocaleString()}`
                              : item.effective_price != null
                              ? `£${item.effective_price.toLocaleString()}`
                              : 'Set price'}
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.supplier_name && <div className="text-sm">{item.supplier_name}</div>}
                      {item.supplier_person && (
                        <div className="text-xs text-muted-foreground">{item.supplier_person}</div>
                      )}
                      {!item.supplier_name && !item.supplier_person && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.supplier_email && (
                        <a
                          href={`mailto:${item.supplier_email}`}
                          className="text-sm text-primary hover:underline block"
                        >
                          {item.supplier_email}
                        </a>
                      )}
                      {item.supplier_phone && (
                        <div className="text-xs text-muted-foreground">{item.supplier_phone}</div>
                      )}
                      {item.order_hyperlink && (
                        <a
                          href={item.order_hyperlink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Order Link
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

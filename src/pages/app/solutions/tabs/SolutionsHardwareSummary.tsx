import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHardwareSummary, type HardwareItem } from '@/hooks/useHardwareSummary';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SolutionsHardwareSummaryProps {
  solutionsProjectId: string;
}

type InvoiceStatus = 'not_raised' | 'raised' | 'received';

const getInvoiceStatusLabel = (status: InvoiceStatus) => {
  switch (status) {
    case 'not_raised':
      return 'Not Raised';
    case 'raised':
      return 'Raised';
    case 'received':
      return 'Received';
    default:
      return 'Not Raised';
  }
};

const getInvoiceStatusTriggerClasses = (status: InvoiceStatus) => {
  switch (status) {
    case 'not_raised':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'raised':
      return 'bg-secondary/20 text-secondary-foreground border-secondary/40';
    case 'received':
      return 'bg-primary/10 text-primary border-primary/30';
    default:
      return '';
  }
};

export const SolutionsHardwareSummary = ({ solutionsProjectId }: SolutionsHardwareSummaryProps) => {
  const { hardware, loading, refetch } = useHardwareSummary(solutionsProjectId);
  const { toast } = useToast();
  const [invoiceSavingId, setInvoiceSavingId] = useState<string | null>(null);

  const handleInvoiceStatusChange = async (item: HardwareItem, status: InvoiceStatus) => {
    if (!item.hardware_master_id) return;

    try {
      setInvoiceSavingId(item.id);
      const { error } = await (supabase
        .from('solutions_project_hardware_invoice_status' as any)
        .upsert(
          {
            solutions_project_id: solutionsProjectId,
            hardware_master_id: item.hardware_master_id,
            invoice_status: status,
          },
          { onConflict: 'solutions_project_id,hardware_master_id' },
        ));

      if (error) throw error;

      toast({
        title: 'Invoice status updated',
        description: 'Invoice status saved successfully.',
      });

      await refetch();
    } catch (error) {
      console.error('Error saving invoice status:', error);
      toast({
        title: 'Error saving invoice status',
        description: 'Could not save invoice status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setInvoiceSavingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const totalPrice = hardware.reduce((sum, item) => {
    const itemPrice = item.price || 0;
    const quantity = item.quantity || 1;
    return sum + itemPrice * quantity;
  }, 0);

  // Calculate stats
  const uniqueLines = new Set(hardware.filter(h => h.line_name).map(h => h.line_name));
  const totalLines = uniqueLines.size;

  // Group by hardware category from the "Type" field in hardware_master
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
          All hardware attributed to this solutions project from Factory Hardware and Lines tabs
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Stats Grid */}
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
          <div className="text-center py-8 text-muted-foreground">
            No hardware configured yet
          </div>
        ) : (
          <>
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
                  <TableHead>Price</TableHead>
                  <TableHead>Invoice Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hardware.map((item) => {
                  const currentStatus: InvoiceStatus = item.invoice_status ?? 'not_raised';

                  return (
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
                        {item.price ? `£${item.price.toLocaleString()}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.hardware_master_id ? (
                          <Select
                            value={currentStatus}
                            onValueChange={(value) =>
                              handleInvoiceStatusChange(item, value as InvoiceStatus)
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                'w-36 justify-between text-xs',
                                getInvoiceStatusTriggerClasses(currentStatus),
                              )}
                              disabled={invoiceSavingId === item.id}
                            >
                              <SelectValue placeholder="Select status">
                                {getInvoiceStatusLabel(currentStatus)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              <SelectItem value="not_raised">Not Raised</SelectItem>
                              <SelectItem value="raised">Raised</SelectItem>
                              <SelectItem value="received">Received</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

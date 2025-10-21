import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useProjectHardwareSummary } from '@/hooks/useProjectHardwareSummary';

interface ProjectHardwareSummaryProps {
  projectId: string;
}

export const ProjectHardwareSummary = ({ projectId }: ProjectHardwareSummaryProps) => {
  const { hardware, loading } = useProjectHardwareSummary(projectId);

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
    return sum + (itemPrice * quantity);
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
          All hardware attributed to this project from Factory Hardware and Lines tabs
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
                    <TableCell>
                      {item.quantity || 1}
                    </TableCell>
                    <TableCell>
                      {item.line_name && <div className="text-sm">{item.line_name}</div>}
                      {item.equipment_name && <div className="text-xs text-muted-foreground">{item.equipment_name}</div>}
                      {!item.line_name && !item.equipment_name && <span className="text-muted-foreground">-</span>}
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
                      {item.supplier_name && <div className="text-sm">{item.supplier_name}</div>}
                      {item.supplier_person && <div className="text-xs text-muted-foreground">{item.supplier_person}</div>}
                      {!item.supplier_name && !item.supplier_person && <span className="text-muted-foreground">-</span>}
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

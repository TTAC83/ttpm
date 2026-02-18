import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useHardwareSummary } from '@/hooks/useHardwareSummary';

interface SolutionsHardwareSummaryProps {
  solutionsProjectId: string;
}

export const SolutionsHardwareSummary = ({ solutionsProjectId }: SolutionsHardwareSummaryProps) => {
  const { hardware, loading } = useHardwareSummary(solutionsProjectId);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const totalPrice = hardware.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalRrp = hardware.reduce((sum, item) => sum + (item.rrp || 0), 0);

  const uniqueLines = new Set(hardware.filter(h => h.line_name).map(h => h.line_name));
  const totalLines = uniqueLines.size;

  const categoryCounts = hardware.reduce((acc, item) => {
    const category = item.category || 'Other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Hardware Summary</span>
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-xs text-muted-foreground font-normal">Total Price</div>
              <div className="text-2xl font-bold text-primary">
                £{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-normal">Total RRP</div>
              <div className="text-2xl font-bold text-primary">
                £{totalRrp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          All hardware attributed to this solutions project from Factory Hardware and Lines tabs
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
          <div className="text-center py-8 text-muted-foreground">
            No hardware configured yet
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Line/Equipment</TableHead>
                  <TableHead>SKU/Model</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Price (GBP)</TableHead>
                  <TableHead>RRP (GBP)</TableHead>
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
                      {item.rrp != null ? `£${item.rrp.toLocaleString()}` : 'N/A'}
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

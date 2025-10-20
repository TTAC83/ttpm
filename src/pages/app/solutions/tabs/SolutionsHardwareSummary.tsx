import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HardwareItem {
  id: string;
  hardware_type: string;
  source: 'direct' | 'line';
  line_name?: string;
  equipment_name?: string;
  // Master data fields
  sku_no?: string;
  manufacturer?: string;
  model_number?: string;
  description?: string;
  price?: number;
  supplier_name?: string;
  supplier_person?: string;
  supplier_email?: string;
  supplier_phone?: string;
  order_hyperlink?: string;
}

interface SolutionsHardwareSummaryProps {
  solutionsProjectId: string;
}

export const SolutionsHardwareSummary = ({ solutionsProjectId }: SolutionsHardwareSummaryProps) => {
  const [hardware, setHardware] = useState<HardwareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllHardware();
  }, [solutionsProjectId]);

  const fetchAllHardware = async () => {
    try {
      setLoading(true);
      
      // Fetch all equipment with lines for this solutions project
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select(`
          id,
          name,
          equipment_type,
          solutions_lines!inner(
            id,
            line_name,
            solutions_project_id
          )
        `)
        .eq('solutions_lines.solutions_project_id', solutionsProjectId);

      if (equipmentError) throw equipmentError;

      // Fetch cameras from lines with master data
      const { data: cameras, error: camerasError } = await supabase
        .from('cameras')
        .select('id, camera_type, equipment_id');

      if (camerasError) throw camerasError;

      // Fetch camera master data
      const { data: cameraMaster, error: cameraMasterError } = await supabase
        .from('cameras_master')
        .select('*');

      if (cameraMasterError) throw cameraMasterError;

      const allHardware: HardwareItem[] = [];

      // Process cameras
      if (cameras && equipmentData) {
        cameras.forEach(cam => {
          const equipment = equipmentData.find(eq => eq.id === cam.equipment_id);
          if (equipment) {
            const master = cameraMaster?.find(m => m.camera_type === cam.camera_type);
            allHardware.push({
              id: cam.id,
              hardware_type: `Camera - ${cam.camera_type}`,
              source: 'line' as const,
              line_name: equipment.solutions_lines?.line_name,
              equipment_name: equipment.name,
              sku_no: master?.model_number,
              manufacturer: master?.manufacturer,
              model_number: master?.model_number,
              description: master?.description,
              price: master?.price,
              supplier_name: master?.supplier_name,
              supplier_person: master?.supplier_person,
              supplier_email: master?.supplier_email,
              supplier_phone: master?.supplier_phone,
              order_hyperlink: master?.order_hyperlink,
            });
          }
        });
      }

      setHardware(allHardware);
    } catch (error) {
      console.error('Error fetching hardware:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch hardware summary',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hardware Summary</CardTitle>
        <CardDescription>
          All hardware attributed to this solutions project from Hardware and Lines tabs
        </CardDescription>
      </CardHeader>

      <CardContent>
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
                  <TableHead>Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hardware.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.hardware_type}</TableCell>
                    <TableCell>
                      <Badge variant={item.source === 'line' ? 'default' : 'secondary'}>
                        {item.source === 'line' ? 'Line' : 'Direct'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.line_name && <div className="text-sm">{item.line_name}</div>}
                      {item.equipment_name && <div className="text-xs text-muted-foreground">{item.equipment_name}</div>}
                    </TableCell>
                    <TableCell>{item.model_number || 'N/A'}</TableCell>
                    <TableCell>{item.manufacturer || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate" title={item.description || undefined}>
                      {item.description || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.price ? `$${item.price.toLocaleString()}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.supplier_name && <div className="text-sm">{item.supplier_name}</div>}
                      {item.supplier_person && <div className="text-xs text-muted-foreground">{item.supplier_person}</div>}
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

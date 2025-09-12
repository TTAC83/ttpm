import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Server, Router, Tv, Radio, HardDrive } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HardwareItem {
  id: string;
  manufacturer: string;
  model_number: string;
  description?: string;
  price?: number;
  quantity: number;
  type: 'server' | 'gateway' | 'tv_display' | 'receiver';
}

interface SolutionsHardwareProps {
  solutionsProjectId: string;
}

export const SolutionsHardware = ({ solutionsProjectId }: SolutionsHardwareProps) => {
  const [hardwareItems, setHardwareItems] = useState<HardwareItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHardwareItems();
  }, [solutionsProjectId]);

  const fetchHardwareItems = async () => {
    try {
      setLoading(true);
      const items: HardwareItem[] = [];

      // Fetch servers
      const { data: servers } = await supabase
        .from('solutions_project_servers')
        .select(`
          quantity,
          server_master_id (
            id,
            manufacturer,
            model_number,
            description,
            price
          )
        `)
        .eq('solutions_project_id', solutionsProjectId);

      if (servers) {
        servers.forEach((item: any) => {
          if (item.server_master_id) {
            items.push({
              id: item.server_master_id.id,
              manufacturer: item.server_master_id.manufacturer,
              model_number: item.server_master_id.model_number,
              description: item.server_master_id.description,
              price: item.server_master_id.price,
              quantity: item.quantity,
              type: 'server'
            });
          }
        });
      }

      // Fetch gateways
      const { data: gateways } = await supabase
        .from('solutions_project_gateways')
        .select(`
          quantity,
          gateway_master_id (
            id,
            manufacturer,
            model_number,
            description,
            price
          )
        `)
        .eq('solutions_project_id', solutionsProjectId);

      if (gateways) {
        gateways.forEach((item: any) => {
          if (item.gateway_master_id) {
            items.push({
              id: item.gateway_master_id.id,
              manufacturer: item.gateway_master_id.manufacturer,
              model_number: item.gateway_master_id.model_number,
              description: item.gateway_master_id.description,
              price: item.gateway_master_id.price,
              quantity: item.quantity,
              type: 'gateway'
            });
          }
        });
      }

      // Fetch TV displays
      const { data: tvDisplays } = await supabase
        .from('solutions_project_tv_displays')
        .select(`
          quantity,
          tv_display_master_id (
            id,
            manufacturer,
            model_number,
            description,
            price
          )
        `)
        .eq('solutions_project_id', solutionsProjectId);

      if (tvDisplays) {
        tvDisplays.forEach((item: any) => {
          if (item.tv_display_master_id) {
            items.push({
              id: item.tv_display_master_id.id,
              manufacturer: item.tv_display_master_id.manufacturer,
              model_number: item.tv_display_master_id.model_number,
              description: item.tv_display_master_id.description,
              price: item.tv_display_master_id.price,
              quantity: item.quantity,
              type: 'tv_display'
            });
          }
        });
      }

      // Fetch receivers
      const { data: receivers } = await supabase
        .from('solutions_project_receivers')
        .select(`
          quantity,
          receiver_master_id (
            id,
            manufacturer,
            model_number,
            description,
            price
          )
        `)
        .eq('solutions_project_id', solutionsProjectId);

      if (receivers) {
        receivers.forEach((item: any) => {
          if (item.receiver_master_id) {
            items.push({
              id: item.receiver_master_id.id,
              manufacturer: item.receiver_master_id.manufacturer,
              model_number: item.receiver_master_id.model_number,
              description: item.receiver_master_id.description,
              price: item.receiver_master_id.price,
              quantity: item.quantity,
              type: 'receiver'
            });
          }
        });
      }

      setHardwareItems(items);
    } catch (error) {
      console.error('Error fetching hardware items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'server':
        return <Server className="h-4 w-4" />;
      case 'gateway':
        return <Router className="h-4 w-4" />;
      case 'tv_display':
        return <Tv className="h-4 w-4" />;
      case 'receiver':
        return <Radio className="h-4 w-4" />;
      default:
        return <HardDrive className="h-4 w-4" />;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'server':
        return 'default';
      case 'gateway':
        return 'secondary';
      case 'tv_display':
        return 'outline';
      case 'receiver':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatPrice = (price: number | undefined) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const calculateTotalPrice = () => {
    return hardwareItems.reduce((total, item) => {
      if (item.price) {
        return total + (item.price * item.quantity);
      }
      return total;
    }, 0);
  };

  const getHardwareCount = () => {
    return hardwareItems.reduce((total, item) => total + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Project Hardware
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{getHardwareCount()} items total</span>
          <Separator orientation="vertical" className="h-4" />
          <span className="font-medium text-foreground">
            Total Value: {formatPrice(calculateTotalPrice())}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {hardwareItems.length === 0 ? (
          <div className="text-center py-8">
            <HardDrive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hardware assigned to this project</p>
            <p className="text-sm text-muted-foreground mt-2">
              Use the Factory Requirements tab to assign hardware to this project
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hardwareItems.map((item) => (
                <TableRow key={`${item.type}-${item.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      <Badge variant={getTypeBadgeVariant(item.type)} className="text-xs">
                        {item.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.manufacturer}</TableCell>
                  <TableCell>{item.model_number}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {item.description || 'No description'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{item.quantity}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPrice(item.price)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {item.price ? formatPrice(item.price * item.quantity) : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-medium">
                <TableCell colSpan={6} className="text-right">
                  Total Project Value:
                </TableCell>
                <TableCell className="text-right font-mono text-lg">
                  {formatPrice(calculateTotalPrice())}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
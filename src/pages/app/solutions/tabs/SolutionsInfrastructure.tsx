import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const INFRA_FIELDS = [
  { key: 'infra_network_ports', label: 'Network Ports' },
  { key: 'infra_vlan', label: 'VLAN' },
  { key: 'infra_static_ip', label: 'Static IP' },
  { key: 'infra_10gb_connection', label: '10Gb Connection' },
  { key: 'infra_mount_fabrication', label: 'Mount Fabrication' },
  { key: 'infra_vpn', label: 'VPN' },
  { key: 'infra_storage', label: 'Storage' },
  { key: 'infra_load_balancer', label: 'Load Balancer' },
] as const;

interface SolutionsInfrastructureProps {
  projectId: string;
  projectData: Record<string, any>;
  onUpdate: () => void;
}

export const SolutionsInfrastructure = ({ projectId, projectData, onUpdate }: SolutionsInfrastructureProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const confirmed = !!(projectData as any)?.infra_customer_confirmed;

  const handleChange = async (field: string, value: string) => {
    setSaving(field);
    try {
      const { error } = await supabase
        .from('solutions_projects')
        .update({ [field]: value } as any)
        .eq('id', projectId);
      if (error) throw error;
      toast({ title: 'Saved', description: `${INFRA_FIELDS.find(f => f.key === field)?.label} updated.` });
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleConfirmToggle = async (checked: boolean) => {
    setSaving('infra_customer_confirmed');
    try {
      const { error } = await supabase
        .from('solutions_projects')
        .update({ infra_customer_confirmed: checked } as any)
        .eq('id', projectId);
      if (error) throw error;
      toast({ title: checked ? 'Confirmed' : 'Unconfirmed', description: checked ? 'Customer confirmation recorded.' : 'Confirmation removed.' });
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Infrastructure Requirements</CardTitle>
        <p className="text-sm text-muted-foreground">
          Set each infrastructure requirement to "Required" or "Not Required", then confirm the customer understands all requirements.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {INFRA_FIELDS.map(({ key, label }) => {
            const currentValue = (projectData as any)?.[key] ?? '';
            return (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label}</Label>
                <Select
                  value={currentValue || undefined}
                  onValueChange={(val) => handleChange(key, val)}
                  disabled={saving === key}
                >
                  <SelectTrigger id={key}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Required">Required</SelectItem>
                    <SelectItem value="Not Required">Not Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="infra_customer_confirmed"
              checked={confirmed}
              onCheckedChange={(checked) => handleConfirmToggle(!!checked)}
              disabled={saving === 'infra_customer_confirmed'}
            />
            <Label htmlFor="infra_customer_confirmed" className="text-sm leading-snug cursor-pointer">
              Customer has confirmed understanding of all infrastructure requirements
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

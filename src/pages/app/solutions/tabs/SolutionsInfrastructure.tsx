import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';




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
      toast({ title: 'Saved' });
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleNumericChange = async (field: string, value: string) => {
    const numVal = value === '' ? null : parseInt(value, 10);
    if (value !== '' && isNaN(numVal as number)) return;
    setSaving(field);
    try {
      const { error } = await supabase
        .from('solutions_projects')
        .update({ [field]: numVal } as any)
        .eq('id', projectId);
      if (error) throw error;
      toast({ title: 'Saved' });
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleBoolChange = async (field: string, checked: boolean) => {
    setSaving(field);
    try {
      const { error } = await supabase
        .from('solutions_projects')
        .update({ [field]: checked } as any)
        .eq('id', projectId);
      if (error) throw error;
      toast({ title: 'Saved' });
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleTextBlur = async (field: string, value: string) => {
    const currentVal = (projectData as any)?.[field] || '';
    if (value === currentVal) return;
    setSaving(field);
    try {
      const { error } = await supabase
        .from('solutions_projects')
        .update({ [field]: value || null } as any)
        .eq('id', projectId);
      if (error) throw error;
      toast({ title: 'Saved' });
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleNumericBlur = async (field: string, value: string) => {
    const numVal = value === '' ? null : parseInt(value, 10);
    const currentVal = (projectData as any)?.[field] ?? null;
    if (numVal === currentVal) return;
    if (value !== '' && isNaN(numVal as number)) return;
    setSaving(field);
    try {
      const { error } = await supabase
        .from('solutions_projects')
        .update({ [field]: numVal } as any)
        .eq('id', projectId);
      if (error) throw error;
      toast({ title: 'Saved' });
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Bandwidth & Cabling */}
      <Card>
        <CardHeader>
          <CardTitle>Bandwidth & Cabling</CardTitle>
          <p className="text-sm text-muted-foreground">
            Network bandwidth and cabling specifications per the ThingTrax network security document.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="infra_internet_speed_mbps">Internet Speed (Mbps)</Label>
              <Input
                id="infra_internet_speed_mbps"
                type="number"
                min={0}
                defaultValue={(projectData as any)?.infra_internet_speed_mbps ?? ''}
                onBlur={(e) => handleNumericBlur('infra_internet_speed_mbps', e.target.value)}
                disabled={saving === 'infra_internet_speed_mbps'}
                placeholder="e.g. 3"
              />
              <p className="text-xs text-muted-foreground">Minimum 2–3 Mbps recommended for dashboard data</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="infra_lan_speed_gbps">Internal LAN Speed (Gbps per camera)</Label>
              <Input
                id="infra_lan_speed_gbps"
                type="number"
                min={0}
                defaultValue={(projectData as any)?.infra_lan_speed_gbps ?? ''}
                onBlur={(e) => handleNumericBlur('infra_lan_speed_gbps', e.target.value)}
                disabled={saving === 'infra_lan_speed_gbps'}
                placeholder="e.g. 1"
              />
              <p className="text-xs text-muted-foreground">1 Gbps per camera (GigE protocol)</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="infra_switch_uplink_gbps">Switch to Server Uplink (Gbps)</Label>
              <Input
                id="infra_switch_uplink_gbps"
                type="number"
                min={0}
                defaultValue={(projectData as any)?.infra_switch_uplink_gbps ?? ''}
                onBlur={(e) => handleNumericBlur('infra_switch_uplink_gbps', e.target.value)}
                disabled={saving === 'infra_switch_uplink_gbps'}
                placeholder="e.g. 10"
              />
              <p className="text-xs text-muted-foreground">5 Gbps minimum, 10 Gbps maximum recommended</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="infra_cable_spec">Cable Specification</Label>
              <Select
                value={(projectData as any)?.infra_cable_spec || undefined}
                onValueChange={(val) => handleChange('infra_cable_spec', val)}
                disabled={saving === 'infra_cable_spec'}
              >
                <SelectTrigger id="infra_cable_spec">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cat 5e">Cat 5e</SelectItem>
                  <SelectItem value="Cat 6">Cat 6</SelectItem>
                  <SelectItem value="Cat 7">Cat 7</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Cat 6 for up to 55m; Cat 7 for up to 100m. Cat 7 required for server uplink.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="infra_max_cable_distance_m">Max Cable Distance (m)</Label>
              <Input
                id="infra_max_cable_distance_m"
                type="number"
                min={0}
                defaultValue={(projectData as any)?.infra_max_cable_distance_m ?? ''}
                onBlur={(e) => handleNumericBlur('infra_max_cable_distance_m', e.target.value)}
                disabled={saving === 'infra_max_cable_distance_m'}
                placeholder="e.g. 100"
              />
              <p className="text-xs text-muted-foreground">100m max for Cat 6/7. Additional switch needed beyond 100m.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="infra_poe_required"
              checked={!!(projectData as any)?.infra_poe_required}
              onCheckedChange={(checked) => handleBoolChange('infra_poe_required', !!checked)}
              disabled={saving === 'infra_poe_required'}
            />
            <div>
              <Label htmlFor="infra_poe_required" className="text-sm leading-snug cursor-pointer">PoE Required</Label>
              <p className="text-xs text-muted-foreground">GigE cameras are PoE powered</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: IP & Remote Access */}
      <Card>
        <CardHeader>
          <CardTitle>IP & Remote Access</CardTitle>
          <p className="text-sm text-muted-foreground">
            IP management, remote access, and server specifications.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="infra_dhcp_reservation"
              checked={!!(projectData as any)?.infra_dhcp_reservation}
              onCheckedChange={(checked) => handleBoolChange('infra_dhcp_reservation', !!checked)}
              disabled={saving === 'infra_dhcp_reservation'}
            />
            <div>
              <Label htmlFor="infra_dhcp_reservation" className="text-sm leading-snug cursor-pointer">DHCP IP Reservation Required</Label>
              <p className="text-xs text-muted-foreground">ThingTrax provides MAC addresses for DHCP reservation to ensure fixed IPs</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="infra_remote_access_method">Remote Access Method</Label>
              <Input
                id="infra_remote_access_method"
                defaultValue={(projectData as any)?.infra_remote_access_method ?? ''}
                onBlur={(e) => handleTextBlur('infra_remote_access_method', e.target.value)}
                disabled={saving === 'infra_remote_access_method'}
                placeholder="e.g. Cloud VNC"
              />
              <p className="text-xs text-muted-foreground">System is accessed remotely using cloud VNC services</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="infra_server_mounting">Server Mounting</Label>
              <Select
                value={(projectData as any)?.infra_server_mounting || undefined}
                onValueChange={(val) => handleChange('infra_server_mounting', val)}
                disabled={saving === 'infra_server_mounting'}
              >
                <SelectTrigger id="infra_server_mounting">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Wall Mount">Wall Mount</SelectItem>
                  <SelectItem value="Rack Mount">Rack Mount</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Server includes wall-mount brackets by default</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="infra_server_power_supply">Server Power Supply</Label>
              <Input
                id="infra_server_power_supply"
                defaultValue={(projectData as any)?.infra_server_power_supply ?? ''}
                onBlur={(e) => handleTextBlur('infra_server_power_supply', e.target.value)}
                disabled={saving === 'infra_server_power_supply'}
                placeholder="e.g. DC 19-36V single supply"
              />
              <p className="text-xs text-muted-foreground">Single power supply, DC 19–36V</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            defaultValue={(projectData as any)?.infra_notes ?? ''}
            onBlur={(e) => handleTextBlur('infra_notes', e.target.value)}
            disabled={saving === 'infra_notes'}
            placeholder="Any customer-specific network or infrastructure requirements…"
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Section 5: Customer Confirmation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="infra_customer_confirmed"
              checked={confirmed}
              onCheckedChange={(checked) => handleBoolChange('infra_customer_confirmed', !!checked)}
              disabled={saving === 'infra_customer_confirmed'}
            />
            <Label htmlFor="infra_customer_confirmed" className="text-sm leading-snug cursor-pointer">
              Customer has confirmed understanding of all infrastructure requirements
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

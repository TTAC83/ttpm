import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { LinkManager, type Link } from '@/components/LinkManager';

interface OverviewTabProps {
  data: any;
  onUpdate: () => void;
  type: 'project' | 'bau' | 'solutions';
}

interface Profile {
  user_id: string;
  name: string | null;
}

export const OverviewTab = ({ data, onUpdate, type }: OverviewTabProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [internalProfiles, setInternalProfiles] = useState<Profile[]>([]);
  const savingRef = useRef(false);

  const [formData, setFormData] = useState(() => buildFormData(data));
  const [usefulLinks, setUsefulLinks] = useState<Link[]>(() => {
    try {
      return Array.isArray(data.useful_links) ? data.useful_links : [];
    } catch {
      return [];
    }
  });

  // Track what the server knows so we only save changed fields
  const serverDataRef = useRef(() => buildFormData(data));

  function buildFormData(d: any) {
    return {
      name: d.name || '',
      site_name: d.site_name || '',
      site_address: d.site_address || '',
      domain: d.domain || '',
      segment: d.segment || '',
      contract_signed_date: d.contract_signed_date || d.go_live_date || '',
      contract_start_date: d.contract_start_date || '',
      contract_end_date: d.contract_end_date || '',
      break_clause_enabled: d.break_clause_enabled || false,
      break_clause_project_date: d.break_clause_project_date || '',
      break_clause_key_points_md: d.break_clause_key_points_md || '',
      customer_project_lead: d.customer_project_lead || 'unassigned',
      implementation_lead: d.implementation_lead || 'unassigned',
      ai_iot_engineer: d.ai_iot_engineer || 'unassigned',
      technical_project_lead: d.technical_project_lead || 'unassigned',
      project_coordinator: d.project_coordinator || 'unassigned',
      sales_lead: d.sales_lead || 'unassigned',
      salesperson: d.salesperson || 'unassigned',
      solution_consultant: d.solutions_consultant || 'unassigned',
      account_manager: d.account_manager || 'unassigned',
      line_description: d.line_description || '',
      product_description: d.product_description || '',
      project_goals: d.project_goals || '',
      contracted_lines: d.contracted_lines?.toString() || '',
      billing_terms: d.billing_terms || d.subscription_plan || '',
      hardware_fee: d.hardware_fee?.toString() || '',
      services_fee: d.services_fee?.toString() || '',
      arr: d.arr?.toString() || '',
      mrr: d.mrr?.toString() || '',
      payment_terms_days: d.payment_terms_days?.toString() || '',
      contracted_days: d.contracted_days?.toString() || '',
      auto_renewal: d.auto_renewal ?? true,
      standard_terms: d.standard_terms ?? true,
      deviation_of_terms: d.deviation_of_terms || '',
      final_scoping_complete: d.final_scoping_complete || false,
      contract_signed: d.contract_signed || false,
      implementation_handover: d.implementation_handover || false,
    };
  }

  // Sync when parent data changes
  useEffect(() => {
    const fresh = buildFormData(data);
    setFormData(fresh);
    serverDataRef.current = () => fresh;
  }, [data]);

  useEffect(() => {
    if (profile?.is_internal) {
      fetchInternalProfiles();
    }
  }, [profile]);

  const fetchInternalProfiles = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .eq('is_internal', true)
        .not('name', 'is', null)
        .neq('name', '')
        .order('name');
      if (error) throw error;
      setInternalProfiles(profiles || []);
    } catch (error) {
      console.error('Error fetching internal profiles:', error);
    }
  };

  const canEdit = profile?.is_internal === true;

  const saveField = useCallback(async (updates: Record<string, any>) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const tableName = type === 'project' ? 'projects' : type === 'solutions' ? 'solutions_projects' : 'bau_customers';
      const { error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', data.id);
      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      savingRef.current = false;
    }
  }, [type, data.id, onUpdate, toast]);

  const handleTextBlur = useCallback((field: string, value: string, dbField?: string) => {
    if (!canEdit) return;
    const serverVal = (serverDataRef.current as any)()[field];
    if (value === serverVal) return;
    const key = dbField || field;
    saveField({ [key]: value || null });
  }, [canEdit, saveField]);

  const handleSelectChange = useCallback((field: string, value: string, dbField?: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (!canEdit) return;
    const key = dbField || field;
    const dbVal = value === 'unassigned' ? null : value;
    saveField({ [key]: dbVal });
  }, [canEdit, saveField]);

  const handleSwitchChange = useCallback((field: string, checked: boolean, dbField?: string) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
    if (!canEdit) return;
    const key = dbField || field;
    saveField({ [key]: checked });
  }, [canEdit, saveField]);

  const handleNumberBlur = useCallback((field: string, value: string, dbField?: string, isFloat = false) => {
    if (!canEdit) return;
    const serverVal = (serverDataRef.current as any)()[field];
    if (value === serverVal) return;
    const key = dbField || field;
    if (!value) {
      saveField({ [key]: null });
      return;
    }
    const num = isFloat ? parseFloat(value) : parseInt(value);
    if (isNaN(num) || num < 0) {
      toast({ title: 'Validation Error', description: `${field} must be a valid number ≥ 0`, variant: 'destructive' });
      return;
    }
    saveField({ [key]: num });
  }, [canEdit, saveField, toast]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{type === 'project' ? 'Project' : type === 'solutions' ? 'Solutions Project' : 'Customer'} Information</CardTitle>
          <CardDescription>Basic details and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{type === 'project' ? 'Project' : type === 'solutions' ? 'Solutions Project' : 'Customer'} Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                onBlur={(e) => handleTextBlur('name', e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Select
                value={formData.domain}
                onValueChange={(value) => handleSelectChange('domain', value)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IoT">IoT</SelectItem>
                  <SelectItem value="Vision">Vision</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment">Segment</Label>
              <Select
                value={formData.segment}
                onValueChange={(value) => handleSelectChange('segment', value)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMB">SMB</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_name">Site Name</Label>
              <Input
                id="site_name"
                value={formData.site_name}
                onChange={(e) => setFormData(prev => ({ ...prev, site_name: e.target.value }))}
                onBlur={(e) => handleTextBlur('site_name', e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site_address">Site Address</Label>
            <Textarea
              id="site_address"
              value={formData.site_address}
              onChange={(e) => setFormData(prev => ({ ...prev, site_address: e.target.value }))}
              onBlur={(e) => handleTextBlur('site_address', e.target.value)}
              rows={3}
              disabled={!canEdit}
            />
          </div>


          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="line_description">Process Description</Label>
              <Textarea
                id="line_description"
                value={formData.line_description}
                onChange={(e) => setFormData(prev => ({ ...prev, line_description: e.target.value }))}
                onBlur={(e) => handleTextBlur('line_description', e.target.value)}
                rows={4}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product_description">Product Description</Label>
              <Textarea
                id="product_description"
                value={formData.product_description}
                onChange={(e) => setFormData(prev => ({ ...prev, product_description: e.target.value }))}
                onBlur={(e) => handleTextBlur('product_description', e.target.value)}
                rows={4}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_goals">Project Goals</Label>
            <Textarea
              id="project_goals"
              value={formData.project_goals}
              onChange={(e) => setFormData(prev => ({ ...prev, project_goals: e.target.value }))}
              onBlur={(e) => handleTextBlur('project_goals', e.target.value)}
              rows={4}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Useful Links Card */}
      <Card>
        <CardHeader>
          <CardTitle>Useful Links</CardTitle>
          <CardDescription>Quick access to important resources</CardDescription>
        </CardHeader>
        <CardContent>
          <LinkManager
            links={usefulLinks}
            onChange={async (newLinks) => {
              setUsefulLinks(newLinks);
              try {
                const tableName = type === 'project' ? 'projects' : type === 'solutions' ? 'solutions_projects' : 'bau_customers';
                const { error } = await supabase
                  .from(tableName as any)
                  .update({ useful_links: newLinks })
                  .eq('id', data.id);
                if (error) throw error;
                toast({
                  title: "Links Updated",
                  description: "Useful links have been saved successfully",
                });
                onUpdate();
              } catch (error: any) {
                toast({
                  title: "Error",
                  description: error.message || "Failed to update links",
                  variant: "destructive",
                });
              }
            }}
            maxLinks={10}
            isEditing={canEdit}
            title=""
          />
        </CardContent>
      </Card>
    </div>
  );
};

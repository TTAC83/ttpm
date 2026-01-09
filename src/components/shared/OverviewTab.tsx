import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { Edit, Save, X } from 'lucide-react';
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
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [internalProfiles, setInternalProfiles] = useState<Profile[]>([]);
  
  const [formData, setFormData] = useState({
    name: data.name || '',
    site_name: data.site_name || '',
    site_address: data.site_address || '',
    domain: data.domain || '',
    segment: data.segment || '',
    contract_signed_date: data.contract_signed_date || data.go_live_date || '',
    contract_start_date: data.contract_start_date || '',
    contract_end_date: data.contract_end_date || '',
    break_clause_enabled: data.break_clause_enabled || false,
    break_clause_project_date: data.break_clause_project_date || '',
    break_clause_key_points_md: data.break_clause_key_points_md || '',
    customer_project_lead: data.customer_project_lead || 'unassigned',
    implementation_lead: data.implementation_lead || 'unassigned',
    ai_iot_engineer: data.ai_iot_engineer || 'unassigned',
    technical_project_lead: data.technical_project_lead || 'unassigned',
    project_coordinator: data.project_coordinator || 'unassigned',
    sales_lead: data.sales_lead || 'unassigned',
    salesperson: data.salesperson || 'unassigned',
    solution_consultant: data.solutions_consultant || 'unassigned',
    account_manager: data.account_manager || 'unassigned',
    line_description: data.line_description || '',
    product_description: data.product_description || '',
    project_goals: data.project_goals || '',
    contracted_lines: data.contracted_lines?.toString() || '',
    billing_terms: data.billing_terms || data.subscription_plan || '',
    hardware_fee: data.hardware_fee?.toString() || '',
    services_fee: data.services_fee?.toString() || '',
    arr: data.arr?.toString() || '',
    mrr: data.mrr?.toString() || '',
    payment_terms_days: data.payment_terms_days?.toString() || '',
    contracted_days: data.contracted_days?.toString() || '',
    auto_renewal: data.auto_renewal ?? true,
    standard_terms: data.standard_terms ?? true,
    deviation_of_terms: data.deviation_of_terms || '',
    final_scoping_complete: data.final_scoping_complete || false,
  });

  const [contractedLinesError, setContractedLinesError] = useState<string>('');
  const [billingTermsError, setBillingTermsError] = useState<string>('');
  const [hardwareFeeError, setHardwareFeeError] = useState<string>('');
  const [servicesFeeError, setServicesFeeError] = useState<string>('');
  const [arrError, setArrError] = useState<string>('');
  const [mrrError, setMrrError] = useState<string>('');
  const [paymentTermsDaysError, setPaymentTermsDaysError] = useState<string>('');
  const [contractedDaysError, setContractedDaysError] = useState<string>('');
  const [deviationOfTermsError, setDeviationOfTermsError] = useState<string>('');

  const [usefulLinks, setUsefulLinks] = useState<Link[]>(() => {
    try {
      return Array.isArray(data.useful_links) ? data.useful_links : [];
    } catch {
      return [];
    }
  });

  const localStorageKey = `${type}-edit-${data.id}`;

  useEffect(() => {
    if (profile?.is_internal) {
      fetchInternalProfiles();
    }
    
    if (editing) {
      loadDraftData();
    }
  }, [profile, editing]);

  const loadDraftData = () => {
    try {
      const savedDraft = localStorage.getItem(localStorageKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        setFormData(draft.formData || formData);
        setUsefulLinks(draft.usefulLinks || usefulLinks);
      }
    } catch (error) {
      console.error('Error loading draft data:', error);
    }
  };

  const saveDraftData = () => {
    try {
      const draftData = {
        formData,
        usefulLinks,
        timestamp: Date.now()
      };
      localStorage.setItem(localStorageKey, JSON.stringify(draftData));
    } catch (error) {
      console.error('Error saving draft data:', error);
    }
  };

  const clearDraftData = () => {
    try {
      localStorage.removeItem(localStorageKey);
    } catch (error) {
      console.error('Error clearing draft data:', error);
    }
  };

  useEffect(() => {
    if (editing) {
      const timeoutId = setTimeout(() => {
        saveDraftData();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData, usefulLinks, editing]);

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

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Clear all errors
    setContractedLinesError("");
    setBillingTermsError("");
    setHardwareFeeError("");
    setServicesFeeError("");
    setArrError("");
    setMrrError("");
    setPaymentTermsDaysError("");
    setContractedDaysError("");
    setDeviationOfTermsError("");
    
    let hasErrors = false;
    
    // Validate contracted lines
    const contractedLinesNum = parseInt(formData.contracted_lines);
    if (formData.contracted_lines && (isNaN(contractedLinesNum) || contractedLinesNum < 0)) {
      setContractedLinesError("Contracted Lines must be an integer ≥ 0");
      hasErrors = true;
    }
    
    if (formData.billing_terms && formData.billing_terms.length > 2000) {
      setBillingTermsError("Billing Terms must be 2000 characters or less");
      hasErrors = true;
    }
    
    if (formData.hardware_fee) {
      const fee = parseFloat(formData.hardware_fee);
      if (isNaN(fee) || fee < 0) {
        setHardwareFeeError("Hardware Fee must be a number ≥ 0");
        hasErrors = true;
      }
    }
    
    if (formData.services_fee) {
      const fee = parseFloat(formData.services_fee);
      if (isNaN(fee) || fee < 0) {
        setServicesFeeError("Services Fee must be a number ≥ 0");
        hasErrors = true;
      }
    }
    
    if (formData.arr) {
      const arr = parseFloat(formData.arr);
      if (isNaN(arr) || arr < 0) {
        setArrError("ARR must be a number ≥ 0");
        hasErrors = true;
      }
    }
    
    if (formData.mrr) {
      const mrr = parseFloat(formData.mrr);
      if (isNaN(mrr) || mrr < 0) {
        setMrrError("MRR must be a number ≥ 0");
        hasErrors = true;
      }
    }
    
    if (formData.payment_terms_days) {
      const days = parseInt(formData.payment_terms_days);
      if (isNaN(days) || days < 0) {
        setPaymentTermsDaysError("Payment Terms must be an integer ≥ 0");
        hasErrors = true;
      }
    }
    
    if (formData.contracted_days) {
      const days = parseInt(formData.contracted_days);
      if (isNaN(days) || days < 0) {
        setContractedDaysError("Contracted Days must be an integer ≥ 0");
        hasErrors = true;
      }
    }
    
    if (!formData.standard_terms) {
      if (!formData.deviation_of_terms.trim()) {
        setDeviationOfTermsError("Deviation of Terms is required when Standard Terms is disabled");
        hasErrors = true;
      } else if (formData.deviation_of_terms.length > 2000) {
        setDeviationOfTermsError("Deviation of Terms must be 2000 characters or less");
        hasErrors = true;
      }
    }
    
    if (hasErrors) return;
    
    if (formData.break_clause_enabled) {
      if (!formData.break_clause_project_date) {
        toast({
          title: "Validation Error",
          description: "Break Clause / Project Date is required when Break Clause is enabled",
          variant: "destructive",
        });
        return;
      }
      
      if (!formData.break_clause_key_points_md?.trim()) {
        toast({
          title: "Validation Error", 
          description: "Key Points are required when Break Clause is enabled",
          variant: "destructive",
        });
        return;
      }
      
      if (type === 'project' && data.project_start && formData.break_clause_project_date < data.project_start) {
        toast({
          title: "Validation Error",
          description: "Break Clause / Project Date must be on or after the project start date",
          variant: "destructive",
        });
        return;
      }
    }
    
    setLoading(true);
    try {
      const tableName = type === 'project' ? 'projects' : type === 'solutions' ? 'solutions_projects' : 'bau_customers';
      const updateData: any = {
        name: formData.name,
        site_name: formData.site_name || null,
        site_address: formData.site_address || null,
        domain: formData.domain || null,
        segment: formData.segment || null,
        break_clause_enabled: formData.break_clause_enabled,
        break_clause_project_date: formData.break_clause_enabled ? formData.break_clause_project_date || null : null,
        break_clause_key_points_md: formData.break_clause_enabled ? formData.break_clause_key_points_md || null : null,
        customer_project_lead: formData.customer_project_lead === 'unassigned' ? null : formData.customer_project_lead,
        implementation_lead: formData.implementation_lead === 'unassigned' ? null : formData.implementation_lead,
        ai_iot_engineer: formData.ai_iot_engineer === 'unassigned' ? null : formData.ai_iot_engineer,
        technical_project_lead: formData.technical_project_lead === 'unassigned' ? null : formData.technical_project_lead,
        project_coordinator: formData.project_coordinator === 'unassigned' ? null : formData.project_coordinator,
        sales_lead: formData.sales_lead === 'unassigned' ? null : formData.sales_lead,
        salesperson: formData.salesperson === 'unassigned' ? null : formData.salesperson,
        solutions_consultant: formData.solution_consultant === 'unassigned' ? null : formData.solution_consultant,
        account_manager: formData.account_manager === 'unassigned' ? null : formData.account_manager,
        line_description: formData.line_description || null,
        product_description: formData.product_description || null,
        project_goals: formData.project_goals || null,
        contracted_lines: formData.contracted_lines ? parseInt(formData.contracted_lines) : null,
        hardware_fee: formData.hardware_fee ? parseFloat(formData.hardware_fee) : null,
        services_fee: formData.services_fee ? parseFloat(formData.services_fee) : null,
        arr: formData.arr ? parseFloat(formData.arr) : null,
        mrr: formData.mrr ? parseFloat(formData.mrr) : null,
        payment_terms_days: formData.payment_terms_days ? parseInt(formData.payment_terms_days) : null,
        contracted_days: formData.contracted_days ? parseInt(formData.contracted_days) : null,
        auto_renewal: formData.auto_renewal,
        standard_terms: formData.standard_terms,
        deviation_of_terms: formData.standard_terms ? null : (formData.deviation_of_terms || null),
        useful_links: usefulLinks as any,
      };

      // Add solutions-specific fields
      if (type === 'solutions') {
        updateData.final_scoping_complete = formData.final_scoping_complete;
      }

      // Add type-specific fields
      if (type === 'project' || type === 'solutions') {
        updateData.contract_signed_date = formData.contract_signed_date || null;
        updateData.contract_start_date = formData.contract_start_date || null;
        updateData.contract_end_date = formData.contract_end_date || null;
        updateData.billing_terms = formData.billing_terms || null;
      } else {
        updateData.go_live_date = formData.contract_signed_date || null;
        updateData.subscription_plan = formData.billing_terms || null;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', data.id);

      if (error) throw error;

      toast({
        title: `${type === 'project' ? 'Project' : type === 'solutions' ? 'Solutions Project' : 'Customer'} Updated`,
        description: `Details have been updated successfully`,
      });

      clearDraftData();
      setEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to update ${type === 'project' ? 'project' : type === 'solutions' ? 'solutions project' : 'customer'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: data.name || '',
      site_name: data.site_name || '',
      site_address: data.site_address || '',
      domain: data.domain || '',
      segment: data.segment || '',
      contract_signed_date: data.contract_signed_date || data.go_live_date || '',
      contract_start_date: data.contract_start_date || '',
      contract_end_date: data.contract_end_date || '',
      break_clause_enabled: data.break_clause_enabled || false,
      break_clause_project_date: data.break_clause_project_date || '',
      break_clause_key_points_md: data.break_clause_key_points_md || '',
      customer_project_lead: data.customer_project_lead || 'unassigned',
      implementation_lead: data.implementation_lead || 'unassigned',
      ai_iot_engineer: data.ai_iot_engineer || 'unassigned',
      technical_project_lead: data.technical_project_lead || 'unassigned',
      project_coordinator: data.project_coordinator || 'unassigned',
      sales_lead: data.sales_lead || 'unassigned',
      salesperson: data.salesperson || 'unassigned',
      solution_consultant: data.solutions_consultant || 'unassigned',
      account_manager: data.account_manager || 'unassigned',
      line_description: data.line_description || '',
      product_description: data.product_description || '',
      project_goals: data.project_goals || '',
      contracted_lines: data.contracted_lines?.toString() || '',
      billing_terms: data.billing_terms || data.subscription_plan || '',
      hardware_fee: data.hardware_fee?.toString() || '',
      services_fee: data.services_fee?.toString() || '',
      arr: data.arr?.toString() || '',
      mrr: data.mrr?.toString() || '',
      payment_terms_days: data.payment_terms_days?.toString() || '',
      contracted_days: data.contracted_days?.toString() || '',
      auto_renewal: data.auto_renewal ?? true,
      standard_terms: data.standard_terms ?? true,
      deviation_of_terms: data.deviation_of_terms || '',
      final_scoping_complete: data.final_scoping_complete || false,
    });
    setContractedLinesError('');
    setBillingTermsError('');
    setHardwareFeeError('');
    setServicesFeeError('');
    setArrError('');
    setMrrError('');
    setPaymentTermsDaysError('');
    setContractedDaysError('');
    setDeviationOfTermsError('');
    setUsefulLinks(() => {
      try {
        return Array.isArray(data.useful_links) ? data.useful_links : [];
      } catch {
        return [];
      }
    });
    clearDraftData();
    setEditing(false);
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return 'Not assigned';
    const profile = internalProfiles.find(p => p.user_id === userId);
    return profile?.name || 'Unknown User';
  };

  const canEdit = profile?.is_internal === true;

  return (
    <div className="space-y-6">
      {/* Basic Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{type === 'project' ? 'Project' : type === 'solutions' ? 'Solutions Project' : 'Customer'} Information</CardTitle>
              <CardDescription>
                Basic details and configuration
              </CardDescription>
            </div>
            {canEdit && !editing && (
              <Button onClick={() => setEditing(true)} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{type === 'project' ? 'Project' : type === 'solutions' ? 'Solutions Project' : 'Customer'} Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain *</Label>
                  <Select 
                    value={formData.domain} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, domain: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                    onValueChange={(value) => setFormData(prev => ({ ...prev, segment: value }))}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_name">Site Name</Label>
                <Input
                  id="site_name"
                  value={formData.site_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, site_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_address">Site Address</Label>
                <Textarea
                  id="site_address"
                  value={formData.site_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, site_address: e.target.value }))}
                  rows={3}
                />
              </div>

              {type === 'solutions' && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="final_scoping_complete"
                    checked={formData.final_scoping_complete}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, final_scoping_complete: checked }))}
                  />
                  <Label htmlFor="final_scoping_complete">Final Scoping Complete</Label>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="line_description">Line Description</Label>
                  <Textarea
                    id="line_description"
                    value={formData.line_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, line_description: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_description">Product Description</Label>
                  <Textarea
                    id="product_description"
                    value={formData.product_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_description: e.target.value }))}
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_goals">Project Goals</Label>
                <Textarea
                  id="project_goals"
                  value={formData.project_goals}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_goals: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{data.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Domain</p>
                  <p className="font-medium">
                    {data.domain ? (
                      <Badge variant="outline">{data.domain}</Badge>
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Site Name</p>
                  <p className="font-medium">{data.site_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Segment</p>
                  <p className="font-medium">{data.segment || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Site Address</p>
                  <p className="font-medium whitespace-pre-wrap">{data.site_address || '-'}</p>
                </div>
                {type === 'solutions' && (
                  <div>
                    <p className="text-sm text-muted-foreground">Final Scoping Complete</p>
                    <p className="font-medium">
                      {data.final_scoping_complete ? (
                        <Badge className="bg-green-500 hover:bg-green-600">Complete</Badge>
                      ) : (
                        <Badge variant="destructive">Incomplete</Badge>
                      )}
                    </p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Line Description</p>
                  <p className="font-medium whitespace-pre-wrap">{data.line_description || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Product Description</p>
                  <p className="font-medium whitespace-pre-wrap">{data.product_description || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Project Goals</p>
                  <p className="font-medium whitespace-pre-wrap">{data.project_goals || '-'}</p>
                </div>
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      {/* Useful Links Card */}
      {!editing && (
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
                // Save immediately when links change
                try {
                  const tableName = type === 'project' ? 'projects' : type === 'solutions' ? 'solutions_projects' : 'bau_customers';
                  
                  // Only update the useful_links column, nothing else
                  const { error } = await supabase
                    .from(tableName as any)
                    .update({ 
                      useful_links: newLinks 
                    })
                    .eq('id', data.id);

                  if (error) {
                    console.error('Error updating links:', error);
                    throw error;
                  }

                  toast({
                    title: "Links Updated",
                    description: "Useful links have been saved successfully",
                  });
                  onUpdate();
                } catch (error: any) {
                  console.error('Failed to save links:', error);
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
      )}
    </div>
  );
};

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
    expansion_opportunity: data.expansion_opportunity || '',
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
    solution_consultant: data.solution_consultant || data.solutions_consultant || 'unassigned',
    account_manager: data.account_manager || 'unassigned',
    line_description: data.line_description || '',
    product_description: data.product_description || '',
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
    testimonial: data.testimonial || false,
    reference_call: data.reference_call || false,
    site_visit: data.site_visit || false,
    case_study: data.case_study || false,
    reference_status: data.reference_status || '',
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
        expansion_opportunity: formData.expansion_opportunity || null,
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
        solution_consultant: formData.solution_consultant === 'unassigned' ? null : formData.solution_consultant,
        account_manager: formData.account_manager === 'unassigned' ? null : formData.account_manager,
        line_description: formData.line_description || null,
        product_description: formData.product_description || null,
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
        testimonial: formData.testimonial,
        reference_call: formData.reference_call,
        site_visit: formData.site_visit,
        case_study: formData.case_study,
        reference_status: formData.reference_status || null,
      };

      // Add type-specific fields
      if (type === 'project' || type === 'solutions') {
        updateData.contract_signed_date = formData.contract_signed_date;
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
      expansion_opportunity: data.expansion_opportunity || '',
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
      solution_consultant: data.solution_consultant || data.solutions_consultant || 'unassigned',
      account_manager: data.account_manager || 'unassigned',
      line_description: data.line_description || '',
      product_description: data.product_description || '',
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
      testimonial: data.testimonial || false,
      reference_call: data.reference_call || false,
      site_visit: data.site_visit || false,
      case_study: data.case_study || false,
      reference_status: data.reference_status || '',
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
                <div className="space-y-2">
                  <Label htmlFor="expansion_opportunity">Expansion Opportunity</Label>
                  <Select 
                    value={formData.expansion_opportunity} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, expansion_opportunity: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
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

              {/* Contract Information */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Contract Information</h4>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="contract_signed_date">
                      {type === 'bau' ? 'Go Live Date' : 'Contract Signed Date'} *
                    </Label>
                    <Input
                      id="contract_signed_date"
                      type="date"
                      value={formData.contract_signed_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, contract_signed_date: e.target.value }))}
                    />
                  </div>
                  {(type === 'project' || type === 'solutions') && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="contract_start_date">Contract Start Date</Label>
                        <Input
                          id="contract_start_date"
                          type="date"
                          value={formData.contract_start_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, contract_start_date: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contract_end_date">Contract End Date</Label>
                        <Input
                          id="contract_end_date"
                          type="date"
                          value={formData.contract_end_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, contract_end_date: e.target.value }))}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contracted_lines">Contracted Lines</Label>
                    <Input
                      id="contracted_lines"
                      type="number"
                      min="0"
                      value={formData.contracted_lines}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, contracted_lines: e.target.value }));
                        if (contractedLinesError) setContractedLinesError("");
                      }}
                      className={contractedLinesError ? "border-destructive" : ""}
                    />
                    {contractedLinesError && (
                      <p className="text-sm text-destructive">{contractedLinesError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_terms_days">Payment Terms (Days)</Label>
                    <Input
                      id="payment_terms_days"
                      type="number"
                      min="0"
                      value={formData.payment_terms_days}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, payment_terms_days: e.target.value }));
                        if (paymentTermsDaysError) setPaymentTermsDaysError("");
                      }}
                      className={paymentTermsDaysError ? "border-destructive" : ""}
                    />
                    {paymentTermsDaysError && (
                      <p className="text-sm text-destructive">{paymentTermsDaysError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contracted_days">Contracted Days</Label>
                    <Input
                      id="contracted_days"
                      type="number"
                      min="0"
                      value={formData.contracted_days}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, contracted_days: e.target.value }));
                        if (contractedDaysError) setContractedDaysError("");
                      }}
                      className={contractedDaysError ? "border-destructive" : ""}
                    />
                    {contractedDaysError && (
                      <p className="text-sm text-destructive">{contractedDaysError}</p>
                    )}
                  </div>

                  <div className="space-y-2 flex items-center gap-2 pt-8">
                    <Switch
                      id="auto_renewal"
                      checked={formData.auto_renewal}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_renewal: checked }))}
                    />
                    <Label htmlFor="auto_renewal" className="cursor-pointer">Auto Renewal</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing_terms">
                    {type === 'bau' ? 'Subscription Plan' : 'Billing Terms'}
                  </Label>
                  <Textarea
                    id="billing_terms"
                    value={formData.billing_terms}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 2000) {
                        setFormData(prev => ({ ...prev, billing_terms: value }));
                        if (billingTermsError) setBillingTermsError("");
                      }
                    }}
                    rows={4}
                    className={billingTermsError ? "border-destructive" : ""}
                  />
                  {billingTermsError && (
                    <p className="text-sm text-destructive">{billingTermsError}</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hardware_fee">Hardware Fee (£)</Label>
                    <Input
                      id="hardware_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.hardware_fee}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, hardware_fee: e.target.value }));
                        if (hardwareFeeError) setHardwareFeeError("");
                      }}
                      className={hardwareFeeError ? "border-destructive" : ""}
                    />
                    {hardwareFeeError && (
                      <p className="text-sm text-destructive">{hardwareFeeError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="services_fee">Services Fee (£)</Label>
                    <Input
                      id="services_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.services_fee}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, services_fee: e.target.value }));
                        if (servicesFeeError) setServicesFeeError("");
                      }}
                      className={servicesFeeError ? "border-destructive" : ""}
                    />
                    {servicesFeeError && (
                      <p className="text-sm text-destructive">{servicesFeeError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arr">ARR (£)</Label>
                    <Input
                      id="arr"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.arr}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, arr: e.target.value }));
                        if (arrError) setArrError("");
                      }}
                      className={arrError ? "border-destructive" : ""}
                    />
                    {arrError && (
                      <p className="text-sm text-destructive">{arrError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mrr">MRR (£)</Label>
                    <Input
                      id="mrr"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.mrr}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, mrr: e.target.value }));
                        if (mrrError) setMrrError("");
                      }}
                      className={mrrError ? "border-destructive" : ""}
                    />
                    {mrrError && (
                      <p className="text-sm text-destructive">{mrrError}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="standard_terms"
                      checked={formData.standard_terms}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, standard_terms: checked }))}
                    />
                    <Label htmlFor="standard_terms" className="cursor-pointer">Standard Terms</Label>
                  </div>
                  
                  {!formData.standard_terms && (
                    <div className="space-y-2">
                      <Label htmlFor="deviation_of_terms">Deviation of Terms *</Label>
                      <Textarea
                        id="deviation_of_terms"
                        value={formData.deviation_of_terms}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length <= 2000) {
                            setFormData(prev => ({ ...prev, deviation_of_terms: value }));
                            if (deviationOfTermsError) setDeviationOfTermsError("");
                          }
                        }}
                        rows={3}
                        className={deviationOfTermsError ? "border-destructive" : ""}
                      />
                      {deviationOfTermsError && (
                        <p className="text-sm text-destructive">{deviationOfTermsError}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="break_clause_enabled"
                      checked={formData.break_clause_enabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, break_clause_enabled: checked }))}
                    />
                    <Label htmlFor="break_clause_enabled" className="cursor-pointer">Break Clause Enabled</Label>
                  </div>
                  
                  {formData.break_clause_enabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="break_clause_project_date">Break Clause / Project Date *</Label>
                        <Input
                          id="break_clause_project_date"
                          type="date"
                          value={formData.break_clause_project_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, break_clause_project_date: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="break_clause_key_points_md">Break Clause Key Points *</Label>
                        <Textarea
                          id="break_clause_key_points_md"
                          value={formData.break_clause_key_points_md}
                          onChange={(e) => setFormData(prev => ({ ...prev, break_clause_key_points_md: e.target.value }))}
                          rows={4}
                          placeholder="Enter key points about the break clause..."
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Team */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Team</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer_project_lead">Customer Project Lead</Label>
                    <Select 
                      value={formData.customer_project_lead} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, customer_project_lead: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="implementation_lead">Implementation Lead</Label>
                    <Select 
                      value={formData.implementation_lead} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, implementation_lead: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_manager">Account Manager</Label>
                    <Select 
                      value={formData.account_manager} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, account_manager: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sales_lead">Sales Lead</Label>
                    <Select 
                      value={formData.sales_lead} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, sales_lead: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salesperson">Salesperson</Label>
                    <Select 
                      value={formData.salesperson} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, salesperson: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="solution_consultant">Solutions Consultant</Label>
                    <Select 
                      value={formData.solution_consultant} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, solution_consultant: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai_iot_engineer">AI/IoT Engineer</Label>
                    <Select 
                      value={formData.ai_iot_engineer} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, ai_iot_engineer: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="technical_project_lead">Technical Project Lead</Label>
                    <Select 
                      value={formData.technical_project_lead} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, technical_project_lead: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project_coordinator">Project Coordinator</Label>
                    <Select 
                      value={formData.project_coordinator} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, project_coordinator: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Reference & Marketing */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Reference & Marketing</h4>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="testimonial"
                      checked={formData.testimonial}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, testimonial: checked }))}
                    />
                    <Label htmlFor="testimonial" className="cursor-pointer">Testimonial</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="reference_call"
                      checked={formData.reference_call}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reference_call: checked }))}
                    />
                    <Label htmlFor="reference_call" className="cursor-pointer">Reference Call</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="site_visit"
                      checked={formData.site_visit}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, site_visit: checked }))}
                    />
                    <Label htmlFor="site_visit" className="cursor-pointer">Site Visit</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="case_study"
                      checked={formData.case_study}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, case_study: checked }))}
                    />
                    <Label htmlFor="case_study" className="cursor-pointer">Case Study</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_status">Reference Status</Label>
                  <Textarea
                    id="reference_status"
                    value={formData.reference_status}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_status: e.target.value }))}
                    rows={3}
                    placeholder="Enter reference status notes..."
                  />
                </div>
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
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Expansion Opportunity</p>
                  <p className="font-medium">{data.expansion_opportunity || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Line Description</p>
                  <p className="font-medium whitespace-pre-wrap">{data.line_description || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Product Description</p>
                  <p className="font-medium whitespace-pre-wrap">{data.product_description || '-'}</p>
                </div>
              </div>

              {/* Contract Information */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Contract Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {type === 'bau' ? 'Go Live Date' : 'Contract Signed Date'}
                    </p>
                    <p className="font-medium">
                      {(type === 'bau' ? data.go_live_date : data.contract_signed_date) 
                        ? formatDateUK(type === 'bau' ? data.go_live_date : data.contract_signed_date)
                        : '-'
                      }
                    </p>
                  </div>
                  {(type === 'project' || type === 'solutions') && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Contract Start Date</p>
                        <p className="font-medium">
                          {data.contract_start_date ? formatDateUK(data.contract_start_date) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Contract End Date</p>
                        <p className="font-medium">
                          {data.contract_end_date ? formatDateUK(data.contract_end_date) : '-'}
                        </p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Contracted Lines</p>
                    <p className="font-medium">{data.contracted_lines || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Terms</p>
                    <p className="font-medium">{data.payment_terms_days ? `${data.payment_terms_days} days` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contracted Days</p>
                    <p className="font-medium">{data.contracted_days || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Auto Renewal</p>
                    <p className="font-medium">
                      <Badge variant={data.auto_renewal ? "default" : "outline"}>
                        {data.auto_renewal ? 'Yes' : 'No'}
                      </Badge>
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">
                      {type === 'bau' ? 'Subscription Plan' : 'Billing Terms'}
                    </p>
                    <p className="font-medium whitespace-pre-wrap">
                      {(type === 'bau' ? data.subscription_plan : data.billing_terms) || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hardware Fee</p>
                    <p className="font-medium">
                      {data.hardware_fee ? `£${parseFloat(data.hardware_fee).toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Services Fee</p>
                    <p className="font-medium">
                      {data.services_fee ? `£${parseFloat(data.services_fee).toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ARR</p>
                    <p className="font-medium">
                      {data.arr ? `£${parseFloat(data.arr).toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">MRR</p>
                    <p className="font-medium">
                      {data.mrr ? `£${parseFloat(data.mrr).toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Standard Terms</p>
                    <p className="font-medium">
                      <Badge variant={data.standard_terms ? "default" : "outline"}>
                        {data.standard_terms ? 'Yes' : 'No'}
                      </Badge>
                    </p>
                  </div>
                  {!data.standard_terms && data.deviation_of_terms && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Deviation of Terms</p>
                      <p className="font-medium whitespace-pre-wrap">{data.deviation_of_terms}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Break Clause Enabled</p>
                    <p className="font-medium">
                      <Badge variant={data.break_clause_enabled ? "default" : "outline"}>
                        {data.break_clause_enabled ? 'Yes' : 'No'}
                      </Badge>
                    </p>
                  </div>
                  {data.break_clause_enabled && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Break Clause / Project Date</p>
                        <p className="font-medium">
                          {data.break_clause_project_date ? formatDateUK(data.break_clause_project_date) : '-'}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">Break Clause Key Points</p>
                        <p className="font-medium whitespace-pre-wrap">{data.break_clause_key_points_md || '-'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Team */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Team</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Project Lead</p>
                    <p className="font-medium">{getProfileName(data.customer_project_lead)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Implementation Lead</p>
                    <p className="font-medium">{getProfileName(data.implementation_lead)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Manager</p>
                    <p className="font-medium">{getProfileName(data.account_manager)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sales Lead</p>
                    <p className="font-medium">{getProfileName(data.sales_lead)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salesperson</p>
                    <p className="font-medium">{getProfileName(data.salesperson)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Solutions Consultant</p>
                    <p className="font-medium">{getProfileName(data.solution_consultant || data.solutions_consultant)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">AI/IoT Engineer</p>
                    <p className="font-medium">{getProfileName(data.ai_iot_engineer)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Technical Project Lead</p>
                    <p className="font-medium">{getProfileName(data.technical_project_lead)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Project Coordinator</p>
                    <p className="font-medium">{getProfileName(data.project_coordinator)}</p>
                  </div>
                </div>
              </div>

              {/* Reference & Marketing */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Reference & Marketing</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Testimonial</p>
                    <p className="font-medium">
                      <Badge variant={data.testimonial ? "default" : "outline"}>
                        {data.testimonial ? 'Yes' : 'No'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reference Call</p>
                    <p className="font-medium">
                      <Badge variant={data.reference_call ? "default" : "outline"}>
                        {data.reference_call ? 'Yes' : 'No'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Site Visit</p>
                    <p className="font-medium">
                      <Badge variant={data.site_visit ? "default" : "outline"}>
                        {data.site_visit ? 'Yes' : 'No'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Case Study</p>
                    <p className="font-medium">
                      <Badge variant={data.case_study ? "default" : "outline"}>
                        {data.case_study ? 'Yes' : 'No'}
                      </Badge>
                    </p>
                  </div>
                  {data.reference_status && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Reference Status</p>
                      <p className="font-medium whitespace-pre-wrap">{data.reference_status}</p>
                    </div>
                  )}
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
            {canEdit && (
              <LinkManager
                links={usefulLinks}
                onChange={setUsefulLinks}
              />
            )}
            {!canEdit && usefulLinks.length === 0 && (
              <p className="text-sm text-muted-foreground">No links available</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

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
    total_sites: data.total_sites?.toString() || '',
    estimated_lines: data.estimated_lines?.toString() || '',
    arr_potential_min: data.arr_potential_min?.toString() || '',
    arr_potential_max: data.arr_potential_max?.toString() || '',
    short_term_estimated_sites: data.short_term_estimated_sites?.toString() || '',
    short_term_estimated_lines: data.short_term_estimated_lines?.toString() || '',
    short_term_arr_min: data.short_term_arr_min?.toString() || '',
    short_term_arr_max: data.short_term_arr_max?.toString() || '',
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
        total_sites: formData.total_sites ? parseInt(formData.total_sites) : null,
        estimated_lines: formData.estimated_lines ? parseInt(formData.estimated_lines) : null,
        arr_potential_min: formData.arr_potential_min ? parseFloat(formData.arr_potential_min) : null,
        arr_potential_max: formData.arr_potential_max ? parseFloat(formData.arr_potential_max) : null,
        short_term_estimated_sites: formData.short_term_estimated_sites ? parseInt(formData.short_term_estimated_sites) : null,
        short_term_estimated_lines: formData.short_term_estimated_lines ? parseInt(formData.short_term_estimated_lines) : null,
        short_term_arr_min: formData.short_term_arr_min ? parseFloat(formData.short_term_arr_min) : null,
        short_term_arr_max: formData.short_term_arr_max ? parseFloat(formData.short_term_arr_max) : null,
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
      total_sites: data.total_sites?.toString() || '',
      estimated_lines: data.estimated_lines?.toString() || '',
      arr_potential_min: data.arr_potential_min?.toString() || '',
      arr_potential_max: data.arr_potential_max?.toString() || '',
      short_term_estimated_sites: data.short_term_estimated_sites?.toString() || '',
      short_term_estimated_lines: data.short_term_estimated_lines?.toString() || '',
      short_term_arr_min: data.short_term_arr_min?.toString() || '',
      short_term_arr_max: data.short_term_arr_max?.toString() || '',
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

              {/* Reference & Marketing */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-2xl font-semibold leading-none tracking-tight">Reference & Marketing</h3>
                
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

              {/* Expansion */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-2xl font-semibold leading-none tracking-tight">Expansion</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="expansion_opportunity">Expansion Opportunity</Label>
                  <Textarea
                    id="expansion_opportunity"
                    value={formData.expansion_opportunity}
                    onChange={(e) => setFormData(prev => ({ ...prev, expansion_opportunity: e.target.value }))}
                    rows={3}
                    placeholder="Describe expansion opportunities..."
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Total / Long Term</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="total_sites">Total Sites</Label>
                      <Input
                        id="total_sites"
                        type="number"
                        min="0"
                        value={formData.total_sites}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_sites: e.target.value }))}
                        placeholder="Enter number of sites"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estimated_lines">Estimated Lines</Label>
                      <Input
                        id="estimated_lines"
                        type="number"
                        min="0"
                        value={formData.estimated_lines}
                        onChange={(e) => setFormData(prev => ({ ...prev, estimated_lines: e.target.value }))}
                        placeholder="Enter estimated lines"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="arr_potential_min">ARR Potential Min (£)</Label>
                      <Input
                        id="arr_potential_min"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.arr_potential_min}
                        onChange={(e) => setFormData(prev => ({ ...prev, arr_potential_min: e.target.value }))}
                        placeholder="Minimum ARR"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="arr_potential_max">ARR Potential Max (£)</Label>
                      <Input
                        id="arr_potential_max"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.arr_potential_max}
                        onChange={(e) => setFormData(prev => ({ ...prev, arr_potential_max: e.target.value }))}
                        placeholder="Maximum ARR"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Short Term</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="short_term_estimated_sites">Short Term Estimated Sites</Label>
                      <Input
                        id="short_term_estimated_sites"
                        type="number"
                        min="0"
                        value={formData.short_term_estimated_sites}
                        onChange={(e) => setFormData(prev => ({ ...prev, short_term_estimated_sites: e.target.value }))}
                        placeholder="Enter number of sites"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="short_term_estimated_lines">Short Term Estimated Lines</Label>
                      <Input
                        id="short_term_estimated_lines"
                        type="number"
                        min="0"
                        value={formData.short_term_estimated_lines}
                        onChange={(e) => setFormData(prev => ({ ...prev, short_term_estimated_lines: e.target.value }))}
                        placeholder="Enter estimated lines"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="short_term_arr_min">Short Term ARR Min (£)</Label>
                      <Input
                        id="short_term_arr_min"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.short_term_arr_min}
                        onChange={(e) => setFormData(prev => ({ ...prev, short_term_arr_min: e.target.value }))}
                        placeholder="Minimum ARR"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="short_term_arr_max">Short Term ARR Max (£)</Label>
                      <Input
                        id="short_term_arr_max"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.short_term_arr_max}
                        onChange={(e) => setFormData(prev => ({ ...prev, short_term_arr_max: e.target.value }))}
                        placeholder="Maximum ARR"
                      />
                    </div>
                  </div>
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
                  <p className="text-sm text-muted-foreground">Line Description</p>
                  <p className="font-medium whitespace-pre-wrap">{data.line_description || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Product Description</p>
                  <p className="font-medium whitespace-pre-wrap">{data.product_description || '-'}</p>
                </div>
              </div>

              {/* Expansion */}
              <div className="border-t pt-6">
                <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">Expansion</h3>
                
                {data.expansion_opportunity && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">Expansion Opportunity</p>
                    <p className="font-medium whitespace-pre-wrap">{data.expansion_opportunity}</p>
                  </div>
                )}

                {(data.total_sites || data.estimated_lines || data.arr_potential_min || data.arr_potential_max) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-base">Total / Long Term</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.total_sites && (
                        <div>
                          <p className="text-sm text-muted-foreground">Total Sites</p>
                          <p className="font-medium">{data.total_sites}</p>
                        </div>
                      )}
                      {data.estimated_lines && (
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Lines</p>
                          <p className="font-medium">{data.estimated_lines}</p>
                        </div>
                      )}
                      {data.arr_potential_min && (
                        <div>
                          <p className="text-sm text-muted-foreground">ARR Potential Min</p>
                          <p className="font-medium">
                            £{parseFloat(data.arr_potential_min).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {data.arr_potential_max && (
                        <div>
                          <p className="text-sm text-muted-foreground">ARR Potential Max</p>
                          <p className="font-medium">
                            £{parseFloat(data.arr_potential_max).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(data.short_term_estimated_sites || data.short_term_estimated_lines || data.short_term_arr_min || data.short_term_arr_max) && (
                  <div className="space-y-2 mt-4">
                    <h4 className="font-medium text-base">Short Term</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.short_term_estimated_sites && (
                        <div>
                          <p className="text-sm text-muted-foreground">Short Term Estimated Sites</p>
                          <p className="font-medium">{data.short_term_estimated_sites}</p>
                        </div>
                      )}
                      {data.short_term_estimated_lines && (
                        <div>
                          <p className="text-sm text-muted-foreground">Short Term Estimated Lines</p>
                          <p className="font-medium">{data.short_term_estimated_lines}</p>
                        </div>
                      )}
                      {data.short_term_arr_min && (
                        <div>
                          <p className="text-sm text-muted-foreground">Short Term ARR Min</p>
                          <p className="font-medium">
                            £{parseFloat(data.short_term_arr_min).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {data.short_term_arr_max && (
                        <div>
                          <p className="text-sm text-muted-foreground">Short Term ARR Max</p>
                          <p className="font-medium">
                            £{parseFloat(data.short_term_arr_max).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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

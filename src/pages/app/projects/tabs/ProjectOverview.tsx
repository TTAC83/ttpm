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

interface ProjectOverviewProps {
  project: any;
  onUpdate: () => void;
}

interface Profile {
  user_id: string;
  name: string | null;
}

const ProjectOverview = ({ project, onUpdate }: ProjectOverviewProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [internalProfiles, setInternalProfiles] = useState<Profile[]>([]);
  
  const [formData, setFormData] = useState({
    name: project.name || '',
    site_name: project.site_name || '',
    site_address: project.site_address || '',
    domain: project.domain || '',
    segment: project.segment || '',
    expansion_opportunity: project.expansion_opportunity || '',
    contract_signed_date: project.contract_signed_date || '',
    contract_start_date: project.contract_start_date || '',
    contract_end_date: project.contract_end_date || '',
    break_clause_enabled: project.break_clause_enabled || false,
    break_clause_project_date: project.break_clause_project_date || '',
    break_clause_key_points_md: project.break_clause_key_points_md || '',
    customer_project_lead: project.customer_project_lead || 'unassigned',
    implementation_lead: project.implementation_lead || 'unassigned',
    ai_iot_engineer: project.ai_iot_engineer || 'unassigned',
    technical_project_lead: project.technical_project_lead || 'unassigned',
    project_coordinator: project.project_coordinator || 'unassigned',
    sales_lead: project.sales_lead || 'unassigned',
    solution_consultant: project.solution_consultant || 'unassigned',
    account_manager: project.account_manager || 'unassigned',
    line_description: project.line_description || '',
    product_description: project.product_description || '',
    contracted_lines: project.contracted_lines?.toString() || '',
    billing_terms: project.billing_terms || '',
    hardware_fee: project.hardware_fee?.toString() || '',
    services_fee: project.services_fee?.toString() || '',
    arr: project.arr?.toString() || '',
    mrr: project.mrr?.toString() || '',
    payment_terms_days: project.payment_terms_days?.toString() || '',
    contracted_days: project.contracted_days?.toString() || '',
    auto_renewal: project.auto_renewal ?? true,
    standard_terms: project.standard_terms ?? true,
    deviation_of_terms: project.deviation_of_terms || '',
    testimonial: project.testimonial || false,
    reference_call: project.reference_call || false,
    site_visit: project.site_visit || false,
    case_study: project.case_study || false,
    reference_status: project.reference_status || '',
  });

  const [contractedLinesError, setContractedLinesError] = useState<string>('');
  
  // Billing Info validation errors
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
      return Array.isArray(project.useful_links) ? project.useful_links : [];
    } catch {
      return [];
    }
  });

  // Local storage key for this project's draft data
  const localStorageKey = `project-edit-${project.id}`;

  useEffect(() => {
    if (profile?.is_internal) {
      fetchInternalProfiles();
    }
    
    // Load draft data from localStorage when editing starts
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

  // Save draft data whenever form data changes during editing
  useEffect(() => {
    if (editing) {
      const timeoutId = setTimeout(() => {
        saveDraftData();
      }, 500); // Debounce saves
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData, usefulLinks, editing]);

  useEffect(() => {
    if (profile?.is_internal) {
      fetchInternalProfiles();
    }
  }, [profile]);

  const fetchInternalProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .eq('is_internal', true)
        .not('name', 'is', null)
        .neq('name', '')
        .order('name');
      
      if (error) throw error;
      setInternalProfiles(data || []);
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
    
    // Validate billing fields
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
    
    // Validate deviation of terms
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
    
    // Validate break clause fields if enabled
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
      
      // Check if break clause date is >= project start date (if exists)
      if (project.project_start && formData.break_clause_project_date < project.project_start) {
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
      const { error } = await supabase
        .from('projects')
        .update({
          name: formData.name,
          site_name: formData.site_name || null,
          site_address: formData.site_address || null,
          domain: formData.domain,
          segment: formData.segment || null,
          expansion_opportunity: formData.expansion_opportunity || null,
          contract_signed_date: formData.contract_signed_date,
          contract_start_date: formData.contract_start_date || null,
          contract_end_date: formData.contract_end_date || null,
          break_clause_enabled: formData.break_clause_enabled,
          break_clause_project_date: formData.break_clause_enabled ? formData.break_clause_project_date || null : null,
          break_clause_key_points_md: formData.break_clause_enabled ? formData.break_clause_key_points_md || null : null,
          customer_project_lead: formData.customer_project_lead === 'unassigned' ? null : formData.customer_project_lead,
          implementation_lead: formData.implementation_lead === 'unassigned' ? null : formData.implementation_lead,
          ai_iot_engineer: formData.ai_iot_engineer === 'unassigned' ? null : formData.ai_iot_engineer,
          technical_project_lead: formData.technical_project_lead === 'unassigned' ? null : formData.technical_project_lead,
          project_coordinator: formData.project_coordinator === 'unassigned' ? null : formData.project_coordinator,
          sales_lead: formData.sales_lead === 'unassigned' ? null : formData.sales_lead,
          solution_consultant: formData.solution_consultant === 'unassigned' ? null : formData.solution_consultant,
          account_manager: formData.account_manager === 'unassigned' ? null : formData.account_manager,
          line_description: formData.line_description || null,
          product_description: formData.product_description || null,
          contracted_lines: formData.contracted_lines ? parseInt(formData.contracted_lines) : null,
          billing_terms: formData.billing_terms || null,
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
        })
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Project Updated",
        description: "Project details have been updated successfully",
      });

      // Clear draft data after successful save
      clearDraftData();
      setEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: project.name || '',
      site_name: project.site_name || '',
      site_address: project.site_address || '',
      domain: project.domain || '',
      segment: project.segment || '',
      expansion_opportunity: project.expansion_opportunity || '',
      contract_signed_date: project.contract_signed_date || '',
      contract_start_date: project.contract_start_date || '',
      contract_end_date: project.contract_end_date || '',
      break_clause_enabled: project.break_clause_enabled || false,
      break_clause_project_date: project.break_clause_project_date || '',
      break_clause_key_points_md: project.break_clause_key_points_md || '',
      customer_project_lead: project.customer_project_lead || 'unassigned',
      implementation_lead: project.implementation_lead || 'unassigned',
      ai_iot_engineer: project.ai_iot_engineer || 'unassigned',
      technical_project_lead: project.technical_project_lead || 'unassigned',
      project_coordinator: project.project_coordinator || 'unassigned',
      sales_lead: project.sales_lead || 'unassigned',
      solution_consultant: project.solution_consultant || 'unassigned',
      account_manager: project.account_manager || 'unassigned',
      line_description: project.line_description || '',
      product_description: project.product_description || '',
      contracted_lines: project.contracted_lines?.toString() || '',
      billing_terms: project.billing_terms || '',
      hardware_fee: project.hardware_fee?.toString() || '',
      services_fee: project.services_fee?.toString() || '',
      arr: project.arr?.toString() || '',
      mrr: project.mrr?.toString() || '',
      payment_terms_days: project.payment_terms_days?.toString() || '',
      contracted_days: project.contracted_days?.toString() || '',
      auto_renewal: project.auto_renewal ?? true,
      standard_terms: project.standard_terms ?? true,
      deviation_of_terms: project.deviation_of_terms || '',
      testimonial: project.testimonial || false,
      reference_call: project.reference_call || false,
      site_visit: project.site_visit || false,
      case_study: project.case_study || false,
      reference_status: project.reference_status || '',
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
        return Array.isArray(project.useful_links) ? project.useful_links : [];
      } catch {
        return [];
      }
    });
    clearDraftData(); // Clear any saved draft when canceling
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>
                Basic project details and configuration
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
                  <Label htmlFor="name">Project Name *</Label>
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
              
              {/* Project Features Section */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-medium">Project Features</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="testimonial"
                      checked={formData.testimonial}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, testimonial: checked }))}
                    />
                    <Label htmlFor="testimonial">Testimonial</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="reference_call"
                      checked={formData.reference_call}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reference_call: checked }))}
                    />
                    <Label htmlFor="reference_call">Reference Call</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="site_visit"
                      checked={formData.site_visit}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, site_visit: checked }))}
                    />
                    <Label htmlFor="site_visit">Site Visit</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="case_study"
                      checked={formData.case_study}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, case_study: checked }))}
                    />
                    <Label htmlFor="case_study">Case Study</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference_status">Reference Status</Label>
                    <Select
                      value={formData.reference_status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, reference_status: value }))}
                    >
                      <SelectTrigger id="reference_status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Promised">Promised</SelectItem>
                        <SelectItem value="Priority">Priority</SelectItem>
                        <SelectItem value="N/A">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="line_description">Line Description</Label>
                  <Textarea
                    id="line_description"
                    value={formData.line_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, line_description: e.target.value }))}
                    rows={4}
                    placeholder="Describe the production line setup..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_description">Product Description</Label>
                  <Textarea
                    id="product_description"
                    value={formData.product_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_description: e.target.value }))}
                    rows={4}
                    placeholder="Describe the products being manufactured..."
                  />
                </div>
              </div>

              {/* Contract Section */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Contract</h4>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="contract_signed_date">Contract Signed Date *</Label>
                    <Input
                      id="contract_signed_date"
                      type="date"
                      value={formData.contract_signed_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, contract_signed_date: e.target.value }))}
                    />
                  </div>
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
                </div>

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

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="break_clause_enabled"
                      checked={formData.break_clause_enabled}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({
                          ...prev,
                          break_clause_enabled: checked,
                          // Clear fields when disabling
                          break_clause_project_date: checked ? prev.break_clause_project_date : '',
                          break_clause_key_points_md: checked ? prev.break_clause_key_points_md : ''
                        }));
                      }}
                    />
                    <Label htmlFor="break_clause_enabled" className="font-medium">
                      Break Clause?
                    </Label>
                  </div>

                  {formData.break_clause_enabled && (
                    <div className="space-y-4 pl-6 border-l-2 border-muted">
                      <div className="space-y-2">
                        <Label htmlFor="break_clause_project_date">Break Clause / Project Date *</Label>
                        <Input
                          id="break_clause_project_date"
                          type="date"
                          value={formData.break_clause_project_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, break_clause_project_date: e.target.value }))}
                          min={project.project_start || undefined}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="break_clause_key_points_md">Key Points *</Label>
                          <span className="text-xs text-muted-foreground">
                            {formData.break_clause_key_points_md?.length || 0}/2000
                          </span>
                        </div>
                        <Textarea
                          id="break_clause_key_points_md"
                          value={formData.break_clause_key_points_md}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 2000) {
                              setFormData(prev => ({ ...prev, break_clause_key_points_md: value }));
                            }
                          }}
                          rows={6}
                          placeholder="Enter key points in markdown format..."
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Supports markdown formatting. Maximum 2000 characters.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Billing Info Section */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Billing Info</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="billing_terms">Billing Terms</Label>
                    <span className="text-xs text-muted-foreground">
                      {formData.billing_terms?.length || 0}/2000
                    </span>
                  </div>
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
                    placeholder="Enter billing terms..."
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

                  <div className="space-y-2">
                    <Label htmlFor="payment_terms_days">Payment Terms (days)</Label>
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
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto_renewal"
                      checked={formData.auto_renewal}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({ ...prev, auto_renewal: checked }));
                      }}
                    />
                    <Label htmlFor="auto_renewal" className="font-medium">
                      Auto Renewal
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="standard_terms"
                      checked={formData.standard_terms}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({
                          ...prev,
                          standard_terms: checked,
                          // Clear deviation when enabling standard terms
                          deviation_of_terms: checked ? '' : prev.deviation_of_terms
                        }));
                        if (checked && deviationOfTermsError) setDeviationOfTermsError("");
                      }}
                    />
                    <Label htmlFor="standard_terms" className="font-medium">
                      Standard Terms
                    </Label>
                  </div>

                  {!formData.standard_terms && (
                    <div className="space-y-2 pl-6 border-l-2 border-muted">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="deviation_of_terms">Deviation of Terms *</Label>
                        <span className="text-xs text-muted-foreground">
                          {formData.deviation_of_terms?.length || 0}/2000
                        </span>
                      </div>
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
                        rows={4}
                        placeholder="Describe deviations from standard terms..."
                        className={deviationOfTermsError ? "border-destructive" : ""}
                      />
                      {deviationOfTermsError && (
                        <p className="text-sm text-destructive">{deviationOfTermsError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Team Assignments</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Customer Project Lead</Label>
                    <Select 
                      value={formData.customer_project_lead} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, customer_project_lead: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select lead" />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.name || 'Unnamed User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Implementation Lead</Label>
                    <Select 
                      value={formData.implementation_lead} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, implementation_lead: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select lead" />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.name || 'Unnamed User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>AI/IoT Engineer</Label>
                    <Select 
                      value={formData.ai_iot_engineer} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, ai_iot_engineer: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select engineer" />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.name || 'Unnamed User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Technical Project Lead</Label>
                    <Select 
                      value={formData.technical_project_lead} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, technical_project_lead: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select lead" />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.name || 'Unnamed User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Project Coordinator</Label>
                    <Select 
                      value={formData.project_coordinator} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, project_coordinator: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select coordinator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.name || 'Unnamed User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Sales Lead</Label>
                    <Select 
                      value={formData.sales_lead} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, sales_lead: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sales lead" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.name || 'Unnamed User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Solution Consultant</Label>
                    <Select 
                      value={formData.solution_consultant} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, solution_consultant: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select solution consultant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.name || 'Unnamed User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Account Manager</Label>
                    <Select 
                      value={formData.account_manager} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, account_manager: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Not assigned</SelectItem>
                        {internalProfiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.name || 'Unnamed User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <LinkManager
                links={usefulLinks}
                onChange={setUsefulLinks}
                maxLinks={20}
                isEditing={true}
                title="Useful Links"
                className="pt-4"
              />

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium">Customer Company</p>
                  <p className="text-sm text-muted-foreground">{project.companies?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Domain</p>
                  <Badge variant="outline">{project.domain}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Site Name</p>
                  <p className="text-sm text-muted-foreground">{project.site_name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Segment</p>
                  <p className="text-sm text-muted-foreground">{project.segment || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Expansion Opportunity</p>
                  <p className="text-sm text-muted-foreground">{project.expansion_opportunity || 'Not specified'}</p>
                </div>
              </div>

              {project.site_address && (
                <div>
                  <p className="text-sm font-medium">Site Address</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{project.site_address}</p>
                </div>
              )}
              
              {/* Project Features */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 border-t pt-4">
                <div>
                  <p className="text-sm font-medium">Testimonial</p>
                  <p className="text-sm text-muted-foreground">{project.testimonial ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Reference Call</p>
                  <p className="text-sm text-muted-foreground">{project.reference_call ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Site Visit</p>
                  <p className="text-sm text-muted-foreground">{project.site_visit ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Case Study</p>
                  <p className="text-sm text-muted-foreground">{project.case_study ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Reference Status</p>
                  <p className="text-sm text-muted-foreground">{project.reference_status || '-'}</p>
                </div>
              </div>

              {(project.line_description || project.product_description) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {project.line_description && (
                    <div>
                      <p className="text-sm font-medium">Line Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{project.line_description}</p>
                    </div>
                  )}
                  {project.product_description && (
                    <div>
                      <p className="text-sm font-medium">Product Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{project.product_description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Contract Section */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-medium">Contract</h4>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm font-medium">Contract Signed Date</p>
                    <p className="text-sm text-muted-foreground">{formatDateUK(project.contract_signed_date)}</p>
                  </div>
                  {project.contract_start_date && (
                    <div>
                      <p className="text-sm font-medium">Contract Start Date</p>
                      <p className="text-sm text-muted-foreground">{formatDateUK(project.contract_start_date)}</p>
                    </div>
                  )}
                  {project.contract_end_date && (
                    <div>
                      <p className="text-sm font-medium">Contract End Date</p>
                      <p className="text-sm text-muted-foreground">{formatDateUK(project.contract_end_date)}</p>
                    </div>
                  )}
                  {project.contracted_lines !== null && (
                    <div>
                      <p className="text-sm font-medium">Contracted Lines</p>
                      <p className="text-sm text-muted-foreground">{project.contracted_lines}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Break Clause</p>
                    <Badge variant={project.break_clause_enabled ? "default" : "secondary"}>
                      {project.break_clause_enabled ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
                
                {project.break_clause_enabled && (
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <div>
                      <p className="text-sm font-medium">Break Clause / Project Date</p>
                      <p className="text-sm text-muted-foreground">
                        {project.break_clause_project_date ? formatDateUK(project.break_clause_project_date) : 'Not set'}
                      </p>
                    </div>
                    {project.break_clause_key_points_md && (
                      <div>
                        <p className="text-sm font-medium">Key Points</p>
                        <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted p-3 rounded-md">
                          {project.break_clause_key_points_md}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Billing Info Section - View Mode */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-medium">Billing Info</h4>
                
                {project.billing_terms && (
                  <div>
                    <p className="text-sm font-medium">Billing Terms</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{project.billing_terms}</p>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {project.hardware_fee !== null && (
                    <div>
                      <p className="text-sm font-medium">Hardware Fee</p>
                      <p className="text-sm text-muted-foreground">£{project.hardware_fee?.toFixed(2)}</p>
                    </div>
                  )}
                  {project.services_fee !== null && (
                    <div>
                      <p className="text-sm font-medium">Services Fee</p>
                      <p className="text-sm text-muted-foreground">£{project.services_fee?.toFixed(2)}</p>
                    </div>
                  )}
                  {project.arr !== null && (
                    <div>
                      <p className="text-sm font-medium">ARR</p>
                      <p className="text-sm text-muted-foreground">£{project.arr?.toFixed(2)}</p>
                    </div>
                  )}
                  {project.mrr !== null && (
                    <div>
                      <p className="text-sm font-medium">MRR</p>
                      <p className="text-sm text-muted-foreground">£{project.mrr?.toFixed(2)}</p>
                    </div>
                  )}
                  {project.payment_terms_days !== null && (
                    <div>
                      <p className="text-sm font-medium">Payment Terms</p>
                      <p className="text-sm text-muted-foreground">{project.payment_terms_days} days</p>
                    </div>
                  )}
                  {project.contracted_days !== null && (
                    <div>
                      <p className="text-sm font-medium">Contracted Days</p>
                      <p className="text-sm text-muted-foreground">{project.contracted_days}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Auto Renewal</p>
                    <Badge variant={project.auto_renewal ? "default" : "secondary"}>
                      {project.auto_renewal ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Standard Terms</p>
                    <Badge variant={project.standard_terms ? "default" : "secondary"}>
                      {project.standard_terms ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>

                {!project.standard_terms && project.deviation_of_terms && (
                  <div className="pl-4 border-l-2 border-muted">
                    <p className="text-sm font-medium">Deviation of Terms</p>
                    <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted p-3 rounded-md">
                      {project.deviation_of_terms}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Team Assignments</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium">Customer Project Lead</p>
                    <p className="text-sm text-muted-foreground">{getProfileName(project.customer_project_lead)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Implementation Lead</p>
                    <p className="text-sm text-muted-foreground">{getProfileName(project.implementation_lead)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">AI/IoT Engineer</p>
                    <p className="text-sm text-muted-foreground">{getProfileName(project.ai_iot_engineer)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Technical Project Lead</p>
                    <p className="text-sm text-muted-foreground">{getProfileName(project.technical_project_lead)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Project Coordinator</p>
                    <p className="text-sm text-muted-foreground">{getProfileName(project.project_coordinator)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sales Lead</p>
                    <p className="text-sm text-muted-foreground">{getProfileName(project.sales_lead)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Solution Consultant</p>
                    <p className="text-sm text-muted-foreground">{getProfileName(project.solution_consultant)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Account Manager</p>
                    <p className="text-sm text-muted-foreground">{getProfileName(project.account_manager)}</p>
                  </div>
                </div>
              </div>

              <LinkManager
                links={usefulLinks}
                onChange={setUsefulLinks}
                isEditing={false}
                title="Useful Links"
                className="pt-4"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectOverview;
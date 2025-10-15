import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Edit, Save, X } from 'lucide-react';

interface ContractInformationTabProps {
  data: any;
  onUpdate: () => void;
  type: 'project' | 'bau' | 'solutions';
}

export const ContractInformationTab = ({ data, onUpdate, type }: ContractInformationTabProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    contract_signed_date: data.contract_signed_date || data.go_live_date || '',
    contract_start_date: data.contract_start_date || '',
    contract_end_date: data.contract_end_date || '',
    break_clause_enabled: data.break_clause_enabled || false,
    break_clause_project_date: data.break_clause_project_date || '',
    break_clause_key_points_md: data.break_clause_key_points_md || '',
    billing_terms: data.billing_terms || data.subscription_plan || '',
    contracted_lines: data.contracted_lines?.toString() || '',
    hardware_fee: data.hardware_fee?.toString() || '',
    services_fee: data.services_fee?.toString() || '',
    arr: data.arr?.toString() || '',
    mrr: data.mrr?.toString() || '',
    payment_terms_days: data.payment_terms_days?.toString() || '',
    contracted_days: data.contracted_days?.toString() || '',
    auto_renewal: data.auto_renewal ?? true,
    standard_terms: data.standard_terms ?? true,
    deviation_of_terms: data.deviation_of_terms || '',
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
    }
    
    setLoading(true);
    try {
      const tableName = type === 'project' ? 'projects' : type === 'solutions' ? 'solutions_projects' : 'bau_customers';
      const updateData: any = {
        break_clause_enabled: formData.break_clause_enabled,
        break_clause_project_date: formData.break_clause_enabled ? formData.break_clause_project_date || null : null,
        break_clause_key_points_md: formData.break_clause_enabled ? formData.break_clause_key_points_md || null : null,
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
        title: "Contract Information Updated",
        description: "Details have been updated successfully",
      });

      setEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update contract information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      contract_signed_date: data.contract_signed_date || data.go_live_date || '',
      contract_start_date: data.contract_start_date || '',
      contract_end_date: data.contract_end_date || '',
      break_clause_enabled: data.break_clause_enabled || false,
      break_clause_project_date: data.break_clause_project_date || '',
      break_clause_key_points_md: data.break_clause_key_points_md || '',
      billing_terms: data.billing_terms || data.subscription_plan || '',
      contracted_lines: data.contracted_lines?.toString() || '',
      hardware_fee: data.hardware_fee?.toString() || '',
      services_fee: data.services_fee?.toString() || '',
      arr: data.arr?.toString() || '',
      mrr: data.mrr?.toString() || '',
      payment_terms_days: data.payment_terms_days?.toString() || '',
      contracted_days: data.contracted_days?.toString() || '',
      auto_renewal: data.auto_renewal ?? true,
      standard_terms: data.standard_terms ?? true,
      deviation_of_terms: data.deviation_of_terms || '',
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
    setEditing(false);
  };

  const canEdit = profile?.is_internal === true;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contract Information</CardTitle>
              <CardDescription>
                Contract details and financial terms
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

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {type === 'bau' ? 'Go Live Date' : 'Contract Signed Date'}
                  </p>
                  <p className="text-sm">{formData.contract_signed_date || 'Not set'}</p>
                </div>
                {(type === 'project' || type === 'solutions') && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Contract Start Date</p>
                      <p className="text-sm">{formData.contract_start_date || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Contract End Date</p>
                      <p className="text-sm">{formData.contract_end_date || 'Not set'}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contracted Lines</p>
                  <p className="text-sm">{formData.contracted_lines || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Terms</p>
                  <p className="text-sm">{formData.payment_terms_days ? `${formData.payment_terms_days} days` : 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contracted Days</p>
                  <p className="text-sm">{formData.contracted_days ? `${formData.contracted_days} days` : 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Auto Renewal</p>
                  <p className="text-sm">{formData.auto_renewal ? 'Yes' : 'No'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {type === 'bau' ? 'Subscription Plan' : 'Billing Terms'}
                </p>
                <p className="text-sm whitespace-pre-wrap">{formData.billing_terms || 'Not set'}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hardware Fee</p>
                  <p className="text-sm">{formData.hardware_fee ? `£${formData.hardware_fee}` : 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Services Fee</p>
                  <p className="text-sm">{formData.services_fee ? `£${formData.services_fee}` : 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ARR</p>
                  <p className="text-sm">{formData.arr ? `£${formData.arr}` : 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">MRR</p>
                  <p className="text-sm">{formData.mrr ? `£${formData.mrr}` : 'Not set'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Standard Terms</p>
                <p className="text-sm">{formData.standard_terms ? 'Yes' : 'No'}</p>
                {!formData.standard_terms && formData.deviation_of_terms && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-muted-foreground">Deviation of Terms</p>
                    <p className="text-sm whitespace-pre-wrap">{formData.deviation_of_terms}</p>
                  </div>
                )}
              </div>

              {formData.break_clause_enabled && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Break Clause</p>
                  <p className="text-sm">Enabled - Date: {formData.break_clause_project_date}</p>
                  {formData.break_clause_key_points_md && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-muted-foreground">Key Points</p>
                      <p className="text-sm whitespace-pre-wrap">{formData.break_clause_key_points_md}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

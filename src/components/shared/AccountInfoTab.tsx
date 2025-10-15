import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Edit, Save, X } from 'lucide-react';

interface AccountInfoTabProps {
  data: any;
  onUpdate: () => void;
  type: 'project' | 'bau' | 'solutions';
}

export const AccountInfoTab = ({ data, onUpdate, type }: AccountInfoTabProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    testimonial: data.testimonial || false,
    reference_call: data.reference_call || false,
    site_visit: data.site_visit || false,
    case_study: data.case_study || false,
    reference_status: data.reference_status || '',
    expansion_opportunity: data.expansion_opportunity || '',
    total_sites: data.total_sites?.toString() || '',
    estimated_lines: data.estimated_lines?.toString() || '',
    arr_potential_min: data.arr_potential_min?.toString() || '',
    arr_potential_max: data.arr_potential_max?.toString() || '',
    short_term_estimated_sites: data.short_term_estimated_sites?.toString() || '',
    short_term_estimated_lines: data.short_term_estimated_lines?.toString() || '',
    short_term_arr_min: data.short_term_arr_min?.toString() || '',
    short_term_arr_max: data.short_term_arr_max?.toString() || '',
  });

  const canEdit = profile?.is_internal;

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    setLoading(true);
    try {
      const tableName = type === 'project' ? 'projects' : type === 'solutions' ? 'solutions_projects' : 'bau_customers';
      const updateData = {
        testimonial: formData.testimonial,
        reference_call: formData.reference_call,
        site_visit: formData.site_visit,
        case_study: formData.case_study,
        reference_status: formData.reference_status || null,
        expansion_opportunity: formData.expansion_opportunity || null,
        total_sites: formData.total_sites ? parseInt(formData.total_sites) : null,
        estimated_lines: formData.estimated_lines ? parseInt(formData.estimated_lines) : null,
        arr_potential_min: formData.arr_potential_min ? parseFloat(formData.arr_potential_min) : null,
        arr_potential_max: formData.arr_potential_max ? parseFloat(formData.arr_potential_max) : null,
        short_term_estimated_sites: formData.short_term_estimated_sites ? parseInt(formData.short_term_estimated_sites) : null,
        short_term_estimated_lines: formData.short_term_estimated_lines ? parseInt(formData.short_term_estimated_lines) : null,
        short_term_arr_min: formData.short_term_arr_min ? parseFloat(formData.short_term_arr_min) : null,
        short_term_arr_max: formData.short_term_arr_max ? parseFloat(formData.short_term_arr_max) : null,
      };

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', data.id);

      if (error) throw error;

      toast({
        title: "Account Info Updated",
        description: "Reference and marketing information has been updated successfully",
      });

      setEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update account info",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      testimonial: data.testimonial || false,
      reference_call: data.reference_call || false,
      site_visit: data.site_visit || false,
      case_study: data.case_study || false,
      reference_status: data.reference_status || '',
      expansion_opportunity: data.expansion_opportunity || '',
      total_sites: data.total_sites?.toString() || '',
      estimated_lines: data.estimated_lines?.toString() || '',
      arr_potential_min: data.arr_potential_min?.toString() || '',
      arr_potential_max: data.arr_potential_max?.toString() || '',
      short_term_estimated_sites: data.short_term_estimated_sites?.toString() || '',
      short_term_estimated_lines: data.short_term_estimated_lines?.toString() || '',
      short_term_arr_min: data.short_term_arr_min?.toString() || '',
      short_term_arr_max: data.short_term_arr_max?.toString() || '',
    });
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reference & Marketing</CardTitle>
              <CardDescription>Manage customer reference and marketing opportunities</CardDescription>
            </div>
            {canEdit && !editing && (
              <Button onClick={() => setEditing(true)} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="testimonial">Testimonial</Label>
                  <Switch
                    id="testimonial"
                    checked={formData.testimonial}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, testimonial: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="reference_call">Reference Call</Label>
                  <Switch
                    id="reference_call"
                    checked={formData.reference_call}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reference_call: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="site_visit">Site Visit</Label>
                  <Switch
                    id="site_visit"
                    checked={formData.site_visit}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, site_visit: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="case_study">Case Study</Label>
                  <Switch
                    id="case_study"
                    checked={formData.case_study}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, case_study: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_status">Reference Status</Label>
                  <Textarea
                    id="reference_status"
                    value={formData.reference_status}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_status: e.target.value }))}
                    placeholder="Enter reference status notes..."
                    rows={4}
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expansion</CardTitle>
          <CardDescription>Track expansion opportunities and potential growth</CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="expansion_opportunity">Expansion Opportunity</Label>
                <Textarea
                  id="expansion_opportunity"
                  value={formData.expansion_opportunity}
                  onChange={(e) => setFormData(prev => ({ ...prev, expansion_opportunity: e.target.value }))}
                  placeholder="Describe expansion opportunities..."
                  rows={4}
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-base">Total / Long Term</h4>
                
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
                <h4 className="font-medium text-base">Short Term</h4>
                
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
          ) : (
            <div className="space-y-6">
              {data.expansion_opportunity && (
                <div>
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
                <div className="space-y-2">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

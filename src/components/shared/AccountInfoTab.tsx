import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
    </div>
  );
};

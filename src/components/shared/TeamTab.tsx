import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Edit, Save, X } from 'lucide-react';

interface TeamTabProps {
  data: any;
  onUpdate: () => void;
  type: 'project' | 'bau' | 'solutions';
}

interface Profile {
  user_id: string;
  name: string | null;
}

export const TeamTab = ({ data, onUpdate, type }: TeamTabProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [internalProfiles, setInternalProfiles] = useState<Profile[]>([]);
  
  const [formData, setFormData] = useState({
    customer_project_lead: data.customer_project_lead || data.customer_lead || 'unassigned',
    implementation_lead: data.implementation_lead || 'unassigned',
    ai_iot_engineer: data.ai_iot_engineer || 'unassigned',
    technical_project_lead: data.technical_project_lead || 'unassigned',
    project_coordinator: data.project_coordinator || 'unassigned',
    sales_lead: data.sales_lead || 'unassigned',
    salesperson: data.salesperson || 'unassigned',
    solution_consultant: data.solution_consultant || data.solutions_consultant || 'unassigned',
    account_manager: data.account_manager || 'unassigned',
  });

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

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    setLoading(true);
    try {
      const tableName = type === 'project' ? 'projects' : type === 'solutions' ? 'solutions_projects' : 'bau_customers';
      const updateData: any = {
        customer_project_lead: formData.customer_project_lead === 'unassigned' ? null : formData.customer_project_lead,
        implementation_lead: formData.implementation_lead === 'unassigned' ? null : formData.implementation_lead,
        ai_iot_engineer: formData.ai_iot_engineer === 'unassigned' ? null : formData.ai_iot_engineer,
        technical_project_lead: formData.technical_project_lead === 'unassigned' ? null : formData.technical_project_lead,
        project_coordinator: formData.project_coordinator === 'unassigned' ? null : formData.project_coordinator,
        sales_lead: formData.sales_lead === 'unassigned' ? null : formData.sales_lead,
        salesperson: formData.salesperson === 'unassigned' ? null : formData.salesperson,
        solution_consultant: formData.solution_consultant === 'unassigned' ? null : formData.solution_consultant,
        account_manager: formData.account_manager === 'unassigned' ? null : formData.account_manager,
      };

      // For solutions projects, map customer_project_lead to customer_lead
      if (type === 'solutions') {
        updateData.customer_lead = updateData.customer_project_lead;
        delete updateData.customer_project_lead;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', data.id);

      if (error) throw error;

      toast({
        title: "Team Updated",
        description: "Team assignments have been updated successfully",
      });

      setEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update team assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      customer_project_lead: data.customer_project_lead || data.customer_lead || 'unassigned',
      implementation_lead: data.implementation_lead || 'unassigned',
      ai_iot_engineer: data.ai_iot_engineer || 'unassigned',
      technical_project_lead: data.technical_project_lead || 'unassigned',
      project_coordinator: data.project_coordinator || 'unassigned',
      sales_lead: data.sales_lead || 'unassigned',
      salesperson: data.salesperson || 'unassigned',
      solution_consultant: data.solution_consultant || data.solutions_consultant || 'unassigned',
      account_manager: data.account_manager || 'unassigned',
    });
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
              <CardTitle>Team Assignments</CardTitle>
              <CardDescription>
                Assign team members to roles
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
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Salesperson</p>
                <p className="text-sm">{getProfileName(data.salesperson)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Solutions Consultant</p>
                <p className="text-sm">{getProfileName(data.solution_consultant || data.solutions_consultant)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer Project Lead</p>
                <p className="text-sm">{getProfileName(data.customer_project_lead || data.customer_lead)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Implementation Lead</p>
                <p className="text-sm">{getProfileName(data.implementation_lead)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Manager</p>
                <p className="text-sm">{getProfileName(data.account_manager)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sales Lead</p>
                <p className="text-sm">{getProfileName(data.sales_lead)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI/IoT Engineer</p>
                <p className="text-sm">{getProfileName(data.ai_iot_engineer)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Technical Project Lead</p>
                <p className="text-sm">{getProfileName(data.technical_project_lead)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project Coordinator</p>
                <p className="text-sm">{getProfileName(data.project_coordinator)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

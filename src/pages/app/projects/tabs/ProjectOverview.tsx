import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { Edit, Save, X } from 'lucide-react';

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
    contract_signed_date: project.contract_signed_date || '',
    customer_project_lead: project.customer_project_lead || 'unassigned',
    implementation_lead: project.implementation_lead || 'unassigned',
    ai_iot_engineer: project.ai_iot_engineer || 'unassigned',
    technical_project_lead: project.technical_project_lead || 'unassigned',
    project_coordinator: project.project_coordinator || 'unassigned',
  });

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

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: formData.name,
          site_name: formData.site_name || null,
          site_address: formData.site_address || null,
          domain: formData.domain,
          contract_signed_date: formData.contract_signed_date,
          customer_project_lead: formData.customer_project_lead === 'unassigned' ? null : formData.customer_project_lead,
          implementation_lead: formData.implementation_lead === 'unassigned' ? null : formData.implementation_lead,
          ai_iot_engineer: formData.ai_iot_engineer === 'unassigned' ? null : formData.ai_iot_engineer,
          technical_project_lead: formData.technical_project_lead === 'unassigned' ? null : formData.technical_project_lead,
          project_coordinator: formData.project_coordinator === 'unassigned' ? null : formData.project_coordinator,
        })
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Project Updated",
        description: "Project details have been updated successfully",
      });

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
      contract_signed_date: project.contract_signed_date || '',
      customer_project_lead: project.customer_project_lead || 'unassigned',
      implementation_lead: project.implementation_lead || 'unassigned',
      ai_iot_engineer: project.ai_iot_engineer || 'unassigned',
      technical_project_lead: project.technical_project_lead || 'unassigned',
      project_coordinator: project.project_coordinator || 'unassigned',
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
            <form className="space-y-4">
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="site_name">Site Name</Label>
                  <Input
                    id="site_name"
                    value={formData.site_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, site_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract_signed_date">Contract Signed Date *</Label>
                  <Input
                    id="contract_signed_date"
                    type="date"
                    value={formData.contract_signed_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, contract_signed_date: e.target.value }))}
                  />
                </div>
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

                  <div className="space-y-2 md:col-span-2">
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
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
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
                  <p className="text-sm font-medium">Contract Signed</p>
                  <p className="text-sm text-muted-foreground">{formatDateUK(project.contract_signed_date)}</p>
                </div>
              </div>

              {project.site_address && (
                <div>
                  <p className="text-sm font-medium">Site Address</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{project.site_address}</p>
                </div>
              )}

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
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium">Project Coordinator</p>
                    <p className="text-sm text-muted-foreground">{getProfileName(project.project_coordinator)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectOverview;
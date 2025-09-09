import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { ArrowLeft } from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

interface Profile {
  user_id: string;
  name: string | null;
  is_internal: boolean;
}

export const NewProject = () => {
  const navigate = useNavigate();
  const { isInternalAdmin } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [internalProfiles, setInternalProfiles] = useState<Profile[]>([]);
  
  const [formData, setFormData] = useState({
    company_name: '', // Changed from company_id
    name: '',
    site_name: '',
    site_address: '',
    domain: '',
    contract_signed_date: '',
    customer_project_lead: '',
    implementation_lead: '',
    ai_iot_engineer: '',
    technical_project_lead: '',
    project_coordinator: ''
  });

  useEffect(() => {
    if (!isInternalAdmin()) {
      navigate('/app/projects');
      return;
    }
    
    fetchCompanies();
    fetchInternalProfiles();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchInternalProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, is_internal')
        .eq('is_internal', true)
        .order('name');
      
      if (error) throw error;
      setInternalProfiles(data || []);
    } catch (error) {
      console.error('Error fetching internal profiles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, find or create the company
      let company_id;
      let { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', formData.company_name.trim())
        .single();

      if (existingCompany) {
        company_id = existingCompany.id;
      } else {
        // Create new company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({ name: formData.company_name.trim(), is_internal: false })
          .select('id')
          .single();
        
        if (companyError) throw companyError;
        company_id = newCompany.id;
      }

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          company_id: company_id,
          name: formData.name,
          site_name: formData.site_name || null,
          site_address: formData.site_address || null,
          domain: formData.domain as 'IoT' | 'Vision' | 'Hybrid',
          contract_signed_date: formData.contract_signed_date,
          customer_project_lead: formData.customer_project_lead || null,
          implementation_lead: formData.implementation_lead || null,
          ai_iot_engineer: formData.ai_iot_engineer || null,
          technical_project_lead: formData.technical_project_lead || null,
          project_coordinator: formData.project_coordinator || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Project Created",
        description: "Project has been created successfully",
      });

      navigate(`/app/projects/${project.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isInternalAdmin()) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/projects')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Project</h1>
          <p className="text-muted-foreground">
            Create a new implementation project
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Enter the project information and assign team leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Customer Company *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Enter customer company name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Domain *</Label>
                <Select 
                  value={formData.domain} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, domain: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IoT">IoT</SelectItem>
                    <SelectItem value="Vision">Vision</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="site_name">Site Name</Label>
                <Input
                  id="site_name"
                  value={formData.site_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, site_name: e.target.value }))}
                  placeholder="Enter site name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract_signed_date">Contract Signed Date *</Label>
                <Input
                  id="contract_signed_date"
                  type="date"
                  value={formData.contract_signed_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_signed_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_address">Site Address</Label>
              <Textarea
                id="site_address"
                value={formData.site_address}
                onChange={(e) => setFormData(prev => ({ ...prev, site_address: e.target.value }))}
                placeholder="Enter full site address"
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Team Assignments</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer_project_lead">Customer Project Lead</Label>
                  <Select 
                    value={formData.customer_project_lead} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, customer_project_lead: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {internalProfiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.name || 'Unnamed User'}
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
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {internalProfiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.name || 'Unnamed User'}
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
                      <SelectValue placeholder="Select engineer" />
                    </SelectTrigger>
                    <SelectContent>
                      {internalProfiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.name || 'Unnamed User'}
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
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {internalProfiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.name || 'Unnamed User'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="project_coordinator">Project Coordinator</Label>
                  <Select 
                    value={formData.project_coordinator} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, project_coordinator: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select coordinator" />
                    </SelectTrigger>
                    <SelectContent>
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
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/app/projects')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewProject;
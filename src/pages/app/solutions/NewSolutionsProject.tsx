import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/ui/date-picker';
import { ContactSearchCombobox, type EnrichedContact } from '@/components/contacts/ContactSearchCombobox';
import {
  linkContactToSolutionsProject,
  linkContactToCompany,
  createAndLinkContact,
} from '@/lib/contactMatchingService';

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
}

export const NewSolutionsProject = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    domain: '' as 'Vision' | 'IoT' | 'Hybrid' | '',
    site_name: '',
    site_address: '',
    salesperson: '',
    solutions_consultant: '',
    customer_lead: '',
    customer_email: '',
    customer_phone: '',
    customer_job_title: '',
    potential_contract_start_date: null as Date | null
  });

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_all_users_with_profiles');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (name: string, value: string | Date | null) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContactSelect = (contact: EnrichedContact | null) => {
    if (contact) {
      setSelectedContactId(contact.id);
      const primaryEmail = contact.emails.find(e => e.is_primary)?.email || contact.emails[0]?.email || '';
      setFormData(prev => ({
        ...prev,
        customer_lead: contact.name,
        customer_email: primaryEmail,
        customer_phone: contact.phone || '',
        customer_job_title: contact.title || '',
      }));
    } else {
      setSelectedContactId(null);
      setFormData(prev => ({
        ...prev,
        customer_lead: '',
        customer_email: '',
        customer_phone: '',
        customer_job_title: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_name || !formData.domain || !formData.site_name || !formData.potential_contract_start_date) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields including Potential Contract Start Date',
        variant: 'destructive',
      });
      return;
    }

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
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({ name: formData.company_name.trim(), is_internal: false })
          .select('id')
          .single();
        
        if (companyError) throw companyError;
        company_id = newCompany.id;
      }

      const projectData = {
        company_id: company_id,
        domain: formData.domain as 'Vision' | 'IoT' | 'Hybrid',
        site_name: formData.site_name,
        site_address: formData.site_address || null,
        salesperson: formData.salesperson || null,
        solutions_consultant: formData.solutions_consultant || null,
        customer_lead: formData.customer_lead || null,
        customer_email: formData.customer_email || null,
        customer_phone: formData.customer_phone || null,
        customer_job_title: formData.customer_job_title || null,
        potential_contract_start_date: formData.potential_contract_start_date!.toISOString().split('T')[0],
        created_by: user?.id
      };

      const { data, error } = await supabase
        .from('solutions_projects')
        .insert([projectData])
        .select()
        .single();

      if (error) throw error;

      // Link or create contact after project creation
      try {
        if (selectedContactId) {
          await linkContactToSolutionsProject(selectedContactId, data.id);
          await linkContactToCompany(selectedContactId, company_id);
        } else if (formData.customer_lead.trim()) {
          await createAndLinkContact({
            name: formData.customer_lead.trim(),
            email: formData.customer_email || undefined,
            phone: formData.customer_phone || undefined,
            title: formData.customer_job_title || undefined,
            companyId: company_id,
            solutionsProjectId: data.id,
            createdBy: user?.id,
          });
        }
      } catch (contactErr) {
        console.error('Error linking contact (project still created):', contactErr);
      }

      toast({
        title: 'Project Created',
        description: 'Solutions project has been created successfully',
      });

      navigate(`/app/solutions/${data.id}`);
    } catch (error: any) {
      console.error('Error creating solutions project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create solutions project',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/solutions')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Solutions Projects
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Solutions Project</h1>
          <p className="text-muted-foreground">
            Create a new solutions project
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Enter the project information and assign team members
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
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  placeholder="Enter customer company name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Domain *</Label>
                <Select 
                  value={formData.domain} 
                  onValueChange={(value) => handleInputChange('domain', value)}
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

              <div className="space-y-2">
                <Label htmlFor="potential_contract_start_date">Potential Contract Start Date *</Label>
                <DatePicker
                  value={formData.potential_contract_start_date || undefined}
                  onChange={(date) => handleInputChange('potential_contract_start_date', date || null)}
                  placeholder="Select start date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_name">Site Name *</Label>
              <Input
                id="site_name"
                value={formData.site_name}
                onChange={(e) => handleInputChange('site_name', e.target.value)}
                placeholder="Enter site name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_address">Site Address</Label>
              <Textarea
                id="site_address"
                value={formData.site_address}
                onChange={(e) => handleInputChange('site_address', e.target.value)}
                placeholder="Enter full site address"
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Team Assignments</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salesperson">Sales Person</Label>
                  <Select 
                    value={formData.salesperson} 
                    onValueChange={(value) => handleInputChange('salesperson', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales person" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="solutions_consultant">Solutions Consultant</Label>
                  <Select 
                    value={formData.solutions_consultant} 
                    onValueChange={(value) => handleInputChange('solutions_consultant', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select solutions consultant" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Contact Information</h3>
              
              <div className="space-y-2">
                <Label>Search Existing Contact</Label>
                <ContactSearchCombobox
                  value={selectedContactId}
                  onSelect={handleContactSelect}
                />
                <p className="text-xs text-muted-foreground">
                  Select an existing contact to auto-fill, or enter details manually below.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer_lead">Customer Lead</Label>
                  <Input
                    id="customer_lead"
                    value={formData.customer_lead}
                    onChange={(e) => handleInputChange('customer_lead', e.target.value)}
                    placeholder="Enter customer lead name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_job_title">Job Title</Label>
                  <Input
                    id="customer_job_title"
                    value={formData.customer_job_title}
                    onChange={(e) => handleInputChange('customer_job_title', e.target.value)}
                    placeholder="Enter job title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_email">Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange('customer_email', e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Phone</Label>
                  <Input
                    id="customer_phone"
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
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
                onClick={() => navigate('/app/solutions')}
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
    customer_job_title: ''
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

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_name || !formData.domain || !formData.site_name) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const projectData = {
        company_name: formData.company_name,
        domain: formData.domain as 'Vision' | 'IoT' | 'Hybrid',
        site_name: formData.site_name,
        site_address: formData.site_address || null,
        salesperson: formData.salesperson || null,
        solutions_consultant: formData.solutions_consultant || null,
        customer_lead: formData.customer_lead || null,
        customer_email: formData.customer_email || null,
        customer_phone: formData.customer_phone || null,
        customer_job_title: formData.customer_job_title || null,
        created_by: user?.id
      };

      const { data, error } = await supabase
        .from('solutions_projects')
        .insert([projectData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Solutions project created successfully',
      });

      navigate(`/app/solutions/${data.id}`);
    } catch (error) {
      console.error('Error creating solutions project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create solutions project',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/app/solutions')}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">New Solutions Project</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="domain">Domain *</Label>
                <Select onValueChange={(value) => handleInputChange('domain', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vision">Vision</SelectItem>
                    <SelectItem value="IoT">IoT</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="site_name">Site Name *</Label>
                <Input
                  id="site_name"
                  value={formData.site_name}
                  onChange={(e) => handleInputChange('site_name', e.target.value)}
                  placeholder="Enter site name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="site_address">Site Address</Label>
                <Textarea
                  id="site_address"
                  value={formData.site_address}
                  onChange={(e) => handleInputChange('site_address', e.target.value)}
                  placeholder="Enter site address"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Team Assignments</h3>
              
              <div>
                <Label htmlFor="salesperson">Salesperson</Label>
                <Select onValueChange={(value) => handleInputChange('salesperson', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select salesperson" />
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

              <div>
                <Label htmlFor="solutions_consultant">Solutions Consultant</Label>
                <Select onValueChange={(value) => handleInputChange('solutions_consultant', value)}>
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

              <div>
                <Label htmlFor="customer_lead">Customer Lead</Label>
                <Input
                  id="customer_lead"
                  value={formData.customer_lead}
                  onChange={(e) => handleInputChange('customer_lead', e.target.value)}
                  placeholder="Enter customer lead name"
                />
              </div>

              <div>
                <Label htmlFor="customer_email">Customer Email</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  placeholder="Enter customer email"
                />
              </div>

              <div>
                <Label htmlFor="customer_phone">Customer Phone</Label>
                <Input
                  id="customer_phone"
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  placeholder="Enter customer phone number"
                />
              </div>

              <div>
                <Label htmlFor="customer_job_title">Customer Job Title</Label>
                <Input
                  id="customer_job_title"
                  value={formData.customer_job_title}
                  onChange={(e) => handleInputChange('customer_job_title', e.target.value)}
                  placeholder="Enter customer job title"
                />
              </div>
            </div>

            <div className="flex gap-4">
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
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SolutionsProject {
  id: string;
  company_name: string;
  domain: string;
  site_name: string;
  site_address?: string;
  salesperson?: string;
  solutions_consultant?: string;
  customer_lead?: string;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
}

export const SolutionsProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<SolutionsProject | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProject = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('solutions_projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching solutions project:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch solutions project',
        variant: 'destructive',
      });
    }
  };

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
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProject(), fetchUsers()]);
      setLoading(false);
    };

    loadData();
  }, [id]);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    return user?.name || user?.email || 'Unknown User';
  };

  const getDomainBadgeVariant = (domain: string) => {
    switch (domain) {
      case 'Vision':
        return 'default';
      case 'IoT':
        return 'secondary';
      case 'Hybrid':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!project) {
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
          <h1 className="text-3xl font-bold">Solutions Project Not Found</h1>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold">{project.company_name}</h1>
        <Badge variant={getDomainBadgeVariant(project.domain)}>
          {project.domain}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Company Name</label>
              <p className="font-medium">{project.company_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Domain</label>
              <div className="flex items-center gap-2">
                <Badge variant={getDomainBadgeVariant(project.domain)}>
                  {project.domain}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Site Name</label>
              <p className="font-medium">{project.site_name}</p>
            </div>
            {project.site_address && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Site Address</label>
                <p className="font-medium">{project.site_address}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="font-medium">{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Salesperson</label>
              <p className="font-medium">
                {project.salesperson ? getUserName(project.salesperson) : 'Not assigned'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Solutions Consultant</label>
              <p className="font-medium">
                {project.solutions_consultant ? getUserName(project.solutions_consultant) : 'Not assigned'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Customer Lead</label>
              <p className="font-medium">
                {project.customer_lead ? getUserName(project.customer_lead) : 'Not assigned'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
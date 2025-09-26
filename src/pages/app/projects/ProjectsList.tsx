import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { Search, Plus, Building, Calendar, Upload, Trash2, Smile, Frown, CheckCircle, AlertCircle } from 'lucide-react';
import { DeleteProjectDialog } from '@/components/DeleteProjectDialog';

interface Project {
  id: string;
  name: string;
  site_name: string | null;
  domain: string;
  contract_signed_date: string;
  created_at: string;
  company_id: string;
  companies: {
    name: string;
  } | null;
}

export const ProjectsList = () => {
  const { isInternalAdmin, profile } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    projectId: string;
    projectName: string;
  }>({
    open: false,
    projectId: '',
    projectName: '',
  });

  // Get current week for health status
  const { data: currentWeek } = useQuery({
    queryKey: ['current-week'],
    queryFn: async () => {
      const { data: weeksData } = await supabase
        .from('impl_weekly_weeks')
        .select('week_start, week_end')
        .order('week_start', { ascending: false });
      
      if (weeksData && weeksData.length >= 2) {
        return weeksData[1].week_start; // Current week (second from top)
      } else if (weeksData && weeksData.length > 0) {
        return weeksData[0].week_start; // Fallback to first available week
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Get health status for all projects
  const { data: healthStatuses } = useQuery({
    queryKey: ['projects-health', currentWeek],
    queryFn: async () => {
      if (!currentWeek) return {};
      
      const { data, error } = await supabase
        .from('impl_weekly_reviews')
        .select('company_id, customer_health, project_status')
        .eq('week_start', currentWeek);
      
      if (error) {
        console.error('Error fetching health statuses:', error);
        return {};
      }
      
      // Convert to a map for easy lookup
      const healthMap: Record<string, { customer_health?: string; project_status?: string }> = {};
      (data || []).forEach(review => {
        healthMap[review.company_id] = {
          customer_health: review.customer_health,
          project_status: review.project_status
        };
      });
      
      return healthMap;
    },
    enabled: !!currentWeek,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          site_name,
          domain,
          contract_signed_date,
          created_at,
          company_id,
          companies (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    setDeleteDialog({
      open: true,
      projectId,
      projectName,
    });
  };

  const handleDeleteSuccess = () => {
    fetchProjects(); // Refresh the projects list
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.companies?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.site_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDomainBadgeVariant = (domain: string) => {
    switch (domain) {
      case 'IoT': return 'default';
      case 'Vision': return 'secondary';
      case 'Hybrid': return 'outline';
      default: return 'outline';
    }
  };

  const renderHealthIcons = (project: Project) => {
    const health = healthStatuses?.[project.company_id];
    if (!health) return null;

    return (
      <div className="flex items-center gap-1">
        {health.customer_health === "green" && (
          <div title="Customer Health: Green">
            <Smile className="h-4 w-4 text-green-600" />
          </div>
        )}
        {health.customer_health === "red" && (
          <div title="Customer Health: Red">
            <Frown className="h-4 w-4 text-red-600" />
          </div>
        )}
        {health.project_status === "on_track" && (
          <div title="Project Status: On Track">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
        )}
        {health.project_status === "off_track" && (
          <div title="Project Status: Off Track">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage implementation projects and track progress
          </p>
        </div>
        
        {/* Debug info - temporary */}
        <div className="text-xs text-gray-500 p-2 border rounded">
          Debug: role={profile?.role}, is_internal={profile?.is_internal?.toString()}, isInternalAdmin={isInternalAdmin().toString()}
        </div>
        
        {(profile?.is_internal === true && profile?.role === 'internal_admin') && (
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/app/projects/new">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Link>
            </Button>
          </div>
        )}
      </div>


      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            {profile?.is_internal 
              ? "View and manage all implementation projects"
              : "View projects for your organization"
            }
          </CardDescription>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects by name, company, or site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Project Name</TableHead>
                   <TableHead>Customer</TableHead>
                   <TableHead>Site</TableHead>
                   <TableHead>Domain</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Contract Date</TableHead>
                   <TableHead>Created</TableHead>
                   <TableHead>Actions</TableHead>
                 </TableRow>
               </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Building className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchTerm ? 'No projects found matching your search' : 'No projects found'}
                        </p>
                        {isInternalAdmin() && !searchTerm && (
                          <Button asChild size="sm">
                            <Link to="/app/projects/new">Create First Project</Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <Link 
                          to={`/app/projects/${project.id}`}
                          className="hover:underline"
                        >
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell>{project.companies?.name || 'Unknown'}</TableCell>
                      <TableCell>{project.site_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getDomainBadgeVariant(project.domain)}>
                          {project.domain}
                        </Badge>
                       </TableCell>
                       <TableCell>{renderHealthIcons(project)}</TableCell>
                       <TableCell>{formatDateUK(project.contract_signed_date)}</TableCell>
                       <TableCell>{formatDateUK(project.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/app/projects/${project.id}`}>
                              View Details
                            </Link>
                          </Button>
                          {isInternalAdmin() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProject(project.id, project.name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DeleteProjectDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        projectId={deleteDialog.projectId}
        projectName={deleteDialog.projectName}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};

export default ProjectsList;
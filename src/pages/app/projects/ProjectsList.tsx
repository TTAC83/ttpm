import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { Search, Plus, Building, Calendar, Upload } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  site_name: string | null;
  domain: string;
  contract_signed_date: string;
  created_at: string;
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

      {/* Date Update Buttons for Internal Admins */}
      {(profile?.is_internal === true && profile?.role === 'internal_admin') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Customer Date Updates
            </CardTitle>
            <CardDescription>
              Bulk update project dates for specific customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/app/projects/update-myton-gadbrook-morrisons">
                  <Upload className="h-4 w-4 mr-2" />
                  Myton Gadbrook
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/app/projects/update-rg-fresh">
                  <Upload className="h-4 w-4 mr-2" />
                  R&G Fresh
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/app/projects/update-village-bakery">
                  <Upload className="h-4 w-4 mr-2" />
                  Village Bakery
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/app/projects/update-park-cakes">
                  <Upload className="h-4 w-4 mr-2" />
                  Park Cakes
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <TableHead>Contract Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
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
                      <TableCell>{formatDateUK(project.contract_signed_date)}</TableCell>
                      <TableCell>{formatDateUK(project.created_at)}</TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/app/projects/${project.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectsList;
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Profile {
  user_id: string;
  name: string | null;
}

interface Project {
  id: string;
  name: string;
  company: {
    name: string;
  };
  salesperson: string | null;
  solutions_consultant: string | null;
  customer_project_lead: string | null;
  implementation_lead: string | null;
  account_manager: string | null;
  sales_lead: string | null;
  ai_iot_engineer: string | null;
  technical_project_lead: string | null;
  project_coordinator: string | null;
  tech_lead: string | null;
  tech_sponsor: string | null;
  vp_customer_success: string | null;
}

const ROLE_COLUMNS = [
  { key: 'salesperson', label: 'Salesperson' },
  { key: 'solutions_consultant', label: 'Solutions Consultant' },
  { key: 'implementation_lead', label: 'Implementation Lead' },
  { key: 'account_manager', label: 'Account Manager' },
  { key: 'ai_iot_engineer', label: 'AI/IoT Engineer' },
  { key: 'technical_project_lead', label: 'Technical Project Lead' },
  { key: 'project_coordinator', label: 'Project Coordinator' },
  { key: 'tech_lead', label: 'Tech/Dev Lead' },
  { key: 'tech_sponsor', label: 'Tech/Dev Sponsor' },
  { key: 'vp_customer_success', label: 'VP Customer Success' },
];

const TeamsReport = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [projectsResponse, profilesResponse] = await Promise.all([
        supabase
          .from('projects')
          .select(`
            id,
            name,
            company:companies(name),
            salesperson,
            solutions_consultant,
            customer_project_lead,
            implementation_lead,
            account_manager,
            sales_lead,
            ai_iot_engineer,
            technical_project_lead,
            project_coordinator,
            tech_lead,
            tech_sponsor,
            vp_customer_success
          `)
          .order('name'),
        supabase
          .from('profiles')
          .select('user_id, name')
          .eq('is_internal', true)
          .not('name', 'is', null)
          .neq('name', '')
          .order('name')
      ]);

      if (projectsResponse.error) throw projectsResponse.error;
      if (profilesResponse.error) throw profilesResponse.error;

      setProjects(projectsResponse.data || []);
      setProfiles(profilesResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch team data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (projectId: string, roleKey: string, newValue: string) => {
    const cellKey = `${projectId}-${roleKey}`;
    setUpdatingCell(cellKey);

    try {
      const updateData: Record<string, string | null> = {
        [roleKey]: newValue === 'unassigned' ? null : newValue,
      };

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId);

      if (error) throw error;

      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, [roleKey]: newValue === 'unassigned' ? null : newValue }
          : p
      ));

      toast({
        title: "Updated",
        description: "Team assignment updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update team assignment",
        variant: "destructive",
      });
    } finally {
      setUpdatingCell(null);
    }
  };

  const getProfileName = (userId: string | null): string => {
    if (!userId) return '-';
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.name || '-';
  };

  const filteredProjects = projects.filter(project => {
    const searchLower = searchTerm.toLowerCase();
    return (
      project.name.toLowerCase().includes(searchLower) ||
      project.company?.name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Teams Report</CardTitle>
            <div className="w-64">
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="h-full overflow-auto border-t">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-20">
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-30 min-w-[200px]">Customer / Project</TableHead>
                    {ROLE_COLUMNS.map(role => (
                      <TableHead key={role.key} className="min-w-[140px] whitespace-nowrap bg-background">
                        {role.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={ROLE_COLUMNS.length + 1} className="text-center text-muted-foreground py-8">
                        No projects found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map(project => (
                      <TableRow key={project.id}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          <div>
                            <div className="font-semibold">{project.company?.name}</div>
                            <div className="text-sm text-muted-foreground">{project.name}</div>
                          </div>
                        </TableCell>
                        {ROLE_COLUMNS.map(role => {
                          const cellKey = `${project.id}-${role.key}`;
                          const currentValue = project[role.key as keyof Project] as string | null;
                          const isUpdating = updatingCell === cellKey;
                          
                          return (
                            <TableCell key={role.key} className="p-1">
                              <Select
                                value={currentValue || 'unassigned'}
                                onValueChange={(value) => handleRoleChange(project.id, role.key, value)}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className="h-8 text-xs border-0 bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
                                  <SelectValue>
                                    {isUpdating ? (
                                      <span className="text-muted-foreground">Saving...</span>
                                    ) : (
                                      <span className={!currentValue ? 'text-muted-foreground' : ''}>
                                        {getProfileName(currentValue)}
                                      </span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-background z-50">
                                  <SelectItem value="unassigned">
                                    <span className="text-muted-foreground">Not assigned</span>
                                  </SelectItem>
                                  {profiles.map(p => (
                                    <SelectItem key={p.user_id} value={p.user_id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamsReport;

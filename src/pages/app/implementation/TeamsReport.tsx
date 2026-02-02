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
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  head_of_support: string | null;
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
];

const TeamsReport = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingCell, setUpdatingCell] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);

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
            vp_customer_success,
            head_of_support
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

  const handleBulkUpdate = async () => {
    setBulkUpdating(true);
    try {
      // User IDs from profiles
      const amanId = '540ee8d7-ae77-4587-95a3-a33fd2eb46d4';
      const imranId = 'e351243c-bd01-47fc-a134-39c7e6a2c1a6';
      const harshId = '178fd856-d23a-44f3-a4bb-1cc66d87e897';
      const jamesId = 'a27c65c6-e881-4a08-8a4b-8a25701d8fb6';
      const arehmanId = '0880ce67-55b4-4ce3-a29c-cb36c8e2ee25';

      // Mappings from the spreadsheet (company name -> tech_lead, tech_sponsor)
      // Note: Abhinav, Huzaifa, Abdur, Affan are NOT in the profiles table yet
      const mappings: Record<string, { tech_lead?: string; tech_sponsor?: string }> = {
        'Aquascot': { tech_sponsor: amanId }, // Tech Lead = Abhinav (missing)
        'Butternut Box': { tech_sponsor: imranId }, // Tech Lead = Huzaifa (missing)
        'Cranswick': { tech_sponsor: imranId }, // Tech Lead = Abdur (missing)
        'Finsbury': { tech_lead: harshId, tech_sponsor: amanId },
        'HFUK': { tech_sponsor: imranId }, // Tech Lead = Affan (missing)
        'Kettle Produce': { tech_sponsor: imranId }, // Tech Lead = Abdur (missing)
        'MBC': { tech_sponsor: amanId }, // Tech Lead = Abhinav (missing)
        'Myton': { tech_lead: jamesId },
        'Park Cakes': { tech_lead: harshId, tech_sponsor: amanId },
        'R&G Fresh': { tech_lead: harshId, tech_sponsor: amanId },
        'Sofina Hull': { tech_sponsor: amanId }, // Tech Lead = Abdur (missing)
        'Sofina Malton': { tech_sponsor: amanId }, // Tech Lead = Abdur (missing)
        'Sofina Foods - Fraserburgh': { tech_lead: harshId, tech_sponsor: amanId },
        'Village Bakery': { tech_sponsor: imranId }, // Tech Lead = Huzaifa (missing)
        'Quin': { tech_lead: harshId, tech_sponsor: amanId },
        'Delifrance': { tech_sponsor: amanId }, // Tech Lead = Abhinav (missing)
        'Stonegate': { tech_sponsor: imranId }, // Tech Lead = Abhinav (missing)
        'Beckets': { tech_sponsor: imranId }, // Tech Lead = Abhinav (missing)
        'Chambers': { tech_sponsor: amanId },
        'Grupo Bimbo': { tech_sponsor: amanId }, // Tech Lead = Huzaifa (missing)
        // Row 10 from image: Tech Lead = A Rehman, Sponsor = Imran (need to identify which project)
      };

      const updatePromises: Promise<any>[] = [];
      const updatedProjects: Record<string, { tech_lead?: string; tech_sponsor?: string }> = {};

      for (const project of projects) {
        const companyName = project.company?.name;
        if (!companyName) continue;

        // Find matching mapping (partial match)
        const matchKey = Object.keys(mappings).find(key => 
          companyName.toLowerCase().includes(key.toLowerCase())
        );

        if (matchKey) {
          const mapping = mappings[matchKey];
          const updateData: Record<string, string | null> = {};

          if (mapping.tech_lead) updateData.tech_lead = mapping.tech_lead;
          if (mapping.tech_sponsor) updateData.tech_sponsor = mapping.tech_sponsor;

          if (Object.keys(updateData).length > 0) {
            updatePromises.push(
              (async () => {
                await supabase.from('projects').update(updateData).eq('id', project.id);
              })()
            );
            updatedProjects[project.id] = mapping;
          }
        }
      }

      await Promise.all(updatePromises);

      // Update local state
      setProjects(prev => prev.map(p => {
        const updates = updatedProjects[p.id];
        if (updates) {
          return {
            ...p,
            tech_lead: updates.tech_lead || p.tech_lead,
            tech_sponsor: updates.tech_sponsor || p.tech_sponsor,
          };
        }
        return p;
      }));

      toast({
        title: "Bulk Update Complete",
        description: `Updated tech lead/sponsor for ${updatePromises.length} projects. Note: Abhinav, Huzaifa, Abdur, Affan not in system yet.`,
      });
    } catch (error: any) {
      console.error('Error bulk updating:', error);
      toast({
        title: "Error",
        description: "Failed to bulk update projects",
        variant: "destructive",
      });
    } finally {
      setBulkUpdating(false);
    }
  };

  const getProfileName = (userId: string | null): string => {
    if (!userId) return '-';
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.name || '-';
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    
    const title = 'Teams Report';
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    
    doc.setFontSize(18);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${date}`, 14, 22);

    const headers = ['Customer', 'Project', ...ROLE_COLUMNS.map(r => r.label)];
    
    const rows = filteredProjects.map(project => [
      project.company?.name || '-',
      project.name,
      ...ROLE_COLUMNS.map(role => getProfileName(project[role.key as keyof Project] as string | null))
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 28,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 30 },
      },
    });

    doc.save(`teams-report-${date.replace(/\s/g, '-')}.pdf`);
    
    toast({
      title: "Export Complete",
      description: "Teams report PDF downloaded",
    });
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
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportPDF}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Export PDF
              </Button>
              <div className="w-64">
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
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

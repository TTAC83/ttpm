import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  SolutionsProject, 
  ConversionMapping, 
  fetchSolutionsProjects, 
  fetchSolutionsProjectById, 
  getConversionMapping,
  PROJECT_ROLES 
} from '@/lib/solutionsConversionService';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  user_id: string;
  name: string | null;
  is_internal: boolean;
}

interface SolutionsProjectSelectorProps {
  open: boolean;
  onClose: () => void;
  onConvert: (project: SolutionsProject, roleMapping: { [key: string]: string }, contractDate: string) => void;
}

export const SolutionsProjectSelector = ({ open, onClose, onConvert }: SolutionsProjectSelectorProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'select' | 'mapping'>('select');
  const [loading, setLoading] = useState(false);
  const [solutionsProjects, setSolutionsProjects] = useState<SolutionsProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<SolutionsProject | null>(null);
  const [conversionMapping, setConversionMapping] = useState<ConversionMapping | null>(null);
  const [internalProfiles, setInternalProfiles] = useState<Profile[]>([]);
  const [contractSignedDate, setContractSignedDate] = useState('');
  const [roleMapping, setRoleMapping] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (open) {
      fetchProjects();
      fetchInternalProfiles();
      setStep('select');
      setSelectedProjectId('');
      setSelectedProject(null);
      setConversionMapping(null);
      setRoleMapping({});
      setContractSignedDate('');
    }
  }, [open]);

  const fetchProjects = async () => {
    try {
      const projects = await fetchSolutionsProjects();
      setSolutionsProjects(projects);
    } catch (error) {
      console.error('Error fetching solutions projects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch solutions projects",
        variant: "destructive",
      });
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

  const handleProjectSelect = async () => {
    if (!selectedProjectId) return;

    setLoading(true);
    try {
      const project = await fetchSolutionsProjectById(selectedProjectId);
      if (!project) throw new Error('Project not found');

      const mapping = await getConversionMapping(project);
      
      setSelectedProject(project);
      setConversionMapping(mapping);
      
      // Set up initial role mappings
      const initialMapping: { [key: string]: string } = {};
      if (mapping.salesperson) {
        initialMapping.customer_project_lead = mapping.salesperson;
      }
      if (mapping.solutions_consultant) {
        initialMapping.ai_iot_engineer = mapping.solutions_consultant;
      }
      
      setRoleMapping(initialMapping);
      setStep('mapping');
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: "Error",
        description: "Failed to load project details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = () => {
    if (!selectedProject || !contractSignedDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    onConvert(selectedProject, roleMapping, contractSignedDate);
  };

  const getUserName = (userId: string) => {
    const profile = internalProfiles.find(p => p.user_id === userId);
    return profile?.name || 'Unknown User';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' ? 'Select Solutions Project' : 'Configure Team Mapping'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="solutions-project">Solutions Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a solutions project to convert" />
                </SelectTrigger>
                <SelectContent>
                  {solutionsProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{project.company_name} - {project.site_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {project.domain} • Created {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleProjectSelect} disabled={!selectedProjectId || loading}>
                {loading ? 'Loading...' : 'Next'}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && selectedProject && conversionMapping && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Project Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Company:</span> {selectedProject.company_name}
                </div>
                <div>
                  <span className="font-medium">Site:</span> {selectedProject.site_name}
                </div>
                <div>
                  <span className="font-medium">Domain:</span> {selectedProject.domain}
                </div>
                <div>
                  <span className="font-medium">Address:</span> {selectedProject.site_address || 'Not specified'}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Required Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="contract-date">Contract Signed Date *</Label>
                <Input
                  id="contract-date"
                  type="date"
                  value={contractSignedDate}
                  onChange={(e) => setContractSignedDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Team Role Mapping</h3>
              <p className="text-sm text-muted-foreground">
                Map the Solutions Project team members to Implementation Project roles. 
                Only team members who exist as internal users will be mapped.
              </p>

              {conversionMapping.salesperson && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">
                    Salesperson: {getUserName(conversionMapping.salesperson)}
                  </div>
                  <div className="space-y-2">
                    <Label>Map to Implementation Role</Label>
                    <Select 
                      value={roleMapping.customer_project_lead || 'none'} 
                      onValueChange={(value) => setRoleMapping(prev => ({ 
                        ...prev, 
                        customer_project_lead: value === 'none' ? '' : value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No assignment</SelectItem>
                        {PROJECT_ROLES.map((role) => (
                          <SelectItem key={role.value} value={conversionMapping.salesperson!}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {conversionMapping.solutions_consultant && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">
                    Solutions Consultant: {getUserName(conversionMapping.solutions_consultant)}
                  </div>
                  <div className="space-y-2">
                    <Label>Map to Implementation Role</Label>
                    <Select 
                      value={Object.entries(roleMapping).find(([_, userId]) => userId === conversionMapping.solutions_consultant)?.[0] || 'none'} 
                      onValueChange={(role) => {
                        if (role === 'none') {
                          // Remove any existing mapping for this user
                          const newMapping = { ...roleMapping };
                          Object.keys(newMapping).forEach(key => {
                            if (newMapping[key] === conversionMapping.solutions_consultant) {
                              delete newMapping[key];
                            }
                          });
                          setRoleMapping(newMapping);
                        } else {
                          setRoleMapping(prev => ({ ...prev, [role]: conversionMapping.solutions_consultant! }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role (suggested: AI/IoT Engineer)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No assignment</SelectItem>
                        {PROJECT_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {conversionMapping.customer_lead_name && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">
                    Customer Lead: {conversionMapping.customer_lead_name}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This is customer contact information and will not be mapped to internal team roles.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-medium">Additional Team Assignments</h4>
                <p className="text-sm text-muted-foreground">Assign internal team members to remaining roles:</p>
                
                {PROJECT_ROLES.map((role) => {
                  const isAlreadyMapped = Object.hasOwnProperty.call(roleMapping, role.value);
                  return (
                    <div key={role.value} className="space-y-2">
                      <Label>{role.label}</Label>
                      <Select 
                        value={roleMapping[role.value] || 'none'} 
                        onValueChange={(value) => setRoleMapping(prev => ({ 
                          ...prev, 
                          [role.value]: value === 'none' ? '' : value 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No assignment</SelectItem>
                          {internalProfiles
                            .filter((profile) => profile.user_id && profile.user_id.trim() !== '')
                            .map((profile) => (
                              <SelectItem key={profile.user_id} value={profile.user_id}>
                                {profile.name || 'Unnamed User'}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleConvert} disabled={!contractSignedDate}>
                Convert to Implementation Project
              </Button>
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
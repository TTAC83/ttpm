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
  SUGGESTED_ROLE_MAPPINGS 
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
      
      // Apply default role mappings automatically
      const initialMapping: { [key: string]: string } = {};
      if (mapping.salesperson) {
        initialMapping.sales_lead = mapping.salesperson;
      }
      if (mapping.solutions_consultant) {
        initialMapping.solution_consultant = mapping.solutions_consultant;
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
                        <span className="font-medium">{project.companies?.name || 'N/A'} - {project.site_name}</span>
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
                  <span className="font-medium">Company:</span> {selectedProject.companies?.name || 'N/A'}
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
              <h3 className="text-lg font-semibold">Default Team Assignments</h3>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  The following team members will be automatically assigned:
                </p>
                
                {conversionMapping.salesperson && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Sales Lead:</span>
                    <span>{getUserName(conversionMapping.salesperson)}</span>
                  </div>
                )}
                
                {conversionMapping.solutions_consultant && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Solution Consultant:</span>
                    <span>{getUserName(conversionMapping.solutions_consultant)}</span>
                  </div>
                )}
                
                {conversionMapping.customer_lead_name && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Customer Lead (info only):</span>
                    <span>{conversionMapping.customer_lead_name}</span>
                  </div>
                )}
                
                {!conversionMapping.salesperson && !conversionMapping.solutions_consultant && (
                  <p className="text-sm text-muted-foreground italic">
                    No team members found to assign automatically
                  </p>
                )}
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
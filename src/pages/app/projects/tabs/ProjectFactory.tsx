import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ProjectFactoryProps {
  projectId: string;
  projectDomain: string;
}

interface FactoryData {
  website_url: string;
  job_scheduling: string;
  job_scheduling_notes: string;
  s3_bucket_required: boolean;
  teams_integration: boolean;
  teams_id: string;
  teams_webhook_url: string;
  tablet_use_cases: string;
  modules_and_features: string;
}

const MODULES_OPTIONS = ['Maintenance', 'Quality'];

export const ProjectFactory = ({ projectId, projectDomain }: ProjectFactoryProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FactoryData>({
    website_url: '',
    job_scheduling: '',
    job_scheduling_notes: '',
    s3_bucket_required: ['Hybrid', 'Vision'].includes(projectDomain),
    teams_integration: false,
    teams_id: '',
    teams_webhook_url: '',
    tablet_use_cases: 'None',
    modules_and_features: '',
  });
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  useEffect(() => {
    fetchFactoryData();
  }, [projectId]);

  const fetchFactoryData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('website_url, job_scheduling, job_scheduling_notes, s3_bucket_required, teams_integration, teams_id, teams_webhook_url, tablet_use_cases, modules_and_features')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          website_url: data.website_url || '',
          job_scheduling: data.job_scheduling || '',
          job_scheduling_notes: data.job_scheduling_notes || '',
          s3_bucket_required: data.s3_bucket_required ?? (['Hybrid', 'Vision'].includes(projectDomain)),
          teams_integration: data.teams_integration || false,
          teams_id: data.teams_id || '',
          teams_webhook_url: data.teams_webhook_url || '',
          tablet_use_cases: data.tablet_use_cases || 'None',
          modules_and_features: data.modules_and_features || '',
        });
        
        if (data.modules_and_features) {
          setSelectedModules(data.modules_and_features.split(',').filter(Boolean));
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch factory data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Empty is valid
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    // Validation
    if (formData.website_url && !validateUrl(formData.website_url)) {
      toast({
        title: 'Validation Error',
        description: 'Website URL must be a valid URL',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.job_scheduling) {
      toast({
        title: 'Validation Error',
        description: 'Job Scheduling must be selected',
        variant: 'destructive',
      });
      return;
    }

    if (formData.job_scheduling_notes.length > 2000) {
      toast({
        title: 'Validation Error',
        description: 'Notes must be 2000 characters or less',
        variant: 'destructive',
      });
      return;
    }

    if (formData.teams_integration) {
      if (!formData.teams_id) {
        toast({
          title: 'Validation Error',
          description: 'Teams ID is required when Teams Integration is enabled',
          variant: 'destructive',
        });
        return;
      }
      if (!formData.teams_webhook_url || !validateUrl(formData.teams_webhook_url)) {
        toast({
          title: 'Validation Error',
          description: 'Teams Webhook URL must be a valid URL',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('projects')
        .update({
          website_url: formData.website_url || null,
          job_scheduling: formData.job_scheduling,
          job_scheduling_notes: formData.job_scheduling_notes || null,
          s3_bucket_required: formData.s3_bucket_required,
          teams_integration: formData.teams_integration,
          teams_id: formData.teams_integration ? formData.teams_id : null,
          teams_webhook_url: formData.teams_integration ? formData.teams_webhook_url : null,
          tablet_use_cases: formData.tablet_use_cases,
          modules_and_features: selectedModules.join(','),
        })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Factory settings saved successfully',
      });
      setIsEditing(false);
      fetchFactoryData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save factory settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleModuleToggle = (module: string) => {
    setSelectedModules(prev =>
      prev.includes(module)
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Factory Configuration</CardTitle>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                fetchFactoryData();
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Website URL */}
        <div className="space-y-2">
          <Label htmlFor="website_url">Website URL</Label>
          <Input
            id="website_url"
            value={formData.website_url}
            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
            disabled={!isEditing}
            placeholder="https://example.com"
            maxLength={500}
          />
        </div>

        {/* Job Scheduling */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job_scheduling">Job Scheduling *</Label>
            <Select
              value={formData.job_scheduling}
              onValueChange={(value) => setFormData({ ...formData, job_scheduling: value })}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select scheduling method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ERP">ERP</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
                <SelectItem value="Manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="job_scheduling_notes">Job Scheduling Notes</Label>
            <Textarea
              id="job_scheduling_notes"
              value={formData.job_scheduling_notes}
              onChange={(e) => setFormData({ ...formData, job_scheduling_notes: e.target.value })}
              disabled={!isEditing}
              placeholder="Additional notes about job scheduling..."
              rows={4}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              {formData.job_scheduling_notes.length}/2000 characters
            </p>
          </div>
        </div>

        {/* S3 Bucket Required */}
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="s3_bucket">S3 Bucket Required</Label>
          <Switch
            id="s3_bucket"
            checked={formData.s3_bucket_required}
            onCheckedChange={(checked) => setFormData({ ...formData, s3_bucket_required: checked })}
            disabled={!isEditing}
          />
        </div>

        {/* Teams Integration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="teams_integration">Teams Integration</Label>
            <Switch
              id="teams_integration"
              checked={formData.teams_integration}
              onCheckedChange={(checked) => setFormData({ ...formData, teams_integration: checked })}
              disabled={!isEditing}
            />
          </div>

          {formData.teams_integration && (
            <>
              <div className="space-y-2">
                <Label htmlFor="teams_id">Teams ID *</Label>
                <Input
                  id="teams_id"
                  value={formData.teams_id}
                  onChange={(e) => setFormData({ ...formData, teams_id: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Enter Teams ID"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teams_webhook">Teams Webhook URL *</Label>
                <Input
                  id="teams_webhook"
                  value={formData.teams_webhook_url}
                  onChange={(e) => setFormData({ ...formData, teams_webhook_url: e.target.value })}
                  disabled={!isEditing}
                  placeholder="https://outlook.office.com/webhook/..."
                />
              </div>
            </>
          )}
        </div>

        {/* Tablet Use Cases */}
        <div className="space-y-2">
          <Label htmlFor="tablet_use_cases">Tablet Use Cases *</Label>
          <Select
            value={formData.tablet_use_cases}
            onValueChange={(value) => setFormData({ ...formData, tablet_use_cases: value })}
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Manage">Manage</SelectItem>
              <SelectItem value="One App">One App</SelectItem>
              <SelectItem value="Both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Modules and Features */}
        <div className="space-y-2">
          <Label>Modules and Features</Label>
          <div className="flex flex-wrap gap-2">
            {MODULES_OPTIONS.map((module) => (
              <Button
                key={module}
                type="button"
                variant={selectedModules.includes(module) ? 'default' : 'outline'}
                size="sm"
                onClick={() => isEditing && handleModuleToggle(module)}
                disabled={!isEditing}
              >
                {module}
              </Button>
            ))}
          </div>
          {selectedModules.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Selected: {selectedModules.join(', ')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

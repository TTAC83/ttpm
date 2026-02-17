import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Layers, Camera, Cpu, Eye, Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface FeasibilityGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  solutionsConsultantId: string | null;
  allTabsGreen: boolean;
  signedOff: boolean;
  signedOffBy: string | null;
  signedOffAt: string | null;
  onSignedOff: () => void;
}

interface SummaryData {
  lineCount: number;
  cameraCount: number;
  iotDeviceCount: number;
  useCases: string[];
}

export const FeasibilityGateDialog = ({
  open,
  onOpenChange,
  projectId,
  solutionsConsultantId,
  allTabsGreen,
  signedOff,
  signedOffBy,
  signedOffAt,
  onSignedOff,
}: FeasibilityGateDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [summary, setSummary] = useState<SummaryData>({ lineCount: 0, cameraCount: 0, iotDeviceCount: 0, useCases: [] });
  const [consultantName, setConsultantName] = useState<string | null>(null);
  const [signedOffByName, setSignedOffByName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const isConsultant = user?.id === solutionsConsultantId;

  useEffect(() => {
    if (!open) return;
    setPassword('');
    fetchSummary();
    if (solutionsConsultantId) fetchProfileName(solutionsConsultantId, setConsultantName);
    if (signedOff && signedOffBy) fetchProfileName(signedOffBy, setSignedOffByName);
  }, [open, projectId]);

  const fetchProfileName = async (userId: string, setter: (n: string) => void) => {
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', userId)
      .single();
    if (data?.name) setter(data.name);
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      // Get lines
      const { data: lines } = await supabase
        .from('solutions_lines')
        .select('id')
        .eq('solutions_project_id', projectId);
      const lineIds = (lines ?? []).map(l => l.id);
      const lineCount = lineIds.length;

      let cameraCount = 0;
      let iotDeviceCount = 0;
      const useCaseSet = new Set<string>();

      if (lineIds.length > 0) {
        // Get positions for these lines
        const { data: positions } = await supabase
          .from('positions')
          .select('id')
          .in('solutions_line_id', lineIds);
        const positionIds = (positions ?? []).map(p => p.id);

        if (positionIds.length > 0) {
          // Get equipment for positions
          const { data: equipment } = await supabase
            .from('equipment')
            .select('id')
            .in('position_id', positionIds);
          const equipmentIds = (equipment ?? []).map(e => e.id);

          if (equipmentIds.length > 0) {
            // Count cameras
            const { count: camCount } = await supabase
              .from('cameras')
              .select('id', { count: 'exact', head: true })
              .in('equipment_id', equipmentIds);
            cameraCount = camCount ?? 0;

            // Count IoT devices
            const { count: iotCount } = await supabase
              .from('iot_devices')
              .select('id', { count: 'exact', head: true })
              .in('equipment_id', equipmentIds);
            iotDeviceCount = iotCount ?? 0;

            if (iotDeviceCount > 0) useCaseSet.add('IoT');

            // Get camera IDs for use cases
            if (cameraCount > 0) {
              const { data: cameras } = await supabase
                .from('cameras')
                .select('id')
                .in('equipment_id', equipmentIds);
              const cameraIds = (cameras ?? []).map(c => c.id);

              if (cameraIds.length > 0) {
                const { data: caseLinks } = await supabase
                  .from('camera_use_cases')
                  .select('vision_use_case_id')
                  .in('camera_id', cameraIds);
                const ucIds = [...new Set((caseLinks ?? []).map(c => c.vision_use_case_id))];

                if (ucIds.length > 0) {
                  const { data: ucNames } = await supabase
                    .from('vision_use_cases_master')
                    .select('name')
                    .in('id', ucIds);
                  (ucNames ?? []).forEach(u => useCaseSet.add(u.name));
                }
              }
            }
          }
        }
      }

      setSummary({ lineCount, cameraCount, iotDeviceCount, useCases: [...useCaseSet].sort() });
    } catch (e) {
      console.error('Error fetching summary:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOff = async () => {
    if (!user?.email || !password) return;
    setSubmitting(true);
    try {
      // Re-authenticate
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (authError) {
        toast({ title: 'Authentication Failed', description: 'Incorrect password.', variant: 'destructive' });
        return;
      }

      // Update project
      const { error: updateError } = await supabase
        .from('solutions_projects')
        .update({
          feasibility_signed_off: true,
          feasibility_signed_off_by: user.id,
          feasibility_signed_off_at: new Date().toISOString(),
        } as any)
        .eq('id', projectId);

      if (updateError) throw updateError;

      toast({ title: 'Feasibility Signed Off', description: 'The feasibility gate has been formally signed off.' });
      onSignedOff();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to sign off', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Feasibility Gate
          </DialogTitle>
        </DialogHeader>

        {/* Summary Section */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Project Summary</p>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <Layers className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{summary.lineCount}</p>
                    <p className="text-xs text-muted-foreground">Lines</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <Camera className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{summary.cameraCount}</p>
                    <p className="text-xs text-muted-foreground">Cameras</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <Cpu className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{summary.iotDeviceCount}</p>
                    <p className="text-xs text-muted-foreground">IoT Devices</p>
                  </CardContent>
                </Card>
              </div>

              {summary.useCases.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> Use Cases
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.useCases.map(uc => (
                      <Badge key={uc} variant="secondary" className="text-xs">{uc}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sign-off Section */}
        {signedOff ? (
          <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4 space-y-1">
            <p className="text-sm font-medium flex items-center gap-1.5 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" /> Signed Off
            </p>
            <p className="text-xs text-muted-foreground">
              By {signedOffByName || 'Unknown'} on {signedOffAt ? new Date(signedOffAt).toLocaleString() : ''}
            </p>
          </div>
        ) : allTabsGreen ? (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              By signing off, you confirm the feasibility assessment is complete.
            </p>
            {consultantName && (
              <p className="text-sm">Solutions Consultant: <span className="font-medium">{consultantName}</span></p>
            )}
            {isConsultant ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" /> Enter your password to confirm
                </div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && password) handleSignOff(); }}
                />
                <Button onClick={handleSignOff} disabled={!password || submitting} className="w-full">
                  {submitting ? 'Verifying…' : 'Sign Off'}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Only the assigned Solutions Consultant can sign off.
              </p>
            )}
          </div>
        ) : (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              All feasibility tabs must be complete (green) before sign-off is available.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

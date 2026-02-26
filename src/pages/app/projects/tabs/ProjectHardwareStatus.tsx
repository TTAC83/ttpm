import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useProjectHardwareSummary } from '@/hooks/useProjectHardwareSummary';
import { useHardwareSummary } from '@/hooks/useHardwareSummary';
import {
  fetchHardwareStatuses,
  upsertHardwareStatus,
  HardwareStage,
  HardwareStatusRecord,
  HardwareStatusType,
} from '@/lib/hardwareStatusService';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HardwareStatusDialog } from '@/components/HardwareStatusDialog';
import { Skeleton } from '@/components/ui/skeleton';

const stages: HardwareStage[] = ['ordered', 'configured', 'bench_tested', 'shipped', 'installed', 'validated'];

const stageLabels: Record<HardwareStage, string> = {
  ordered: 'Ordered',
  configured: 'Configured',
  bench_tested: 'Bench Tested',
  shipped: 'Shipped',
  installed: 'Installed',
  validated: 'Validated',
};

interface StatusDialogState {
  open: boolean;
  hardwareReference: string;
  stage: HardwareStage;
  hardwareType: string;
  lineName?: string;
  equipmentName?: string;
  skuModel?: string;
  currentStatus?: HardwareStatusRecord;
}

interface ProjectHardwareStatusProps {
  projectType?: 'implementation' | 'solutions';
}

export const ProjectHardwareStatus = ({ projectType = 'implementation' }: ProjectHardwareStatusProps) => {
  const { id: projectId } = useParams();
  const { toast } = useToast();
  const implHw = useProjectHardwareSummary(projectType === 'implementation' ? projectId! : '__skip__');
  const solHw = useHardwareSummary(projectType === 'solutions' ? projectId! : '__skip__');
  const hardware = projectType === 'solutions' ? solHw.hardware : implHw.hardware;
  const hardwareLoading = projectType === 'solutions' ? solHw.loading : implHw.loading;
  const [statuses, setStatuses] = useState<HardwareStatusRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogState, setDialogState] = useState<StatusDialogState>({
    open: false,
    hardwareReference: '',
    stage: 'ordered',
    hardwareType: '',
  });

  useEffect(() => {
    if (projectId) {
      loadStatuses();
    }
  }, [projectId]);

  const loadStatuses = async () => {
    try {
      setLoading(true);
      const data = await fetchHardwareStatuses(projectId!);
      setStatuses(data);
    } catch (error) {
      console.error('Error loading hardware statuses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load hardware statuses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusForStage = (hardwareReference: string, stage: HardwareStage) => {
    return statuses.find((s) => s.hardware_reference === hardwareReference && s.stage === stage);
  };

  const getStatusBadgeVariant = (status?: HardwareStatusRecord): 'default' | 'destructive' | 'secondary' => {
    if (!status) return 'secondary'; // Grey for open/no status
    if (status.status === 'complete' || status.complete_date) return 'default'; // Green
    if (status.status === 'overdue') return 'destructive'; // Red
    return 'secondary'; // Grey for open
  };

  const getStatusLabel = (status?: HardwareStatusRecord): string => {
    if (!status) return '○';
    if (status.status === 'complete' || status.complete_date) return '✓';
    if (status.status === 'overdue') return '!';
    return '○';
  };

  const handleStatusClick = (
    hardwareReference: string,
    stage: HardwareStage,
    hardwareType: string,
    lineName?: string,
    equipmentName?: string,
    skuModel?: string
  ) => {
    const currentStatus = getStatusForStage(hardwareReference, stage);
    setDialogState({
      open: true,
      hardwareReference,
      stage,
      hardwareType,
      lineName,
      equipmentName,
      skuModel,
      currentStatus,
    });
  };

  const handleSaveStatus = async (data: {
    status: HardwareStatusType;
    start_date?: string;
    complete_date?: string;
    notes?: string;
  }) => {
    try {
      await upsertHardwareStatus(
        projectId!,
        dialogState.hardwareReference,
        dialogState.stage,
        {
          ...data,
          hardware_type: dialogState.hardwareType,
          line_name: dialogState.lineName,
          equipment_name: dialogState.equipmentName,
          sku_model: dialogState.skuModel,
        }
      );
      
      toast({
        title: 'Success',
        description: 'Hardware status updated',
      });
      
      await loadStatuses();
    } catch (error) {
      console.error('Error saving status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update hardware status',
        variant: 'destructive',
      });
      throw error;
    }
  };

  if (hardwareLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Hardware Status Tracking</h2>
        <p className="text-muted-foreground">
          Track the lifecycle status of all hardware components from ordering to validation
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Type</TableHead>
              <TableHead className="w-[200px]">Line/Equipment</TableHead>
              <TableHead className="w-[150px]">SKU Model</TableHead>
              {stages.map((stage) => (
                <TableHead key={stage} className="text-center">
                  {stageLabels[stage]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {hardware.map((hw) => {
              const lineEquipment = [hw.line_name, hw.equipment_name].filter(Boolean).join(' / ');
              
              return (
                <TableRow key={hw.id}>
                  <TableCell className="font-medium">{hw.hardware_type}</TableCell>
                  <TableCell>{lineEquipment || '—'}</TableCell>
                  <TableCell>{hw.sku_no || hw.model_number || '—'}</TableCell>
                  {stages.map((stage) => {
                    const status = getStatusForStage(hw.id, stage);
                    return (
                      <TableCell key={stage} className="text-center">
                        <Badge
                          variant={getStatusBadgeVariant(status)}
                          className="cursor-pointer hover:opacity-80"
                          onClick={() =>
                            handleStatusClick(
                              hw.id,
                              stage,
                              hw.hardware_type,
                              hw.line_name,
                              hw.equipment_name,
                              hw.sku_no || hw.model_number
                            )
                          }
                        >
                          {getStatusLabel(status)}
                        </Badge>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            {hardware.length === 0 && (
              <TableRow>
                <TableCell colSpan={3 + stages.length} className="text-center text-muted-foreground">
                  No hardware found for this project
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <HardwareStatusDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState({ ...dialogState, open })}
        stage={dialogState.stage}
        hardwareType={dialogState.hardwareType}
        lineName={dialogState.lineName}
        equipmentName={dialogState.equipmentName}
        skuModel={dialogState.skuModel}
        currentStatus={dialogState.currentStatus}
        onSave={handleSaveStatus}
      />
    </div>
  );
};

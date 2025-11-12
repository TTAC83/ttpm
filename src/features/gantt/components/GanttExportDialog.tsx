/**
 * Dialog for exporting Gantt chart in various formats
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileText, Image, Code, Table } from 'lucide-react';
import { GanttExportFormat } from '../types/gantt.types';

interface GanttExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: GanttExportFormat) => Promise<void>;
  isExporting?: boolean;
}

export const GanttExportDialog: React.FC<GanttExportDialogProps> = ({
  open,
  onOpenChange,
  onExport,
  isExporting = false,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<GanttExportFormat>('pdf');

  const handleExport = async () => {
    await onExport(selectedFormat);
  };

  const formats: { value: GanttExportFormat; label: string; description: string; icon: React.ReactNode }[] = [
    {
      value: 'pdf',
      label: 'PDF - Full Timeline',
      description: 'Complete timeline with all tasks (multi-page A3)',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      value: 'png',
      label: 'PNG - High Resolution',
      description: 'High-quality image export',
      icon: <Image className="h-4 w-4" />,
    },
    {
      value: 'svg',
      label: 'SVG - Vector Graphics',
      description: 'Scalable vector format for editing',
      icon: <Code className="h-4 w-4" />,
    },
    {
      value: 'csv',
      label: 'CSV - Data Export',
      description: 'Task data for Excel/analysis',
      icon: <Table className="h-4 w-4" />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Gantt Chart</DialogTitle>
          <DialogDescription>
            Choose the export format for your project timeline
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as GanttExportFormat)}>
          <div className="space-y-3">
            {formats.map((format) => (
              <div
                key={format.value}
                className="flex items-start space-x-3 space-y-0 rounded-md border border-border p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setSelectedFormat(format.value)}
              >
                <RadioGroupItem value={format.value} id={format.value} />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={format.value}
                    className="flex items-center gap-2 font-medium cursor-pointer"
                  >
                    {format.icon}
                    {format.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {format.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              'Export'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { VisionModel } from "@/lib/visionModelsService";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, ArrowRight, Loader2 } from "lucide-react";

const VISION_MODEL_STATUSES: VisionModel['status'][] = [
  'Footage Required',
  'Annotation Required',
  'Processing Required',
  'Deployment Required',
  'Validation Required',
  'Complete'
];

interface BulkStatusChangeBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onChangeStatus: (newStatus: VisionModel['status']) => Promise<void>;
  isUpdating: boolean;
}

export function BulkStatusChangeBar({
  selectedCount,
  onClearSelection,
  onChangeStatus,
  isUpdating
}: BulkStatusChangeBarProps) {
  const [targetStatus, setTargetStatus] = useState<VisionModel['status'] | "">("");

  const handleApply = async () => {
    if (!targetStatus) return;
    await onChangeStatus(targetStatus);
    setTargetStatus("");
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg border">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">
          {selectedCount} model{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-7 px-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Move to:</span>
        <Select
          value={targetStatus}
          onValueChange={(val) => setTargetStatus(val as VisionModel['status'])}
          disabled={isUpdating}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {VISION_MODEL_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleApply}
          disabled={!targetStatus || isUpdating}
          size="sm"
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4 mr-2" />
              Apply
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

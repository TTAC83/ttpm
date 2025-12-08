import { visionModelsService } from "@/lib/visionModelsService";
import { VisionModelsTable } from "@/components/vision-models/VisionModelsTable";
import { VisionModelsTableConfig } from "@/components/vision-models/types";
import { formatDateWithOptionalTime, TimezoneMode } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

const config: VisionModelsTableConfig = {
  title: "Schedule Required",
  description: "Vision models with status \"Footage Required\" that need production run dates",
  cardTitle: "Models Requiring Schedule",
  emptyMessage: "No models found requiring schedule",
  queryKey: ['schedule-required-models'],
  queryFn: () => visionModelsService.getScheduleRequiredModels(),
  showTimezoneToggle: true,
  columns: [
    { key: 'customer_name', label: 'Customer' },
    { key: 'project_name', label: 'Project' },
    { 
      key: 'implementation_lead_name', 
      label: 'Impl Lead',
      render: (model) => model.implementation_lead_name || (
        <span className="text-muted-foreground">-</span>
      )
    },
    { key: 'line_name', label: 'Line' },
    { key: 'equipment', label: 'Equipment' },
    { key: 'product_sku', label: 'Product SKU' },
    { key: 'product_title', label: 'Product Title' },
    { key: 'use_case', label: 'Use Case' },
    { key: 'group_name', label: 'Group' },
    { 
      key: 'product_run_start', 
      label: 'Run Start',
      render: (model, timezone: TimezoneMode = 'uk') => model.product_run_start ? formatDateWithOptionalTime(model.product_run_start, model.product_run_start_has_time, timezone) : (
        <span className="text-destructive font-medium">Not set</span>
      )
    },
    { 
      key: 'product_run_end', 
      label: 'Run End',
      render: (model, timezone: TimezoneMode = 'uk') => model.product_run_end ? formatDateWithOptionalTime(model.product_run_end, model.product_run_end_has_time, timezone) : (
        <span className="text-destructive font-medium">Not set</span>
      )
    },
    {
      key: 'reschedule_count',
      label: 'Rescheduled',
      render: (model) => model.reschedule_count > 0 ? (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
          <RefreshCw className="h-3 w-3" />
          ×{model.reschedule_count}
        </Badge>
      ) : null
    },
  ],
};

export default function ScheduleRequired() {
  return <VisionModelsTable config={config} />;
}
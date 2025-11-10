import { visionModelsService } from "@/lib/visionModelsService";
import { VisionModelsTable } from "@/components/vision-models/VisionModelsTable";
import { VisionModelsTableConfig } from "@/components/vision-models/types";
import { formatDateUK } from "@/lib/dateUtils";

const config: VisionModelsTableConfig = {
  title: "Schedule Required",
  description: "Vision models with status \"Footage Required\" that need production run dates",
  cardTitle: "Models Requiring Schedule",
  emptyMessage: "No models found requiring schedule",
  queryKey: ['schedule-required-models'],
  queryFn: () => visionModelsService.getScheduleRequiredModels(),
  columns: [
    { key: 'customer_name', label: 'Customer' },
    { key: 'project_name', label: 'Project' },
    { key: 'line_name', label: 'Line' },
    { key: 'equipment', label: 'Equipment' },
    { key: 'product_sku', label: 'Product SKU' },
    { key: 'product_title', label: 'Product Title' },
    { key: 'use_case', label: 'Use Case' },
    { key: 'group_name', label: 'Group' },
    { 
      key: 'product_run_start', 
      label: 'Run Start',
      render: (model) => model.product_run_start ? formatDateUK(model.product_run_start) : (
        <span className="text-destructive font-medium">Not set</span>
      )
    },
    { 
      key: 'product_run_end', 
      label: 'Run End',
      render: (model) => model.product_run_end ? formatDateUK(model.product_run_end) : (
        <span className="text-destructive font-medium">Not set</span>
      )
    },
  ],
};

export default function ScheduleRequired() {
  return <VisionModelsTable config={config} />;
}
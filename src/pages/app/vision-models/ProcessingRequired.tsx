import { visionModelsService } from "@/lib/visionModelsService";
import { VisionModelsTable } from "@/components/vision-models/VisionModelsTable";
import { VisionModelsTableConfig } from "@/components/vision-models/types";

const config: VisionModelsTableConfig = {
  title: "Processing Required",
  description: "Vision models requiring processing",
  cardTitle: "Models Requiring Processing",
  emptyMessage: "No models requiring processing",
  queryKey: ['processing-required-models'],
  queryFn: () => visionModelsService.getModelsByStatus('Processing Required'),
  columns: [
    { key: 'customer_name', label: 'Customer' },
    { key: 'project_name', label: 'Project' },
    { key: 'line_name', label: 'Line' },
    { key: 'equipment', label: 'Equipment' },
    { key: 'product_sku', label: 'Product SKU' },
    { key: 'product_title', label: 'Product Title' },
    { key: 'use_case', label: 'Use Case' },
    { key: 'group_name', label: 'Group' },
  ],
};

export default function ProcessingRequired() {
  return <VisionModelsTable config={config} />;
}

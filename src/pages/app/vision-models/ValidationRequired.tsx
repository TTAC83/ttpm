import { visionModelsService } from "@/lib/visionModelsService";
import { VisionModelsTable } from "@/components/vision-models/VisionModelsTable";
import { VisionModelsTableConfig } from "@/components/vision-models/types";

const config: VisionModelsTableConfig = {
  title: "Validation Required",
  description: "Vision models requiring validation",
  cardTitle: "Models Requiring Validation",
  emptyMessage: "No models requiring validation",
  queryKey: ['validation-required-models'],
  queryFn: () => visionModelsService.getModelsByStatus('Validation Required'),
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

export default function ValidationRequired() {
  return <VisionModelsTable config={config} />;
}

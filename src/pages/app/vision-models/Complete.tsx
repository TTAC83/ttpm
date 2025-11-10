import { visionModelsService } from "@/lib/visionModelsService";
import { VisionModelsTable } from "@/components/vision-models/VisionModelsTable";
import { VisionModelsTableConfig } from "@/components/vision-models/types";

const config: VisionModelsTableConfig = {
  title: "Complete",
  description: "Completed vision models",
  cardTitle: "Completed Models",
  emptyMessage: "No completed models",
  queryKey: ['complete-models'],
  queryFn: () => visionModelsService.getModelsByStatus('Complete'),
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

export default function Complete() {
  return <VisionModelsTable config={config} />;
}

import { visionModelsService } from "@/lib/visionModelsService";
import { VisionModelsTable } from "@/components/vision-models/VisionModelsTable";
import { VisionModelsTableConfig } from "@/components/vision-models/types";

const config: VisionModelsTableConfig = {
  title: "Annotation Required",
  description: "Vision models requiring annotation",
  cardTitle: "Models Requiring Annotation",
  emptyMessage: "No models requiring annotation",
  queryKey: ['annotation-required-models'],
  queryFn: () => visionModelsService.getModelsByStatus('Annotation Required'),
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

export default function AnnotationRequired() {
  return <VisionModelsTable config={config} />;
}

import { VisionModel } from "@/lib/visionModelsService";
import { TimezoneMode } from "@/lib/dateUtils";

export interface VisionModelsTableColumn {
  key: keyof VisionModel;
  label: string;
  sortable?: boolean;
  render?: (model: VisionModel, timezone?: TimezoneMode) => React.ReactNode;
}

export interface VisionModelsTableConfig {
  title: string;
  description: string;
  cardTitle: string;
  emptyMessage: string;
  queryKey: string[];
  queryFn: () => Promise<VisionModel[]>;
  columns: VisionModelsTableColumn[];
  customSort?: (a: VisionModel, b: VisionModel, sortColumn: keyof VisionModel | null, sortDirection: 'asc' | 'desc' | null) => number;
  rowClassName?: (model: VisionModel) => string;
  showTimezoneToggle?: boolean;
}

import { visionModelsService, VisionModel } from "@/lib/visionModelsService";
import { VisionModelsTable } from "@/components/vision-models/VisionModelsTable";
import { VisionModelsTableConfig } from "@/components/vision-models/types";
import { formatDateWithOptionalTime, TimezoneMode } from "@/lib/dateUtils";

const config: VisionModelsTableConfig = {
  title: "Footage Required",
  description: "Vision models with status \"Footage Required\" that have production run dates set",
  cardTitle: "Models Ready for Footage",
  emptyMessage: "No models found ready for footage",
  queryKey: ['footage-required-models'],
  queryFn: () => visionModelsService.getFootageRequiredModels(),
  showTimezoneToggle: true,
  columns: [
    { key: 'customer_name', label: 'Customer' },
    { key: 'project_name', label: 'Project' },
    { 
      key: 'footage_assigned_to_name', 
      label: 'Assigned To',
      render: (model) => model.footage_assigned_to_name || (
        <span className="text-amber-600 font-medium">Unassigned</span>
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
      render: (model, timezone: TimezoneMode = 'uk') => 
        formatDateWithOptionalTime(model.product_run_start, model.product_run_start_has_time, timezone)
    },
    { 
      key: 'product_run_end', 
      label: 'Run End',
      render: (model, timezone: TimezoneMode = 'uk') => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const runStartDate = model.product_run_start ? new Date(model.product_run_start) : null;
        const runEndDate = model.product_run_end ? new Date(model.product_run_end) : null;
        if (runStartDate) runStartDate.setHours(0, 0, 0, 0);
        if (runEndDate) runEndDate.setHours(0, 0, 0, 0);
        
        const isInProductionWindow = runStartDate && runEndDate && today >= runStartDate && today <= runEndDate;
        const isOverdue = runEndDate && today > runEndDate;
        
        return (
          <span className={isInProductionWindow ? "text-green-600 font-semibold" : isOverdue ? "text-destructive font-semibold" : ""}>
            {formatDateWithOptionalTime(model.product_run_end, model.product_run_end_has_time, timezone)}
          </span>
        );
      }
    },
  ],
  customSort: (a, b, sortColumn, sortDirection) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const getStatus = (model: VisionModel) => {
      const runStartDate = model.product_run_start ? new Date(model.product_run_start) : null;
      const runEndDate = model.product_run_end ? new Date(model.product_run_end) : null;
      if (runStartDate) runStartDate.setHours(0, 0, 0, 0);
      if (runEndDate) runEndDate.setHours(0, 0, 0, 0);
      
      const isOverdue = runEndDate && today > runEndDate;
      const isInProductionWindow = runStartDate && runEndDate && today >= runStartDate && today <= runEndDate;
      
      if (isOverdue) return 0; // Red - highest priority
      if (isInProductionWindow) return 1; // Green - medium priority
      return 2; // Grey - lowest priority
    };
    
    const aStatus = getStatus(a);
    const bStatus = getStatus(b);
    
    // If using custom sorting, apply it
    if (sortColumn && sortDirection) {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' 
        ? (aVal > bVal ? 1 : -1) 
        : (aVal < bVal ? 1 : -1);
    }
    
    // Default sorting by status priority
    if (aStatus !== bStatus) {
      return aStatus - bStatus;
    }
    
    // Within same status, sort by start date
    const aStart = a.product_run_start ? new Date(a.product_run_start).getTime() : 0;
    const bStart = b.product_run_start ? new Date(b.product_run_start).getTime() : 0;
    return aStart - bStart;
  },
  rowClassName: (model) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const runStartDate = model.product_run_start ? new Date(model.product_run_start) : null;
    const runEndDate = model.product_run_end ? new Date(model.product_run_end) : null;
    if (runStartDate) runStartDate.setHours(0, 0, 0, 0);
    if (runEndDate) runEndDate.setHours(0, 0, 0, 0);
    
    const isInProductionWindow = runStartDate && runEndDate && today >= runStartDate && today <= runEndDate;
    const isOverdue = runEndDate && today > runEndDate;
    
    return isInProductionWindow ? "bg-green-500/10" : isOverdue ? "bg-destructive/10" : "";
  }
};

export default function FootageRequired() {
  return <VisionModelsTable config={config} />;
}

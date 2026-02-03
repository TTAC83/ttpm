import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { VisionModel, visionModelsService } from "@/lib/visionModelsService";
import { TimezoneMode } from "@/lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { VisionModelDialog } from "@/components/vision-models/VisionModelDialog";
import { BulkStatusChangeBar } from "@/components/vision-models/BulkStatusChangeBar";
import { VisionModelsTableConfig } from "./types";
import { toast } from "sonner";

type SortColumn = keyof VisionModel | null;
type SortDirection = 'asc' | 'desc' | null;

interface VisionModelsTableProps {
  config: VisionModelsTableConfig;
}

export function VisionModelsTable({ config }: VisionModelsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [editingModel, setEditingModel] = useState<VisionModel | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [timezone, setTimezone] = useState<TimezoneMode>('uk');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: models = [], isLoading, refetch } = useQuery({
    queryKey: config.queryKey,
    queryFn: config.queryFn,
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const filteredAndSortedModels = models
    .filter(model => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        model.customer_name?.toLowerCase().includes(search) ||
        model.project_name?.toLowerCase().includes(search) ||
        model.line_name?.toLowerCase().includes(search) ||
        model.equipment?.toLowerCase().includes(search) ||
        model.product_sku?.toLowerCase().includes(search) ||
        model.product_title?.toLowerCase().includes(search) ||
        model.use_case?.toLowerCase().includes(search) ||
        model.group_name?.toLowerCase().includes(search) ||
        model.product_run_start?.toLowerCase().includes(search) ||
        model.product_run_end?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      // Use custom sort if provided
      if (config.customSort) {
        return config.customSort(a, b, sortColumn, sortDirection);
      }

      // Default sort logic
      if (!sortColumn || !sortDirection) return 0;
      
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
    });

  const handleEdit = (model: VisionModel) => {
    setEditingModel(model);
    setIsDialogOpen(true);
  };

  const handleClose = async () => {
    await refetch();
    setIsDialogOpen(false);
    setEditingModel(null);
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredAndSortedModels.map(m => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkStatusChange = async (newStatus: VisionModel['status']) => {
    if (selectedIds.size === 0) return;
    
    setIsUpdating(true);
    try {
      await visionModelsService.bulkUpdateStatus(Array.from(selectedIds), newStatus);
      toast.success(`${selectedIds.size} model${selectedIds.size !== 1 ? 's' : ''} moved to ${newStatus}`);
      setSelectedIds(new Set());
      await refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const allSelected = filteredAndSortedModels.length > 0 && 
    filteredAndSortedModels.every(m => selectedIds.has(m.id));
  const someSelected = filteredAndSortedModels.some(m => selectedIds.has(m.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading {config.title.toLowerCase()}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {config.title} <span className="text-muted-foreground">({models.length})</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          {config.description}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{config.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Input
              placeholder="Search by customer, project, line, equipment, SKU, title, use case, or group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            {config.showTimezoneToggle !== false && (
              <div className="flex items-center gap-2">
                <Label htmlFor="timezone-toggle" className="text-sm text-muted-foreground">
                  {timezone === 'uk' ? 'UK Time' : 'Local Time'}
                </Label>
                <Switch
                  id="timezone-toggle"
                  checked={timezone === 'local'}
                  onCheckedChange={(checked) => setTimezone(checked ? 'local' : 'uk')}
                />
              </div>
            )}
          </div>

          {selectedIds.size > 0 && (
            <BulkStatusChangeBar
              selectedCount={selectedIds.size}
              onClearSelection={() => setSelectedIds(new Set())}
              onChangeStatus={handleBulkStatusChange}
              isUpdating={isUpdating}
            />
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
                      {...(someSelected && !allSelected ? { "data-state": "indeterminate" } : {})}
                    />
                  </TableHead>
                  {config.columns.map((column) => (
                    <TableHead key={column.key}>
                      {column.sortable !== false ? (
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort(column.key)} 
                          className="h-8 p-0 font-semibold hover:bg-transparent"
                        >
                          {column.label} {getSortIcon(column.key)}
                        </Button>
                      ) : (
                        <span className="font-semibold">{column.label}</span>
                      )}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedModels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={config.columns.length + 2} className="text-center text-muted-foreground py-8">
                      {config.emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedModels.map((model) => (
                    <TableRow 
                      key={model.id}
                      className={`${config.rowClassName ? config.rowClassName(model) : ""} ${selectedIds.has(model.id) ? "bg-muted/50" : ""}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(model.id)}
                          onCheckedChange={(checked) => handleSelectOne(model.id, !!checked)}
                          aria-label={`Select ${model.product_title || model.product_sku}`}
                        />
                      </TableCell>
                      {config.columns.map((column) => (
                        <TableCell 
                          key={column.key}
                          className={
                            column.key === 'customer_name' || column.key === 'project_name' 
                              ? "font-medium" 
                              : ""
                          }
                        >
                          {column.render 
                            ? column.render(model, timezone) 
                            : model[column.key] || '-'
                          }
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(model)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedModels.length} of {models.length} model{models.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {editingModel && editingModel.project_id && (
        <VisionModelDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onClose={handleClose}
          model={editingModel as any}
          projectId={editingModel.project_id}
          projectType={editingModel.project_type || 'implementation'}
          mode="edit"
        />
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { visionModelsService, VisionModel } from "@/lib/visionModelsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { VisionModelDialog } from "@/components/VisionModelDialog";

type SortColumn = keyof VisionModel | null;
type SortDirection = 'asc' | 'desc' | null;

export default function ProcessingRequired() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [editingModel, setEditingModel] = useState<VisionModel | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: models = [], isLoading, refetch } = useQuery({
    queryKey: ['processing-required-models'],
    queryFn: () => visionModelsService.getModelsByStatus('Processing Required'),
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
        model.group_name?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading processing required models...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Processing Required</h1>
        <p className="text-muted-foreground mt-2">
          Vision models requiring processing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Models Requiring Processing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by customer, project, line, equipment, SKU, title, use case, or group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('customer_name')} className="h-8 p-0 font-semibold hover:bg-transparent">
                      Customer {getSortIcon('customer_name')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('project_name')} className="h-8 p-0 font-semibold hover:bg-transparent">
                      Project {getSortIcon('project_name')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('line_name')} className="h-8 p-0 font-semibold hover:bg-transparent">
                      Line {getSortIcon('line_name')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('equipment')} className="h-8 p-0 font-semibold hover:bg-transparent">
                      Equipment {getSortIcon('equipment')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('product_sku')} className="h-8 p-0 font-semibold hover:bg-transparent">
                      Product SKU {getSortIcon('product_sku')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('product_title')} className="h-8 p-0 font-semibold hover:bg-transparent">
                      Product Title {getSortIcon('product_title')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('use_case')} className="h-8 p-0 font-semibold hover:bg-transparent">
                      Use Case {getSortIcon('use_case')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('group_name')} className="h-8 p-0 font-semibold hover:bg-transparent">
                      Group {getSortIcon('group_name')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedModels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No models requiring processing
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedModels.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">{model.customer_name}</TableCell>
                      <TableCell className="font-medium">{model.project_name}</TableCell>
                      <TableCell>{model.line_name}</TableCell>
                      <TableCell>{model.equipment}</TableCell>
                      <TableCell>{model.product_sku}</TableCell>
                      <TableCell>{model.product_title}</TableCell>
                      <TableCell>{model.use_case}</TableCell>
                      <TableCell>{model.group_name || '-'}</TableCell>
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

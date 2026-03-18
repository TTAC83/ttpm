import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AttributeDialog, type AttributeFormData } from "@/components/attributes/AttributeDialog";
import { DATA_TYPES, getUnitOptions } from "@/components/attributes/attributeConfig";

interface MasterAttribute {
  id: string;
  name: string;
  data_type: string;
  unit_of_measure: string | null;
  validation_type: string;
  default_value: string | null;
  min_value: string | null;
  max_value: string | null;
  apply_min_max_date: boolean;
  created_at: string;
  updated_at: string;
}

export default function AttributesManagement() {
  const { toast } = useToast();
  const [attributes, setAttributes] = useState<MasterAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<MasterAttribute | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("master_attributes")
        .select("*")
        .order("name");

      if (error) throw error;
      setAttributes(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch attributes",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingAttribute(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (attr: MasterAttribute) => {
    setEditingAttribute(attr);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: AttributeFormData) => {
    const payload = {
      name: data.name.trim(),
      data_type: data.data_type,
      unit_of_measure: data.unit_of_measure || null,
      validation_type: data.validation_type,
      default_value: data.default_value.trim() || null,
      min_value: data.min_value.trim() || null,
      max_value: data.max_value.trim() || null,
      apply_min_max_date: data.apply_min_max_date,
    };

    try {
      if (editingAttribute) {
        const { error } = await supabase
          .from("master_attributes")
          .update(payload)
          .eq("id", editingAttribute.id);
        if (error) throw error;
        toast({ title: "Success", description: "Attribute updated" });
      } else {
        const { error } = await supabase.from("master_attributes").insert(payload);
        if (error) throw error;
        toast({ title: "Success", description: "Attribute created" });
      }
      fetchAttributes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save attribute",
      });
      throw error; // keep dialog open on error
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase
        .from("master_attributes")
        .delete()
        .eq("id", deletingId);
      if (error) throw error;
      toast({ title: "Success", description: "Attribute deleted" });
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchAttributes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete attribute",
      });
    }
  };

  const getDataTypeLabel = (value: string) =>
    DATA_TYPES.find((dt) => dt.value === value)?.label || value;

  const getUnitLabel = (dataType: string, unitValue: string | null) => {
    if (!unitValue) return "-";
    const options = getUnitOptions(dataType);
    return options.find((o) => o.value === unitValue)?.label || unitValue;
  };

  const getValidationLabel = (value: string) => {
    const map: Record<string, string> = {
      single_value: "Single Value",
      multiple_values: "Multiple Values",
      range: "Range",
    };
    return map[value] || value;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attributes</h1>
          <p className="text-muted-foreground mt-1">
            Manage master attributes used across projects and products
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Attribute
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : attributes.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">No attributes found</p>
          <Button onClick={handleOpenAdd} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Attribute
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Data Type</TableHead>
                <TableHead>Unit of Measure</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attributes.map((attr) => (
                <TableRow key={attr.id}>
                  <TableCell className="font-medium">{attr.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getDataTypeLabel(attr.data_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getUnitLabel(attr.data_type, attr.unit_of_measure)}
                  </TableCell>
                  <TableCell>{getValidationLabel(attr.validation_type)}</TableCell>
                  <TableCell>{attr.default_value || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(attr)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingId(attr.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AttributeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        editMode={!!editingAttribute}
        initialData={
          editingAttribute
            ? {
                name: editingAttribute.name,
                data_type: editingAttribute.data_type,
                unit_of_measure: editingAttribute.unit_of_measure || "",
                validation_type: editingAttribute.validation_type,
                default_value: editingAttribute.default_value || "",
                min_value: editingAttribute.min_value || "",
                max_value: editingAttribute.max_value || "",
                apply_min_max_date: editingAttribute.apply_min_max_date,
              }
            : undefined
        }
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this attribute. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VisionUseCase {
  id: string;
  name: string;
  category: string;
  description: string | null;
  limitations_watchouts: string | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  category: string;
  description: string;
  limitations_watchouts: string;
}

export default function VisionUseCases() {
  const { toast } = useToast();
  const [useCases, setUseCases] = useState<VisionUseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    category: "",
    description: "",
    limitations_watchouts: "",
  });

  useEffect(() => {
    fetchUseCases();
  }, []);

  const fetchUseCases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vision_use_cases")
        .select("*")
        .order("name");

      if (error) throw error;
      setUseCases(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch vision use cases",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (useCase?: VisionUseCase) => {
    if (useCase) {
      setEditingId(useCase.id);
      setFormData({
        name: useCase.name,
        category: useCase.category,
        description: useCase.description || "",
        limitations_watchouts: useCase.limitations_watchouts || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        category: "",
        description: "",
        limitations_watchouts: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      category: "",
      description: "",
      limitations_watchouts: "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.category.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name and Category are required",
      });
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from("vision_use_cases")
          .update({
            name: formData.name.trim(),
            category: formData.category.trim(),
            description: formData.description.trim() || null,
            limitations_watchouts: formData.limitations_watchouts.trim() || null,
          })
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Vision use case updated successfully",
        });
      } else {
        const { error } = await supabase.from("vision_use_cases").insert({
          name: formData.name.trim(),
          category: formData.category.trim(),
          description: formData.description.trim() || null,
          limitations_watchouts: formData.limitations_watchouts.trim() || null,
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Vision use case created successfully",
        });
      }

      handleCloseDialog();
      fetchUseCases();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save vision use case",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from("vision_use_cases")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vision use case deleted successfully",
      });

      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchUseCases();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete vision use case",
      });
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const truncate = (text: string | null, maxLength: number = 100) => {
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vision Use Cases</h1>
          <p className="text-muted-foreground mt-1">
            Manage vision use cases, categories, and limitations
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Use Case
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : useCases.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">No vision use cases found</p>
          <Button onClick={() => handleOpenDialog()} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Use Case
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Limitations/Watchouts</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {useCases.map((useCase) => (
                <TableRow key={useCase.id}>
                  <TableCell className="font-medium">{useCase.name}</TableCell>
                  <TableCell>{useCase.category}</TableCell>
                  <TableCell>{truncate(useCase.description)}</TableCell>
                  <TableCell>{truncate(useCase.limitations_watchouts)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(useCase)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(useCase.id)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Vision Use Case" : "Add Vision Use Case"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the vision use case details"
                : "Create a new vision use case"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Object Detection"
              />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="e.g., Quality Control"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the use case..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="limitations">Limitations/Watchouts</Label>
              <Textarea
                id="limitations"
                value={formData.limitations_watchouts}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    limitations_watchouts: e.target.value,
                  })
                }
                placeholder="List any limitations or important watchouts..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this vision use case. This action
              cannot be undone.
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

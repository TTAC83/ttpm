import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Light {
  id: string;
  manufacturer: string;
  model_number: string;
  description?: string;
  price?: number;
  order_hyperlink?: string;
  supplier_name?: string;
  supplier_person?: string;
  supplier_email?: string;
  supplier_phone?: string;
  created_at: string;
}

const LightsManagement = () => {
  const { user } = useAuth();
  const [lights, setLights] = useState<Light[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLight, setEditingLight] = useState<Light | null>(null);
  const [formData, setFormData] = useState({
    manufacturer: "",
    model_number: "",
    description: "",
    price: "",
    order_hyperlink: "",
    supplier_name: "",
    supplier_person: "",
    supplier_email: "",
    supplier_phone: "",
  });

  const fetchLights = async () => {
    const { data, error } = await supabase
      .from('lights')
      .select('*')
      .order('manufacturer', { ascending: true });

    if (error) {
      toast.error("Error fetching lights");
      console.error(error);
    } else {
      setLights(data || []);
    }
  };

  useEffect(() => {
    fetchLights();
  }, []);

  const resetForm = () => {
    setFormData({
      manufacturer: "",
      model_number: "",
      description: "",
      price: "",
      order_hyperlink: "",
      supplier_name: "",
      supplier_person: "",
      supplier_email: "",
      supplier_phone: "",
    });
    setEditingLight(null);
  };

  const handleEdit = (light: Light) => {
    setEditingLight(light);
    setFormData({
      manufacturer: light.manufacturer,
      model_number: light.model_number,
      description: light.description || "",
      price: light.price?.toString() || "",
      order_hyperlink: light.order_hyperlink || "",
      supplier_name: light.supplier_name || "",
      supplier_person: light.supplier_person || "",
      supplier_email: light.supplier_email || "",
      supplier_phone: light.supplier_phone || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.manufacturer.trim() || !formData.model_number.trim()) {
      toast.error("Manufacturer and model number are required");
      return;
    }

    const lightData = {
      manufacturer: formData.manufacturer.trim(),
      model_number: formData.model_number.trim(),
      description: formData.description.trim() || null,
      price: formData.price ? parseFloat(formData.price) : null,
      order_hyperlink: formData.order_hyperlink.trim() || null,
      supplier_name: formData.supplier_name.trim() || null,
      supplier_person: formData.supplier_person.trim() || null,
      supplier_email: formData.supplier_email.trim() || null,
      supplier_phone: formData.supplier_phone.trim() || null,
    };

    if (editingLight) {
      const { error } = await supabase
        .from('lights')
        .update(lightData)
        .eq('id', editingLight.id);

      if (error) {
        toast.error("Error updating light");
        console.error(error);
        return;
      }
      toast.success("Light updated successfully");
    } else {
      const { error } = await supabase
        .from('lights')
        .insert([lightData]);

      if (error) {
        toast.error("Error creating light");
        console.error(error);
        return;
      }
      toast.success("Light created successfully");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchLights();
  };

  const handleDelete = async (lightId: string) => {
    if (!confirm("Are you sure you want to delete this light?")) return;

    const { error } = await supabase
      .from('lights')
      .delete()
      .eq('id', lightId);

    if (error) {
      toast.error("Error deleting light");
      console.error(error);
    } else {
      toast.success("Light deleted successfully");
      fetchLights();
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lights Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Light
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLight ? "Edit Light" : "Add New Light"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manufacturer">Manufacturer *</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="Enter manufacturer"
                />
              </div>
              <div>
                <Label htmlFor="model_number">Model Number *</Label>
                <Input
                  id="model_number"
                  value={formData.model_number}
                  onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                  placeholder="Enter model number"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Enter price"
                />
              </div>
              <div>
                <Label htmlFor="order_hyperlink">Order Hyperlink</Label>
                <Input
                  id="order_hyperlink"
                  value={formData.order_hyperlink}
                  onChange={(e) => setFormData({ ...formData, order_hyperlink: e.target.value })}
                  placeholder="Enter order link"
                />
              </div>
              <div>
                <Label htmlFor="supplier_name">Supplier Name</Label>
                <Input
                  id="supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="Enter supplier name"
                />
              </div>
              <div>
                <Label htmlFor="supplier_person">Supplier Person</Label>
                <Input
                  id="supplier_person"
                  value={formData.supplier_person}
                  onChange={(e) => setFormData({ ...formData, supplier_person: e.target.value })}
                  placeholder="Enter contact person"
                />
              </div>
              <div>
                <Label htmlFor="supplier_email">Supplier Email</Label>
                <Input
                  id="supplier_email"
                  type="email"
                  value={formData.supplier_email}
                  onChange={(e) => setFormData({ ...formData, supplier_email: e.target.value })}
                  placeholder="Enter supplier email"
                />
              </div>
              <div>
                <Label htmlFor="supplier_phone">Supplier Phone</Label>
                <Input
                  id="supplier_phone"
                  value={formData.supplier_phone}
                  onChange={(e) => setFormData({ ...formData, supplier_phone: e.target.value })}
                  placeholder="Enter supplier phone"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingLight ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lights Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Model Number</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lights.map((light) => (
                <TableRow key={light.id}>
                  <TableCell>{light.manufacturer}</TableCell>
                  <TableCell>{light.model_number}</TableCell>
                  <TableCell>{light.description || "-"}</TableCell>
                  <TableCell>{light.price ? `$${light.price}` : "-"}</TableCell>
                  <TableCell>{light.supplier_name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(light)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(light.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {lights.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No lights found. Add your first light to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LightsManagement;
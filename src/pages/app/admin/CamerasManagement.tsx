import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CameraMaster {
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
  camera_type?: string;
  created_at: string;
  updated_at: string;
}

export const CamerasManagement: React.FC = () => {
  const [cameras, setCameras] = useState<CameraMaster[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraMaster | null>(null);
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
    camera_type: "",
  });

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const { data, error } = await supabase
        .from('cameras_master')
        .select('*')
        .order('manufacturer', { ascending: true });

      if (error) throw error;
      setCameras(data || []);
    } catch (error) {
      console.error('Error fetching cameras:', error);
      toast.error('Failed to fetch cameras');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.manufacturer || !formData.model_number) {
      toast.error('Manufacturer and model number are required');
      return;
    }

    try {
      const cameraData = {
        manufacturer: formData.manufacturer,
        model_number: formData.model_number,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        order_hyperlink: formData.order_hyperlink || null,
        supplier_name: formData.supplier_name || null,
        supplier_person: formData.supplier_person || null,
        supplier_email: formData.supplier_email || null,
        supplier_phone: formData.supplier_phone || null,
        camera_type: formData.camera_type || null,
      };

      if (editingCamera) {
        const { error } = await supabase
          .from('cameras_master')
          .update(cameraData)
          .eq('id', editingCamera.id);

        if (error) throw error;
        toast.success('Camera updated successfully');
      } else {
        const { error } = await supabase
          .from('cameras_master')
          .insert([cameraData]);

        if (error) throw error;
        toast.success('Camera added successfully');
      }

      resetForm();
      setIsDialogOpen(false);
      fetchCameras();
    } catch (error) {
      console.error('Error saving camera:', error);
      toast.error('Failed to save camera');
    }
  };

  const handleEdit = (camera: CameraMaster) => {
    setEditingCamera(camera);
    setFormData({
      manufacturer: camera.manufacturer,
      model_number: camera.model_number,
      description: camera.description || "",
      price: camera.price?.toString() || "",
      order_hyperlink: camera.order_hyperlink || "",
      supplier_name: camera.supplier_name || "",
      supplier_person: camera.supplier_person || "",
      supplier_email: camera.supplier_email || "",
      supplier_phone: camera.supplier_phone || "",
      camera_type: camera.camera_type || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this camera?')) return;

    try {
      const { error } = await supabase
        .from('cameras_master')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Camera deleted successfully');
      fetchCameras();
    } catch (error) {
      console.error('Error deleting camera:', error);
      toast.error('Failed to delete camera');
    }
  };

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
      camera_type: "",
    });
    setEditingCamera(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Cameras Management
              </CardTitle>
              <CardDescription>
                Manage camera master data including specifications and supplier information
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Camera
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCamera ? 'Edit Camera' : 'Add New Camera'}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="manufacturer">Manufacturer *</Label>
                      <Input
                        id="manufacturer"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        placeholder="Enter manufacturer"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="model_number">Model Number *</Label>
                      <Input
                        id="model_number"
                        value={formData.model_number}
                        onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                        placeholder="Enter model number"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="camera_type">Camera Type</Label>
                      <Input
                        id="camera_type"
                        value={formData.camera_type}
                        onChange={(e) => setFormData({ ...formData, camera_type: e.target.value })}
                        placeholder="e.g., Industrial, PTZ, Fixed"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter camera description"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="order_hyperlink">Order Link</Label>
                      <Input
                        id="order_hyperlink"
                        value={formData.order_hyperlink}
                        onChange={(e) => setFormData({ ...formData, order_hyperlink: e.target.value })}
                        placeholder="Enter order URL (e.g., https://example.com)"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Supplier Information</h3>
                    <div className="grid grid-cols-2 gap-4">
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
                        <Label htmlFor="supplier_person">Contact Person</Label>
                        <Input
                          id="supplier_person"
                          value={formData.supplier_person}
                          onChange={(e) => setFormData({ ...formData, supplier_person: e.target.value })}
                          placeholder="Enter contact person"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="supplier_email">Email</Label>
                        <Input
                          id="supplier_email"
                          type="email"
                          value={formData.supplier_email}
                          onChange={(e) => setFormData({ ...formData, supplier_email: e.target.value })}
                          placeholder="Enter email"
                        />
                      </div>
                      <div>
                        <Label htmlFor="supplier_phone">Phone</Label>
                        <Input
                          id="supplier_phone"
                          value={formData.supplier_phone}
                          onChange={(e) => setFormData({ ...formData, supplier_phone: e.target.value })}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingCamera ? 'Update Camera' : 'Add Camera'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Lens Hardware</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cameras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No cameras found. Add your first camera to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  cameras.map((camera) => (
                    <TableRow key={camera.id}>
                      <TableCell className="font-medium">{camera.manufacturer}</TableCell>
                      <TableCell>{camera.model_number}</TableCell>
                      <TableCell>
                        {camera.camera_type && (
                          <Badge variant="outline">{camera.camera_type}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Separate Hardware</Badge>
                      </TableCell>
                      <TableCell>
                        {camera.price && `$${camera.price.toFixed(2)}`}
                      </TableCell>
                      <TableCell>{camera.supplier_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(camera)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(camera.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
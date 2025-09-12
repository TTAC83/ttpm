import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Focus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LensMaster {
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
  lens_type?: string;
  focal_length?: string;
  aperture?: string;
  created_at: string;
  updated_at: string;
}

export const LensManagement: React.FC = () => {
  const [lenses, setLenses] = useState<LensMaster[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLens, setEditingLens] = useState<LensMaster | null>(null);
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
    lens_type: "",
    focal_length: "",
    aperture: "",
  });

  useEffect(() => {
    fetchLenses();
  }, []);

  const fetchLenses = async () => {
    try {
      const { data, error } = await supabase
        .from('lens_master')
        .select('*')
        .order('manufacturer', { ascending: true });

      if (error) throw error;
      setLenses(data || []);
    } catch (error) {
      console.error('Error fetching lenses:', error);
      toast.error('Failed to fetch lenses');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.manufacturer || !formData.model_number) {
      toast.error('Manufacturer and model number are required');
      return;
    }

    try {
      const lensData = {
        manufacturer: formData.manufacturer,
        model_number: formData.model_number,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        order_hyperlink: formData.order_hyperlink || null,
        supplier_name: formData.supplier_name || null,
        supplier_person: formData.supplier_person || null,
        supplier_email: formData.supplier_email || null,
        supplier_phone: formData.supplier_phone || null,
        lens_type: formData.lens_type || null,
        focal_length: formData.focal_length || null,
        aperture: formData.aperture || null,
      };

      if (editingLens) {
        const { error } = await supabase
          .from('lens_master')
          .update(lensData)
          .eq('id', editingLens.id);

        if (error) throw error;
        toast.success('Lens updated successfully');
      } else {
        const { error } = await supabase
          .from('lens_master')
          .insert([lensData]);

        if (error) throw error;
        toast.success('Lens added successfully');
      }

      resetForm();
      setIsDialogOpen(false);
      fetchLenses();
    } catch (error) {
      console.error('Error saving lens:', error);
      toast.error('Failed to save lens');
    }
  };

  const handleEdit = (lens: LensMaster) => {
    setEditingLens(lens);
    setFormData({
      manufacturer: lens.manufacturer,
      model_number: lens.model_number,
      description: lens.description || "",
      price: lens.price?.toString() || "",
      order_hyperlink: lens.order_hyperlink || "",
      supplier_name: lens.supplier_name || "",
      supplier_person: lens.supplier_person || "",
      supplier_email: lens.supplier_email || "",
      supplier_phone: lens.supplier_phone || "",
      lens_type: lens.lens_type || "",
      focal_length: lens.focal_length || "",
      aperture: lens.aperture || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lens?')) return;

    try {
      const { error } = await supabase
        .from('lens_master')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Lens deleted successfully');
      fetchLenses();
    } catch (error) {
      console.error('Error deleting lens:', error);
      toast.error('Failed to delete lens');
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
      lens_type: "",
      focal_length: "",
      aperture: "",
    });
    setEditingLens(null);
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
                <Focus className="h-5 w-5" />
                Lens Management
              </CardTitle>
              <CardDescription>
                Manage lens master data including specifications and supplier information
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lens
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingLens ? 'Edit Lens' : 'Add New Lens'}
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

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="lens_type">Lens Type</Label>
                      <Input
                        id="lens_type"
                        value={formData.lens_type}
                        onChange={(e) => setFormData({ ...formData, lens_type: e.target.value })}
                        placeholder="e.g., Wide Angle, Telephoto"
                      />
                    </div>
                    <div>
                      <Label htmlFor="focal_length">Focal Length</Label>
                      <Input
                        id="focal_length"
                        value={formData.focal_length}
                        onChange={(e) => setFormData({ ...formData, focal_length: e.target.value })}
                        placeholder="e.g., 50mm, 24-70mm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="aperture">Aperture</Label>
                      <Input
                        id="aperture"
                        value={formData.aperture}
                        onChange={(e) => setFormData({ ...formData, aperture: e.target.value })}
                        placeholder="e.g., f/1.4, f/2.8"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter lens description"
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
                      {editingLens ? 'Update Lens' : 'Add Lens'}
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
                  <TableHead>Specs</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No lenses found. Add your first lens to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  lenses.map((lens) => (
                    <TableRow key={lens.id}>
                      <TableCell className="font-medium">{lens.manufacturer}</TableCell>
                      <TableCell>{lens.model_number}</TableCell>
                      <TableCell>
                        {lens.lens_type && (
                          <Badge variant="outline">{lens.lens_type}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {lens.focal_length && (
                            <Badge variant="secondary" className="text-xs">{lens.focal_length}</Badge>
                          )}
                          {lens.aperture && (
                            <Badge variant="secondary" className="text-xs">{lens.aperture}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lens.price && `$${lens.price.toFixed(2)}`}
                      </TableCell>
                      <TableCell>{lens.supplier_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(lens)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(lens.id)}
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
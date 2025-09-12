import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlcMaster {
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
  plc_type?: string;
  input_output_count?: string;
  communication_protocol?: string;
  created_at: string;
  updated_at: string;
}

export const PlcManagement: React.FC = () => {
  const [plcs, setPlcs] = useState<PlcMaster[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlc, setEditingPlc] = useState<PlcMaster | null>(null);
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
    plc_type: "",
    input_output_count: "",
    communication_protocol: "",
  });

  useEffect(() => {
    fetchPlcs();
  }, []);

  const fetchPlcs = async () => {
    try {
      const { data, error } = await supabase
        .from('plc_master')
        .select('*')
        .order('manufacturer', { ascending: true });

      if (error) throw error;
      setPlcs(data || []);
    } catch (error) {
      console.error('Error fetching PLCs:', error);
      toast.error('Failed to fetch PLCs');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.manufacturer || !formData.model_number) {
      toast.error('Manufacturer and model number are required');
      return;
    }

    try {
      const plcData = {
        manufacturer: formData.manufacturer,
        model_number: formData.model_number,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        order_hyperlink: formData.order_hyperlink || null,
        supplier_name: formData.supplier_name || null,
        supplier_person: formData.supplier_person || null,
        supplier_email: formData.supplier_email || null,
        supplier_phone: formData.supplier_phone || null,
        plc_type: formData.plc_type || null,
        input_output_count: formData.input_output_count || null,
        communication_protocol: formData.communication_protocol || null,
      };

      if (editingPlc) {
        const { error } = await supabase
          .from('plc_master')
          .update(plcData)
          .eq('id', editingPlc.id);

        if (error) throw error;
        toast.success('PLC updated successfully');
      } else {
        const { error } = await supabase
          .from('plc_master')
          .insert([plcData]);

        if (error) throw error;
        toast.success('PLC added successfully');
      }

      resetForm();
      setIsDialogOpen(false);
      fetchPlcs();
    } catch (error) {
      console.error('Error saving PLC:', error);
      toast.error('Failed to save PLC');
    }
  };

  const handleEdit = (plc: PlcMaster) => {
    setEditingPlc(plc);
    setFormData({
      manufacturer: plc.manufacturer,
      model_number: plc.model_number,
      description: plc.description || "",
      price: plc.price?.toString() || "",
      order_hyperlink: plc.order_hyperlink || "",
      supplier_name: plc.supplier_name || "",
      supplier_person: plc.supplier_person || "",
      supplier_email: plc.supplier_email || "",
      supplier_phone: plc.supplier_phone || "",
      plc_type: plc.plc_type || "",
      input_output_count: plc.input_output_count || "",
      communication_protocol: plc.communication_protocol || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PLC?')) return;

    try {
      const { error } = await supabase
        .from('plc_master')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('PLC deleted successfully');
      fetchPlcs();
    } catch (error) {
      console.error('Error deleting PLC:', error);
      toast.error('Failed to delete PLC');
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
      plc_type: "",
      input_output_count: "",
      communication_protocol: "",
    });
    setEditingPlc(null);
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
                <Cpu className="h-5 w-5" />
                PLC Management
              </CardTitle>
              <CardDescription>
                Manage PLC master data including specifications and supplier information
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add PLC
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPlc ? 'Edit PLC' : 'Add New PLC'}
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
                      <Label htmlFor="plc_type">PLC Type</Label>
                      <Input
                        id="plc_type"
                        value={formData.plc_type}
                        onChange={(e) => setFormData({ ...formData, plc_type: e.target.value })}
                        placeholder="e.g., Compact, Modular"
                      />
                    </div>
                    <div>
                      <Label htmlFor="input_output_count">Outputs Count</Label>
                      <Input
                        id="input_output_count"
                        value={formData.input_output_count}
                        onChange={(e) => setFormData({ ...formData, input_output_count: e.target.value })}
                        placeholder="e.g., 16DI/16DO"
                      />
                    </div>
                    <div>
                      <Label htmlFor="communication_protocol">Protocol</Label>
                      <Input
                        id="communication_protocol"
                        value={formData.communication_protocol}
                        onChange={(e) => setFormData({ ...formData, communication_protocol: e.target.value })}
                        placeholder="e.g., Ethernet/IP, Modbus"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter PLC description"
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
                      {editingPlc ? 'Update PLC' : 'Add PLC'}
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
                  <TableHead>Outputs</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plcs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No PLCs found. Add your first PLC to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  plcs.map((plc) => (
                    <TableRow key={plc.id}>
                      <TableCell className="font-medium">{plc.manufacturer}</TableCell>
                      <TableCell>{plc.model_number}</TableCell>
                      <TableCell>
                        {plc.plc_type && (
                          <Badge variant="outline">{plc.plc_type}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {plc.input_output_count && (
                          <Badge variant="secondary" className="text-xs">{plc.input_output_count}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {plc.communication_protocol && (
                          <Badge variant="secondary" className="text-xs">{plc.communication_protocol}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {plc.price && `$${plc.price.toFixed(2)}`}
                      </TableCell>
                      <TableCell>{plc.supplier_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(plc)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(plc.id)}
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
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Router } from "lucide-react";

interface GatewayMaster {
  id: string;
  manufacturer: string;
  model_number: string;
  gateway_type?: string;
  communication_protocols?: string;
  connection_types?: string;
  max_devices?: number;
  power_requirements?: string;
  description?: string;
  price?: number;
  supplier_name?: string;
  supplier_person?: string;
  supplier_email?: string;
  supplier_phone?: string;
  order_hyperlink?: string;
}

export default function GatewaysManagement() {
  const [gateways, setGateways] = useState<GatewayMaster[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<GatewayMaster | null>(null);
  const [formData, setFormData] = useState({
    manufacturer: "",
    model_number: "",
    gateway_type: "",
    communication_protocols: "",
    connection_types: "",
    max_devices: "",
    power_requirements: "",
    description: "",
    price: "",
    supplier_name: "",
    supplier_person: "",
    supplier_email: "",
    supplier_phone: "",
    order_hyperlink: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      const { data, error } = await supabase
        .from("gateways_master")
        .select("*")
        .order("manufacturer", { ascending: true });

      if (error) throw error;
      setGateways(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching gateways",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const gatewayData = {
        manufacturer: formData.manufacturer,
        model_number: formData.model_number,
        gateway_type: formData.gateway_type || null,
        communication_protocols: formData.communication_protocols || null,
        connection_types: formData.connection_types || null,
        max_devices: formData.max_devices ? parseInt(formData.max_devices) : null,
        power_requirements: formData.power_requirements || null,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        supplier_name: formData.supplier_name || null,
        supplier_person: formData.supplier_person || null,
        supplier_email: formData.supplier_email || null,
        supplier_phone: formData.supplier_phone || null,
        order_hyperlink: formData.order_hyperlink || null,
      };

      if (editingGateway) {
        const { error } = await supabase
          .from("gateways_master")
          .update(gatewayData)
          .eq("id", editingGateway.id);

        if (error) throw error;
        toast({ title: "Gateway updated successfully" });
      } else {
        const { error } = await supabase
          .from("gateways_master")
          .insert([gatewayData]);

        if (error) throw error;
        toast({ title: "Gateway added successfully" });
      }

      setIsDialogOpen(false);
      setEditingGateway(null);
      resetForm();
      fetchGateways();
    } catch (error: any) {
      toast({
        title: "Error saving gateway",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (gateway: GatewayMaster) => {
    setEditingGateway(gateway);
    setFormData({
      manufacturer: gateway.manufacturer,
      model_number: gateway.model_number,
      gateway_type: gateway.gateway_type || "",
      communication_protocols: gateway.communication_protocols || "",
      connection_types: gateway.connection_types || "",
      max_devices: gateway.max_devices?.toString() || "",
      power_requirements: gateway.power_requirements || "",
      description: gateway.description || "",
      price: gateway.price?.toString() || "",
      supplier_name: gateway.supplier_name || "",
      supplier_person: gateway.supplier_person || "",
      supplier_email: gateway.supplier_email || "",
      supplier_phone: gateway.supplier_phone || "",
      order_hyperlink: gateway.order_hyperlink || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gateway?")) return;

    try {
      const { error } = await supabase
        .from("gateways_master")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Gateway deleted successfully" });
      fetchGateways();
    } catch (error: any) {
      toast({
        title: "Error deleting gateway",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      manufacturer: "",
      model_number: "",
      gateway_type: "",
      communication_protocols: "",
      connection_types: "",
      max_devices: "",
      power_requirements: "",
      description: "",
      price: "",
      supplier_name: "",
      supplier_person: "",
      supplier_email: "",
      supplier_phone: "",
      order_hyperlink: "",
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingGateway(null);
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gateways Management</h1>
          <p className="text-muted-foreground">
            Manage your gateway master data catalog
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Gateway
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGateway ? "Edit Gateway" : "Add New Gateway"}
              </DialogTitle>
              <DialogDescription>
                {editingGateway
                  ? "Update the gateway information below."
                  : "Enter the gateway details below."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manufacturer">Manufacturer *</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) =>
                      setFormData({ ...formData, manufacturer: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="model_number">Model Number *</Label>
                  <Input
                    id="model_number"
                    value={formData.model_number}
                    onChange={(e) =>
                      setFormData({ ...formData, model_number: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gateway_type">Gateway Type</Label>
                  <Input
                    id="gateway_type"
                    value={formData.gateway_type}
                    onChange={(e) =>
                      setFormData({ ...formData, gateway_type: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="max_devices">Max Devices</Label>
                  <Input
                    id="max_devices"
                    type="number"
                    value={formData.max_devices}
                    onChange={(e) =>
                      setFormData({ ...formData, max_devices: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="communication_protocols">Communication Protocols</Label>
                  <Input
                    id="communication_protocols"
                    value={formData.communication_protocols}
                    onChange={(e) =>
                      setFormData({ ...formData, communication_protocols: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="connection_types">Connection Types</Label>
                  <Input
                    id="connection_types"
                    value={formData.connection_types}
                    onChange={(e) =>
                      setFormData({ ...formData, connection_types: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="power_requirements">Power Requirements</Label>
                <Input
                  id="power_requirements"
                  value={formData.power_requirements}
                  onChange={(e) =>
                    setFormData({ ...formData, power_requirements: e.target.value })
                  }
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
                />
              </div>

              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier_name">Supplier Name</Label>
                  <Input
                    id="supplier_name"
                    value={formData.supplier_name}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="supplier_person">Supplier Contact Person</Label>
                  <Input
                    id="supplier_person"
                    value={formData.supplier_person}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_person: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier_email">Supplier Email</Label>
                  <Input
                    id="supplier_email"
                    type="email"
                    value={formData.supplier_email}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="supplier_phone">Supplier Phone</Label>
                  <Input
                    id="supplier_phone"
                    value={formData.supplier_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="order_hyperlink">Order Link</Label>
                <Input
                  id="order_hyperlink"
                  type="url"
                  value={formData.order_hyperlink}
                  onChange={(e) =>
                    setFormData({ ...formData, order_hyperlink: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingGateway ? "Update" : "Add"} Gateway
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Router className="h-5 w-5" />
            Gateways Catalog
          </CardTitle>
          <CardDescription>
            All available gateways in the master database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Protocols</TableHead>
                  <TableHead>Max Devices</TableHead>
                  <TableHead>Power</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gateways.map((gateway) => (
                  <TableRow key={gateway.id}>
                    <TableCell className="font-medium">
                      {gateway.manufacturer}
                    </TableCell>
                    <TableCell>{gateway.model_number}</TableCell>
                    <TableCell>
                      {gateway.gateway_type && (
                        <Badge variant="secondary">{gateway.gateway_type}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{gateway.communication_protocols}</TableCell>
                    <TableCell>{gateway.max_devices}</TableCell>
                    <TableCell>{gateway.power_requirements}</TableCell>
                    <TableCell>
                      {gateway.price && `$${gateway.price.toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{gateway.supplier_name}</div>
                        {gateway.supplier_person && (
                          <div className="text-muted-foreground">
                            {gateway.supplier_person}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(gateway)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(gateway.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
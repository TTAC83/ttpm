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
import { Plus, Pencil, Trash2, Radio } from "lucide-react";

interface ReceiverMaster {
  id: string;
  manufacturer: string;
  model_number: string;
  receiver_type?: string;
  frequency_range?: string;
  communication_protocol?: string;
  range_distance?: string;
  power_requirements?: string;
  description?: string;
  price?: number;
  supplier_name?: string;
  supplier_person?: string;
  supplier_email?: string;
  supplier_phone?: string;
  order_hyperlink?: string;
}

export default function ReceiversManagement() {
  const [receivers, setReceivers] = useState<ReceiverMaster[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReceiver, setEditingReceiver] = useState<ReceiverMaster | null>(null);
  const [formData, setFormData] = useState({
    manufacturer: "",
    model_number: "",
    receiver_type: "",
    frequency_range: "",
    communication_protocol: "",
    range_distance: "",
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
    fetchReceivers();
  }, []);

  const fetchReceivers = async () => {
    try {
      const { data, error } = await supabase
        .from("receivers_master")
        .select("*")
        .order("manufacturer", { ascending: true });

      if (error) throw error;
      setReceivers(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching receivers",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const receiverData = {
        manufacturer: formData.manufacturer,
        model_number: formData.model_number,
        receiver_type: formData.receiver_type || null,
        frequency_range: formData.frequency_range || null,
        communication_protocol: formData.communication_protocol || null,
        range_distance: formData.range_distance || null,
        power_requirements: formData.power_requirements || null,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        supplier_name: formData.supplier_name || null,
        supplier_person: formData.supplier_person || null,
        supplier_email: formData.supplier_email || null,
        supplier_phone: formData.supplier_phone || null,
        order_hyperlink: formData.order_hyperlink || null,
      };

      if (editingReceiver) {
        const { error } = await supabase
          .from("receivers_master")
          .update(receiverData)
          .eq("id", editingReceiver.id);

        if (error) throw error;
        toast({ title: "Receiver updated successfully" });
      } else {
        const { error } = await supabase
          .from("receivers_master")
          .insert([receiverData]);

        if (error) throw error;
        toast({ title: "Receiver added successfully" });
      }

      setIsDialogOpen(false);
      setEditingReceiver(null);
      resetForm();
      fetchReceivers();
    } catch (error: any) {
      toast({
        title: "Error saving receiver",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (receiver: ReceiverMaster) => {
    setEditingReceiver(receiver);
    setFormData({
      manufacturer: receiver.manufacturer,
      model_number: receiver.model_number,
      receiver_type: receiver.receiver_type || "",
      frequency_range: receiver.frequency_range || "",
      communication_protocol: receiver.communication_protocol || "",
      range_distance: receiver.range_distance || "",
      power_requirements: receiver.power_requirements || "",
      description: receiver.description || "",
      price: receiver.price?.toString() || "",
      supplier_name: receiver.supplier_name || "",
      supplier_person: receiver.supplier_person || "",
      supplier_email: receiver.supplier_email || "",
      supplier_phone: receiver.supplier_phone || "",
      order_hyperlink: receiver.order_hyperlink || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this receiver?")) return;

    try {
      const { error } = await supabase
        .from("receivers_master")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Receiver deleted successfully" });
      fetchReceivers();
    } catch (error: any) {
      toast({
        title: "Error deleting receiver",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      manufacturer: "",
      model_number: "",
      receiver_type: "",
      frequency_range: "",
      communication_protocol: "",
      range_distance: "",
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
      setEditingReceiver(null);
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receivers Management</h1>
          <p className="text-muted-foreground">
            Manage your receiver master data catalog
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Receiver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingReceiver ? "Edit Receiver" : "Add New Receiver"}
              </DialogTitle>
              <DialogDescription>
                {editingReceiver
                  ? "Update the receiver information below."
                  : "Enter the receiver details below."}
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
                  <Label htmlFor="receiver_type">Receiver Type</Label>
                  <Input
                    id="receiver_type"
                    value={formData.receiver_type}
                    onChange={(e) =>
                      setFormData({ ...formData, receiver_type: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="communication_protocol">Communication Protocol</Label>
                  <Input
                    id="communication_protocol"
                    value={formData.communication_protocol}
                    onChange={(e) =>
                      setFormData({ ...formData, communication_protocol: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency_range">Frequency Range</Label>
                  <Input
                    id="frequency_range"
                    value={formData.frequency_range}
                    onChange={(e) =>
                      setFormData({ ...formData, frequency_range: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="range_distance">Range Distance</Label>
                  <Input
                    id="range_distance"
                    value={formData.range_distance}
                    onChange={(e) =>
                      setFormData({ ...formData, range_distance: e.target.value })
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
                  {editingReceiver ? "Update" : "Add"} Receiver
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Receivers Catalog
          </CardTitle>
          <CardDescription>
            All available receivers in the master database
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
                  <TableHead>Frequency</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Power</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivers.map((receiver) => (
                  <TableRow key={receiver.id}>
                    <TableCell className="font-medium">
                      {receiver.manufacturer}
                    </TableCell>
                    <TableCell>{receiver.model_number}</TableCell>
                    <TableCell>
                      {receiver.receiver_type && (
                        <Badge variant="secondary">{receiver.receiver_type}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{receiver.frequency_range}</TableCell>
                    <TableCell>{receiver.communication_protocol}</TableCell>
                    <TableCell>{receiver.range_distance}</TableCell>
                    <TableCell>{receiver.power_requirements}</TableCell>
                    <TableCell>
                      {receiver.price && `$${receiver.price.toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{receiver.supplier_name}</div>
                        {receiver.supplier_person && (
                          <div className="text-muted-foreground">
                            {receiver.supplier_person}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(receiver)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(receiver.id)}
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
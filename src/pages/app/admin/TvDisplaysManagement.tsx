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
import { Plus, Pencil, Trash2, Monitor } from "lucide-react";

interface TvDisplayMaster {
  id: string;
  manufacturer: string;
  model_number: string;
  screen_size?: string;
  resolution?: string;
  display_type?: string;
  connectivity_options?: string;
  mounting_type?: string;
  power_consumption?: string;
  description?: string;
  price?: number;
  supplier_name?: string;
  supplier_person?: string;
  supplier_email?: string;
  supplier_phone?: string;
  order_hyperlink?: string;
}

export default function TvDisplaysManagement() {
  const [tvDisplays, setTvDisplays] = useState<TvDisplayMaster[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTvDisplay, setEditingTvDisplay] = useState<TvDisplayMaster | null>(null);
  const [formData, setFormData] = useState({
    manufacturer: "",
    model_number: "",
    screen_size: "",
    resolution: "",
    display_type: "",
    connectivity_options: "",
    mounting_type: "",
    power_consumption: "",
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
    fetchTvDisplays();
  }, []);

  const fetchTvDisplays = async () => {
    try {
      const { data, error } = await supabase
        .from("tv_displays_master")
        .select("*")
        .order("manufacturer", { ascending: true });

      if (error) throw error;
      setTvDisplays(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching TV displays",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const tvDisplayData = {
        manufacturer: formData.manufacturer,
        model_number: formData.model_number,
        screen_size: formData.screen_size || null,
        resolution: formData.resolution || null,
        display_type: formData.display_type || null,
        connectivity_options: formData.connectivity_options || null,
        mounting_type: formData.mounting_type || null,
        power_consumption: formData.power_consumption || null,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        supplier_name: formData.supplier_name || null,
        supplier_person: formData.supplier_person || null,
        supplier_email: formData.supplier_email || null,
        supplier_phone: formData.supplier_phone || null,
        order_hyperlink: formData.order_hyperlink || null,
      };

      if (editingTvDisplay) {
        const { error } = await supabase
          .from("tv_displays_master")
          .update(tvDisplayData)
          .eq("id", editingTvDisplay.id);

        if (error) throw error;
        toast({ title: "TV display updated successfully" });
      } else {
        const { error } = await supabase
          .from("tv_displays_master")
          .insert([tvDisplayData]);

        if (error) throw error;
        toast({ title: "TV display added successfully" });
      }

      setIsDialogOpen(false);
      setEditingTvDisplay(null);
      resetForm();
      fetchTvDisplays();
    } catch (error: any) {
      toast({
        title: "Error saving TV display",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (tvDisplay: TvDisplayMaster) => {
    setEditingTvDisplay(tvDisplay);
    setFormData({
      manufacturer: tvDisplay.manufacturer,
      model_number: tvDisplay.model_number,
      screen_size: tvDisplay.screen_size || "",
      resolution: tvDisplay.resolution || "",
      display_type: tvDisplay.display_type || "",
      connectivity_options: tvDisplay.connectivity_options || "",
      mounting_type: tvDisplay.mounting_type || "",
      power_consumption: tvDisplay.power_consumption || "",
      description: tvDisplay.description || "",
      price: tvDisplay.price?.toString() || "",
      supplier_name: tvDisplay.supplier_name || "",
      supplier_person: tvDisplay.supplier_person || "",
      supplier_email: tvDisplay.supplier_email || "",
      supplier_phone: tvDisplay.supplier_phone || "",
      order_hyperlink: tvDisplay.order_hyperlink || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this TV display?")) return;

    try {
      const { error } = await supabase
        .from("tv_displays_master")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "TV display deleted successfully" });
      fetchTvDisplays();
    } catch (error: any) {
      toast({
        title: "Error deleting TV display",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      manufacturer: "",
      model_number: "",
      screen_size: "",
      resolution: "",
      display_type: "",
      connectivity_options: "",
      mounting_type: "",
      power_consumption: "",
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
      setEditingTvDisplay(null);
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TV Displays Management</h1>
          <p className="text-muted-foreground">
            Manage your TV display master data catalog
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add TV Display
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTvDisplay ? "Edit TV Display" : "Add New TV Display"}
              </DialogTitle>
              <DialogDescription>
                {editingTvDisplay
                  ? "Update the TV display information below."
                  : "Enter the TV display details below."}
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="screen_size">Screen Size</Label>
                  <Input
                    id="screen_size"
                    value={formData.screen_size}
                    onChange={(e) =>
                      setFormData({ ...formData, screen_size: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="resolution">Resolution</Label>
                  <Input
                    id="resolution"
                    value={formData.resolution}
                    onChange={(e) =>
                      setFormData({ ...formData, resolution: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="display_type">Display Type</Label>
                  <Input
                    id="display_type"
                    value={formData.display_type}
                    onChange={(e) =>
                      setFormData({ ...formData, display_type: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="connectivity_options">Connectivity Options</Label>
                  <Input
                    id="connectivity_options"
                    value={formData.connectivity_options}
                    onChange={(e) =>
                      setFormData({ ...formData, connectivity_options: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="mounting_type">Mounting Type</Label>
                  <Input
                    id="mounting_type"
                    value={formData.mounting_type}
                    onChange={(e) =>
                      setFormData({ ...formData, mounting_type: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="power_consumption">Power Consumption</Label>
                <Input
                  id="power_consumption"
                  value={formData.power_consumption}
                  onChange={(e) =>
                    setFormData({ ...formData, power_consumption: e.target.value })
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
                  {editingTvDisplay ? "Update" : "Add"} TV Display
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            TV Displays Catalog
          </CardTitle>
          <CardDescription>
            All available TV displays in the master database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Resolution</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Connectivity</TableHead>
                  <TableHead>Mounting</TableHead>
                  <TableHead>Power</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tvDisplays.map((tvDisplay) => (
                  <TableRow key={tvDisplay.id}>
                    <TableCell className="font-medium">
                      {tvDisplay.manufacturer}
                    </TableCell>
                    <TableCell>{tvDisplay.model_number}</TableCell>
                    <TableCell>{tvDisplay.screen_size}</TableCell>
                    <TableCell>{tvDisplay.resolution}</TableCell>
                    <TableCell>
                      {tvDisplay.display_type && (
                        <Badge variant="secondary">{tvDisplay.display_type}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{tvDisplay.connectivity_options}</TableCell>
                    <TableCell>{tvDisplay.mounting_type}</TableCell>
                    <TableCell>{tvDisplay.power_consumption}</TableCell>
                    <TableCell>
                      {tvDisplay.price && `$${tvDisplay.price.toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{tvDisplay.supplier_name}</div>
                        {tvDisplay.supplier_person && (
                          <div className="text-muted-foreground">
                            {tvDisplay.supplier_person}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(tvDisplay)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tvDisplay.id)}
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
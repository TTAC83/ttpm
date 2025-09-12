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
import { Plus, Pencil, Trash2, Server } from "lucide-react";

interface ServerMaster {
  id: string;
  manufacturer: string;
  model_number: string;
  server_type?: string;
  cpu_specs?: string;
  ram_specs?: string;
  storage_specs?: string;
  operating_system?: string;
  description?: string;
  price?: number;
  supplier_name?: string;
  supplier_person?: string;
  supplier_email?: string;
  supplier_phone?: string;
  order_hyperlink?: string;
}

export default function ServersManagement() {
  const [servers, setServers] = useState<ServerMaster[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerMaster | null>(null);
  const [formData, setFormData] = useState({
    manufacturer: "",
    model_number: "",
    server_type: "",
    cpu_specs: "",
    ram_specs: "",
    storage_specs: "",
    operating_system: "",
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
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from("servers_master")
        .select("*")
        .order("manufacturer", { ascending: true });

      if (error) throw error;
      setServers(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching servers",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const serverData = {
        manufacturer: formData.manufacturer,
        model_number: formData.model_number,
        server_type: formData.server_type || null,
        cpu_specs: formData.cpu_specs || null,
        ram_specs: formData.ram_specs || null,
        storage_specs: formData.storage_specs || null,
        operating_system: formData.operating_system || null,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        supplier_name: formData.supplier_name || null,
        supplier_person: formData.supplier_person || null,
        supplier_email: formData.supplier_email || null,
        supplier_phone: formData.supplier_phone || null,
        order_hyperlink: formData.order_hyperlink || null,
      };

      if (editingServer) {
        const { error } = await supabase
          .from("servers_master")
          .update(serverData)
          .eq("id", editingServer.id);

        if (error) throw error;
        toast({ title: "Server updated successfully" });
      } else {
        const { error } = await supabase
          .from("servers_master")
          .insert([serverData]);

        if (error) throw error;
        toast({ title: "Server added successfully" });
      }

      setIsDialogOpen(false);
      setEditingServer(null);
      resetForm();
      fetchServers();
    } catch (error: any) {
      toast({
        title: "Error saving server",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (server: ServerMaster) => {
    setEditingServer(server);
    setFormData({
      manufacturer: server.manufacturer,
      model_number: server.model_number,
      server_type: server.server_type || "",
      cpu_specs: server.cpu_specs || "",
      ram_specs: server.ram_specs || "",
      storage_specs: server.storage_specs || "",
      operating_system: server.operating_system || "",
      description: server.description || "",
      price: server.price?.toString() || "",
      supplier_name: server.supplier_name || "",
      supplier_person: server.supplier_person || "",
      supplier_email: server.supplier_email || "",
      supplier_phone: server.supplier_phone || "",
      order_hyperlink: server.order_hyperlink || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this server?")) return;

    try {
      const { error } = await supabase
        .from("servers_master")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Server deleted successfully" });
      fetchServers();
    } catch (error: any) {
      toast({
        title: "Error deleting server",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      manufacturer: "",
      model_number: "",
      server_type: "",
      cpu_specs: "",
      ram_specs: "",
      storage_specs: "",
      operating_system: "",
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
      setEditingServer(null);
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servers Management</h1>
          <p className="text-muted-foreground">
            Manage your server master data catalog
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingServer ? "Edit Server" : "Add New Server"}
              </DialogTitle>
              <DialogDescription>
                {editingServer
                  ? "Update the server information below."
                  : "Enter the server details below."}
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
                  <Label htmlFor="server_type">Server Type</Label>
                  <Input
                    id="server_type"
                    value={formData.server_type}
                    onChange={(e) =>
                      setFormData({ ...formData, server_type: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="operating_system">Operating System</Label>
                  <Input
                    id="operating_system"
                    value={formData.operating_system}
                    onChange={(e) =>
                      setFormData({ ...formData, operating_system: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cpu_specs">CPU Specs</Label>
                  <Input
                    id="cpu_specs"
                    value={formData.cpu_specs}
                    onChange={(e) =>
                      setFormData({ ...formData, cpu_specs: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="ram_specs">RAM Specs</Label>
                  <Input
                    id="ram_specs"
                    value={formData.ram_specs}
                    onChange={(e) =>
                      setFormData({ ...formData, ram_specs: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="storage_specs">Storage Specs</Label>
                  <Input
                    id="storage_specs"
                    value={formData.storage_specs}
                    onChange={(e) =>
                      setFormData({ ...formData, storage_specs: e.target.value })
                    }
                  />
                </div>
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
                  {editingServer ? "Update" : "Add"} Server
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Servers Catalog
          </CardTitle>
          <CardDescription>
            All available servers in the master database
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
                  <TableHead>CPU</TableHead>
                  <TableHead>RAM</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium">
                      {server.manufacturer}
                    </TableCell>
                    <TableCell>{server.model_number}</TableCell>
                    <TableCell>
                      {server.server_type && (
                        <Badge variant="secondary">{server.server_type}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{server.cpu_specs}</TableCell>
                    <TableCell>{server.ram_specs}</TableCell>
                    <TableCell>{server.storage_specs}</TableCell>
                    <TableCell>{server.operating_system}</TableCell>
                    <TableCell>
                      {server.price && `$${server.price.toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{server.supplier_name}</div>
                        {server.supplier_person && (
                          <div className="text-muted-foreground">
                            {server.supplier_person}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(server)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(server.id)}
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
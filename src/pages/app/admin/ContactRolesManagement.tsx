import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ContactRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function ContactRolesManagement() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<ContactRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ContactRole | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<ContactRole | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contact_roles_master')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch contact roles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (role: ContactRole) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description || '' });
    setDialogOpen(true);
  };

  const openDeleteDialog = (role: ContactRole) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      if (editingRole) {
        const { error } = await supabase
          .from('contact_roles_master')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
          })
          .eq('id', editingRole.id);

        if (error) throw error;

        toast({
          title: "Role Updated",
          description: `"${formData.name}" has been updated`,
        });
      } else {
        const { error } = await supabase
          .from('contact_roles_master')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
          });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: "Duplicate Role",
              description: "A role with this name already exists",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }

        toast({
          title: "Role Created",
          description: `"${formData.name}" has been added`,
        });
      }

      setDialogOpen(false);
      fetchRoles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save role",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('contact_roles_master')
        .delete()
        .eq('id', roleToDelete.id);

      if (error) {
        if (error.code === '23503') {
          toast({
            title: "Cannot Delete",
            description: "This role is assigned to one or more contacts. Remove the assignments first.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Role Deleted",
        description: `"${roleToDelete.name}" has been removed`,
      });

      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      fetchRoles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Contact Roles</h1>
            <p className="text-muted-foreground">Manage roles that can be assigned to project contacts</p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Roles</CardTitle>
          <CardDescription>
            {roles.length} role{roles.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No roles configured yet. Click "Add Role" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {role.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(role)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Edit Role' : 'Add New Role'}
            </DialogTitle>
            <DialogDescription>
              {editingRole 
                ? 'Update the role name and description' 
                : 'Create a new role that can be assigned to contacts'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Project Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this role"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingRole ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{roleToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

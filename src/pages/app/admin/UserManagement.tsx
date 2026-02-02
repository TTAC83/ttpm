import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, Mail, Edit } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: {
    name: string | null;
    job_title: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: string | null;
    is_internal: boolean;
    company_id: string | null;
    company_name?: string | null;
  } | null;
}


interface Company {
  id: string;
  name: string;
  is_internal: boolean;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({ 
    role: '', 
    company_id: '', 
    name: '', 
    job_title: '', 
    phone: '', 
    avatar_url: '' 
  });
  
  const { toast } = useToast();

  // Fetch users from the admin view
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again",
          variant: "destructive",
        });
        return;
      }

      // Fetch all users using the database function that includes auth data
      const { data: usersData, error } = await supabase
        .rpc('get_all_users_with_profiles');

      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        });
        return;
      }

      // Transform the data to match our interface, handling missing fields gracefully
      const transformedUsers: UserData[] = usersData?.map(user => ({
        id: user.user_id,
        email: user.email || '',
        created_at: user.created_at || new Date().toISOString(),
        last_sign_in_at: user.last_sign_in_at || null,
        profile: {
          user_id: user.user_id,
          company_id: user.company_id || null,
          role: user.role || null,
          is_internal: user.is_internal || false,
          name: user.name || null,
          job_title: user.job_title || null,
          phone: user.phone || null,
          avatar_url: user.avatar_url || null,
          created_at: user.created_at || new Date().toISOString(),
          company_name: user.company_name || null
        }
      })) || [];

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  // Fetch companies
  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, is_internal')
        .order('name');

      if (error) {
        console.error('Error fetching companies:', error);
        return;
      }

      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('admin-invite-user', {
        body: { email: inviteEmail },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Full invite response:', response);

      // Handle function invocation errors (network issues, etc.)
      if (response.error) {
        console.error('Edge function invocation error:', response.error);
        throw new Error(response.error.message || 'Failed to invoke invitation function');
      }

      // Handle application-level errors from the edge function
      if (response.data?.success === false || response.data?.error) {
        const errorMessage = response.data.error;
        const errorCode = response.data.error_code;
        
        console.log('Application error:', errorMessage, 'Code:', errorCode);
        
        if (errorCode === 'email_exists' || errorMessage.includes('already been registered')) {
          toast({
            title: "User Already Registered",
            description: `${inviteEmail} is already registered in the system. Check the "Users" table above to see their current status.`,
            variant: "destructive",
          });
          setInviteEmail('');
          return;
        }
        
        throw new Error(errorMessage);
      }

      // Handle successful invitation
      if (response.data?.success === true) {
        toast({
          title: "User Invited",
          description: `Invitation sent to ${inviteEmail}`,
        });
        
        setInviteEmail('');
        fetchUsers();
        return;
      }

      // Fallback for unexpected response format
      throw new Error('Unexpected response format from invitation service');
    } catch (error: any) {
      console.error('Invitation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to invite user",
        variant: "destructive",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Update non-sensitive profile information (name, job title, phone, avatar)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: editForm.name || null,
          job_title: editForm.job_title || null,
          phone: editForm.phone || null,
          avatar_url: editForm.avatar_url || null,
          company_id: editForm.company_id === 'none' ? null : editForm.company_id || null,
          is_internal: ['internal_admin', 'internal_user', 'tech_lead', 'tech_sponsor'].includes(editForm.role)
        })
        .eq('user_id', editingUser.id);

      if (profileError) throw profileError;

      // Get user's current role to determine if we need to update
      const currentRole = editingUser.profile?.role;
      
      // Update role through secure edge function if role has changed
      if (currentRole !== editForm.role && editForm.role) {
        // Remove old role if exists
        if (currentRole) {
          const removeResponse = await supabase.functions.invoke('admin-set-user-role', {
            body: {
              target_user_id: editingUser.id,
              role: currentRole,
              action: 'remove'
            }
          });

          if (removeResponse.error) {
            throw new Error('Failed to remove old role: ' + removeResponse.error.message);
          }
        }

        // Add new role
        const addResponse = await supabase.functions.invoke('admin-set-user-role', {
          body: {
            target_user_id: editingUser.id,
            role: editForm.role,
            action: 'add'
          }
        });

        if (addResponse.error) {
          throw new Error('Failed to assign new role: ' + addResponse.error.message);
        }

        if (addResponse.data && !addResponse.data.success) {
          throw new Error(addResponse.data.error || 'Failed to assign role');
        }
      }

      toast({
        title: "User Updated",
        description: "User profile and role have been updated successfully",
      });
      
      setEditingUser(null);
      // Refresh the user list
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/London'
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleBadgeVariant = (role: string | null, isInternal: boolean) => {
    if (role === 'internal_admin') return 'default';
    if (role === 'tech_lead' || role === 'tech_sponsor') return 'secondary';
    if (isInternal) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Send an invitation to a new user. They will receive an email with setup instructions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={inviteLoading || !inviteEmail}>
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage all user accounts and their access levels
          </CardDescription>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profile?.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.profile?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.profile?.name || 'Unnamed User'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.profile?.role ? (
                        <Badge 
                          variant={getRoleBadgeVariant(user.profile.role, user.profile.is_internal)}
                          className="text-xs"
                        >
                          {user.profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">No role assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.profile ? (
                        <Badge variant={user.profile.is_internal ? 'default' : 'outline'} className="text-xs">
                          {user.profile.is_internal ? 'Internal' : 'External'}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">No profile</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.last_sign_in_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setEditForm({
                            role: user.profile?.role || '',
                            company_id: user.profile?.company_id || 'none',
                            name: user.profile?.name || '',
                            job_title: user.profile?.job_title || '',
                            phone: user.profile?.phone || '',
                            avatar_url: user.profile?.avatar_url || ''
                          });
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update all user profile information, role, and company assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-job-title">Job Title</Label>
                <Input
                  id="edit-job-title"
                  value={editForm.job_title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, job_title: e.target.value }))}
                  placeholder="Enter job title"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-avatar">Avatar URL</Label>
                <Input
                  id="edit-avatar"
                  value={editForm.avatar_url}
                  onChange={(e) => setEditForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                  placeholder="Enter avatar image URL"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal_admin">Internal Admin</SelectItem>
                    <SelectItem value="internal_user">Internal User</SelectItem>
                    <SelectItem value="tech_lead">Tech/Dev Lead</SelectItem>
                    <SelectItem value="tech_sponsor">Tech/Dev Sponsor</SelectItem>
                    <SelectItem value="external_admin">External Admin</SelectItem>
                    <SelectItem value="external_user">External User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={editForm.company_id} onValueChange={(value) => setEditForm(prev => ({ ...prev, company_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No company assigned</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name} {company.is_internal && '(Internal)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser}>
                Update User Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
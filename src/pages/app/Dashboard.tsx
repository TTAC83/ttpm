import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const Dashboard = () => {
  const { user, profile } = useAuth();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/London'
    });
  };

  const getRoleBadgeVariant = (role: string | null, isInternal: boolean) => {
    if (role === 'internal_admin') return 'default';
    if (isInternal) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {profile?.name || 'User'}</h1>
        <p className="text-muted-foreground">
          Here's an overview of your Thingtrax implementation dashboard
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-sm text-muted-foreground">{profile?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Job Title</p>
              <p className="text-sm text-muted-foreground">{profile?.job_title || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Role</p>
              {profile?.role && (
                <Badge 
                  variant={getRoleBadgeVariant(profile.role, profile.is_internal)}
                  className="text-xs"
                >
                  {profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Status</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium">Account Type</p>
              <Badge variant={profile?.is_internal ? 'default' : 'outline'} className="text-xs">
                {profile?.is_internal ? 'Internal' : 'External'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Member Since</p>
              <p className="text-sm text-muted-foreground">
                {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Last Sign In</p>
              <p className="text-sm text-muted-foreground">
                {user?.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Unknown'}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p>• Update your profile information</p>
              <p>• View project assignments</p>
              {profile?.is_internal && profile?.role === 'internal_admin' && (
                <>
                  <p>• Manage user accounts</p>
                  <p>• Invite new users</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
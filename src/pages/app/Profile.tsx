import { useState, useRef } from 'react';
import PushNotificationSetup from '@/components/pwa/PushNotificationSetup';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PasswordInput, PasswordConfirmInput } from '@/components/ui/password-input';
import { usePasswordMatchValidation, validatePasswordOnSubmit } from '@/hooks/usePasswordValidation';
import { useToast } from '@/hooks/use-toast';
import { Upload, Camera } from 'lucide-react';

export const Profile = () => {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    job_title: profile?.job_title || '',
    phone: profile?.phone || '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Use password validation hook
  const passwordValidation = usePasswordMatchValidation(passwordData.newPassword, passwordData.confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await updateProfile(formData);
      if (!error) {
        setEditing(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile?.name || '',
      job_title: profile?.job_title || '',
      phone: profile?.phone || '',
    });
    setEditing(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleBadgeVariant = (role: string | null, isInternal: boolean) => {
    if (role === 'internal_admin') return 'default';
    if (isInternal) return 'secondary';
    return 'outline';
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update the profile with the new avatar URL
      await updateProfile({ avatar_url: publicUrl });

      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated",
      });
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/London'
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use the validation function for submit validation
    const passwordValidationResult = validatePasswordOnSubmit(passwordData.newPassword, passwordData.confirmPassword);
    
    if (!passwordValidationResult.isValid) {
      setPasswordMessage(`Error: ${passwordValidationResult.errorMessage}`);
      return;
    }
    
    setPasswordLoading(true);
    setPasswordMessage('');
    
    try {
      // For Supabase, we can update password without current password if user is authenticated
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) {
        setPasswordMessage(`Error: ${error.message}`);
      } else {
        setPasswordMessage('Password updated successfully!');
        setChangingPassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        toast({
          title: "Password Updated",
          description: "Your password has been updated successfully",
        });
      }
    } catch (error: any) {
      setPasswordMessage(`Error: ${error.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setChangingPassword(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordMessage('');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account information and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </div>
            {!editing && (
              <Button onClick={() => setEditing(true)} variant="outline">
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="text-lg">
                  {getInitials(profile?.name)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div>
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{profile?.name || 'Unnamed User'}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
              {profile?.role && (
                <Badge 
                  variant={getRoleBadgeVariant(profile.role, profile.is_internal)}
                  className="text-xs mt-1"
                >
                  {profile.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              )}
            </div>
          </div>
          
          <Separator />
          
          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                    placeholder="Enter your job title"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Full Name</p>
                <p className="text-sm text-muted-foreground">{profile?.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Job Title</p>
                <p className="text-sm text-muted-foreground">{profile?.job_title || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Phone Number</p>
                <p className="text-sm text-muted-foreground">{profile?.phone || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Read-only account details managed by administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Account Type</p>
              <Badge variant={profile?.is_internal ? 'default' : 'outline'} className="text-xs">
                {profile?.is_internal ? 'Internal' : 'External'}
              </Badge>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Password & Security</CardTitle>
              <CardDescription>
                Update your password and security settings
              </CardDescription>
            </div>
            {!changingPassword && (
              <Button onClick={() => setChangingPassword(true)} variant="outline">
                Change Password
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {changingPassword ? (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <PasswordInput
                id="new-password"
                label="New Password"
                placeholder="Enter new password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                required
                minLength={6}
                showValidation={true}
                validation={passwordValidation}
              />
              
              <PasswordConfirmInput
                id="confirm-new-password"
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={6}
                passwordMatches={passwordValidation.matches}
                showMatchValidation={true}
              />
              
              {passwordMessage && (
                <div className={`text-sm ${passwordMessage.includes('Error') ? 'text-destructive' : 'text-green-600'}`}>
                  {passwordMessage}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button type="submit" disabled={passwordLoading || !passwordValidation.confirmPasswordValid}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelPasswordChange}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Password</p>
                <p className="text-sm text-muted-foreground">Last updated: {user?.updated_at ? formatDate(user.updated_at) : 'Unknown'}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>• Use a strong password with at least 6 characters</p>
                <p>• Include a mix of letters, numbers, and symbols</p>
                <p>• Don't reuse passwords from other accounts</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PushNotificationSetup />
    </div>
  );
};

export default Profile;
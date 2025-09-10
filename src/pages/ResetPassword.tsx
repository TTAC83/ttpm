import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkResetToken = async () => {
      // First, sign out any existing session to prevent auto-login
      await supabase.auth.signOut();
      
      // Check URL hash for recovery tokens (this is how Supabase sends them)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          // Validate the tokens without setting a persistent session
          const { data: user, error } = await supabase.auth.getUser(accessToken);
          
          if (!error && user) {
            setIsValidToken(true);
            // Store tokens temporarily for password update
            sessionStorage.setItem('reset_access_token', accessToken);
            sessionStorage.setItem('reset_refresh_token', refreshToken);
            // Clear the hash from URL for security
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            throw error || new Error('Invalid token');
          }
        } catch (err: any) {
          toast({
            variant: "destructive",
            title: "Invalid reset link",
            description: "This password reset link is invalid or has expired. Please request a new one.",
          });
          navigate('/auth');
        }
      } else {
        toast({
          variant: "destructive",
          title: "Invalid reset link",
          description: "This password reset link is invalid or has expired. Please request a new one.",
        });
        navigate('/auth');
      }
    };

    checkResetToken();
  }, [navigate, toast]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in both password fields.",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Retrieve the stored tokens for password update
      const accessToken = sessionStorage.getItem('reset_access_token');
      const refreshToken = sessionStorage.getItem('reset_refresh_token');
      
      if (!accessToken || !refreshToken) {
        throw new Error('Reset session expired. Please request a new reset link.');
      }
      
      // Temporarily set the session to update the password
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      
      if (sessionError) {
        throw sessionError;
      }
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Error updating password",
          description: error.message,
        });
      } else {
        toast({
          title: "Password updated successfully",
          description: "Your password has been updated. You can now sign in with your new password.",
        });
        
        // Clean up stored tokens
        sessionStorage.removeItem('reset_access_token');
        sessionStorage.removeItem('reset_refresh_token');
        
        // Sign out the user so they can sign in with the new password
        await supabase.auth.signOut();
        navigate('/auth');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating password",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/auth')}
              className="text-sm"
            >
              Back to sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
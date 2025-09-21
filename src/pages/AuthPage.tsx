import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

export const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  
  const authContext = useAuth();
  const { signIn, signInWithMagicLink } = authContext || {};

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      return;
    }
    
    setLoading(true);
    try {
      console.log('Auth context:', authContext);
      console.log('signIn function:', signIn);
      console.log('Attempting sign in with:', { email: email.trim() });
      
      if (!signIn || typeof signIn !== 'function') {
        console.error('signIn is not available or not a function:', signIn);
        return;
      }
      
      const result = await signIn(email.trim(), password);
      console.log('Sign in result:', result);
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setMagicLinkLoading(true);
    try {
      await signInWithMagicLink(email);
    } finally {
      setMagicLinkLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setResetLoading(true);
    setResetMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        setResetMessage(`Error: ${error.message}`);
      } else {
        setResetMessage('Password reset email sent! Check your inbox.');
      }
    } catch (error: any) {
      setResetMessage(`Error: ${error.message}`);
    } finally {
      setResetLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Thingtrax</CardTitle>
          <CardDescription>
            Sign in to access your implementation dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
              <TabsTrigger value="reset">Reset Password</TabsTrigger>
            </TabsList>
            
            <TabsContent value="password" className="space-y-4 mt-6">
              <form onSubmit={handleEmailPasswordSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <PasswordInput
                    id="password"
                    label="Password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !email || !password}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="magic-link" className="space-y-4 mt-6">
              <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="magic-email">Email</Label>
                  <Input
                    id="magic-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={magicLinkLoading || !email}
                >
                  {magicLinkLoading ? 'Sending...' : 'Send Magic Link'}
                </Button>
              </form>
              <div className="text-sm text-muted-foreground text-center">
                We'll send you a secure link to sign in without a password
              </div>
            </TabsContent>
            
            <TabsContent value="reset" className="space-y-4 mt-6">
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={resetLoading || !email}
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                {resetMessage && (
                  <div className={`text-sm text-center ${resetMessage.includes('Error') ? 'text-destructive' : 'text-green-600'}`}>
                    {resetMessage}
                  </div>
                )}
              </form>
              <div className="text-sm text-muted-foreground text-center">
                We'll send you a secure link to reset your password
              </div>
            </TabsContent>
          </Tabs>
          
          <Separator className="my-6" />
          
          <div className="text-center text-sm text-muted-foreground">
            <p>This is an invite-only system.</p>
            <p>Contact your administrator if you need access.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
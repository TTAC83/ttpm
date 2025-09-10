import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Check, X } from 'lucide-react';

export const CompleteSignup = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Password validation checks
  const passwordChecks = {
    length: password.length >= 6,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
    noSpaces: !password.includes(' ') && password.trim() === password,
    matches: password === confirmPassword && password.length > 0 && confirmPassword.length > 0
  };

  useEffect(() => {
    // Get email from URL params if available (from invitation link)
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!passwordChecks.hasLetter) {
      toast({
        title: "Invalid Password",
        description: "Password must contain at least one letter",
        variant: "destructive",
      });
      return;
    }

    if (!passwordChecks.hasNumber) {
      toast({
        title: "Invalid Password", 
        description: "Password must contain at least one number",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords match",
        variant: "destructive",
      });
      return;
    }

    // Additional password validation
    if (password.trim() !== password || password.includes(' ')) {
      toast({
        title: "Invalid Password",
        description: "Password cannot contain spaces",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Starting signup process with:', { email, fullName: name.trim() });
      
      // Use the current origin for redirect URL
      const redirectUrl = `${window.location.origin}/app`;
        
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name.trim()
          }
        }
      });

      console.log('Signup result:', { data: !!data.user, error });

      if (error) {
        console.error('Signup error:', error);
        if (error.message.includes('User already registered')) {
          toast({
            title: "Account Already Exists",
            description: "An account with this email already exists. Try signing in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Signup Error", 
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        console.log('User created successfully:', data.user.id);
        
        // If user is immediately logged in (no email confirmation required)
        if (data.session) {
          console.log('User logged in immediately, updating profile...');
          
          // Update the profile with the full name to ensure it's saved
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ name: name.trim() })
            .eq('user_id', data.user.id);
            
          if (profileError) {
            console.error('Profile update error:', profileError);
          }
          
          toast({
            title: "Account Created Successfully",
            description: "Welcome! You're now logged in.",
          });
          
          // Redirect to the app
          navigate('/app');
        } else {
          toast({
            title: "Account Created Successfully",
            description: "Please check your email to verify your account before signing in.",
          });
          
          // Redirect to auth page for login
          navigate('/auth');
        }
      }
    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      toast({
        title: "Signup Error",
        description: "An unexpected error occurred during signup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Complete Your Registration</CardTitle>
          <CardDescription>
            Please provide your details to complete your account setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!searchParams.get('email')}
                className={searchParams.get('email') ? 'opacity-50' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              
              {/* Password Requirements */}
              {password && (
                <div className="text-sm space-y-1 mt-2">
                  <div className="flex items-center gap-2">
                    {passwordChecks.length ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-red-500" />
                    )}
                    <span className={passwordChecks.length ? "text-green-600" : "text-red-500"}>
                      At least 6 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordChecks.hasLetter ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-red-500" />
                    )}
                    <span className={passwordChecks.hasLetter ? "text-green-600" : "text-red-500"}>
                      Contains at least one letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordChecks.hasNumber ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-red-500" />
                    )}
                    <span className={passwordChecks.hasNumber ? "text-green-600" : "text-red-500"}>
                      Contains at least one number
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordChecks.noSpaces ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-red-500" />
                    )}
                    <span className={passwordChecks.noSpaces ? "text-green-600" : "text-red-500"}>
                      No spaces allowed
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="flex items-center gap-2 text-sm">
                  {passwordChecks.matches ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <X className="h-3 w-3 text-red-500" />
                  )}
                  <span className={passwordChecks.matches ? "text-green-600" : "text-red-500"}>
                    {passwordChecks.matches ? "Passwords match" : "Passwords don't match"}
                  </span>
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={
                loading || 
                !name.trim() || 
                !email || 
                !password || 
                !confirmPassword || 
                !passwordChecks.length ||
                !passwordChecks.hasLetter ||
                !passwordChecks.hasNumber ||
                !passwordChecks.noSpaces ||
                !passwordChecks.matches
              }
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button 
                variant="link" 
                className="p-0 h-auto font-semibold"
                onClick={() => navigate('/auth')}
              >
                Sign in
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteSignup;
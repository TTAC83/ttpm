import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordInput, PasswordConfirmInput } from '@/components/ui/password-input';
import { usePasswordMatchValidation, validatePasswordOnSubmit } from '@/hooks/usePasswordValidation';
import { useToast } from '@/hooks/use-toast';

export const CompleteSignup = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Use the password validation hook
  const passwordValidation = usePasswordMatchValidation(password, confirmPassword);

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

    // Use the validation function for submit validation
    const passwordValidationResult = validatePasswordOnSubmit(password, confirmPassword);
    
    if (!passwordValidationResult.isValid) {
      toast({
        title: "Invalid Password",
        description: passwordValidationResult.errorMessage,
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
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <PasswordInput
              id="password"
              label="Password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              showValidation={true}
              validation={passwordValidation}
            />
            
            <PasswordConfirmInput
              id="confirmPassword"
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              passwordMatches={passwordValidation.matches}
              showMatchValidation={true}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={
                loading || 
                !name.trim() || 
                !email || 
                !password || 
                !confirmPassword || 
                !passwordValidation.confirmPasswordValid
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
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  user_id: string;
  company_id: string | null;
  role: string | null;
  is_internal: boolean;
  name: string | null;
  job_title: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  hasRole: (role: string) => boolean;
  isInternalAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile data when user signs in
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(profileData => {
          setProfile(profileData);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Keep session fresh to avoid unexpected sign-outs in long-lived pages
  useEffect(() => {
    const refresh = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user && !profile) {
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
          }, 0);
        }
      } catch (e) {
        // noop
      }
    };

    const interval = setInterval(refresh, 4 * 60 * 1000); // every 4 minutes
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [profile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        const { toast } = await import('@/hooks/use-toast');
        toast({
          title: "Sign In Error",
          description: error.message,
          variant: "destructive",
        });
      }
      
      return { error };
    } catch (error: any) {
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Sign In Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      // Use production URL if available, otherwise fall back to current origin
      const redirectUrl = window.location.hostname === 'localhost' 
        ? `${window.location.origin}/app`
        : `${window.location.origin}/app`;
        
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        }
      });
      
      if (error) {
        const { toast } = await import('@/hooks/use-toast');
        toast({
          title: "Magic Link Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const { toast } = await import('@/hooks/use-toast');
        toast({
          title: "Magic Link Sent",
          description: "Check your email for the magic link",
        });
      }
      
      return { error };
    } catch (error: any) {
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Magic Link Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      });
    } catch (error: any) {
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Sign Out Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user logged in' };
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);
      
      if (error) {
        const { toast } = await import('@/hooks/use-toast');
        toast({
          title: "Update Error",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }
      
      // Update local profile state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      });
      
      return { error: null };
    } catch (error: any) {
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Update Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      return { error };
    }
  };

  const hasRole = (role: string) => {
    return profile?.role === role;
  };

  const isInternalAdmin = () => {
    return profile?.is_internal === true && profile?.role === 'internal_admin';
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signInWithMagicLink,
    signOut,
    updateProfile,
    hasRole,
    isInternalAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
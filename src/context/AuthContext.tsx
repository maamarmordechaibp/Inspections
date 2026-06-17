import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'technician';
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string; needsVerification?: boolean }>;
  logout: () => void;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function supabaseUserToAppUser(supabaseUser: SupabaseUser, profile: { full_name: string; role: string }): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    fullName: profile.full_name,
    role: profile.role as 'admin' | 'manager' | 'technician',
    avatar: profile.full_name.split(' ').map((n: string) => n[0]).join(''),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('dousefire_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  // Check Supabase session on mount — also handles email verification hash callbacks
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Supabase v2 automatically detects access_token/refresh_token in the URL hash
        // (from email verification, password reset, magic link, etc.) and exchanges them for a session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session recovery error:', error.message);
        }

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile) {
            const appUser = supabaseUserToAppUser(session.user, profile);
            setUser(appUser);
            localStorage.setItem('dousefire_user', JSON.stringify(appUser));
          }
        }
      } catch (err: any) {
        console.error('Auth init error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile) {
              const appUser = supabaseUserToAppUser(session.user, profile);
              setUser(appUser);
              localStorage.setItem('dousefire_user', JSON.stringify(appUser));
            }
          });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('dousefire_user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // Check if this is an unverified email error from Supabase
        if (
          error.message?.includes('Email not confirmed') ||
          error.message?.includes('email_not_confirmed') ||
          error.message?.includes('Email link is invalid or has expired')
        ) {
          return {
            success: false,
            needsVerification: true,
            error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
          };
        }

        return { success: false, error: error.message };
      }

      if (data.user) {
        let { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', data.user.id)
          .maybeSingle();

        // If no profile exists yet, auto-create one with technician role
        if (!profile) {
          const defaultName = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User';
          const defaultRole = 'technician';

          const { data: newProfile, error: createErr } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              email: data.user.email,
              full_name: defaultName,
              role: defaultRole,
            }, { onConflict: 'id' })
            .select('full_name, role')
            .single();

          if (createErr) {
            return { success: false, error: 'Failed to create user profile. Please contact admin.' };
          }

          profile = newProfile;
        }

        if (profile) {
          const appUser = supabaseUserToAppUser(data.user, profile);
          setUser(appUser);
          localStorage.setItem('dousefire_user', JSON.stringify(appUser));
          return { success: true, role: appUser.role };
        }
      }

      return { success: false, error: 'Profile not found. Please contact admin.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed. Please check your connection.' };
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${__BASE_PATH__}/login`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to resend verification email.' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('dousefire_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
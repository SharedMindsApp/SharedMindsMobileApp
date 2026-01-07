import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

let getViewAsProfile: (() => any) | null = null;

export function setViewAsGetter(getter: () => any) {
  getViewAsProfile = getter;
}

export type UserRole = 'free' | 'premium' | 'admin';

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string | null;
  safe_mode_enabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  isPremium: boolean;
  isFree: boolean;
  actualRole: UserRole | null;
  isViewingAs: boolean;
  safeModeEnabled: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  toggleSafeMode: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 10000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise,
        ]) as any;

        if (error) throw error;

        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        (async () => {
          if (mounted) {
            setUser(session?.user ?? null);
            if (session?.user) {
              await fetchProfile(session.user.id);
            } else {
              setProfile(null);
            }
          }
        })();
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const toggleSafeMode = async (enabled: boolean) => {
    if (!user?.id) return;

    const { pauseAllInterventionsForSafeMode, clearSafeModePauseFlags } = await import(
      '../lib/interventions/stage3_1-service'
    );

    const { error } = await supabase
      .from('profiles')
      .update({ safe_mode_enabled: enabled })
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to toggle Safe Mode:', error);
      throw error;
    }

    if (enabled) {
      await pauseAllInterventionsForSafeMode(user.id);
    } else {
      await clearSafeModePauseFlags(user.id);
    }

    await refreshProfile();
  };

  const viewAsData = getViewAsProfile ? getViewAsProfile() : { viewAsProfile: null, isViewingAs: false };
  const effectiveProfile = viewAsData.isViewingAs && viewAsData.viewAsProfile
    ? viewAsData.viewAsProfile
    : profile;

  const actualRole = profile?.role ?? null;
  const role = effectiveProfile?.role ?? null;
  const isAdmin = actualRole === 'admin';
  const isPremium = role === 'premium' || role === 'admin';
  const isFree = role === 'free';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: effectiveProfile,
        loading,
        role,
        isAdmin,
        isPremium,
        isFree,
        actualRole,
        isViewingAs: viewAsData.isViewingAs,
        safeModeEnabled: effectiveProfile?.safe_mode_enabled ?? false,
        signOut,
        refreshProfile,
        toggleSafeMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

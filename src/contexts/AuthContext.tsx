import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { isStandaloneApp } from '../lib/appContext';
import { startHealthMonitoring, subscribeToHealthState, retryWithBackoff } from '../lib/connectionHealth';
import { logError, logWarning, logInfo } from '../lib/errorLogger';

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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef<Profile | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      if (data) {
        logInfo('Profile loaded successfully', {
          component: 'AuthContext',
          action: 'fetchProfile',
          userId,
        });
      }
    } catch (error) {
      logError(
        'Failed to fetch profile',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'AuthContext',
          action: 'fetchProfile',
          userId,
        }
      );
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const initAuth = async () => {
      try {
        // Phase 11: Use retry with backoff for session check with timeout
        const { data: { session }, error } = await retryWithBackoff(
          async () => {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Session check timeout')), 5000)
            );

            const sessionPromise = supabase.auth.getSession();

            return Promise.race([
              sessionPromise,
              timeoutPromise,
            ]) as Promise<{ data: { session: any }; error: any }>;
          },
          3, // Max 3 retries
          1000 // Initial 1s delay
        );

        if (error) throw error;

        if (mounted) {
          setUser(session?.user ?? null);
          // Phase 10: Set loading false immediately, fetch profile in background
          // This allows UI to render while profile loads
          setLoading(false);
          if (session?.user) {
            // Don't await - let profile load in background
            fetchProfile(session.user.id).catch(err => {
              console.error('Background profile fetch error:', err);
            });
          }
        }
      } catch (error) {
        logError(
          'Auth initialization failed',
          error instanceof Error ? error : new Error(String(error)),
          {
            component: 'AuthContext',
            action: 'initAuth',
            userId: user?.id,
          }
        );
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    initAuth();

    // Phase 12: Add a maximum timeout for auth loading to prevent infinite loading
    // If auth is still loading after 15 seconds, force it to stop
    timeoutId = setTimeout(() => {
      if (mounted) {
        // Check current loading state - if still loading after timeout, force stop
        setLoading((currentLoading) => {
          if (currentLoading) {
            logWarning('Auth loading timeout - forcing loading state to false', {
              component: 'AuthContext',
              action: 'initAuth',
              timeout: 15000,
            });
            // Clear any potentially invalid session state if no user
            setUser((currentUser) => {
              if (!currentUser) {
                setProfile(null);
              }
              return currentUser;
            });
            return false;
          }
          return currentLoading;
        });
      }
    }, 15000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        (async () => {
          if (mounted) {
            setUser(session?.user ?? null);
            setLoading(false); // Clear loading when auth state changes
            if (session?.user) {
              await fetchProfile(session.user.id);
            } else {
              setProfile(null);
            }
          }
        })();
      }
    );

    // Phase 3B: Check session on app visibility change (app resume)
    // Phase 3C: Enhanced to prevent double redirects and flicker
    // Ensures session is still valid when app comes back to foreground
    let isCheckingVisibility = false; // Phase 3C: Prevent concurrent checks
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && mounted && !isCheckingVisibility) {
        isCheckingVisibility = true;
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session) {
            // Phase 3C: Session expired or invalid - clear state silently
            // Don't trigger redirects here to avoid flicker
            if (mounted) {
              setUser(null);
              setProfile(null);
            }
          } else if (mounted && session.user) {
            // Phase 3C: Session valid - ensure profile is loaded
            // Only fetch if profile is missing or user changed
            // Phase 10: Use ref to check profile without dependency
            // Phase 11: Use retry with backoff for session validation
            const currentProfile = profileRef.current;
            if (!currentProfile || currentProfile.user_id !== session.user.id) {
              // Fetch in background with retry, don't block
              retryWithBackoff(
                () => fetchProfile(session.user.id),
                2, // Max 2 retries for profile fetch
                500 // Initial 500ms delay
              ).catch(err => {
                console.error('Visibility change profile fetch error:', err);
              });
            }
          }
        } catch (error) {
          logError(
            'Session check on visibility change failed',
            error instanceof Error ? error : new Error(String(error)),
            {
              component: 'AuthContext',
              action: 'handleVisibilityChange',
              userId: user?.id,
            }
          );
        } finally {
          isCheckingVisibility = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    // Phase 3B: In installed app, redirect to login after logout
    if (isStandaloneApp()) {
      window.location.href = '/auth/login';
    }
  }, []);

  const toggleSafeMode = useCallback(async (enabled: boolean) => {
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
  }, [user?.id, refreshProfile]);

  const viewAsData = getViewAsProfile ? getViewAsProfile() : { viewAsProfile: null, isViewingAs: false };
  const effectiveProfile = viewAsData.isViewingAs && viewAsData.viewAsProfile
    ? viewAsData.viewAsProfile
    : profile;

  const actualRole = profile?.role ?? null;
  const role = effectiveProfile?.role ?? null;
  const isAdmin = actualRole === 'admin';
  const isPremium = role === 'premium' || role === 'admin';
  const isFree = role === 'free';

  // Phase 10: Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
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
    }),
    [
      user,
      effectiveProfile,
      loading,
      role,
      isAdmin,
      isPremium,
      isFree,
      actualRole,
      viewAsData.isViewingAs,
      signOut,
      refreshProfile,
      toggleSafeMode,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
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

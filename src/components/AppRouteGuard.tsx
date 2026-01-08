// Phase 3B: App-Only Route Guard
// Phase 3C: Enhanced with launch stability
// Phase 8C: App-first auth entry - always redirect unauthenticated to /login
// Redirects installed apps away from marketing/landing pages
// Now applies to all contexts (browser + installed app)

import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

type AppRouteGuardProps = {
  children: React.ReactNode;
};

export function AppRouteGuard({ children }: AppRouteGuardProps) {
  const location = useLocation();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hasRedirected = useRef(false); // Phase 8C: Prevent double redirects

  useEffect(() => {
    // Phase 8C: Check auth for all contexts (not just installed app)
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setIsAuthenticated(!!session);
        
        // Phase 8C: Immediate redirect if needed, before showing loading state
        const isRootRoute = location.pathname === '/';
        
        if (isRootRoute && !hasRedirected.current) {
          hasRedirected.current = true;
          // Redirect will happen in render, but we set state first
        }
      } catch (error) {
        console.error('[AppRouteGuard] Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth changes (but don't trigger redirects on change)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [location.pathname]);

  // Phase 8C: Handle root route redirect
  const isRootRoute = location.pathname === '/';

  if (isRootRoute && !hasRedirected.current) {
    if (checkingAuth) {
      // Phase 8C: Minimal loading state - no flicker
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      );
    }
    
    // Phase 8C: Redirect immediately once auth state is known
    hasRedirected.current = true;
    if (isAuthenticated) {
      // Phase 8C: Check for last planner view (mobile-first)
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        const lastView = localStorage.getItem('last_planner_view');
        if (lastView && ['/planner/daily', '/planner/weekly', '/planner/monthly'].includes(lastView)) {
          return <Navigate to={lastView} replace />;
        }
      }
      return <Navigate to="/planner/daily" replace />;
    } else {
      // Phase 8C: Always redirect unauthenticated users to /login
      return <Navigate to="/auth/login" replace />;
    }
  }

  return <>{children}</>;
}


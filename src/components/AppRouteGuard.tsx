// Phase 3B: App-Only Route Guard
// Phase 3C: Enhanced with launch stability
// Redirects installed apps away from marketing/landing pages
// Browser users see normal behavior (landing page when logged out)

import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isStandaloneApp } from '../lib/appContext';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

type AppRouteGuardProps = {
  children: React.ReactNode;
};

export function AppRouteGuard({ children }: AppRouteGuardProps) {
  const location = useLocation();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hasRedirected = useRef(false); // Phase 3C: Prevent double redirects

  useEffect(() => {
    // Phase 3B: Only apply app-only behavior when running as installed app
    if (!isStandaloneApp()) {
      setCheckingAuth(false);
      return;
    }

    // Phase 3C: In installed app, check auth synchronously first to avoid flicker
    const checkAuth = async () => {
      try {
        // Phase 3C: Use getSession which is fast and synchronous for cached sessions
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setIsAuthenticated(!!session);
        
        // Phase 3C: Immediate redirect if needed, before showing loading state
        const isMarketingRoute = location.pathname === '/' || 
                                 location.pathname === '/how-it-works';
        
        if (isMarketingRoute && !hasRedirected.current) {
          hasRedirected.current = true;
          // Redirect will happen in render, but we set state first
        }
      } catch (error) {
        console.error('Auth check error:', error);
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

  // Phase 3B: In browser mode, no redirects - normal behavior
  if (!isStandaloneApp()) {
    return <>{children}</>;
  }

  // Phase 3C: In installed app, show minimal loading only if truly checking
  // Try to avoid showing loading state if we can redirect immediately
  const isMarketingRoute = location.pathname === '/' || 
                           location.pathname === '/how-it-works';

  if (isMarketingRoute && !hasRedirected.current) {
    if (checkingAuth) {
      // Phase 3C: Minimal loading state - no flicker
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      );
    }
    
    // Phase 3C: Redirect immediately once auth state is known
    // Phase 4A: Enhanced to remember last planner view for faster access
    hasRedirected.current = true;
    if (isAuthenticated) {
      // Phase 4A: Check for last planner view (mobile-first)
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        const lastView = localStorage.getItem('last_planner_view');
        if (lastView && ['/planner/daily', '/planner/weekly', '/planner/monthly'].includes(lastView)) {
          return <Navigate to={lastView} replace />;
        }
      }
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/auth/login" replace />;
    }
  }

  return <>{children}</>;
}


/**
 * Phase 8C: RootRedirect Component
 * 
 * Makes / a redirect-only route.
 * - Authenticated users → /planner/daily (or last planner view)
 * - Unauthenticated users → /auth/login
 * 
 * No UI is rendered at / - it's purely a routing decision.
 */

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export function RootRedirect() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('[RootRedirect] Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Phase 8C: Show minimal loading during auth check
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
        </div>
      </div>
    );
  }

  // Phase 8C: Redirect based on auth state
  if (isAuthenticated) {
    // Phase 8C: Check for last planner view (mobile-first)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      const lastView = localStorage.getItem('last_planner_view');
      if (lastView && ['/planner/daily', '/planner/weekly', '/planner/monthly'].includes(lastView)) {
        return <Navigate to={lastView} replace />;
      }
    }
    // Default to planner daily for authenticated users
    return <Navigate to="/planner/daily" replace />;
  }

  // Phase 8C: Unauthenticated users always go to login
  return <Navigate to="/auth/login" replace />;
}



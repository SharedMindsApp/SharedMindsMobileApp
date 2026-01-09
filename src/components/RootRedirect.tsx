/**
 * Phase 8C: RootRedirect Component
 * FIXED: Removed redundant auth check - now relies on AuthContext
 * 
 * Makes / a redirect-only route.
 * - Authenticated users → /planner/daily (or last planner view)
 * - Unauthenticated users → /auth/login
 * 
 * No UI is rendered at / - it's purely a routing decision.
 */

import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function RootRedirect() {
  const { user, loading } = useAuth(); // Use AuthContext instead of doing our own check
  const isAuthenticated = !!user;

  // Show minimal loading during auth check (handled by AuthContext)
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
        </div>
      </div>
    );
  }

  // Phase 8C: Redirect based on auth state from AuthContext
  if (isAuthenticated) {
    // Phase 8C: Check for last planner view (mobile-first)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      const lastView = localStorage.getItem('last_planner_view');
      if (lastView && lastView.startsWith('/planner')) {
        return <Navigate to={lastView} replace />;
      }
    }
    // Default to planner calendar for authenticated users
    return <Navigate to="/planner/calendar?view=month" replace />;
  }

  // Phase 8C: Unauthenticated users always go to login
  return <Navigate to="/auth/login" replace />;
}



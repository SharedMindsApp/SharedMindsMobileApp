// Phase 3B: App-Only Route Guard
// Phase 3C: Enhanced with launch stability
// Phase 8C: App-first auth entry - always redirect unauthenticated to /login
// Phase 1: Critical Load Protection - Added timeout protection
// FIXED: Removed redundant auth checks - now relies on AuthContext instead of checking on every route change

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type AppRouteGuardProps = {
  children: React.ReactNode;
};

export function AppRouteGuard({ children }: AppRouteGuardProps) {
  const location = useLocation();
  const { user, loading } = useAuth(); // Use AuthContext instead of doing our own check
  const isAuthenticated = !!user;

  // Phase 8C: Handle root route redirect
  // FIXED: Only check root route, don't do auth check here - AuthContext handles that
  const isRootRoute = location.pathname === '/';

  if (isRootRoute) {
    // Show loading while auth is being checked by AuthContext
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      );
    }
    
    // Redirect based on auth state from AuthContext
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


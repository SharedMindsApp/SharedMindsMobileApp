import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, LogOut, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { retryWithBackoff } from '../lib/connectionHealth';

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    checkInitialSession();

    // Phase 10: Reduced timeout from 10s to 5s for faster failure recovery
    const timeoutId = setTimeout(() => {
      if (loading) {
        setTimedOut(true);
        setLoading(false);
        setErrorMessage('Authentication check timed out. Please try signing in again.');
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (() => {
        setAuthenticated(!!session);
        setLoading(false);
        clearTimeout(timeoutId);
      })();
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const checkInitialSession = async () => {
    try {
      // Phase 11: Use retry with backoff for session check
      const { data: { session }, error } = await retryWithBackoff(
        () => supabase.auth.getSession(),
        3, // Max 3 retries
        1000 // Initial 1s delay
      );

      if (error) {
        console.error('Session check error:', error);
        setAuthenticated(false);
      } else {
        setAuthenticated(!!session);
      }
    } catch (error) {
      // Phase 3C: Handle network errors gracefully
      console.error('Auth initialization error:', error);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Phase 8C: Always redirect to login after logout
    window.location.href = '/auth/login';
  };

  const handleGoToLogin = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  const handleGoHome = async () => {
    await supabase.auth.signOut();
    // Phase 8C: Always redirect to login (no landing page)
    window.location.href = '/auth/login';
  };

  if (timedOut && errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-gray-600">{errorMessage}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGoToLogin}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Login
            </button>
            <button
              onClick={handleGoToLogin}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Go to Login
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-3">
              Still having issues?
            </p>
            <button
              onClick={handleSignOut}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut size={16} className="mr-2" />
              Clear Session and Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
          <button
            onClick={handleSignOut}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut size={16} className="mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    // Phase 8C: Always redirect unauthenticated users to /login
    return <Navigate to="/auth/login" replace />;
  }

  // Phase 8C: If authenticated user is on /login or /, redirect to app
  if (location.pathname === '/auth/login' || location.pathname === '/') {
    // Check for last planner view (mobile-first)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      const lastView = localStorage.getItem('last_planner_view');
      if (lastView && ['/planner/daily', '/planner/weekly', '/planner/monthly'].includes(lastView)) {
        return <Navigate to={lastView} replace />;
      }
    }
    return <Navigate to="/planner/daily" replace />;
  }

  return <>{children}</>;
}

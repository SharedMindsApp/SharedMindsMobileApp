import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, LogOut, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isStandaloneApp } from '../lib/appContext';

type GuestGuardProps = {
  children: React.ReactNode;
};

export function GuestGuard({ children }: GuestGuardProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasHousehold, setHasHousehold] = useState<boolean | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    checkInitialSession();

    const timeoutId = setTimeout(() => {
      if (loading) {
        setTimedOut(true);
        setLoading(false);
        setErrorMessage('Page load timed out. Please check your connection and try again.');
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (() => {
        if (session) {
          checkUserHousehold(session.user.id);
        } else {
          setAuthenticated(false);
          setHasHousehold(null);
          setLoading(false);
        }
        clearTimeout(timeoutId);
      })();
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const checkUserHousehold = async (userId: string) => {
    try {
      const { data: memberData } = await supabase
        .from('members')
        .select('household_id')
        .eq('user_id', userId)
        .maybeSingle();

      setHasHousehold(!!memberData?.household_id);
      setAuthenticated(true);
    } catch (error) {
      console.error('Error checking household:', error);
      setHasHousehold(false);
      setAuthenticated(true);
    } finally {
      setLoading(false);
    }
  };

  const checkInitialSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session check error:', error);
        setAuthenticated(false);
        setLoading(false);
      } else if (session?.user) {
        await checkUserHousehold(session.user.id);
      } else {
        setAuthenticated(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setAuthenticated(false);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Phase 3B: In installed app, redirect to login after logout
    const redirectTo = isStandaloneApp() ? '/auth/login' : '/';
    window.location.href = redirectTo;
  };

  const handleGoToLogin = () => {
    window.location.href = '/auth/login';
  };

  const handleGoHome = () => {
    // Phase 3B: In installed app, redirect to login instead of landing
    const redirectTo = isStandaloneApp() ? '/auth/login' : '/';
    window.location.href = redirectTo;
  };

  if (timedOut && errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
            <p className="text-gray-600">{errorMessage}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGoHome}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Reload Home Page
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
              Need to clear your session?
            </p>
            <button
              onClick={handleSignOut}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut size={16} className="mr-2" />
              Clear Session
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
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (authenticated) {
    if (hasHousehold) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/onboarding/household" replace />;
    }
  }

  return <>{children}</>;
}

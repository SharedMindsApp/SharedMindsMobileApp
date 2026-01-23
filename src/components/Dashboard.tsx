/**
 * Phase 1: Critical Load Protection - Added timeout protection
 */

import { useEffect, useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase, Section, Member, Progress } from '../lib/supabase';
import { QuestionScreen } from './QuestionScreen';
import { getUserHousehold, Household } from '../lib/household';
import { useAuth } from '../contexts/AuthContext';
import { useUIPreferences } from '../contexts/UIPreferencesContext';
import { DashboardLayoutRouter } from './dashboard/DashboardLayoutRouter';
import { COLOR_THEMES } from '../lib/uiPreferencesTypes';
import { useLoadingState } from '../hooks/useLoadingState';
import { TimeoutRecovery } from './common/TimeoutRecovery';
import { DashboardSkeleton } from './common/Skeleton';
import { DashboardMarks, timeAsync } from '../lib/performance';

export function Dashboard() {
  // Performance: Mark dashboard start
  useEffect(() => {
    DashboardMarks.start();
  }, []);

  const [sections, setSections] = useState<Section[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [progressData, setProgressData] = useState<Progress[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingCritical, setLoadingCritical] = useState(true); // Only for critical auth data
  const [loadingDeferred, setLoadingDeferred] = useState(true); // For dashboard data
  const { timedOut } = useLoadingState({
    timeoutMs: 12000,
  });
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isPremium, role } = useAuth();
  const { config, neurotype } = useUIPreferences();

  // CRITICAL: Render shell immediately, then load data
  useEffect(() => {
    loadCriticalData();
  }, []);

  // Load critical auth data first (blocks navigation only)
  const loadCriticalData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log('No user found, redirecting to onboarding');
        navigate('/onboarding/household');
        return;
      }

      setCurrentUserId(user.id);
      DashboardMarks.shellVisible();

      // Load member data (required for navigation)
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error('Error loading member data:', memberError);
        throw memberError;
      }

      if (!memberData) {
        console.log('No member data found, redirecting to onboarding');
        navigate('/onboarding/household', { replace: true });
        return;
      }

      setLoadingCritical(false);
      DashboardMarks.skeletonsVisible();

      // Now load dashboard data in parallel (non-blocking)
      startTransition(() => {
        loadDashboardData(memberData.household_id);
      });
    } catch (err) {
      console.error('Error loading critical data:', err);
      setError('Failed to load dashboard. Please try again.');
      setLoadingCritical(false);
    }
  };

  // Load dashboard data in parallel (non-blocking after shell renders)
  const loadDashboardData = async (householdId: string) => {
    await timeAsync('dashboard:data:load', async () => {
      try {
        // FIXED: Parallel fetching instead of waterfall
        const [householdData, householdMembersResult, sectionsResult] = await Promise.all([
          getUserHousehold(),
          supabase
            .from('members')
            .select('*')
            .eq('household_id', householdId),
          supabase
            .from('sections')
            .select('*')
            .order('order_index', { ascending: true }),
        ]);

        if (householdMembersResult.error) throw householdMembersResult.error;
        if (sectionsResult.error) throw sectionsResult.error;

        const householdMembers = householdMembersResult.data || [];
        const sectionsData = sectionsResult.data || [];

        setHousehold(householdData);
        setMembers(householdMembers);
        setSections(sectionsData);
        DashboardMarks.criticalDataLoaded();

        // Load progress data after members/sections are available
        if (householdMembers.length > 0) {
          const { data: progressDataList, error: progressError } = await supabase
            .from('progress')
            .select('*')
            .in('member_id', householdMembers.map((m) => m.id));

          if (progressError) throw progressError;
          setProgressData(progressDataList || []);
        }

        DashboardMarks.allDataLoaded();
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard. Please try again.');
      } finally {
        setLoadingDeferred(false);
        DashboardMarks.interactive();
      }
    });
  };

  const handleCloseQuestions = () => {
    setActiveSection(null);
    if (household) {
      loadDashboardData(household.id);
    } else {
      loadCriticalData();
    }
  };

  const getFirstIncompleteSection = (): Section | null => {
    const currentMember = members.find((m) => m.user_id === currentUserId);
    if (!currentMember) return null;

    const memberProgress = progressData.filter((p) => p.member_id === currentMember.id);

    for (const section of sections) {
      const sectionProgress = memberProgress.find((p) => p.section_id === section.id);
      if (!sectionProgress || !sectionProgress.completed) {
        return section;
      }
    }

    return null;
  };

  const isReportAvailable = (): boolean => {
    if (sections.length === 0 || members.length === 0) return false;

    const totalSections = sections.length * members.length;
    const completedSections = progressData.filter((p) => p.completed).length;

    return completedSections === totalSections;
  };

  // Show timeout recovery if critical data load timed out
  if (timedOut && loadingCritical) {
    return (
      <TimeoutRecovery
        message="Dashboard is taking longer than expected to load. This may be due to a network issue."
        timeoutSeconds={12}
        onRetry={() => loadCriticalData()}
        onReload={() => window.location.reload()}
      />
    );
  }

  // CRITICAL: Render shell immediately, show skeletons while data loads
  // Never block UI render on data - this is the key performance fix
  const bgTheme = COLOR_THEMES[config.colorTheme];
  const transitionClass = config.reducedMotion ? '' : 'transition-colors duration-200';

  // Render page shell immediately, even if data is loading
  return (
    <div className={`min-h-screen ${bgTheme.bg} ${bgTheme.text} ${transitionClass} -mx-4 -my-8 px-4 py-8 sm:-mx-6 sm:-my-8 sm:px-6 lg:-mx-8 lg:-my-8 lg:px-8`}>
      {loadingCritical || loadingDeferred ? (
        // Show skeleton while loading - user sees structure immediately
        <DashboardSkeleton />
      ) : error ? (
        // Error state
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Error</h2>
              <p className="text-gray-600">{error}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setLoadingCritical(true);
                  setLoadingDeferred(true);
                  loadCriticalData();
                }}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Render dashboard with data
        <DashboardLayoutRouter
          neurotype={neurotype}
          sections={sections}
          members={members}
          progressData={progressData}
          household={household}
          currentMember={members.find((m) => m.user_id === currentUserId) || null}
          firstIncompleteSection={getFirstIncompleteSection()}
          reportAvailable={isReportAvailable()}
          overallProgress={
            sections.length > 0 && members.length > 0
              ? Math.round(
                  (progressData.filter((p) => p.completed).length / (sections.length * members.length)) *
                    100
                )
              : 0
          }
          isPremium={isPremium}
        />
      )}
    </div>
  );

  const handleGoToOnboarding = () => {
    navigate('/onboarding/household', { replace: true });
  };

  const handleGoToSettings = () => {
    navigate('/settings', { replace: true });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => loadData()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Try Again
            </button>
            <button
              onClick={handleGoToOnboarding}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Reset Household Setup
            </button>
            <button
              onClick={handleGoToSettings}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Go to Settings
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeSection) {
    return <QuestionScreen sectionId={activeSection} onClose={handleCloseQuestions} />;
  }

  // Helper functions (moved here to avoid duplication)
  const getFirstIncompleteSection = (): Section | null => {
    const currentMember = members.find((m) => m.user_id === currentUserId);
    if (!currentMember) return null;

    const memberProgress = progressData.filter((p) => p.member_id === currentMember.id);

    for (const section of sections) {
      const sectionProgress = memberProgress.find((p) => p.section_id === section.id);
      if (!sectionProgress || !sectionProgress.completed) {
        return section;
      }
    }

    return null;
  };

  const isReportAvailable = (): boolean => {
    if (sections.length === 0 || members.length === 0) return false;

    const totalSections = sections.length * members.length;
    const completedSections = progressData.filter((p) => p.completed).length;

    return completedSections === totalSections;
  };
}

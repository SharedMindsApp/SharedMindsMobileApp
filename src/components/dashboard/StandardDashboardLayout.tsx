import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  FileText,
  Users,
  BookOpen,
  Lock,
  Home,
  LayoutGrid,
  Compass,
} from 'lucide-react';
import { Section, Member, Progress } from '../../lib/supabase';
import { Household } from '../../lib/household';
import { useNavigate } from 'react-router-dom';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { DENSITY_SPACING_MAP, FONT_SCALE_MAP, COLOR_THEMES } from '../../lib/uiPreferencesTypes';
import { BrainProfileWidget } from './BrainProfileWidget';
import { LockedFeaturesJourney } from '../features/LockedFeaturesJourney';
import { HouseholdMatchTriggerCard } from '../household/HouseholdMatchTriggerCard';
import { HouseholdInsightMatchViewer } from '../household/HouseholdInsightMatchViewer';
import { HouseholdMatchUnlockCelebration } from '../household/HouseholdMatchUnlockCelebration';
import { DailyAlignmentEntryCard } from '../regulation/DailyAlignmentEntryCard';
import { getDailyAlignmentEnabled } from '../../lib/regulation/dailyAlignmentService';
import { PersonalCalendarCard } from '../calendar/PersonalCalendarCard';
import { SharedCalendarCard } from '../calendar/SharedCalendarCard';
import {
  checkHouseholdMatchReady,
  generateHouseholdMatch,
  getHouseholdMatch,
  markMatchAsViewed,
  saveMatchToProfile,
  HouseholdInsightMatch,
} from '../../lib/householdInsightMatch';
import { isStandaloneApp } from '../../lib/appContext';
import { AppReferenceGuide } from '../reference/AppReferenceGuide';

interface StandardDashboardLayoutProps {
  sections: Section[];
  members: Member[];
  progressData: Progress[];
  household: Household | null;
  currentMember: Member | null;
  firstIncompleteSection: Section | null;
  reportAvailable: boolean;
  overallProgress: number;
  isPremium: boolean;
}

export function StandardDashboardLayout({
  sections,
  members,
  progressData,
  household,
  currentMember,
  firstIncompleteSection,
  reportAvailable,
  overallProgress,
  isPremium,
}: StandardDashboardLayoutProps) {
  const navigate = useNavigate();
  const { config } = useUIPreferences();
  const densityClass = DENSITY_SPACING_MAP[config.uiDensity];
  const fontScale = FONT_SCALE_MAP[config.fontScale];
  const theme = COLOR_THEMES[config.colorTheme];
  const lineHeight = config.fontScale === 'xl' ? 'leading-relaxed' : config.fontScale === 'l' ? 'leading-relaxed' : 'leading-normal';
  const transitionClass = config.reducedMotion ? '' : 'transition-all duration-300';

  const [householdMatch, setHouseholdMatch] = useState<HouseholdInsightMatch | null>(null);
  const [matchReady, setMatchReady] = useState(false);
  const [showMatchViewer, setShowMatchViewer] = useState(false);
  const [showUnlockCelebration, setShowUnlockCelebration] = useState(false);
  const [isCheckingMatch, setIsCheckingMatch] = useState(true);
  const [dailyAlignmentEnabled, setDailyAlignmentEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // FIXED: Restore app guide state from sessionStorage on load
  const [showReferenceGuide, setShowReferenceGuide] = useState(() => {
    // Check if guide was open before reload
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('app_guide_open') === 'true';
    }
    return false;
  });

  useEffect(() => {
    // Restore guide state on mount if it was open before reload
    if (typeof window !== 'undefined') {
      const wasOpen = sessionStorage.getItem('app_guide_open') === 'true';
      if (wasOpen) {
        setShowReferenceGuide(true);
      }
    }
  }, []);

  useEffect(() => {
    checkForHouseholdMatch();
  }, [household, members, progressData]);

  useEffect(() => {
    if (currentMember?.user_id) {
      loadDailyAlignmentEnabled();
    }
  }, [currentMember]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768 || isStandaloneApp());
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadDailyAlignmentEnabled = async () => {
    if (!currentMember?.user_id) return;
    const enabled = await getDailyAlignmentEnabled(currentMember.user_id);
    setDailyAlignmentEnabled(enabled);
  };

  const checkForHouseholdMatch = async () => {
    if (!household) return;

    setIsCheckingMatch(true);

    const isReady = await checkHouseholdMatchReady(household.id);
    setMatchReady(isReady);

    if (isReady) {
      const existingMatch = await getHouseholdMatch(household.id);

      if (existingMatch) {
        setHouseholdMatch(existingMatch);
        if (!existingMatch.viewed) {
          setShowUnlockCelebration(true);
          await markMatchAsViewed(existingMatch.id);
        }
      } else {
        const newMatch = await generateHouseholdMatch(household.id);
        if (newMatch) {
          setHouseholdMatch(newMatch);
          setShowUnlockCelebration(true);
        }
      }
    }

    setIsCheckingMatch(false);
  };

  const handleViewMatch = () => {
    setShowMatchViewer(true);
  };

  const handleCloseMatchViewer = () => {
    setShowMatchViewer(false);
  };

  const handleSaveMatchToProfile = async () => {
    if (!householdMatch) return;
    await saveMatchToProfile(householdMatch.id);
  };

  const handleUnlockCelebrationComplete = () => {
    setShowUnlockCelebration(false);
  };

  return (
    <div className={`${densityClass} ${lineHeight}`} style={{ fontSize: `${fontScale}rem` }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome{currentMember ? `, ${currentMember.name}` : ''}
          </h1>
          <p className="text-gray-600">
            {household?.name ? `${household.name} · ` : ''}
            {members.length} member{members.length !== 1 ? 's' : ''} · {sections.length} sections
          </p>
        </div>
        <button
          onClick={() => setShowReferenceGuide(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors shadow-sm"
          title="How Everything Fits Together"
        >
          <Compass size={18} className="text-blue-600" />
          <span>App Guide</span>
        </button>
      </div>

      {household && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl shadow-lg overflow-hidden border-2 border-amber-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-md">
                    <Home size={28} className="text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      {household.name} Hub
                    </h2>
                    <p className="text-white/90 text-sm">
                      Your shared family space with calendar, goals, and more
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/planner')}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-xl transition-all font-semibold flex items-center gap-2 shadow-md"
                >
                  <LayoutGrid size={20} />
                  Open Hub
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <PersonalCalendarCard />
        <SharedCalendarCard />
      </div>

      {dailyAlignmentEnabled && currentMember?.user_id && (
        <div className="mb-6">
          <DailyAlignmentEntryCard userId={currentMember.user_id} />
        </div>
      )}

      <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-2'} ${densityClass}`}>
        {/* Questionnaire Progress - Hidden on mobile */}
        {!isMobile && (
          <div className={`${theme.cardBg} rounded-xl shadow-sm border border-gray-200 p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Questionnaire Progress</h2>
                <p className="text-sm text-gray-600">Complete all sections</p>
              </div>
            </div>

          {firstIncompleteSection && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-gray-900 mb-1">Next Section:</p>
              <p className="text-sm text-blue-700">{firstIncompleteSection.title}</p>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-semibold text-gray-900">{overallProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full ${transitionClass}`}
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Household Progress</span>
              <span className="text-xs text-gray-500">{members.length} members</span>
            </div>
            <div className="space-y-1">
              {members.map((member) => {
                const memberProgress = progressData.filter((p) => p.member_id === member.id);
                const completedCount = memberProgress.filter((p) => p.completed).length;
                const memberPercent =
                  sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

                return (
                  <div key={member.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-20 truncate">{member.name}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`bg-blue-400 h-1.5 rounded-full ${transitionClass}`}
                        style={{ width: `${memberPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 w-10 text-right">{memberPercent}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {firstIncompleteSection ? (
            <button
              onClick={() => navigate('/journey')}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg ${transitionClass} flex items-center justify-center gap-2`}
            >
              Continue Questionnaire
              <ArrowRight size={20} />
            </button>
          ) : (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle2 size={20} />
              <span className="font-medium">All sections completed!</span>
            </div>
          )}
          </div>
        )}

        <div className={`${theme.cardBg} rounded-xl shadow-sm border border-gray-200 p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText size={24} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Household Report</h2>
              <p className="text-sm text-gray-600">
                AI-generated insights
                {!isPremium && (
                  <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded">
                    Premium
                  </span>
                )}
              </p>
            </div>
          </div>

          {!isPremium ? (
            <>
              <p className="text-gray-600 mb-4 text-sm">
                Upgrade to Premium to unlock AI-powered harmony reports with personalized insights and action plans.
              </p>
              <button
                onClick={() => navigate('/settings')}
                className={`w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-lg ${transitionClass} flex items-center justify-center gap-2`}
              >
                <Lock size={20} />
                Upgrade to Premium
              </button>
            </>
          ) : reportAvailable ? (
            <>
              <p className="text-gray-600 mb-4 text-sm">
                Your household report is ready! View personalized insights and action items.
              </p>
              <button
                onClick={() => navigate('/report')}
                className={`w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg ${transitionClass} flex items-center justify-center gap-2`}
              >
                View Report
                <ArrowRight size={20} />
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-4 text-sm">
                Complete all sections for every member to generate your household report.
              </p>
              <button
                disabled
                className="w-full bg-gray-100 text-gray-400 font-semibold py-3 px-4 rounded-lg cursor-not-allowed"
              >
                Report Locked
              </button>
            </>
          )}
        </div>
      </div>

      {matchReady && householdMatch && !showMatchViewer && (
        <HouseholdMatchTriggerCard
          onViewMatch={handleViewMatch}
          memberCount={householdMatch.memberIds.length}
          reducedMotion={config.reducedMotion}
        />
      )}

      {/* Your Insight Journey - Hidden on mobile */}
      {!isMobile && (
        <LockedFeaturesJourney
          memberId={currentMember?.id || null}
          reducedMotion={config.reducedMotion}
        />
      )}

      {/* My Brain Profile - Hidden on mobile */}
      {!isMobile && <BrainProfileWidget />}

      {showUnlockCelebration && (
        <HouseholdMatchUnlockCelebration
          onComplete={handleUnlockCelebrationComplete}
          reducedMotion={config.reducedMotion}
        />
      )}

      {showMatchViewer && householdMatch && (
        <HouseholdInsightMatchViewer
          insightCards={householdMatch.insightCards}
          onSaveToProfile={handleSaveMatchToProfile}
          onClose={handleCloseMatchViewer}
          reducedMotion={config.reducedMotion}
        />
      )}

      <div className={`${theme.cardBg} border border-blue-200 rounded-xl p-6`}>
        <div className="flex items-start gap-3">
          <Users size={24} className="text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">Household Members</h3>
            <div className="space-y-2">
              {members.map((member) => {
                const memberProgress = progressData.filter((p) => p.member_id === member.id);
                const completedCount = memberProgress.filter((p) => p.completed).length;
                const memberPercent =
                  sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;
                const isComplete = memberPercent === 100;

                return (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isComplete ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {isComplete ? (
                          <CheckCircle2 size={16} className="text-green-600" />
                        ) : (
                          <span className="text-sm font-semibold text-blue-800">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-600">{member.role}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${isComplete ? 'text-green-600' : 'text-gray-700'}`}>
                      {memberPercent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Phase 9: App Reference Guide */}
      <AppReferenceGuide
        isOpen={showReferenceGuide}
        onClose={() => setShowReferenceGuide(false)}
      />
    </div>
  );
}

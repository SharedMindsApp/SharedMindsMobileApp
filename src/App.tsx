import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EncryptionProvider } from './contexts/EncryptionContext';
import { ViewAsProvider } from './contexts/ViewAsContext';
import { UIPreferencesProvider } from './contexts/UIPreferencesContext';
import { ActiveProjectProvider } from './contexts/ActiveProjectContext';
import { ActiveTrackProvider } from './contexts/ActiveTrackContext';
import { FocusSessionProvider } from './contexts/FocusSessionContext';
import { RegulationProvider } from './contexts/RegulationContext';
import { AIChatWidgetProvider } from './contexts/AIChatWidgetContext';
import { ActiveDataProvider } from './contexts/ActiveDataContext';
import { ForegroundTriggersProvider } from './contexts/ForegroundTriggersContext';
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';
import { AppBootProvider, useAppBoot } from './contexts/AppBootContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AppBootScreen } from './components/AppBootScreen';
import { startHealthMonitoring } from './lib/connectionHealth';
import { NotFoundRedirect } from './components/NotFoundRedirect';
import { RootRedirect } from './components/RootRedirect';
import { Layout } from './components/Layout';
import { RouteGlitchEffect } from './components/RouteGlitchEffect';
import { Dashboard } from './components/Dashboard';
import { HouseholdOnboarding } from './components/HouseholdOnboarding';
import { MembersOnboarding } from './components/MembersOnboarding';
import { ManageMembers } from './components/ManageMembers';
import { HouseholdMembersPage } from './components/HouseholdMembersPage';
import { ProfessionalAccessManagement } from './components/ProfessionalAccessManagement';
import { AcceptInvite } from './components/AcceptInvite';
import { ReportViewer } from './components/ReportViewer';
import { ProfileSettings } from './components/ProfileSettings';
import { Signup } from './components/Signup';
import { Login } from './components/Login';
import { ResetPassword } from './components/ResetPassword';
import { OAuthCallback } from './components/OAuthCallback';
import { AuthGuard } from './components/AuthGuard';
import { GuestGuard } from './components/GuestGuard';
import { RequireRole } from './components/RequireRole';
import { Landing } from './components/Landing';
import { HowItWorks } from './components/HowItWorks';
import { isStandaloneApp } from './lib/appContext';
import { AppRouteGuard } from './components/AppRouteGuard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminHouseholds } from './components/admin/AdminHouseholds';
import { AdminReports } from './components/admin/AdminReports';
import { AdminAnalytics } from './components/admin/AdminAnalytics';
import { AdminLogs } from './components/admin/AdminLogs';
import { AdminSettings } from './components/admin/AdminSettings';
import { AdminAIProvidersPage } from './components/admin/AdminAIProvidersPage';
import { AdminAIRoutingPage } from './components/admin/AdminAIRoutingPage';
import { AdminGuardrailsLayout } from './components/admin/guardrails/AdminGuardrailsLayout';
import { AdminProjectTypesPage } from './components/admin/guardrails/AdminProjectTypesPage';
import { AdminTemplatesPage } from './components/admin/guardrails/AdminTemplatesPage';
import { AdminSubtracksPage } from './components/admin/guardrails/AdminSubtracksPage';
import { AdminTagsPage } from './components/admin/guardrails/AdminTagsPage';
import { AdminTemplateTagsPage } from './components/admin/guardrails/AdminTemplateTagsPage';
import { AdminProjectTypeTagsPage } from './components/admin/guardrails/AdminProjectTypeTagsPage';
import { AdminTemplateSubtracksPage } from './components/admin/guardrails/AdminTemplateSubtracksPage';
import { ProfessionalDashboard } from './components/professional/ProfessionalDashboard';
import { ProfessionalHouseholdInsights } from './components/professional/ProfessionalHouseholdInsights';
import { ProfessionalOnboarding } from './components/professional/ProfessionalOnboarding';
import { ProfessionalRequestAccess } from './components/professional/ProfessionalRequestAccess';
import { ConversationListPage } from './components/messaging/ConversationListPage';
import { ConversationPage } from './components/messaging/ConversationPage';
import { NewConversationPage } from './components/messaging/NewConversationPage';
import { AddParticipantsPage } from './components/messaging/AddParticipantsPage';
import { UIPreferencesSettings } from './components/UIPreferencesSettings';
import { BrainProfileOnboarding } from './components/BrainProfileOnboarding';
import { BrainProfileCards } from './components/BrainProfileCards';
import { InsightJourney } from './components/journey/InsightJourney';
import { IndividualProfileFlow } from './components/individual-profile/IndividualProfileFlow';
import { CalendarPageWrapper } from './components/CalendarPageWrapper';
import { InsightsDashboard } from './components/insights/InsightsDashboard';
import { MealPreferences } from './components/MealPreferences';
import { MobileModeContainer } from './components/mobile/MobileModeContainer';
import { GuardrailsPage } from './components/GuardrailsPage';
import { GuardrailsLayout } from './components/guardrails/GuardrailsLayout';
import { GuardrailsDashboard } from './components/guardrails/GuardrailsDashboard';
import { GuardrailsAIChatsPage } from './components/guardrails/GuardrailsAIChatsPage';
import { GuardrailsRoadmap } from './components/guardrails/GuardrailsRoadmap';
import { GuardrailsTaskFlow } from './components/guardrails/GuardrailsTaskFlow';
import { GuardrailsMindMesh } from './components/guardrails/GuardrailsMindMesh';
import { GuardrailsSideProjects } from './components/guardrails/GuardrailsSideProjects';
import { GuardrailsOffshoots } from './components/guardrails/GuardrailsOffshoots';
import { GuardrailsSessions } from './components/guardrails/GuardrailsSessions';
import { GuardrailsRegulation } from './components/guardrails/GuardrailsRegulation';
import { RequireActiveProjectADC } from './components/guardrails/RequireActiveProjectADC';
import { SideProjectDetail } from './components/guardrails/side-projects/SideProjectDetail';
import { OffshootIdeaDetail } from './components/guardrails/offshoots/OffshootIdeaDetail';
import { ProjectRoadmapPage } from './components/guardrails/roadmap/ProjectRoadmapPage';
import { ProjectNodesPage } from './components/guardrails/nodes/ProjectNodesPage';
import { ProjectTaskFlowPage } from './components/guardrails/taskflow/ProjectTaskFlowPage';
import { ProjectRealityCheckPage } from './components/guardrails/reality/ProjectRealityCheckPage';
import { ArchiveManagementPage } from './components/guardrails/settings/ArchiveManagementPage';
import { SideProjectsPage } from './components/SideProjectsPage';
import { OffshootIdeasListPage } from './components/OffshootIdeasListPage';
import { OffshootIdeaDetailPage } from './components/OffshootIdeaDetailPage';
import { PersonalSpacePage } from './components/PersonalSpacePage';
import { PersonalCalendarPage } from './components/personal-spaces/PersonalCalendarPage';
import { SharedSpacesListPage } from './components/SharedSpacesListPage';
import { SpaceViewPage } from './components/SpaceViewPage';
import { SpacesIndexPage } from './components/SpacesIndexPage';
import { WidgetAppView } from './components/spaces/WidgetAppView';
import { FocusModeStart } from './components/guardrails/focus/FocusModeStart';
import { FocusModeLive } from './components/guardrails/focus/FocusModeLive';
import { SessionSummaryPage } from './components/guardrails/focus/SessionSummaryPage';
import { FocusSessionsHistory } from './components/guardrails/focus/FocusSessionsHistory';
import { FocusAnalytics } from './components/guardrails/focus/FocusAnalytics';
import { ProjectWizard } from './components/guardrails/wizard/ProjectWizard';
import { PeoplePage } from './components/guardrails/people/PeoplePage';
import { ProjectWelcomePage } from './components/guardrails/ProjectWelcomePage';
import { InterventionsDashboard } from './components/interventions/InterventionsDashboard';
import { CreateInterventionFlow } from './components/interventions/CreateInterventionFlow';
import { EditInterventionPage } from './components/interventions/EditInterventionPage';
import { ManualInterventionsPage } from './components/interventions/ManualInterventionsPage';
import { TriggerAuditPanel } from './components/interventions/TriggerAuditPanel';
import { GovernancePanel } from './components/interventions/GovernancePanel';
import { Stage3ErrorBoundary } from './components/interventions/Stage3ErrorBoundary';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RegulationHubTabbed } from './components/interventions/RegulationHubTabbed';
import { RegulationUsePage } from './components/interventions/RegulationUsePage';
import { ContextsPage } from './components/interventions/ContextsPage';
import { SignalDetailPage } from './components/regulation/SignalDetailPage';
import { TestingModePage } from './components/regulation/TestingModePage';
import { BehavioralInsightsDashboard } from './components/behavioral-insights/BehavioralInsightsDashboard';
import { PlannerIndex } from './components/planner/PlannerIndex';
import { PlannerDailyV2 } from './components/planner/PlannerDailyV2';
import { PlannerWeekly } from './components/planner/PlannerWeekly';
import { PlannerMonthly } from './components/planner/PlannerMonthly';
import { PlannerQuarterly } from './components/planner/PlannerQuarterly';
import { PlannerReview } from './components/planner/PlannerReview';
import { PlannerAreas } from './components/planner/PlannerAreas';
import { PlannerPersonal } from './components/planner/PlannerPersonal';
import { PlannerWork } from './components/planner/PlannerWork';
import { DailyWorkFlow } from './components/planner/work/DailyWorkFlow';
import { WeeklyFocus } from './components/planner/work/WeeklyFocus';
import { ProjectHub } from './components/planner/work/ProjectHub';
import { TaskActionLists } from './components/planner/work/TaskActionLists';
import { Communications } from './components/planner/work/Communications';
import { CareerDevelopment } from './components/planner/work/CareerDevelopment';
import { WorkNotes } from './components/planner/work/WorkNotes';
import { PlannerEducation } from './components/planner/PlannerEducation';
import { LearningSchedule } from './components/planner/education/LearningSchedule';
import { Assignments } from './components/planner/education/Assignments';
import { CourseInfo } from './components/planner/education/CourseInfo';
import { RevisionReview } from './components/planner/education/RevisionReview';
import { ResearchProjects } from './components/planner/education/ResearchProjects';
import { ProgressMetrics } from './components/planner/education/ProgressMetrics';
import { ReadingResources } from './components/planner/education/ReadingResources';
import { LessonPlanning } from './components/planner/education/LessonPlanning';
import { PlannerFinance } from './components/planner/PlannerFinance';
import { FinancialOverview } from './components/planner/finance/FinancialOverview';
import { IncomeAndCashFlow } from './components/planner/finance/IncomeAndCashFlow';
import { SpendingAndExpenses } from './components/planner/finance/SpendingAndExpenses';
import { SavingsAndSafetyNets } from './components/planner/finance/SavingsAndSafetyNets';
import { InvestmentsAndAssets } from './components/planner/finance/InvestmentsAndAssets';
import { DebtsAndCommitments } from './components/planner/finance/DebtsAndCommitments';
import { ProtectionAndInsurance } from './components/planner/finance/ProtectionAndInsurance';
import { RetirementPlanning } from './components/planner/finance/RetirementPlanning';
import { FinancialReflection } from './components/planner/finance/FinancialReflection';
import { PlannerBudget } from './components/planner/PlannerBudget';
import { PlannerVision } from './components/planner/PlannerVision';
import { LifeVision } from './components/planner/vision/LifeVision';
import { LongTermGoals } from './components/planner/vision/LongTermGoals';
import { FiveYearOutlook } from './components/planner/vision/FiveYearOutlook';
import { VisionAreas } from './components/planner/vision/VisionAreas';
import { VisionBoard } from './components/planner/vision/VisionBoard';
import { MonthlyCheckin } from './components/planner/vision/MonthlyCheckin';
import { CareerPurpose } from './components/planner/vision/CareerPurpose';
import { RelationshipVision } from './components/planner/vision/RelationshipVision';
import { ValuesAlignment } from './components/planner/vision/ValuesAlignment';
import { PlannerPlanning } from './components/planner/PlannerPlanning';
import { GoalPlanner } from './components/planner/planning/GoalPlanner';
import { PriorityPlanner } from './components/planner/planning/PriorityPlanner';
import { UnifiedTodoList } from './components/planner/planning/UnifiedTodoList';
import { EventPlanner } from './components/planner/planning/EventPlanner';
import { WeeklyOverview } from './components/planner/planning/WeeklyOverview';
import { DailyTimeline } from './components/planner/planning/DailyTimeline';
import { GoalActionPlan } from './components/planner/planning/GoalActionPlan';
import { PlannerHousehold } from './components/planner/PlannerHousehold';
import { HouseholdMeals } from './components/planner/household/HouseholdMeals';
import { HouseholdCleaning } from './components/planner/household/HouseholdCleaning';
import { HouseholdGroceries } from './components/planner/household/HouseholdGroceries';
import { PlannerShell } from './components/planner/PlannerShell';
import { PlannerSelfCare } from './components/planner/PlannerSelfCare';
import { WellnessGoals } from './components/planner/selfcare/WellnessGoals';
import { ExerciseTracker } from './components/planner/selfcare/ExerciseTracker';
import { MentalHealthCheckins } from './components/planner/selfcare/MentalHealthCheckins';
import { NutritionLog } from './components/planner/selfcare/NutritionLog';
import { SleepTracker } from './components/planner/selfcare/SleepTracker';
import { MindfulnessMeditation } from './components/planner/selfcare/MindfulnessMeditation';
import { SelfCareRoutines } from './components/planner/selfcare/SelfCareRoutines';
import { GratitudeJournal } from './components/planner/selfcare/GratitudeJournal';
import { BeautyRoutines } from './components/planner/selfcare/BeautyRoutines';
import { RestRecovery } from './components/planner/selfcare/RestRecovery';
import { PlannerTravel } from './components/planner/PlannerTravel';
import { CreateTripPage } from './components/planner/travel/CreateTripPage';
import { TripDetailPage } from './components/planner/travel/TripDetailPage';
import { PlannerSocial } from './components/planner/PlannerSocial';
import { PlannerJournal } from './components/planner/PlannerJournal';
import { DailyAlignmentPage } from './components/regulation/DailyAlignmentPage';

// Phase 8: Wrapper to show boot screen when auth is stuck (must be inside AuthProvider)
function AppBootScreenWrapper() {
  const { state } = useAppBoot();
  const { loading: authLoading } = useAuth();
  const showStuckAuth = state.status === 'ready' && authLoading && state.elapsedTime > 10000;
  
  if (!showStuckAuth) return null;
  
  return (
    <div className="fixed inset-0 z-[9999] bg-white">
      <AppBootScreen />
    </div>
  );
}

// Phase 8: Inner app component that manages boot state
function AppContent() {
  const { state, setStatus, setServiceWorkerState } = useAppBoot();

  // Phase 8: Monitor service worker state
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const controller = navigator.serviceWorker.controller;
      if (controller) {
        setServiceWorkerState('controlling');
      } else {
        navigator.serviceWorker.ready.then(() => {
          setServiceWorkerState('registered');
        });
      }

      // Phase 8: Listen for service worker update events
      const handleUpdateAvailable = () => {
        setStatus('update-available');
      };

      const handleRegistrationFailed = () => {
        setServiceWorkerState('broken');
      };

      window.addEventListener('sw-update-available', handleUpdateAvailable);
      window.addEventListener('sw-registration-failed', handleRegistrationFailed);

      return () => {
        window.removeEventListener('sw-update-available', handleUpdateAvailable);
        window.removeEventListener('sw-registration-failed', handleRegistrationFailed);
      };
    }
  }, [setStatus, setServiceWorkerState]);

  // Phase 10: Optimized boot sequence - event-driven, no artificial delays
  useEffect(() => {
    // Immediately transition to ready - let AuthContext and other providers handle loading
    // Boot screen will show as overlay if auth is still loading
    if (state.status === 'initializing') {
      setStatus('ready');
    }
  }, [state.status, setStatus]);

  // Phase 11: Start connection health monitoring when app is ready
  useEffect(() => {
    if (state.status === 'ready') {
      startHealthMonitoring();
      return () => {
        // Cleanup will be handled when component unmounts
      };
    }
  }, [state.status]);

  // Phase 10: Render app immediately, boot screen is shown as overlay during auth loading
  // This allows contexts to start initializing in parallel rather than sequentially
  // AppBootScreen will handle detecting stuck auth states internally
  const showBootOverlay = state.status !== 'ready';

  return (
    <>
      {showBootOverlay && (
        <div className="fixed inset-0 z-[9999] bg-white">
          <AppBootScreen />
        </div>
      )}
    <BrowserRouter>
      <AuthProvider>
        {/* AppBootScreen also shows when auth is stuck, must be inside AuthProvider */}
        <AppBootScreenWrapper />
        <NotificationProvider>
          <ViewAsProvider>
            <ActiveDataProvider>
              <UIPreferencesProvider>
                <ActiveProjectProvider>
                  <ActiveTrackProvider>
                    <RegulationProvider>
                      <FocusSessionProvider>
                        <EncryptionProvider>
                          <AIChatWidgetProvider>
                        <ForegroundTriggersProvider>
                          <NetworkStatusProvider>
                            <AppRouteGuard>
                            <RouteGlitchEffect />
                              <Routes>
          {/* Phase 8C: Root route is redirect-only, no UI rendered */}
          <Route
            path="/"
            element={<RootRedirect />}
          />

          <Route
            path="/how-it-works"
            element={<HowItWorks />}
          />

          <Route
            path="/auth/signup"
            element={
              <GuestGuard>
                <Signup />
              </GuestGuard>
            }
          />
          <Route
            path="/auth/login"
            element={
              <GuestGuard>
                <Login />
              </GuestGuard>
            }
          />
          <Route path="/auth/reset" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />

          <Route
            path="/invite/accept"
            element={
              <AuthGuard>
                <AcceptInvite />
              </AuthGuard>
            }
          />

          <Route
            path="/onboarding/household"
            element={
              <AuthGuard>
                <HouseholdOnboarding />
              </AuthGuard>
            }
          />
          <Route
            path="/onboarding/members"
            element={
              <AuthGuard>
                <MembersOnboarding />
              </AuthGuard>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Layout>
                  <Dashboard />
                </Layout>
              </AuthGuard>
            }
          />
          {/* Phase 11: Daily Alignment standalone route */}
          <Route
            path="/alignment"
            element={
              <AuthGuard>
                <DailyAlignmentPage />
              </AuthGuard>
            }
          />
          <Route
            path="/calendar/personal"
            element={
              <AuthGuard>
                <ErrorBoundary
                  context="Personal Calendar"
                  fallbackRoute="/planner"
                  errorMessage="An error occurred while loading the personal calendar."
                >
                  <PersonalCalendarPage />
                </ErrorBoundary>
              </AuthGuard>
            }
          />
          <Route
            path="/spaces"
            element={
              <AuthGuard>
                <Layout>
                  <SpacesIndexPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/spaces/personal"
            element={
              <AuthGuard>
                <PersonalSpacePage />
              </AuthGuard>
            }
          />
          <Route
            path="/spaces/shared"
            element={
              <AuthGuard>
                <SharedSpacesListPage />
              </AuthGuard>
            }
          />
          <Route
            path="/spaces/:spaceId"
            element={
              <AuthGuard>
                <SpaceViewPage />
              </AuthGuard>
            }
          />
          <Route
            path="/spaces/:spaceId/app/:widgetId"
            element={
              <AuthGuard>
                <WidgetAppView />
              </AuthGuard>
            }
          />
          <Route
            path="/mobile"
            element={
              <AuthGuard>
                <MobileModeContainer />
              </AuthGuard>
            }
          />
          <Route
            path="/calendar"
            element={
              <AuthGuard>
                <ErrorBoundary
                  context="Calendar"
                  fallbackRoute="/planner"
                  errorMessage="An error occurred while loading the calendar."
                >
                  <CalendarPageWrapper />
                </ErrorBoundary>
              </AuthGuard>
            }
          />
          <Route
            path="/insights/:householdId"
            element={
              <AuthGuard>
                <InsightsDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/wizard"
            element={
              <AuthGuard>
                <ProjectWizard />
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <GuardrailsDashboard />
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/dashboard"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <GuardrailsDashboard />
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/people"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <PeoplePage />
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/ai-chats"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <GuardrailsAIChatsPage />
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/roadmap"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <GuardrailsRoadmap />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/taskflow"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <GuardrailsTaskFlow />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/mindmesh"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <GuardrailsMindMesh />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/side-projects"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <GuardrailsSideProjects />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/offshoots"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <GuardrailsOffshoots />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/side-projects/:id"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <SideProjectDetail />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/offshoots/:id"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <OffshootIdeaDetail />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/sessions"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <GuardrailsSessions />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/regulation"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <GuardrailsRegulation />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/settings/archive"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <ArchiveManagementPage />
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/projects/:projectId/welcome"
            element={
              <AuthGuard>
                <ProjectWelcomePage />
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/projects/:masterProjectId/roadmap"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <ProjectRoadmapPage />
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/projects/:masterProjectId/nodes"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <ProjectNodesPage />
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/projects/:masterProjectId/taskflow"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <ProjectTaskFlowPage />
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/projects/:masterProjectId/reality"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <ProjectRealityCheckPage />
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/projects/:masterProjectId/side-projects"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <SideProjectsPage />
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/projects/:masterProjectId/offshoots"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <OffshootIdeasListPage />
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/offshoots/:offshootId"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <OffshootIdeaDetailPage />
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/journey"
            element={
              <AuthGuard>
                <Layout>
                  <InsightJourney />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/journey/individual-profile"
            element={
              <AuthGuard>
                <IndividualProfileFlow />
              </AuthGuard>
            }
          />
          <Route
            path="/report"
            element={
              <AuthGuard>
                <Layout>
                  <ReportViewer />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <Layout>
                  <ProfileSettings />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/members"
            element={
              <AuthGuard>
                <Layout>
                  <ManageMembers />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/household-access"
            element={
              <AuthGuard>
                <Layout>
                  <HouseholdMembersPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/professional-access"
            element={
              <AuthGuard>
                <Layout>
                  <ProfessionalAccessManagement />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/ui-preferences"
            element={
              <AuthGuard>
                <UIPreferencesSettings />
              </AuthGuard>
            }
          />
          <Route
            path="/settings/meal-preferences"
            element={
              <AuthGuard>
                <Layout>
                  <MealPreferences />
                </Layout>
              </AuthGuard>
            }
          />

          <Route
            path="/messages"
            element={
              <AuthGuard>
                <Layout>
                  <ConversationListPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/messages/new"
            element={
              <AuthGuard>
                <Layout>
                  <NewConversationPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <AuthGuard>
                <Layout>
                  <ConversationPage />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/messages/:conversationId/add"
            element={
              <AuthGuard>
                <Layout>
                  <AddParticipantsPage />
                </Layout>
              </AuthGuard>
            }
          />

          <Route
            path="/brain-profile/onboarding"
            element={
              <AuthGuard>
                <BrainProfileOnboarding />
              </AuthGuard>
            }
          />
          <Route
            path="/brain-profile/cards"
            element={
              <AuthGuard>
                <BrainProfileCards />
              </AuthGuard>
            }
          />

          <Route
            path="/professional/onboarding"
            element={
              <AuthGuard>
                <ProfessionalOnboarding />
              </AuthGuard>
            }
          />
          <Route
            path="/professional/dashboard"
            element={
              <AuthGuard>
                <Layout>
                  <ProfessionalDashboard />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/professional/households/:householdId"
            element={
              <AuthGuard>
                <Layout>
                  <ProfessionalHouseholdInsights />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/professional/request-access"
            element={
              <AuthGuard>
                <Layout>
                  <ProfessionalRequestAccess />
                </Layout>
              </AuthGuard>
            }
          />

          <Route
            path="/guardrails/focus"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <FocusModeStart />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/focus/live"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <FocusModeLive />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/focus/summary/:sessionId"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <SessionSummaryPage />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/focus/sessions"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <FocusSessionsHistory />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/guardrails/focus/analytics"
            element={
              <AuthGuard>
                <GuardrailsLayout>
                  <RequireActiveProjectADC>
                    <FocusAnalytics />
                  </RequireActiveProjectADC>
                </GuardrailsLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireRole role="admin">
                <AdminUsers />
              </RequireRole>
            }
          />
          <Route
            path="/admin/households"
            element={
              <RequireRole role="admin">
                <AdminHouseholds />
              </RequireRole>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RequireRole role="admin">
                <AdminReports />
              </RequireRole>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <RequireRole role="admin">
                <AdminAnalytics />
              </RequireRole>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <RequireRole role="admin">
                <AdminLogs />
              </RequireRole>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireRole role="admin">
                <AdminSettings />
              </RequireRole>
            }
          />
          <Route
            path="/admin/ai-providers"
            element={
              <RequireRole role="admin">
                <AdminAIProvidersPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/ai-routing"
            element={
              <RequireRole role="admin">
                <AdminAIRoutingPage />
              </RequireRole>
            }
          />

          <Route path="/admin/guardrails" element={<AdminGuardrailsLayout />}>
            <Route path="project-types" element={<AdminProjectTypesPage />} />
            <Route path="templates" element={<AdminTemplatesPage />} />
            <Route path="subtracks" element={<AdminSubtracksPage />} />
            <Route path="tags" element={<AdminTagsPage />} />
            <Route path="template-tags" element={<AdminTemplateTagsPage />} />
            <Route path="project-type-tags" element={<AdminProjectTypeTagsPage />} />
            <Route path="template-subtracks" element={<AdminTemplateSubtracksPage />} />
          </Route>

          <Route
            path="/regulation"
            element={
              <Stage3ErrorBoundary fallbackRoute="/dashboard">
                <AuthGuard>
                  <Layout>
                    <RegulationHubTabbed />
                  </Layout>
                </AuthGuard>
              </Stage3ErrorBoundary>
            }
          />
          <Route
            path="/regulation/signals/:signalId"
            element={
              <Stage3ErrorBoundary fallbackRoute="/regulation">
                <AuthGuard>
                  <Layout>
                    <SignalDetailPage />
                  </Layout>
                </AuthGuard>
              </Stage3ErrorBoundary>
            }
          />
          <Route
            path="/regulation/create"
            element={
              <Stage3ErrorBoundary fallbackRoute="/regulation">
                <AuthGuard>
                  <Layout>
                    <CreateInterventionFlow />
                  </Layout>
                </AuthGuard>
              </Stage3ErrorBoundary>
            }
          />
          <Route
            path="/regulation/edit/:id"
            element={
              <Stage3ErrorBoundary fallbackRoute="/regulation">
                <AuthGuard>
                  <Layout>
                    <EditInterventionPage />
                  </Layout>
                </AuthGuard>
              </Stage3ErrorBoundary>
            }
          />
          <Route
            path="/regulation/use"
            element={
              <Stage3ErrorBoundary fallbackRoute="/regulation">
                <AuthGuard>
                  <Layout>
                    <RegulationUsePage />
                  </Layout>
                </AuthGuard>
              </Stage3ErrorBoundary>
            }
          />
          <Route
            path="/regulation/contexts"
            element={
              <Stage3ErrorBoundary fallbackRoute="/regulation">
                <AuthGuard>
                  <Layout>
                    <ContextsPage />
                  </Layout>
                </AuthGuard>
              </Stage3ErrorBoundary>
            }
          />
          <Route
            path="/regulation/governance"
            element={
              <Stage3ErrorBoundary fallbackRoute="/regulation">
                <AuthGuard>
                  <Layout>
                    <GovernancePanel />
                  </Layout>
                </AuthGuard>
              </Stage3ErrorBoundary>
            }
          />
          <Route
            path="/regulation/testing"
            element={
              <Stage3ErrorBoundary fallbackRoute="/regulation">
                <AuthGuard>
                  <Layout>
                    <TestingModePage />
                  </Layout>
                </AuthGuard>
              </Stage3ErrorBoundary>
            }
          />

          {/* Legacy redirects for old intervention routes */}
          <Route path="/interventions" element={<Navigate to="/regulation" replace />} />
          <Route path="/interventions/create" element={<Navigate to="/regulation/create" replace />} />
          <Route path="/interventions/edit/:id" element={<Navigate to="/regulation/edit/:id" replace />} />
          <Route path="/interventions/use" element={<Navigate to="/regulation/use" replace />} />
          <Route path="/interventions/triggers" element={<Navigate to="/regulation/contexts" replace />} />
          <Route path="/interventions/governance" element={<Navigate to="/regulation/governance" replace />} />
          <Route
            path="/behavioral-insights"
            element={
              <AuthGuard>
                <Layout>
                  <BehavioralInsightsDashboard />
                </Layout>
              </AuthGuard>
            }
          />

          {/* Personal Planner Routes */}
          <Route
            path="/planner"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerIndex />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/index"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerIndex />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/daily"
            element={
              <AuthGuard>
                <Layout>
                  <ErrorBoundary
                    context="Planner Daily"
                    fallbackRoute="/planner"
                    errorMessage="An error occurred while loading the daily planner."
                  >
                    <PlannerDailyV2 />
                  </ErrorBoundary>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/weekly"
            element={
              <AuthGuard>
                <Layout>
                  <ErrorBoundary
                    context="Planner Weekly"
                    fallbackRoute="/planner"
                    errorMessage="An error occurred while loading the weekly planner."
                  >
                    <PlannerWeekly />
                  </ErrorBoundary>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/monthly"
            element={
              <AuthGuard>
                <Layout>
                  <ErrorBoundary
                    context="Planner Monthly"
                    fallbackRoute="/planner"
                    errorMessage="An error occurred while loading the monthly planner."
                  >
                    <PlannerMonthly />
                  </ErrorBoundary>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/quarterly"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerQuarterly />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/personal"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerPersonal />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/work"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerWork />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/work/daily"
            element={
              <AuthGuard>
                <Layout>
                  <DailyWorkFlow />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/work/weekly"
            element={
              <AuthGuard>
                <Layout>
                  <WeeklyFocus />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/work/projects"
            element={
              <AuthGuard>
                <Layout>
                  <ProjectHub />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/work/tasks"
            element={
              <AuthGuard>
                <Layout>
                  <TaskActionLists />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/work/communications"
            element={
              <AuthGuard>
                <Layout>
                  <Communications />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/work/career"
            element={
              <AuthGuard>
                <Layout>
                  <CareerDevelopment />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/work/notes"
            element={
              <AuthGuard>
                <Layout>
                  <WorkNotes />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/education"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerEducation />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/education/schedule"
            element={
              <AuthGuard>
                <Layout>
                  <LearningSchedule />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/education/assignments"
            element={
              <AuthGuard>
                <Layout>
                  <Assignments />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/education/courses"
            element={
              <AuthGuard>
                <Layout>
                  <CourseInfo />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/education/revision"
            element={
              <AuthGuard>
                <Layout>
                  <RevisionReview />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/education/projects"
            element={
              <AuthGuard>
                <Layout>
                  <ResearchProjects />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/education/progress"
            element={
              <AuthGuard>
                <Layout>
                  <ProgressMetrics />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/education/resources"
            element={
              <AuthGuard>
                <Layout>
                  <ReadingResources />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/education/lesson"
            element={
              <AuthGuard>
                <Layout>
                  <LessonPlanning />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/finance"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerFinance />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/finance/overview"
            element={
              <AuthGuard>
                <Layout>
                  <FinancialOverview />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/finance/income"
            element={
              <AuthGuard>
                <Layout>
                  <IncomeAndCashFlow />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/finance/expenses"
            element={
              <AuthGuard>
                <Layout>
                  <SpendingAndExpenses />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/finance/savings"
            element={
              <AuthGuard>
                <Layout>
                  <SavingsAndSafetyNets />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/finance/investments"
            element={
              <AuthGuard>
                <Layout>
                  <InvestmentsAndAssets />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/finance/debts"
            element={
              <AuthGuard>
                <Layout>
                  <DebtsAndCommitments />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/finance/insurance"
            element={
              <AuthGuard>
                <Layout>
                  <ProtectionAndInsurance />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/finance/retirement"
            element={
              <AuthGuard>
                <Layout>
                  <RetirementPlanning />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/finance/reflection"
            element={
              <AuthGuard>
                <Layout>
                  <FinancialReflection />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/budget"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerBudget />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/vision"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerVision />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/vision/life"
            element={
              <AuthGuard>
                <Layout>
                  <LifeVision />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/vision/goals"
            element={
              <AuthGuard>
                <Layout>
                  <LongTermGoals />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/vision/five-year"
            element={
              <AuthGuard>
                <Layout>
                  <FiveYearOutlook />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/vision/areas"
            element={
              <AuthGuard>
                <Layout>
                  <VisionAreas />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/vision/board"
            element={
              <AuthGuard>
                <Layout>
                  <VisionBoard />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/vision/checkin"
            element={
              <AuthGuard>
                <Layout>
                  <MonthlyCheckin />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/vision/career"
            element={
              <AuthGuard>
                <Layout>
                  <CareerPurpose />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/vision/relationships"
            element={
              <AuthGuard>
                <Layout>
                  <RelationshipVision />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/vision/values"
            element={
              <AuthGuard>
                <Layout>
                  <ValuesAlignment />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/planning"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerPlanning />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/planning/goals"
            element={
              <AuthGuard>
                <Layout>
                  <GoalPlanner />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/planning/priorities"
            element={
              <AuthGuard>
                <Layout>
                  <PriorityPlanner />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/planning/todos"
            element={
              <AuthGuard>
                <Layout>
                  <UnifiedTodoList />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/planning/events"
            element={
              <AuthGuard>
                <Layout>
                  <EventPlanner />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/planning/weekly"
            element={
              <AuthGuard>
                <Layout>
                  <WeeklyOverview />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/planning/daily"
            element={
              <AuthGuard>
                <Layout>
                  <DailyTimeline />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/planning/goal-actions"
            element={
              <AuthGuard>
                <Layout>
                  <GoalActionPlan />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/household"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerHousehold />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/household/meals"
            element={
              <AuthGuard>
                <Layout>
                  <HouseholdMeals />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/household/overview"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerShell>
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Household Overview</h2>
                        <p className="text-slate-600">Coming soon</p>
                      </div>
                    </div>
                  </PlannerShell>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/household/chores"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerShell>
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Chores & Responsibilities</h2>
                        <p className="text-slate-600">Coming soon</p>
                      </div>
                    </div>
                  </PlannerShell>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/household/groceries"
            element={
              <AuthGuard>
                <Layout>
                  <HouseholdGroceries />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/household/cleaning"
            element={
              <AuthGuard>
                <Layout>
                  <HouseholdCleaning />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/household/appointments"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerShell>
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Appointments & Events</h2>
                        <p className="text-slate-600">Coming soon</p>
                      </div>
                    </div>
                  </PlannerShell>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/household/calendar"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerShell>
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Family Calendar</h2>
                        <p className="text-slate-600">Coming soon</p>
                      </div>
                    </div>
                  </PlannerShell>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/household/notes"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerShell>
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Household Notes</h2>
                        <p className="text-slate-600">Coming soon</p>
                      </div>
                    </div>
                  </PlannerShell>
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/selfcare"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerSelfCare />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/selfcare/goals"
            element={
              <AuthGuard>
                <Layout>
                  <WellnessGoals />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/selfcare/exercise"
            element={
              <AuthGuard>
                <Layout>
                  <ExerciseTracker />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/selfcare/mental"
            element={
              <AuthGuard>
                <Layout>
                  <MentalHealthCheckins />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/selfcare/nutrition"
            element={
              <AuthGuard>
                <Layout>
                  <NutritionLog />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/selfcare/sleep"
            element={
              <AuthGuard>
                <Layout>
                  <SleepTracker />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/selfcare/mindfulness"
            element={
              <AuthGuard>
                <Layout>
                  <MindfulnessMeditation />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/selfcare/routines"
            element={
              <AuthGuard>
                <Layout>
                  <SelfCareRoutines />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/selfcare/gratitude"
            element={
              <AuthGuard>
                <Layout>
                  <GratitudeJournal />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/selfcare/beauty"
            element={
              <AuthGuard>
                <Layout>
                  <BeautyRoutines />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/selfcare/rest"
            element={
              <AuthGuard>
                <Layout>
                  <RestRecovery />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/travel/new"
            element={
              <AuthGuard>
                <CreateTripPage />
              </AuthGuard>
            }
          />
          <Route
            path="/planner/travel/:tripId"
            element={
              <AuthGuard>
                <TripDetailPage />
              </AuthGuard>
            }
          />
          <Route
            path="/planner/travel"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerTravel />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/review"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerReview />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/areas"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerAreas />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/social"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerSocial />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/planner/journal"
            element={
              <AuthGuard>
                <Layout>
                  <PlannerJournal />
                </Layout>
              </AuthGuard>
            }
          />
          {/* Phase 8B: Catch-all route for unmatched paths */}
          <Route
            path="*"
            element={<NotFoundRedirect />}
          />
                              </Routes>
                            </AppRouteGuard>
                          </NetworkStatusProvider>
                        </ForegroundTriggersProvider>
                        </AIChatWidgetProvider>
                      </EncryptionProvider>
                    </FocusSessionProvider>
                  </RegulationProvider>
                </ActiveTrackProvider>
              </ActiveProjectProvider>
            </UIPreferencesProvider>
          </ActiveDataProvider>
        </ViewAsProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
    </>
  );
}

// Phase 8: Main App component with boot system and error boundary
function App() {
  return (
    <AppErrorBoundary>
      <AppBootProvider>
        <AppContent />
      </AppBootProvider>
    </AppErrorBoundary>
  );
}

export default App;

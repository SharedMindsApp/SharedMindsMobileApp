import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { ProjectWizardProvider, useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { useActiveProject } from '../../../contexts/ActiveProjectContext';
import { setActiveProjectId } from '../../../state/activeDataContext';
import { WizardProgress } from './WizardProgress';
import { WizardFooter } from './WizardFooter';
import { WizardContextDisplay } from './WizardContextDisplay';
import { WizardStepDomainSelect } from './WizardStepDomainSelect';
import { WizardStepProjectTypeSelect } from './WizardStepProjectTypeSelect';
import { WizardStepTemplateSelect } from './WizardStepTemplateSelect';
import { WizardStepProjectDetails } from './WizardStepProjectDetails';
import { WizardStepIdeaIntake } from './WizardStepIdeaIntake';
import { WizardStepGoals } from './WizardStepGoals';
import { WizardStepClarification } from './WizardStepClarification';
import { WizardStepVersionChoice } from './WizardStepVersionChoice';
import { WizardStepReview } from './WizardStepReview';
import { createProjectWithWizard, addTracksToProject, getMasterProjectById, getDomains } from '../../../lib/guardrails';
import { markWizardCompleted, markWizardSkipped } from '../../../lib/guardrails/wizardHelpers';
import { mapDomainToTemplateType } from '../../../lib/guardrails/templates';
import type { DomainType } from '../../../lib/guardrails/templateTypes';
import { createProjectFromDraft } from '../../../lib/guardrails/wizardDraftCreation';
import { getAppliedTemplateIdsForProject } from '../../../lib/guardrails/wizard';
import { getProjectLifecyclePhase } from '../../../lib/guardrails/projectLifecycle';
import type { MasterProject } from '../../../lib/guardrailsTypes';

// Phase 1 (Intent) steps - Domain, Project Type, Details, Idea, Goals, Clarify, Review
const PHASE_1_STEPS = [
  { number: 1, label: 'Domain' },
  { number: 2, label: 'Project Type' },
  { number: 3, label: 'Details' },
  { number: 4, label: 'Idea' },
  { number: 5, label: 'Goals' },
  { number: 6, label: 'Clarify' },
  { number: 7, label: 'Review' },
];

// Legacy steps for backward compatibility (when not in phase-aware mode)
const LEGACY_WIZARD_STEPS = [
  { number: 1, label: 'Domain' },
  { number: 2, label: 'Project Type' },
  { number: 3, label: 'Templates' },
  { number: 4, label: 'Details' },
  { number: 5, label: 'Idea' },
  { number: 6, label: 'Clarify' },
  { number: 7, label: 'Version' },
  { number: 8, label: 'Review' },
];

function ProjectWizardContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, isExistingProject, setCurrentStep, canProceedToNextStep, resetWizard, setExistingProjectId, setDomain, setProjectName, setProjectDescription, setProjectType, setSelectedDefaultTemplateIds, setSelectedSystemTemplateIds, setSelectedUserTemplateIds, getMinStep, changeDomainAndGoBack } = useProjectWizard();
  const { setActiveProject } = useActiveProject();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState<MasterProject | null>(null);

  // Determine which phase we're in and which steps to use
  const lifecyclePhase = currentProject ? getProjectLifecyclePhase(currentProject) : 'intent';
  const isPhase1 = lifecyclePhase === 'intent' || lifecyclePhase === 'intent_checked';
  const WIZARD_STEPS = isPhase1 ? PHASE_1_STEPS : LEGACY_WIZARD_STEPS;

  useEffect(() => {
    async function loadExistingProject() {
      const projectId = searchParams.get('project');

      if (projectId) {
        try {
          const project = await getMasterProjectById(projectId);
          if (project) {
            setCurrentProject(project);
            const domains = await getDomains();
            const projectDomain = domains.find(d => d.id === project.domain_id);

            if (projectDomain) {
              const mappedDomainType = mapDomainToTemplateType(projectDomain.name);
              setExistingProjectId(projectId);
              setDomain(project.domain_id, mappedDomainType);
              setProjectName(project.name);
              setProjectDescription(project.description || '');
              
              // Load project type if it exists
              if (project.project_type_id) {
                setProjectType(project.project_type_id);
              }
              
              // Only load templates if we're in Phase 2 (feasibility)
              const phase = getProjectLifecyclePhase(project);
              if (phase === 'feasibility' || phase === 'feasibility_checked') {
                try {
                  const appliedTemplates = await getAppliedTemplateIdsForProject(projectId, mappedDomainType);
                  setSelectedDefaultTemplateIds(appliedTemplates.defaultTemplateIds);
                  setSelectedSystemTemplateIds(appliedTemplates.systemTemplateIds);
                  setSelectedUserTemplateIds(appliedTemplates.userTemplateIds);
                } catch (err) {
                  console.error('Failed to load applied templates:', err);
                }
              }
              
              // Set initial step based on phase
              const isPhase1 = phase === 'intent' || phase === 'intent_checked';
              setCurrentStep(isPhase1 ? 1 : 2);
            }
          }
        } catch (err) {
          console.error('Failed to load project:', err);
          setError('Failed to load project');
        }
      }

      setLoading(false);
    }

    loadExistingProject();
  }, [searchParams, setExistingProjectId, setDomain, setProjectName, setProjectDescription, setProjectType, setSelectedDefaultTemplateIds, setSelectedSystemTemplateIds, setSelectedUserTemplateIds, setCurrentStep]);

  const handleBack = () => {
    const minStep = getMinStep();

    if (state.currentStep > minStep) {
      if (state.currentStep === 2) {
        changeDomainAndGoBack();
      } else if (state.aiDisabledForSession && state.currentStep === 8) {
        setCurrentStep(4);
      } else {
        setCurrentStep(state.currentStep - 1);
      }
      setError(null);
    }
  };

  const handleNext = async () => {
    if (!canProceedToNextStep()) return;

    const maxStep = WIZARD_STEPS.length;
    if (state.currentStep < maxStep) {
      if (isPhase1) {
        // Phase 1: Go through intent steps (Domain, Project Type, Details, Idea, Goals, Clarify, Review)
        if (state.aiDisabledForSession && state.currentStep === 3) {
          // Skip from Details to Review (when AI disabled, skip Idea, Goals, Clarify)
          setCurrentStep(7);
        } else {
          setCurrentStep(state.currentStep + 1);
        }
      } else {
        // Legacy mode: original behavior
        if (state.aiDisabledForSession && state.currentStep === 4) {
          setCurrentStep(8);
        } else {
          setCurrentStep(state.currentStep + 1);
        }
      }
      setError(null);
    } else {
      await handleCreateProject();
    }
  };

  const handleSkip = async () => {
    try {
      await markWizardSkipped();
      navigate('/guardrails');
    } catch (error) {
      console.error('Failed to skip wizard:', error);
      navigate('/guardrails');
    }
  };

  const handleBackToDashboard = () => {
    resetWizard();
    navigate('/guardrails/dashboard');
  };

  const handleCreateProject = async () => {
    if (!state.domainId || !state.domainType) {
      setError('Domain information is missing');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const validDefaultIds = state.selectedDefaultTemplateIds.filter((id): id is string => !!id);
      const validSystemIds = state.selectedSystemTemplateIds.filter((id): id is string => !!id);
      const validUserIds = state.selectedUserTemplateIds.filter((id): id is string => !!id);

      const hasAIDraft = !!state.aiStructureDraft && !state.aiDisabledForSession;

      if (state.existingProjectId) {
        if (hasAIDraft) {
          const draftResult = await createProjectFromDraft({
            projectId: state.existingProjectId,
            draft: state.aiStructureDraft!,
            includeNodes: state.includeNodes,
            includeRoadmapItems: state.includeRoadmapItems,
            includeMilestones: state.includeMilestones,
          });

          if (!draftResult.success) {
            console.warn('[WIZARD] Project creation completed with errors:', draftResult.errors);
          }
        } else {
          await addTracksToProject({
            project_id: state.existingProjectId,
            domain_type: state.domainType,
            use_default_templates: validDefaultIds.length > 0,
            selected_default_template_ids: validDefaultIds,
            selected_system_template_ids: validSystemIds,
            selected_user_template_ids: validUserIds,
          });
        }

        const updatedProject = await getMasterProjectById(state.existingProjectId);
        if (updatedProject) {
          setActiveProject(updatedProject);
          setActiveProjectId(updatedProject.id, updatedProject.domain_id);
        }

        resetWizard();
        navigate(hasAIDraft
          ? `/guardrails/projects/${state.existingProjectId}/welcome`
          : `/guardrails/dashboard`
        );
      } else {
        if (hasAIDraft) {
          const result = await createProjectWithWizard({
            domain_id: state.domainId,
            domain_type: state.domainType,
            name: state.projectName,
            description: state.projectDescription || undefined,
            use_default_templates: false,
            selected_default_template_ids: [],
            selected_system_template_ids: [],
            selected_user_template_ids: [],
            generate_initial_roadmap: false,
          });

          const draftResult = await createProjectFromDraft({
            projectId: result.project.id,
            draft: state.aiStructureDraft!,
            includeNodes: state.includeNodes,
            includeRoadmapItems: state.includeRoadmapItems,
            includeMilestones: state.includeMilestones,
          });

          if (!draftResult.success) {
            console.warn('[WIZARD] Project creation completed with errors:', draftResult.errors);
          }

          await markWizardCompleted();

          setActiveProject(result.project);
          setActiveProjectId(result.project.id, result.project.domain_id);

          resetWizard();

          navigate(`/guardrails/projects/${result.project.id}/welcome`);
        } else {
          const result = await createProjectWithWizard({
            domain_id: state.domainId,
            domain_type: state.domainType,
            name: state.projectName,
            description: state.projectDescription || undefined,
            use_default_templates: validDefaultIds.length > 0,
            selected_default_template_ids: validDefaultIds,
            selected_system_template_ids: validSystemIds,
            selected_user_template_ids: validUserIds,
            generate_initial_roadmap: state.generateInitialRoadmap,
          });

          await markWizardCompleted();

          setActiveProject(result.project);
          setActiveProjectId(result.project.id, result.project.domain_id);

          resetWizard();

          navigate(`/guardrails/dashboard`);
        }
      }
    } catch (err: any) {
      console.error('Failed to complete wizard:', err);
      setError(err.message || 'Failed to complete wizard. Please try again.');
      setIsCreating(false);
    }
  };

  const renderStep = () => {
    if (isPhase1) {
      // Phase 1 (Intent): Domain, Project Type, Details, Idea, Clarify, Review
      if (state.aiDisabledForSession) {
        switch (state.currentStep) {
          case 1:
            return <WizardStepDomainSelect />;
          case 2:
            return <WizardStepProjectTypeSelect />;
          case 3:
            return <WizardStepProjectDetails />;
          case 6:
            return <WizardStepReview />;
          default:
            return null;
        }
      }

      switch (state.currentStep) {
        case 1:
          return <WizardStepDomainSelect />;
        case 2:
          return <WizardStepProjectTypeSelect />;
        case 3:
          return <WizardStepProjectDetails />;
        case 4:
          return <WizardStepIdeaIntake />;
        case 5:
          return <WizardStepGoals />;
        case 6:
          return <WizardStepClarification />;
        case 7:
          return <WizardStepReview />;
        default:
          return null;
      }
    } else {
      // Legacy mode: Original step mapping
      if (state.aiDisabledForSession) {
        switch (state.currentStep) {
          case 1:
            return <WizardStepDomainSelect />;
          case 2:
            return <WizardStepProjectTypeSelect />;
          case 3:
            return <WizardStepTemplateSelect />;
          case 4:
            return <WizardStepProjectDetails />;
          case 8:
            return <WizardStepReview />;
          default:
            return null;
        }
      }

      switch (state.currentStep) {
        case 1:
          return <WizardStepDomainSelect />;
        case 2:
          return <WizardStepProjectTypeSelect />;
        case 3:
          return <WizardStepTemplateSelect />;
        case 4:
          return <WizardStepProjectDetails />;
        case 5:
          return <WizardStepIdeaIntake />;
        case 6:
          return <WizardStepClarification />;
        case 7:
          return <WizardStepVersionChoice />;
        case 8:
          return <WizardStepReview />;
        default:
          return null;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wizard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {isExistingProject ? 'Complete Project Setup' : 'Create Your First Project'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isExistingProject
                  ? 'Add tracks and subtracks to your project'
                  : 'Set up a structured project with tracks and subtracks'}
              </p>
              <div className="mt-3">
                <WizardContextDisplay />
              </div>
            </div>
            <button
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </button>
          </div>
        </div>

        <WizardProgress currentStep={state.currentStep} steps={WIZARD_STEPS} />
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-900">Error creating project</div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-20">
        {renderStep()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg z-10">
        <WizardFooter
          currentStep={state.currentStep}
          totalSteps={WIZARD_STEPS.length}
          canProceed={canProceedToNextStep()}
          isLastStep={state.currentStep === WIZARD_STEPS.length}
          isLoading={isCreating}
          onBack={handleBack}
          onNext={handleNext}
          onSkip={!isExistingProject ? handleSkip : undefined}
          minStep={getMinStep()}
          isExistingProject={isExistingProject}
        />
      </div>
    </div>
  );
}

export function ProjectWizard() {
  return (
    <ProjectWizardProvider>
      <ProjectWizardContent />
    </ProjectWizardProvider>
  );
}

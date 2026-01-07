import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface WizardFooterProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  isLastStep: boolean;
  isLoading: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  minStep?: number;
  isExistingProject?: boolean;
}

export function WizardFooter({
  currentStep,
  totalSteps,
  canProceed,
  isLastStep,
  isLoading,
  onBack,
  onNext,
  onSkip,
  minStep = 1,
  isExistingProject = false,
}: WizardFooterProps) {
  return (
    <div className="border-t bg-white px-6 py-4">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentStep > minStep && (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              {currentStep === 2 ? 'Change Domain' : 'Back'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onSkip && currentStep < totalSteps && (
            <button
              type="button"
              onClick={onSkip}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Skip for now
            </button>
          )}

          <button
            type="button"
            onClick={onNext}
            disabled={!canProceed || isLoading}
            className={`
              flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded-lg transition-all
              ${
                canProceed && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isExistingProject ? 'Applying...' : 'Creating...'}
              </>
            ) : isLastStep ? (
              isExistingProject ? 'Complete Setup' : 'Create Project'
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

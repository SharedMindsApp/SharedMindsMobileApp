import { Check } from 'lucide-react';

interface WizardProgressProps {
  currentStep: number;
  steps: Array<{ number: number; label: string }>;
}

export function WizardProgress({ currentStep, steps }: WizardProgressProps) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between max-w-3xl mx-auto px-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center relative flex-1">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${
                    currentStep > step.number
                      ? 'bg-green-600 text-white'
                      : currentStep === step.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }
                `}
              >
                {currentStep > step.number ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium whitespace-nowrap
                  ${
                    currentStep >= step.number
                      ? 'text-gray-900'
                      : 'text-gray-500'
                  }
                `}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`
                  h-1 flex-1 mx-2 transition-all
                  ${
                    currentStep > step.number
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                  }
                `}
                style={{ marginTop: '-32px' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

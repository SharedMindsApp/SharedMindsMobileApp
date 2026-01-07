import React, { useState, useEffect, useRef } from 'react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import type { ClarifySignals } from '../../../contexts/ProjectWizardContext';

// Question definitions following the design brief
interface ClarifyQuestion {
  id: keyof ClarifySignals;
  prompt: string;
  options: string[];
  contextKey: keyof ClarifySignals;
}

const CLARIFY_QUESTIONS: ClarifyQuestion[] = [
  {
    id: 'timeExpectation',
    prompt: 'How long do you expect this project to take to show meaningful progress?',
    options: [
      'Less than 2 weeks',
      '1–2 months',
      '3–6 months',
      '6–12 months',
      'Longer than a year',
      'Not sure yet',
    ],
    contextKey: 'timeExpectationContext',
  },
  {
    id: 'weeklyCommitment',
    prompt: 'Roughly how much time can you realistically dedicate each week?',
    options: [
      'Less than 2 hours',
      '2–5 hours',
      '5–10 hours',
      '10–20 hours',
      'More than 20 hours',
      'Not sure',
    ],
    contextKey: 'weeklyCommitmentContext',
  },
  {
    id: 'experienceLevel',
    prompt: 'How much experience do you already have in this area?',
    options: [
      'None at all',
      'Some personal experience',
      'Informal or hobby-level experience',
      'Professional or structured experience',
      'Expert-level experience',
    ],
    contextKey: 'experienceLevelContext',
  },
  {
    id: 'dependencyLevel',
    prompt: 'Does this project depend on other people, approval, or external systems to move forward?',
    options: [
      'No, I can do this mostly independently',
      'Yes, but only lightly',
      'Yes, significantly',
      "I'm not sure yet",
    ],
    contextKey: 'dependencyLevelContext',
  },
  {
    id: 'resourceAssumption',
    prompt: 'Do you expect this project to require money, equipment, or paid support?',
    options: [
      'No',
      'Yes, but minimal',
      'Yes, a moderate amount',
      'Yes, a significant amount',
      'Not sure yet',
    ],
    contextKey: 'resourceAssumptionContext',
  },
  {
    id: 'scopeClarity',
    prompt: 'How clearly defined do you feel the scope of this project is right now?',
    options: [
      'Very clear and contained',
      'Mostly clear, some unknowns',
      'Quite open-ended',
      'Very open-ended',
      "I haven't defined the scope yet",
    ],
    contextKey: 'scopeClarityContext',
  },
];

export function WizardStepClarification() {
  const { state, setClarifySignals, setCurrentStep } = useProjectWizard();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<ClarifySignals>>(
    state.clarifySignals || {}
  );
  const hasLoadedRef = useRef(false);

  // Load saved answers on mount
  useEffect(() => {
    if (state.clarifySignals && !hasLoadedRef.current) {
      setAnswers(state.clarifySignals);
      hasLoadedRef.current = true;
    }
  }, [state.clarifySignals]);

  // Auto-save answers whenever they change
  useEffect(() => {
    // Only save if we have at least one answer
    const hasAnyAnswer = Object.values(answers).some(
      (value) => value !== null && value !== undefined && value !== ''
    );
    if (hasAnyAnswer || hasLoadedRef.current) {
      setClarifySignals(answers as ClarifySignals);
    }
  }, [answers, setClarifySignals]);

  const currentQuestion = CLARIFY_QUESTIONS[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id] || null;
  const currentContext = answers[currentQuestion.contextKey] || '';

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleContextChange = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.contextKey]: value,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < CLARIFY_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions shown, proceed to next step
      handleContinue();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleContinue = () => {
    // Save final answers
    setClarifySignals(answers as ClarifySignals);
    setCurrentStep(state.currentStep + 1);
  };

  const handleSkip = () => {
    // Allow skipping - save whatever answers we have
    setClarifySignals(answers as ClarifySignals);
    setCurrentStep(state.currentStep + 1);
  };

  const answeredCount = CLARIFY_QUESTIONS.filter(
    (q) => answers[q.id]
  ).length;
  const canProceed = answeredCount > 0;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Clarify Your Project
        </h2>
        <p className="text-gray-600">
          Help us understand the shape of your project by answering a few questions.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <span>
            Question {currentQuestionIndex + 1} of {CLARIFY_QUESTIONS.length}
          </span>
          {answeredCount > 0 && (
            <>
              <span>•</span>
              <span>{answeredCount} answered</span>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {currentQuestion.prompt}
          </h3>

          <div className="space-y-2">
            {currentQuestion.options.map((option) => (
              <label
                key={option}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  currentAnswer === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-900 flex-1">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional context (optional)
          </label>
          <textarea
            value={currentContext}
            onChange={(e) => handleContextChange(e.target.value)}
            placeholder="Add any additional details that might be helpful..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
            rows={3}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Previous
        </button>

        <div className="flex items-center gap-3">
          {currentQuestionIndex < CLARIFY_QUESTIONS.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Next Question
            </button>
          ) : (
            <>
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleContinue}
                disabled={!canProceed}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 text-sm text-gray-500 text-center">
        These questions help surface assumptions and constraints. Answer as many as you can.
      </div>
    </div>
  );
}

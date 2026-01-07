/**
 * Phase 8: Intelligent Boot Screen
 * 
 * Replaces passive spinners with progress-aware boot screen.
 * Shows step-based messages and recovery options when loading exceeds thresholds.
 */

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, WifiOff, RefreshCw, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useAppBoot, LONG_LOADING_THRESHOLD_MS_EXPORT, FATAL_ERROR_THRESHOLD_MS_EXPORT } from '../contexts/AppBootContext';

const BOOT_STEPS = [
  { status: 'initializing', message: 'Starting app…' },
  { status: 'loading-assets', message: 'Loading saved data…' },
  { status: 'hydrating-session', message: 'Checking connection…' },
  { status: 'ready', message: 'Finalising setup…' },
] as const;

export function AppBootScreen() {
  const { state, retryBoot, resetApp, setStatus } = useAppBoot();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Phase 8: Progress through boot steps based on status
  useEffect(() => {
    const stepIndex = BOOT_STEPS.findIndex((step) => step.status === state.status);
    if (stepIndex >= 0) {
      setCurrentStepIndex(stepIndex);
    }
  }, [state.status]);

  const currentStep = BOOT_STEPS[currentStepIndex] || BOOT_STEPS[0];
  const showLongLoadingMessage = state.elapsedTime >= LONG_LOADING_THRESHOLD_MS_EXPORT;
  const showRecoveryOptions = state.elapsedTime >= FATAL_ERROR_THRESHOLD_MS_EXPORT || state.status === 'fatal-error';

  // Phase 8: Offline state
  if (state.status === 'offline') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4 z-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
          <WifiOff size={48} className="text-orange-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">You're Offline</h1>
          <p className="text-gray-600 mb-6">
            Some features may not work until you reconnect.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={retryBoot}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Retry Connection
            </button>
            <button
              onClick={() => {
                // Continue offline - transition to ready state
                setStatus('ready');
              }}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Continue Offline
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase 8: Update available state
  if (state.status === 'update-available') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 z-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
          <CheckCircle2 size={48} className="text-blue-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Update Available</h1>
          <p className="text-gray-600 mb-6">
            A new version of the app is ready. Update now to get the latest features.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Update Now
            </button>
            <button
              onClick={() => {
                // User chose to update later - continue with current version
                setStatus('ready');
              }}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase 8: Fatal error state
  if (state.status === 'fatal-error') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center p-4 z-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something Went Wrong</h1>
          <p className="text-gray-600 mb-2">
            Something went wrong while loading the app.
          </p>
          {state.errorCode && (
            <p className="text-xs text-gray-500 mb-6">
              Error code: {state.errorCode}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={retryBoot}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Retry
            </button>
            <button
              onClick={resetApp}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              Reset App
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase 8: Normal loading state
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4 z-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
        <Loader2 size={48} className="text-orange-500 mx-auto mb-4 animate-spin" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">{currentStep.message}</h1>
        
        {state.networkType === 'slow-2g' || state.networkType === '2g' ? (
          <p className="text-sm text-gray-600 mb-4">
            Optimising for your connection…
          </p>
        ) : null}

        {showLongLoadingMessage && !showRecoveryOptions && (
          <p className="text-sm text-amber-600 mb-4">
            This is taking longer than expected.
          </p>
        )}

        {showRecoveryOptions && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-4">
              The app is still loading. You can try:
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={retryBoot}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Reload App
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


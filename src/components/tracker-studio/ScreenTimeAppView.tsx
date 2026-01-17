/**
 * Screen Time App View
 * 
 * Full-screen app-like interface for Screen Time Tracker.
 * Displays app list, usage monitoring, and lockout configuration.
 * Designed to look and feel like a native mobile app.
 */

import { useState, useEffect } from 'react';
import { Smartphone, Lock, Bell, TrendingUp, Settings, Plus, Check, X as XIcon, Shield, Clock, AlertCircle, Link2, Loader2 } from 'lucide-react';
import type { Tracker } from '../../lib/trackerStudio/types';
import { AppListBrowser } from './screen-time/AppListBrowser';
import { AppSettingsModal } from './screen-time/AppSettingsModal';
import { ScreenTimeStatsPanel } from './screen-time/ScreenTimeStatsPanel';
import { LockoutSessionPanel } from './screen-time/LockoutSessionPanel';
import { getInstalledApps, requestAppUsagePermission } from '../../lib/trackerStudio/screenTimeNativeBridge';
import { startTrackingApp, stopTrackingApp, getTrackedApps, initializeAppUsageMonitoring, type TrackedApp } from '../../lib/trackerStudio/screenTimeTrackingService';

interface ScreenTimeAppViewProps {
  tracker: Tracker;
}

export interface InstalledApp {
  id: string;
  name: string;
  packageName?: string; // Android package or iOS bundle ID
  category: string;
  icon?: string; // Base64 or URL to app icon
}

export interface AppRule {
  appId: string;
  monitorUsage: boolean;
  notificationRule?: {
    enabled: boolean;
    trigger: 'visit_count' | 'time_limit' | 'daily_total';
    threshold: number; // e.g., 5 visits
    message?: string;
  };
  lockoutRule?: {
    enabled: boolean;
    trigger: 'visit_count_per_hour' | 'daily_time_limit' | 'schedule';
    threshold: number; // e.g., 3 visits per hour
    duration: number; // lockout duration in minutes
    cooldown?: number; // minutes before can unlock
  };
}

interface ScreenTimeAppViewState {
  installedApps: InstalledApp[];
  trackedApps: TrackedApp[];
  selectedApp: InstalledApp | null;
  showAppSelector: boolean;
  activeTab: 'apps' | 'stats' | 'sessions';
  isConnected: boolean;
  isConnecting: boolean;
}

export function ScreenTimeAppView({ tracker }: ScreenTimeAppViewProps) {
  const [state, setState] = useState<ScreenTimeAppViewState>({
    installedApps: [],
    trackedApps: [],
    selectedApp: null,
    showAppSelector: false,
    activeTab: 'apps',
    isConnected: false,
    isConnecting: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tracked apps on mount
  useEffect(() => {
    loadTrackedApps();
    checkConnection();
  }, [tracker.id]);

  // Initialize monitoring when tracked apps are loaded
  useEffect(() => {
    if (state.trackedApps.length > 0 && state.isConnected) {
      initializeAppUsageMonitoring(tracker.id).catch(err => {
        console.error('Failed to initialize monitoring:', err);
      });
    }
  }, [state.trackedApps, state.isConnected, tracker.id]);

  const checkConnection = async () => {
    try {
      // Check if native bridge is available
      const isAvailable = await checkNativeBridgeAvailable();
      setState(prev => ({ ...prev, isConnected: isAvailable }));
    } catch (err) {
      setState(prev => ({ ...prev, isConnected: false }));
    }
  };

  const handleConnectToPhone = async () => {
    try {
      setState(prev => ({ ...prev, isConnecting: true }));
      setError(null);

      // Request permissions
      const hasPermission = await requestAppUsagePermission();
      if (!hasPermission) {
        setError('App usage permission is required to track screen time. Please grant permission in your device settings.');
        return;
      }

      // Load installed apps from native bridge
      const apps = await getInstalledApps();
      
      setState(prev => ({
        ...prev,
        installedApps: apps,
        isConnected: true,
        showAppSelector: true,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to phone. Make sure you\'re using the native Shared Minds app.');
      console.error('Failed to connect:', err);
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  };

  const loadTrackedApps = async () => {
    try {
      const tracked = await getTrackedApps(tracker.id);
      setState(prev => ({ ...prev, trackedApps: tracked }));
    } catch (err) {
      console.error('Failed to load tracked apps:', err);
    }
  };

  const handleSelectApps = async (selectedApps: InstalledApp[]) => {
    try {
      setLoading(true);
      
      // Start tracking each selected app
      for (const app of selectedApps) {
        await startTrackingApp(tracker.id, {
          id: app.id,
          name: app.name,
          packageName: app.packageName,
          category: app.category,
        });
      }

      // Reload tracked apps
      await loadTrackedApps();
      setState(prev => ({ ...prev, showAppSelector: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start tracking apps');
      console.error('Failed to start tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStopTracking = async (appId: string) => {
    try {
      await stopTrackingApp(tracker.id, appId);
      await loadTrackedApps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop tracking');
      console.error('Failed to stop tracking:', err);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Smartphone size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Screen Time</h1>
                <p className="text-indigo-100 text-sm">Manage your app usage</p>
              </div>
            </div>
            <button
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'apps' }))}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                state.activeTab === 'apps'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-indigo-100 hover:bg-white/10'
              }`}
            >
              Apps
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'stats' }))}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                state.activeTab === 'stats'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-indigo-100 hover:bg-white/10'
              }`}
            >
              Stats
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, activeTab: 'sessions' }))}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                state.activeTab === 'sessions'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-indigo-100 hover:bg-white/10'
              }`}
            >
              Lockouts
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-amber-900 font-medium">{error}</p>
              <p className="text-amber-700 text-sm mt-1">
                To enable full functionality, connect to the native Shared Minds app.
              </p>
            </div>
          </div>
        )}

        {state.activeTab === 'apps' && (
          <div className="space-y-6">
            {/* Connect to Phone Button */}
            {!state.isConnected && (
              <div className="bg-white rounded-xl p-8 border-2 border-gray-200 text-center">
                <div className="mb-4">
                  <div className="inline-flex p-4 bg-indigo-100 rounded-full mb-4">
                    <Smartphone size={32} className="text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect to Your Phone</h2>
                  <p className="text-gray-600 mb-6">
                    Connect to your phone to automatically track app usage and screen time.
                  </p>
                  <button
                    onClick={handleConnectToPhone}
                    disabled={state.isConnecting}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    {state.isConnecting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Link2 size={20} />
                        <span>Connect to Phone</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* App Selection and Tracking */}
            {state.isConnected && (
              <AppListBrowser
                installedApps={state.installedApps}
                trackedApps={state.trackedApps}
                onSelectApps={handleSelectApps}
                onStopTracking={handleStopTracking}
                loading={loading}
                showAppSelector={state.showAppSelector}
                onCloseSelector={() => setState(prev => ({ ...prev, showAppSelector: !prev.showAppSelector }))}
              />
            )}
          </div>
        )}

        {state.activeTab === 'stats' && (
          <ScreenTimeStatsPanel tracker={tracker} />
        )}

        {state.activeTab === 'sessions' && (
          <LockoutSessionPanel tracker={tracker} />
        )}
      </div>

    </div>
  );
}

/**
 * Tracker App Widget
 * 
 * Full-featured tracker app view for Spaces. This provides a complete
 * tracker interface similar to Tracker Studio, but embedded in Spaces.
 */

import { useState, useEffect, useCallback } from 'react';
import { Calendar, BarChart3, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { useTracker } from '../../../hooks/trackerStudio/useTracker';
import { getEntryByDate } from '../../../lib/trackerStudio/trackerEntryService';
import { resolveTrackerPermissions } from '../../../lib/trackerStudio/trackerPermissionResolver';
import type { Tracker, TrackerEntry } from '../../../lib/trackerStudio/types';
import { TrackerEntryForm } from '../../tracker-studio/TrackerEntryForm';
import { TrackerEntryList } from '../../tracker-studio/TrackerEntryList';
import { TrackerAnalyticsPanel } from '../../tracker-studio/analytics/TrackerAnalyticsPanel';
import { getTrackerTheme } from '../../../lib/trackerStudio/trackerThemeUtils';
import type { TrackerContent } from '../../../lib/fridgeCanvasTypes';

interface TrackerAppWidgetProps {
  content: TrackerContent;
}

export function TrackerAppWidget({ content }: TrackerAppWidgetProps) {
  const { tracker, loading, error } = useTracker(content.tracker_id);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [existingEntry, setExistingEntry] = useState<TrackerEntry | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [permissions, setPermissions] = useState<{ canView: boolean; canEdit: boolean; canManage: boolean; isOwner: boolean; role: 'owner' | 'editor' | 'viewer' | null } | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const loadEntryForDate = useCallback(async () => {
    if (!tracker || !selectedDate) return;

    try {
      setLoadingEntry(true);
      const entry = await getEntryByDate(tracker.id, selectedDate);
      setExistingEntry(entry);
    } catch (err) {
      console.error('Failed to load entry:', err);
      setExistingEntry(null);
    } finally {
      setLoadingEntry(false);
    }
  }, [tracker, selectedDate]);

  useEffect(() => {
    if (tracker) {
      resolveTrackerPermissions(tracker.id).then(setPermissions);
    }
  }, [tracker]);

  useEffect(() => {
    if (tracker && selectedDate) {
      loadEntryForDate();
    }
  }, [tracker, selectedDate, loadEntryForDate]);

  const handleEntrySaved = () => {
    setRefreshKey(prev => prev + 1);
    loadEntryForDate();
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <div className="min-h-screen-safe bg-white safe-top safe-bottom flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading tracker...</p>
        </div>
      </div>
    );
  }

  if (error || !tracker) {
    return (
      <div className="min-h-screen-safe bg-white safe-top safe-bottom flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">{error || 'Tracker not found'}</p>
          <p className="text-sm text-gray-500">This tracker may have been deleted or you may not have access.</p>
        </div>
      </div>
    );
  }

  if (tracker.archived_at) {
    return (
      <div className="min-h-screen-safe bg-white safe-top safe-bottom flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-gray-600 font-medium mb-2">Tracker archived</p>
          <p className="text-sm text-gray-500">This tracker is no longer active.</p>
        </div>
      </div>
    );
  }

  const theme = getTrackerTheme(tracker);

  return (
    <div className="min-h-screen-safe bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm safe-top">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900 mb-1">{tracker.name}</h1>
          {tracker.description && (
            <p className="text-sm text-gray-600">{tracker.description}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Entry Form Section */}
        <div className={`bg-white rounded-2xl shadow-lg border-2 ${theme?.borderColor || 'border-gray-200'} p-4 sm:p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={20} className={theme?.iconColor || 'text-gray-600'} />
              Add Entry
            </h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {loadingEntry ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <TrackerEntryForm
              tracker={tracker}
              entryDate={selectedDate}
              existingEntry={existingEntry}
              onEntrySaved={handleEntrySaved}
              theme={theme}
            />
          )}
        </div>

        {/* Entry History Section */}
        <div className={`bg-white rounded-2xl shadow-lg border-2 ${theme?.borderColor || 'border-gray-200'} p-4 sm:p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={20} className={theme?.iconColor || 'text-gray-600'} />
              Entry History
            </h2>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                showAnalytics
                  ? `${theme?.buttonBg || 'bg-blue-600'} text-white shadow-md`
                  : `${theme?.accentBg || 'bg-gray-100'} ${theme?.accentText || 'text-gray-700'} hover:shadow-md`
              }`}
            >
              <BarChart3 size={16} />
              <span>{showAnalytics ? 'Hide' : 'Show'} Analytics</span>
            </button>
          </div>
          <TrackerEntryList key={refreshKey} tracker={tracker} theme={theme} />
        </div>

        {/* Analytics Section */}
        {showAnalytics && (
          <div className={`bg-white rounded-2xl shadow-lg border-2 ${theme?.borderColor || 'border-gray-200'} p-4 sm:p-6 animate-in fade-in slide-in-from-top-4 duration-300`}>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 size={20} className={theme?.iconColor || 'text-gray-600'} />
              Analytics
            </h2>
            <TrackerAnalyticsPanel tracker={tracker} />
          </div>
        )}
      </div>
    </div>
  );
}

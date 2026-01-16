import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Share2, Eye, Loader2, AlertCircle, Users, BarChart3, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { getTracker } from '../../lib/trackerStudio/trackerService';
import { getEntryByDate } from '../../lib/trackerStudio/trackerEntryService';
import { resolveTrackerPermissions } from '../../lib/trackerStudio/trackerPermissionResolver';
import type { Tracker, TrackerEntry } from '../../lib/trackerStudio/types';
import { TrackerEntryForm } from './TrackerEntryForm';
import { TrackerEntryList } from './TrackerEntryList';
import { TrackerSharingDrawer } from './TrackerSharingDrawer';
import { TrackerReminderSettings } from './TrackerReminderSettings';
import { InterpretationTimelinePanel } from './InterpretationTimelinePanel';
import { ShareTrackerToProjectModal } from './ShareTrackerToProjectModal';
import { TrackerObservationList } from './TrackerObservationList';
import { TrackerAnalyticsPanel } from './analytics/TrackerAnalyticsPanel';
import { getTrackerTheme } from '../../lib/trackerStudio/trackerThemeUtils';
import { isMoodTracker, shouldUseLowFrictionUX } from '../../lib/trackerStudio/emotionWords';

export function TrackerDetailPage() {
  const { trackerId } = useParams<{ trackerId: string }>();
  const navigate = useNavigate();
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [existingEntry, setExistingEntry] = useState<TrackerEntry | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [permissions, setPermissions] = useState<{ canView: boolean; canEdit: boolean; canManage: boolean; isOwner: boolean; role: 'owner' | 'editor' | 'viewer' | null } | null>(null);
  const [showSharingDrawer, setShowSharingDrawer] = useState(false);
  const [showShareToProjectModal, setShowShareToProjectModal] = useState(false);
  const [observationRefreshKey, setObservationRefreshKey] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadTracker = useCallback(async () => {
    if (!trackerId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getTracker(trackerId);
      if (!data) {
        setError('Tracker not found or you do not have access');
        return;
      }
      setTracker(data);

      // Load permissions
      const perms = await resolveTrackerPermissions(trackerId);
      setPermissions(perms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tracker');
    } finally {
      setLoading(false);
    }
  }, [trackerId]);

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
    if (trackerId) {
      loadTracker();
    }
  }, [trackerId, loadTracker]);

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
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tracker) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-900 mb-1">Error loading tracker</h2>
              <p className="text-red-800 mb-4">{error || 'Tracker not found or you do not have access'}</p>
              <button
                onClick={() => navigate('/tracker-studio/my-trackers')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Back to Trackers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const theme = tracker ? getTrackerTheme(tracker.name) : null;
  const Icon = theme?.icon;
  const isMood = tracker ? isMoodTracker(tracker.name, tracker.field_schema_snapshot) : false;
  const useLowFriction = tracker ? shouldUseLowFrictionUX(tracker.name, tracker.field_schema_snapshot) : false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Themed Header */}
      {tracker && theme && (
        <div className={`bg-gradient-to-br ${theme.gradient} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-6 sm:pt-8 pb-12 sm:pb-16">
            <button
              onClick={() => navigate('/tracker-studio/my-trackers')}
              className="flex items-center gap-2 text-white/90 hover:text-white transition-colors text-sm sm:text-base mb-6 backdrop-blur-sm bg-white/10 rounded-lg px-3 py-2 inline-flex"
            >
              <ArrowLeft size={18} />
              <span>Back to Trackers</span>
            </button>
            
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className={`${theme.iconBg} ${theme.iconColor} rounded-2xl p-4 shadow-xl flex-shrink-0`}>
                  <Icon size={32} className={theme.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                    {tracker.name}
                  </h1>
                  {tracker.description && (
                    <p className="text-white/90 text-base sm:text-lg drop-shadow-md">
                      {tracker.description}
                    </p>
                  )}
                </div>
              </div>
              {permissions && !permissions.isOwner && (
                <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium flex-shrink-0 backdrop-blur-sm ${
                  permissions.role === 'viewer'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/20 text-white'
                }`}>
                  <Eye size={16} />
                  {permissions.role === 'viewer' ? 'Read-only' : 'Editor'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 -mt-8 sm:-mt-12 relative z-10">
        {/* Entry Form Section - Elevated Card */}
        <div className={`bg-white rounded-2xl shadow-xl border-2 ${theme?.borderColor || 'border-gray-200'} p-6 sm:p-8 mb-6 transition-all hover:shadow-2xl`}>
          {/* Date Picker - Hidden for mood trackers, collapsible for low-friction trackers */}
          {!isMood && (
            <div className="mb-6">
              {useLowFriction ? (
                // Collapsible date picker for low-friction trackers
                <div>
                  {!showDatePicker ? (
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(true)}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Clock size={16} />
                      <span>
                        {selectedDate === new Date().toISOString().split('T')[0] 
                          ? 'Logging for today' 
                          : `Logging for ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        }
                      </span>
                      <ChevronDown size={16} />
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label htmlFor="entry-date" className="block text-sm font-semibold text-gray-700">
                          <Calendar className="inline mr-2" size={18} />
                          Entry Date
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowDatePicker(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label="Hide date picker"
                        >
                          <ChevronUp size={16} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          id="entry-date"
                          type="date"
                          value={selectedDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-blue-500 focus:ring-blue-500 transition-all text-base font-medium"
                        />
                        {selectedDate === new Date().toISOString().split('T')[0] && (
                          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                            Today
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Always visible for other trackers
                <div>
                  <label htmlFor="entry-date" className="block text-sm font-semibold text-gray-700 mb-3">
                    <Calendar className="inline mr-2" size={18} />
                    Entry Date
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="entry-date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-blue-500 focus:ring-blue-500 transition-all text-base font-medium"
                    />
                    {selectedDate === new Date().toISOString().split('T')[0] && (
                      <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                        Today
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {loadingEntry ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-gray-600">Loading entry...</p>
            </div>
          ) : (
            <TrackerEntryForm
              tracker={tracker!}
              entryDate={selectedDate}
              existingEntry={existingEntry}
              onEntrySaved={handleEntrySaved}
              readOnly={!permissions?.canEdit}
              theme={theme!}
            />
          )}
        </div>

        {/* Entry History Section */}
        <div className={`bg-white rounded-2xl shadow-lg border-2 ${theme?.borderColor || 'border-gray-200'} p-6 sm:p-8 mb-6`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={24} className={theme?.iconColor || 'text-gray-600'} />
              Entry History
            </h2>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                showAnalytics
                  ? `${theme?.buttonBg || 'bg-blue-600'} text-white shadow-md`
                  : `${theme?.accentBg || 'bg-gray-100'} ${theme?.accentText || 'text-gray-700'} hover:shadow-md`
              }`}
            >
              <BarChart3 size={18} />
              <span className="hidden sm:inline">{showAnalytics ? 'Hide' : 'Show'} Analytics</span>
            </button>
          </div>
          <TrackerEntryList key={refreshKey} tracker={tracker!} theme={theme!} />
        </div>

        {/* Analytics Section */}
        {showAnalytics && (
          <div className={`bg-white rounded-2xl shadow-lg border-2 ${theme?.borderColor || 'border-gray-200'} p-6 sm:p-8 mb-6 animate-in fade-in slide-in-from-top-4 duration-300`}>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 size={24} className={theme?.iconColor || 'text-gray-600'} />
              Analytics
            </h2>
            <TrackerAnalyticsPanel tracker={tracker!} />
          </div>
        )}

        {/* Your Notes Section */}
        <InterpretationTimelinePanel
          trackerId={tracker.id}
        />

        {/* Reminders Section */}
        {permissions?.canEdit && (
          <TrackerReminderSettings
            tracker={tracker}
            canEdit={permissions.canEdit}
          />
        )}

        {/* Shared Access Section */}
        {permissions?.isOwner && (
          <TrackerObservationList
            key={observationRefreshKey}
            tracker={tracker}
            onRevoked={() => setObservationRefreshKey(prev => prev + 1)}
          />
        )}

        {/* Share Buttons Section */}
        {permissions?.canManage && (
          <div className={`bg-white rounded-2xl shadow-lg border-2 ${theme?.borderColor || 'border-gray-200'} p-6 sm:p-8 mt-6`}>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Share2 size={24} className={theme?.iconColor || 'text-gray-600'} />
              Sharing
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowShareToProjectModal(true)}
                disabled={tracker.archived_at !== null}
                className={`flex items-center justify-center gap-2 px-6 py-3 border-2 ${theme?.borderColor || 'border-gray-300'} ${theme?.accentText || 'text-gray-700'} rounded-xl hover:shadow-md active:scale-[0.98] transition-all font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base`}
                aria-label="Share tracker to Guardrails projects"
              >
                <Users size={20} />
                <span className="hidden sm:inline">Share to Project</span>
                <span className="sm:hidden">To Project</span>
              </button>
              <button
                onClick={() => setShowSharingDrawer(true)}
                className={`flex items-center justify-center gap-2 px-6 py-3 ${theme?.buttonBg || 'bg-blue-600'} ${theme?.buttonHover || 'hover:bg-blue-700'} text-white rounded-xl hover:shadow-lg active:scale-[0.98] transition-all font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[48px] text-base shadow-md`}
              >
                <Share2 size={20} />
                <span className="hidden sm:inline">Share with Users</span>
                <span className="sm:hidden">With Users</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sharing Drawer */}
      {tracker && permissions && (
        <TrackerSharingDrawer
          trackerId={tracker.id}
          isOpen={showSharingDrawer}
          onClose={() => setShowSharingDrawer(false)}
        />
      )}

      {/* Share to Project Modal */}
      {tracker && permissions?.isOwner && (
        <ShareTrackerToProjectModal
          isOpen={showShareToProjectModal}
          onClose={() => setShowShareToProjectModal(false)}
          tracker={tracker}
          onShared={() => {
            setObservationRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}

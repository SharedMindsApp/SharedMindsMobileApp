/**
 * My Trackers Page - Dashboard Style
 * 
 * OS-style dashboard for viewing and interacting with active trackers.
 * Includes analytics previews and visual indicators.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Calendar, FileText, Info, BarChart3, Loader2, AlertCircle,
  TrendingUp, TrendingDown, Minus, ArrowRight, Sparkles, Clock, Activity,
  Target, Zap, CheckCircle2, AlertTriangle, GripVertical
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateTrackerOptionsModal } from './CreateTrackerOptionsModal';
import { listTrackers, reorderTrackers } from '../../lib/trackerStudio/trackerService';
import { useTrackerEntries } from '../../hooks/trackerStudio/useTrackerEntries';
import { calculateAggregatedStats, getNumericFields } from '../../lib/trackerStudio/trackerAnalyticsService';
import { getDateRangePreset } from '../../lib/trackerStudio/analyticsUtils';
import { getTrackerTheme } from '../../lib/trackerStudio/trackerThemeUtils';
import { calculateDashboardInsights } from '../../lib/trackerStudio/trackerEngagementAnalytics';
import type { Tracker } from '../../lib/trackerStudio/types';
import type { DateRange } from '../../lib/trackerStudio/analyticsTypes';

export function MyTrackersPage() {
  const navigate = useNavigate();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof calculateDashboardInsights>> | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // Drag and drop sensors
  // PointerSensor for mouse, TouchSensor for touch devices
  // Use distance-based activation to allow clicks while enabling drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement starts drag (allows clicks to work)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms hold on touch devices before drag starts
        tolerance: 5, // Allow 5px of movement during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadTrackers();
  }, []);

  const loadTrackers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listTrackers(false); // Exclude archived
      setTrackers(data);
      
      // Load insights after trackers are loaded
      if (data.length > 0) {
        loadInsights(data);
      } else {
        setInsights(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trackers');
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async (trackersToAnalyze: Tracker[]) => {
    try {
      setLoadingInsights(true);
      const calculatedInsights = await calculateDashboardInsights(trackersToAnalyze);
      setInsights(calculatedInsights);
    } catch (err) {
      console.error('Failed to calculate insights:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const getGranularityLabel = (granularity: string) => {
    return granularity.charAt(0).toUpperCase() + granularity.slice(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('[MyTrackersPage] Drag ended:', { activeId: active.id, overId: over?.id });

    if (!over || active.id === over.id) {
      console.log('[MyTrackersPage] Drag cancelled - no valid drop target');
      return;
    }

    const oldIndex = trackers.findIndex(t => t.id === active.id);
    const newIndex = trackers.findIndex(t => t.id === over.id);

    console.log('[MyTrackersPage] Drag indices:', { oldIndex, newIndex, totalTrackers: trackers.length });

    if (oldIndex === -1 || newIndex === -1) {
      console.log('[MyTrackersPage] Invalid indices');
      return;
    }

    // Optimistically update UI
    const newTrackers = arrayMove(trackers, oldIndex, newIndex);
    setTrackers(newTrackers);
    setIsReordering(true);

    try {
      // Calculate new display orders
      const trackerOrders = newTrackers.map((tracker, index) => ({
        trackerId: tracker.id,
        displayOrder: index,
      }));

      await reorderTrackers(trackerOrders);
      console.log('[MyTrackersPage] Trackers reordered successfully:', trackerOrders);
    } catch (err) {
      // Revert on error
      console.error('[MyTrackersPage] Failed to reorder trackers:', err);
      setTrackers(trackers);
      alert(err instanceof Error ? err.message : 'Failed to reorder trackers');
    } finally {
      setIsReordering(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                My Trackers
              </h1>
              <p className="text-base sm:text-lg text-gray-600">Your personal tracking dashboard</p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => navigate('/tracker-studio/insights')}
                className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-white hover:border-gray-400 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
              >
                <BarChart3 size={18} />
                <span className="hidden sm:inline">Cross-Tracker</span>
                <span className="sm:hidden">Insights</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm font-semibold shadow-lg"
              >
                <Plus size={18} />
                <span>Create</span>
              </button>
            </div>
          </div>

          {/* Intelligent Insights Cards */}
          {!loading && !loadingInsights && insights && trackers.length > 0 && (
            <div className="space-y-4 mb-6">
              {/* Engagement Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200 p-4 sm:p-5 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500 rounded-xl flex-shrink-0">
                    <Zap className="text-white" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Today's Activity</h3>
                    <p className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                      {insights.engagementMessage}
                    </p>
                    {insights.totalEntriesThisWeek > 0 && (
                      <p className="text-xs sm:text-sm text-gray-600">
                        {insights.totalEntriesThisWeek} {insights.totalEntriesThisWeek === 1 ? 'entry' : 'entries'} this week
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Insights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Trackers Needing Attention */}
                {insights.trackersNeedingAttention.length > 0 && (
                  <div 
                    onClick={() => insights.trackersNeedingAttention[0] && navigate(`/tracker-studio/tracker/${insights.trackersNeedingAttention[0].tracker.id}`)}
                    className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-300 p-4 sm:p-5 shadow-lg hover:shadow-xl hover:border-orange-400 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 bg-orange-500 rounded-xl flex-shrink-0 shadow-md">
                        <AlertTriangle className="text-white" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 mb-1">Needs Your Attention</h3>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 line-clamp-1">
                          {insights.trackersNeedingAttention[0].tracker.name}
                        </p>
                        <p className="text-sm font-semibold text-orange-700 mb-2">
                          {insights.trackersNeedingAttention[0].message}
                        </p>
                        <p className="text-xs text-orange-600 font-medium">
                          Tap to log an entry →
                        </p>
                      </div>
                      <ArrowRight size={18} className="text-orange-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                    {insights.trackersNeedingAttention.length > 1 && (
                      <div className="pt-3 border-t border-orange-200">
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">{insights.trackersNeedingAttention.length - 1} more</span> tracker{insights.trackersNeedingAttention.length - 1 !== 1 ? 's' : ''} need attention
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Most Active Tracker */}
                {insights.mostActiveTracker && (
                  <div 
                    onClick={() => navigate(`/tracker-studio/tracker/${insights.mostActiveTracker!.tracker.id}`)}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-300 p-4 sm:p-5 shadow-lg hover:shadow-xl hover:border-green-400 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 bg-green-500 rounded-xl flex-shrink-0 shadow-md">
                        <Target className="text-white" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 mb-1">Most Active This Week</h3>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 line-clamp-1">
                          {insights.mostActiveTracker.tracker.name}
                        </p>
                        <p className="text-sm font-semibold text-green-700 mb-2">
                          {insights.mostActiveTracker.message}
                        </p>
                        <p className="text-xs text-green-600 font-medium">
                          Keep it up! View details →
                        </p>
                      </div>
                      <ArrowRight size={18} className="text-green-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </div>
                )}

                {/* Consistent Trackers */}
                {insights.consistentTrackers.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-300 p-4 sm:p-5 shadow-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 bg-blue-500 rounded-xl flex-shrink-0 shadow-md">
                        <CheckCircle2 className="text-white" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Consistent Tracking</h3>
                        <p className="text-xs text-gray-600 mb-3">You're building great habits!</p>
                        <div className="space-y-2.5">
                          {insights.consistentTrackers.slice(0, 2).map((item, idx) => (
                            <div 
                              key={idx}
                              onClick={() => navigate(`/tracker-studio/tracker/${item.tracker.id}`)}
                              className="flex items-center justify-between p-2 bg-white/60 rounded-lg hover:bg-white/80 transition-colors cursor-pointer group"
                            >
                              <span className="text-xs sm:text-sm font-medium text-gray-700 line-clamp-1 flex-1">
                                {item.tracker.name}
                              </span>
                              <span className="text-xs font-semibold text-blue-700 ml-2">
                                {item.message}
                              </span>
                              <ArrowRight size={14} className="text-blue-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all ml-1 flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading Insights */}
          {!loading && trackers.length > 0 && loadingInsights && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Calculating insights...</p>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Loading your trackers...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6 flex items-start gap-3 shadow-lg">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-semibold mb-1 text-lg">Failed to load trackers</p>
              <p className="text-red-700 text-sm mb-4">{error}</p>
              <button
                onClick={loadTrackers}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Trackers Grid - Dashboard Style with Drag and Drop */}
        {!loading && !error && trackers.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={trackers.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {trackers.map(tracker => (
                  <SortableTrackerCard
                    key={tracker.id}
                    tracker={tracker}
                    onOpen={() => navigate(`/tracker-studio/tracker/${tracker.id}`)}
                    getGranularityLabel={getGranularityLabel}
                    formatDate={formatDate}
                    disabled={isReordering}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Empty State */}
        {!loading && !error && trackers.length === 0 && (
          <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-gray-200 shadow-xl">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-4">
                  <Calendar className="text-blue-600" size={48} />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Start Tracking</h3>
              <p className="text-gray-600 mb-8 text-lg">Create your first tracker to begin collecting insights over time.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg"
                >
                  Create Tracker
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Tracker Options Modal */}
      <CreateTrackerOptionsModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSelectCustom={() => navigate('/tracker-studio/create')}
        onSelectTemplates={() => navigate('/tracker-studio/templates')}
      />
    </div>
  );
}

type TrackerDashboardCardProps = {
  tracker: Tracker;
  onOpen: () => void;
  getGranularityLabel: (g: string) => string;
  formatDate: (d: string) => string;
  disabled?: boolean;
};

type TrackerDashboardCardInternalProps = Omit<TrackerDashboardCardProps, 'disabled'> & {
  isDragging?: boolean;
};

function SortableTrackerCard({
  tracker,
  onOpen,
  getGranularityLabel,
  formatDate,
  disabled = false,
}: TrackerDashboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: tracker.id, 
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  // Debug logging
  useEffect(() => {
    if (isDragging) {
      console.log('[SortableTrackerCard] Started dragging:', tracker.id);
    }
  }, [isDragging, tracker.id]);

  return (
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        touchAction: 'none', // Prevent scrolling on mobile while dragging
      }}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing select-none"
    >
      <TrackerDashboardCard
        tracker={tracker}
        onOpen={onOpen}
        getGranularityLabel={getGranularityLabel}
        formatDate={formatDate}
        isDragging={isDragging}
      />
    </div>
  );
}

function TrackerDashboardCard({
  tracker, 
  onOpen, 
  getGranularityLabel, 
  formatDate,
  isDragging = false,
}: TrackerDashboardCardInternalProps) {
  const theme = getTrackerTheme(tracker.name);
  const Icon = theme.icon;
  
  // Get date range for analytics (last 30 days)
  const dateRange: DateRange = useMemo(() => {
    return getDateRangePreset('30d');
  }, []);

  // Fetch entries for analytics preview
  const { entries, loading: loadingEntries } = useTrackerEntries({
    tracker_id: tracker.id,
    start_date: dateRange.start,
    end_date: dateRange.end,
  });

  // Calculate analytics preview
  const analyticsPreview = useMemo(() => {
    const numericFields = getNumericFields(tracker.field_schema_snapshot);
    if (numericFields.length === 0 || entries.length === 0) {
      return null;
    }

    const primaryField = numericFields[0];
    const stats = calculateAggregatedStats(entries, primaryField.id, dateRange, primaryField);
    
    return {
      field: primaryField,
      stats,
      hasData: stats.count > 0,
    };
  }, [entries, tracker.field_schema_snapshot, dateRange]);

  // Calculate trend (simple: compare last 7 days vs previous 7 days)
  const trend = useMemo(() => {
    if (entries.length < 2) return null;
    
    const numericFields = getNumericFields(tracker.field_schema_snapshot);
    if (numericFields.length === 0) return null;

    const primaryField = numericFields[0];
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentEntries = entries.filter(e => new Date(e.entry_date) >= lastWeek);
    const previousEntries = entries.filter(e => {
      const date = new Date(e.entry_date);
      return date >= twoWeeksAgo && date < lastWeek;
    });

    if (recentEntries.length === 0 || previousEntries.length === 0) return null;

    const recentAvg = recentEntries.reduce((sum, e) => {
      const val = e.field_values[primaryField.id];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0) / recentEntries.length;

    const previousAvg = previousEntries.reduce((sum, e) => {
      const val = e.field_values[primaryField.id];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0) / previousEntries.length;

    if (previousAvg === 0) return null;

    const change = ((recentAvg - previousAvg) / previousAvg) * 100;
    return {
      value: Math.abs(change),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    };
  }, [entries, tracker.field_schema_snapshot]);

  const entryCount = entries.length;
  const daysSinceCreated = Math.floor((new Date().getTime() - new Date(tracker.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const hasRecentEntry = entries.some(e => {
    const entryDate = new Date(e.entry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return entryDate >= today;
  });

  // Handle click navigation (only if not dragging)
  const handleCardClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      onOpen();
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-2xl transition-all duration-300 group overflow-hidden relative ${isDragging ? 'ring-2 ring-blue-500 ring-offset-2 shadow-2xl' : 'cursor-pointer'}`}
    >
      {/* Drag Handle Indicator (visual only, entire card is draggable) */}
      <div
        className="absolute top-3 right-3 p-2 rounded-lg text-gray-400 z-10 pointer-events-none"
        title="Hold and drag to reorder"
      >
        <GripVertical size={18} />
      </div>
      
      {/* Themed Header Section */}
      <div className={`bg-gradient-to-br ${theme.gradient} relative overflow-hidden p-5 sm:p-6`}>
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={`${theme.iconBg} ${theme.iconColor} rounded-2xl p-3 sm:p-4 shadow-lg flex-shrink-0`}>
              <Icon size={28} className={theme.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 line-clamp-1 group-hover:underline">
                {tracker.name}
              </h3>
              {tracker.description && (
                <p className="text-sm text-white/90 line-clamp-2">
                  {tracker.description}
                </p>
              )}
            </div>
          </div>
        </div>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-white"></div>
      </div>

      {/* Analytics Preview Section */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} className="text-gray-500" />
              <span className="text-xs text-gray-600 font-medium">Entries</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{entryCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {daysSinceCreated > 0 ? `in ${daysSinceCreated} days` : 'today'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={14} className="text-gray-500" />
              <span className="text-xs text-gray-600 font-medium">Fields</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{tracker.field_schema_snapshot.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">{getGranularityLabel(tracker.entry_granularity)}</p>
          </div>
        </div>

        {/* Analytics Preview */}
        {analyticsPreview && analyticsPreview.hasData && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {analyticsPreview.field.label}
              </span>
              {trend && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  trend.direction === 'up' 
                    ? 'bg-green-100 text-green-700' 
                    : trend.direction === 'down'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {trend.direction === 'up' ? (
                    <TrendingUp size={12} />
                  ) : trend.direction === 'down' ? (
                    <TrendingDown size={12} />
                  ) : (
                    <Minus size={12} />
                  )}
                  {trend.value.toFixed(0)}%
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {analyticsPreview.stats.average !== null 
                  ? analyticsPreview.stats.average.toFixed(analyticsPreview.field.type === 'rating' ? 1 : 0)
                  : '—'
                }
              </span>
              {analyticsPreview.field.type === 'rating' && (
                <span className="text-sm text-gray-500">/ 5</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
              <span>Min: {analyticsPreview.stats.min ?? '—'}</span>
              <span>Max: {analyticsPreview.stats.max ?? '—'}</span>
            </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {hasRecentEntry ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600 font-medium">Active today</span>
              </>
            ) : (
              <>
                <Clock size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500">No entry today</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold group-hover:gap-2 transition-all">
            <span>View Details</span>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all pointer-events-none"></div>
    </div>
  );
}

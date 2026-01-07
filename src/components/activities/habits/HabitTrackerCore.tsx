/**
 * Canonical Habit Tracker Core Component
 * 
 * Contains ALL habit tracking logic. Works identically in Planner, Personal Spaces, and Shared Spaces.
 * 
 * VERIFICATION CHECKLIST:
 * [ ] Tracker renders in Planner
 * [ ] Tracker renders in Personal Space
 * [ ] Tracker renders in Shared Space
 * [ ] Check-ins sync both ways (tracker ↔ calendar)
 * [ ] Permissions enforced correctly (can_view, can_edit, detail_level)
 * [ ] No duplicate logic
 * [ ] No feature drift
 * 
 * This component NEVER knows where it's rendered - it only receives context and permissions.
 */

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Plus, CheckCircle2, XCircle, Minus, TrendingUp, TrendingDown, Activity as ActivityIcon, Lock, Eye, Grid3x3, Award, Link2, ArrowRight } from 'lucide-react';
import {
  listHabits,
  createHabitActivity,
  updateHabitActivity,
  archiveHabit,
  upsertHabitCheckin,
  getHabitSummary,
  getHabitCheckinsForRange,
  type HabitCheckinStatus,
  type HabitPolarity,
  type HabitMetricType,
  type HabitDirection,
} from '../../../lib/habits/habitsService';
import type { Activity } from '../../../lib/activities/activityService';
import type { PermissionFlags } from '../../../lib/permissions/types';
import { FEATURE_HABITS_GOALS, FEATURE_HABITS_GOALS_REALTIME } from '../../../lib/featureFlags';
import { subscribeActivityChanged } from '../../../lib/activities/activityEvents';
import { supabase } from '../../../lib/supabase';
import { HabitCheckinSheet } from './HabitCheckinSheet';
import { TagPicker } from '../../tags/TagPicker';
import { TagSelector } from '../../tags/TagSelector';
import { FEATURE_CONTEXT_TAGGING } from '../../../lib/featureFlags';
import { skillEntityLinksService, skillsService } from '../../../lib/skillsService';
import { SkillDetailModal } from '../../skills/SkillDetailModal';

// ============================================================================
// Types
// ============================================================================

export interface HabitTrackerContext {
  mode: 'planner' | 'personal_space' | 'shared_space';
  scope: 'self' | 'shared';
}

export interface HabitTrackerCoreProps {
  ownerUserId: string;
  context: HabitTrackerContext;
  permissions: PermissionFlags;
  layout?: 'full' | 'compact';
  onHabitUpdate?: () => void; // Callback for external updates (e.g., calendar sync)
}

// ============================================================================
// Core Component
// ============================================================================

export function HabitTrackerCore({
  ownerUserId,
  context,
  permissions,
  layout = 'full',
  onHabitUpdate,
}: HabitTrackerCoreProps) {
  const [habits, setHabits] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [checkinSheet, setCheckinSheet] = useState<{ habit: Activity; date?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Permission enforcement: can_view === false → render null
  if (!permissions.can_view) {
    return null;
  }

  useEffect(() => {
    if (FEATURE_HABITS_GOALS) {
      loadHabits();
    }
  }, [ownerUserId]);

  // Subscribe to activity changes for live sync
  useEffect(() => {
    if (!FEATURE_HABITS_GOALS) return;

    // Use Supabase realtime if enabled, otherwise fallback to bus
    if (FEATURE_HABITS_GOALS_REALTIME) {
      const channel = supabase
        .channel(`habits:${ownerUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'habit_checkins',
            filter: `owner_id=eq.${ownerUserId}`,
          },
          () => {
            loadHabits();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Fallback to activityEvents bus
      const unsubscribe = subscribeActivityChanged((activityId) => {
        loadHabits();
      });
      return unsubscribe;
    }
  }, [ownerUserId]);

  const loadHabits = async () => {
    try {
      const userHabits = await listHabits(ownerUserId, { includeTags: true });
      setHabits(userHabits);
    } catch (err) {
      console.error('[HabitTrackerCore] Error loading habits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHabitUpdate = useCallback(() => {
    loadHabits();
    onHabitUpdate?.(); // Notify parent (e.g., calendar) of updates
  }, [onHabitUpdate]);

  if (!FEATURE_HABITS_GOALS) {
    return (
      <div className="p-6 text-center text-gray-500">
        Habits feature is currently disabled. Enable FEATURE_HABITS_GOALS to use.
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading habits...</div>;
  }

  const isReadOnly = !permissions.can_edit;
  const isCompact = layout === 'compact';
  const showDetails = permissions.detail_level === 'detailed';

  return (
    <div className={`${isCompact ? 'p-4' : 'p-6'} space-y-${isCompact ? '4' : '6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className={`${isCompact ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>
            Habit Tracker
          </h1>
          {context.scope === 'shared' && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
              <Eye size={12} />
              Shared
            </span>
          )}
          {isReadOnly && (
            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
              <Lock size={12} />
              Read-only
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showDetails && !isCompact && (
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Grid3x3 size={14} className="inline mr-1" />
                30-Day
              </button>
            </div>
          )}
          {permissions.can_edit && (
            <button
              onClick={() => setShowCreateForm(true)}
              className={`${isCompact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2`}
            >
              <Plus size={isCompact ? 16 : 20} />
              New Habit
            </button>
          )}
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && permissions.can_edit && (
        <CreateHabitForm
          userId={ownerUserId}
          onClose={() => {
            setShowCreateForm(false);
            handleHabitUpdate();
          }}
          compact={isCompact}
        />
      )}

      {/* Habits List or Grid */}
      {viewMode === 'grid' && showDetails ? (
        <Habits30DayGrid
          habits={habits}
          userId={ownerUserId}
          permissions={permissions}
          onCheckinClick={(habit, date) => setCheckinSheet({ habit, date })}
        />
      ) : (
        <div className={`grid gap-${isCompact ? '3' : '4'}`}>
          {habits.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              userId={ownerUserId}
              context={context}
              permissions={permissions}
              layout={layout}
              onUpdate={handleHabitUpdate}
              onCheckinClick={(date) => setCheckinSheet({ habit, date })}
            />
          ))}
        </div>
      )}

      {/* Check-in Sheet */}
      {checkinSheet && (
        <HabitCheckinSheet
          isOpen={!!checkinSheet}
          onClose={() => setCheckinSheet(null)}
          habit={checkinSheet.habit}
          userId={ownerUserId}
          initialDate={checkinSheet.date}
          onCheckinComplete={() => {
            handleHabitUpdate();
            setCheckinSheet(null);
          }}
        />
      )}

      {/* Empty State */}
      {habits.length === 0 && (
        <div className={`text-center py-${isCompact ? '8' : '12'} text-gray-500`}>
          <ActivityIcon size={isCompact ? 36 : 48} className="mx-auto mb-4 text-gray-300" />
          <p>{isReadOnly ? 'No habits to display.' : 'No habits yet. Create your first habit to get started!'}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Create Habit Form
// ============================================================================

function CreateHabitForm({
  userId,
  onClose,
  compact = false,
}: {
  userId: string;
  onClose: () => void;
  compact?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [polarity, setPolarity] = useState<HabitPolarity>('build');
  const [metricType, setMetricType] = useState<HabitMetricType>('boolean');
  const [metricUnit, setMetricUnit] = useState('');
  const [targetValue, setTargetValue] = useState<number>(1);
  const [direction, setDirection] = useState<HabitDirection>('at_least');
  const [repeatType, setRepeatType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00'); // Default to 8 AM
  const [saving, setSaving] = useState(false);

  // Calculate default start date (30 days ago for existing habits, today for new)
  useEffect(() => {
    if (polarity === 'existing') {
      if (!startDate) {
        const date = new Date();
        date.setDate(date.getDate() - 30); // Default to 30 days ago
        setStartDate(date.toISOString().split('T')[0]);
      }
    } else {
      // For new habits, default to today
      if (!startDate) {
        setStartDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [polarity]); // Only depend on polarity

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      // Use selected start date or default to today
      const habitStartDate = startDate 
        ? new Date(startDate + 'T00:00:00').toISOString()
        : new Date().toISOString();

      await createHabitActivity(userId, {
        title: title.trim(),
        description: description.trim() || undefined,
        polarity,
        metric_type: metricType,
        metric_unit: metricUnit.trim() || undefined,
        target_value: metricType !== 'boolean' ? targetValue : undefined,
        direction: metricType !== 'boolean' ? direction : undefined,
        startDate: habitStartDate,
        repeatType,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        autoGenerateTags: true, // Auto-generate tags from title/description
        isExistingHabit: polarity === 'existing', // Derived from polarity type
        reminderEnabled: reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime : undefined,
      });
      
      onClose();
    } catch (err) {
      console.error('[HabitTrackerCore] Error creating habit:', err);
      alert('Failed to create habit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${compact ? 'p-4' : 'p-6'} shadow-sm`}>
      <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold mb-4`}>Create New Habit</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Habit Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Morning Meditation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={compact ? 2 : 3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="build"
                checked={polarity === 'build'}
                onChange={(e) => setPolarity(e.target.value as HabitPolarity)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Build (Good habit)</span>
                <p className="text-xs text-gray-500">A new positive habit you want to develop</p>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="break"
                checked={polarity === 'break'}
                onChange={(e) => setPolarity(e.target.value as HabitPolarity)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Break (Bad habit)</span>
                <p className="text-xs text-gray-500">A negative habit you want to stop</p>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="existing"
                checked={polarity === 'existing'}
                onChange={(e) => setPolarity(e.target.value as HabitPolarity)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Existing (Habit I already do)</span>
                <p className="text-xs text-gray-500">Track a habit you're already doing</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Metric Type</label>
          <select
            value={metricType}
            onChange={(e) => setMetricType(e.target.value as HabitMetricType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="boolean">Yes/No (Did I do it?)</option>
            <option value="count">Count (e.g., pushups)</option>
            <option value="minutes">Minutes (e.g., meditation time)</option>
            <option value="rating">Rating (1-10)</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {metricType !== 'boolean' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit (optional)</label>
              <input
                type="text"
                value={metricUnit}
                onChange={(e) => setMetricUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., pushups, pages, cups"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as HabitDirection)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="at_least">At least (≥)</option>
                  <option value="at_most">At most (≤)</option>
                  <option value="exactly">Exactly (=)</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <select
            value={repeatType}
            onChange={(e) => setRepeatType(e.target.value as 'daily' | 'weekly' | 'monthly')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Start Date for Existing Habits */}
        {polarity === 'existing' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" />
              When did you start this habit?
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              This helps us calculate your streak and completion rate accurately. You can always add past check-ins later.
            </p>
          </div>
        )}

        {/* Reminder Settings */}
        <div className="border-t border-gray-200 pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700">Enable reminders</span>
              <p className="text-xs text-gray-500 mt-0.5">
                Get calendar reminders for this habit
              </p>
            </div>
          </label>

          {reminderEnabled && (
            <div className="mt-3 ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Time
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                You'll receive a calendar reminder at this time for each habit instance.
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        {FEATURE_CONTEXT_TAGGING && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <TagSelector
              userId={userId}
              entityType="habit"
              selectedTagIds={selectedTagIds}
              onTagsChange={setSelectedTagIds}
              compact={compact}
            />
            <p className="text-xs text-gray-500 mt-1">
              Tags will be auto-generated from your title and description. You can also add custom tags.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Habit'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// Habit Card
// ============================================================================

function HabitCard({
  habit,
  userId,
  context,
  permissions,
  layout,
  onUpdate,
  onCheckinClick,
}: {
  habit: Activity;
  userId: string;
  context: HabitTrackerContext;
  permissions: PermissionFlags;
  layout: 'full' | 'compact';
  onUpdate: () => void;
  onCheckinClick?: (date: string) => void;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedSkills, setRelatedSkills] = useState<Array<{ skill: any; link: any }>>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const isCompact = layout === 'compact';
  const showDetails = permissions.detail_level === 'detailed';
  const canEdit = permissions.can_edit;

  useEffect(() => {
    if (showDetails) {
      loadSummary();
      loadRelatedSkills();
    } else {
      setLoading(false);
    }
  }, [habit.id, showDetails]);

  const loadRelatedSkills = async () => {
    setLoadingSkills(true);
    try {
      // Skill linking is owner-controlled only
      const links = await skillEntityLinksService.getLinksForEntity(userId, 'habit', habit.id);
      const skillsWithLinks = await Promise.all(
        links.map(async (link) => {
          const skill = await skillsService.getById(link.skill_id);
          return { skill, link };
        })
      );
      setRelatedSkills(skillsWithLinks.filter(item => item.skill !== null));
    } catch (error) {
      console.error('Error loading related skills:', error);
    } finally {
      setLoadingSkills(false);
    }
  };

  const loadSummary = async () => {
    try {
      const habitSummary = await getHabitSummary(userId, habit.id);
      setSummary(habitSummary);
    } catch (err) {
      console.error('[HabitTrackerCore] Error loading habit summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (status: HabitCheckinStatus) => {
    if (!canEdit) return;
    
    // Open check-in sheet for better UX (supports all metric types)
    if (onCheckinClick) {
      onCheckinClick(today);
    } else {
      // Fallback to simple check-in for boolean habits
      try {
        await upsertHabitCheckin(userId, habit.id, today, {
          status,
          value_boolean: status === 'done' ? true : undefined,
        });
        loadSummary();
        onUpdate(); // Trigger calendar sync
      } catch (err) {
        console.error('[HabitTrackerCore] Error checking in:', err);
      }
    }
  };

  const handleArchive = async () => {
    if (!permissions.can_manage) return;
    
    try {
      await archiveHabit(userId, habit.id);
      onUpdate(); // Trigger calendar sync (hides projections)
    } catch (err) {
      console.error('[HabitTrackerCore] Error archiving habit:', err);
    }
  };

  const metricType = habit.metadata?.metric_type || 'boolean';
  const polarity = habit.metadata?.polarity || 'build';

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${isCompact ? 'p-3' : 'p-4'} shadow-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
            {habit.title}
          </h3>
          {habit.description && showDetails && (
            <p className={`text-sm text-gray-600 mt-1`}>{habit.description}</p>
          )}
          {/* Tags */}
          {showDetails && (
            <div className="mt-2">
              <TagPicker
                userId={userId}
                entityType="habit"
                entityId={habit.id}
                permissions={permissions}
                compact={isCompact}
                onTagsChanged={onUpdate}
              />
            </div>
          )}
        </div>
        {permissions.can_manage && (
          <button
            onClick={handleArchive}
            className="text-gray-400 hover:text-red-600"
            title="Archive habit"
          >
            <XCircle size={isCompact ? 18 : 20} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : summary && showDetails ? (
        <div className="space-y-3">
          <div className={`flex items-center gap-${isCompact ? '3' : '4'} text-sm`}>
            <div className="flex items-center gap-1">
              <ActivityIcon size={16} className="text-blue-600" />
              <span className="font-medium">{summary.currentStreak} day streak</span>
            </div>
            {summary.trend === 'up' ? (
              <TrendingUp size={16} className="text-green-600" />
            ) : summary.trend === 'down' ? (
              <TrendingDown size={16} className="text-red-600" />
            ) : null}
            <span className="text-gray-600">
              {Math.round(summary.completionRate7d)}% (7d)
            </span>
          </div>

          {canEdit && (
            <div className={`flex items-center gap-2 pt-2 border-t border-gray-200`}>
              <span className="text-sm font-medium text-gray-700">Today:</span>
              <button
                onClick={() => handleCheckIn('done')}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canEdit}
              >
                <CheckCircle2 size={16} />
                Done
              </button>
              <button
                onClick={() => handleCheckIn('missed')}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canEdit}
              >
                <XCircle size={16} />
                Missed
              </button>
              <button
                onClick={() => handleCheckIn('skipped')}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canEdit}
              >
                <Minus size={16} />
                Skip
              </button>
            </div>
          )}

          {/* Related Skills Section */}
          {showDetails && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Award size={16} className="text-blue-600" />
                <h4 className="text-sm font-semibold text-gray-900">Related Skills</h4>
              </div>
              {loadingSkills ? (
                <div className="text-xs text-gray-500">Loading skills...</div>
              ) : relatedSkills.length === 0 ? (
                <div className="text-center py-2 bg-gray-50 rounded border border-gray-200">
                  <Link2 size={16} className="text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">No skills linked</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {relatedSkills.map(({ skill, link }) => (
                    <button
                      key={skill.id}
                      onClick={() => setSelectedSkillId(skill.id)}
                      className="w-full text-left p-2 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Award size={14} className="text-blue-600" />
                          <span className="text-xs font-medium text-gray-900">{skill.name}</span>
                        </div>
                        <ArrowRight size={12} className="text-gray-400" />
                      </div>
                      {link.link_notes && (
                        <p className="text-xs text-gray-600 mt-0.5 ml-5">{link.link_notes}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : showDetails ? (
        <div className="text-sm text-gray-500">No data available</div>
      ) : (
        <div className="text-sm text-gray-500">Summary view - detailed information hidden</div>
      )}

      {/* Skill Detail Modal */}
      {selectedSkillId && (
        <SkillDetailModal
          isOpen={true}
          onClose={() => setSelectedSkillId(null)}
          skillId={selectedSkillId}
          mode="planner"
          permissions={{ can_view: true, can_edit: false, can_manage: false }}
        />
      )}
    </div>
  );
}


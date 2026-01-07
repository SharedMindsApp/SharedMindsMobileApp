/**
 * Habits Service
 * 
 * Full CRUD and check-in logic for habits using the canonical Activity system.
 * Habits are activities with check-ins. No duplication with calendar.
 */

import { supabase } from '../supabase';
import {
  createActivity,
  createActivitySchedule,
  updateActivity,
  archiveActivity,
  getUserActivities,
  type Activity,
} from '../activities/activityService';
import {
  projectActivitySchedulesToCalendar,
  hideActivityProjections,
} from '../activities/activityCalendarProjection';
import type { CreateActivityInput } from '../activities/activityTypes';
import { emitActivityChanged } from '../activities/activityEvents';
import { getTagsForEntity, addTagsToEntity, type Tag } from '../tags/tagService';
import { FEATURE_CONTEXT_TAGGING } from '../featureFlags';
import { autoGenerateAndLinkTags } from '../tags/tagAutoGeneration';
import { generateInstancesFromSchedule } from '../activities/scheduleInstances';
import type { ActivitySchedule } from '../activities/activityTypes';

// ============================================================================
// Types
// ============================================================================

export type HabitPolarity = 'build' | 'break' | 'existing';
export type HabitMetricType = 'count' | 'minutes' | 'boolean' | 'rating' | 'custom';
export type HabitDirection = 'at_least' | 'at_most' | 'exactly';
export type HabitCheckinStatus = 'done' | 'missed' | 'skipped' | 'partial';

export interface HabitCheckin {
  id: string;
  activity_id: string;
  owner_id: string;
  local_date: string; // YYYY-MM-DD
  status: HabitCheckinStatus;
  value_numeric: number | null;
  value_boolean: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHabitInput {
  title: string;
  description?: string;
  polarity: HabitPolarity;
  metric_type: HabitMetricType;
  metric_unit?: string;
  target_value?: number;
  direction?: HabitDirection;
  startDate: string;
  endDate?: string;
  repeatType: 'daily' | 'weekly' | 'monthly';
  visibility_default?: 'private' | 'shared_overview' | 'shared_detailed';
  display?: {
    icon?: string;
    color?: string;
  };
  tagIds?: string[]; // Optional tag IDs to link to the habit
  autoGenerateTags?: boolean; // Auto-generate tags from title/description
  isExistingHabit?: boolean; // Flag to indicate this is an existing habit (for UI/UX purposes)
  reminderEnabled?: boolean; // Opt-in reminder notifications
  reminderTime?: string; // Time in HH:MM format (e.g., "08:00")
}

export interface UpdateHabitInput {
  title?: string;
  description?: string;
  polarity?: HabitPolarity;
  metric_type?: HabitMetricType;
  metric_unit?: string;
  target_value?: number;
  direction?: HabitDirection;
  status?: 'active' | 'completed' | 'archived' | 'inactive';
}

export interface HabitCheckinInput {
  activityId: string;
  local_date: string; // YYYY-MM-DD
  status?: HabitCheckinStatus;
  value_numeric?: number;
  value_boolean?: boolean;
  notes?: string;
}

export interface HabitSummary {
  habit: Activity & { tags?: Tag[] };
  currentStreak: number;
  bestStreak: number;
  completionRate7d: number;
  completionRate30d: number;
  totalCheckins: number;
  trend: 'up' | 'down' | 'stable';
}

// ============================================================================
// Habit CRUD
// ============================================================================

/**
 * Create a habit activity with schedule
 */
export async function createHabitActivity(
  userId: string,
  input: CreateHabitInput
): Promise<{ activityId: string; scheduleId: string }> {
  // Create activity
  // For 'existing' habits, treat them like 'build' habits for direction logic
  const effectivePolarity = input.polarity === 'existing' ? 'build' : input.polarity;
  const metadata = {
    polarity: input.polarity, // Store the actual polarity including 'existing'
    metric_type: input.metric_type,
    metric_unit: input.metric_unit,
    target_value: input.target_value,
    direction: input.direction || (effectivePolarity === 'build' ? 'at_least' : 'at_most'),
    repeatType: input.repeatType,
  };
  
  const activityInput: CreateActivityInput = {
    type: 'habit',
    title: input.title,
    description: input.description,
    status: 'active',
    metadata,
  };

  const activity = await createActivity(userId, activityInput);

  // Emit change event for sync
  emitActivityChanged(activity.id);

  // Update activity with habit-specific fields (if columns exist)
  // Note: These fields are in metadata, but we also store in columns if they exist
  try {
    await supabase
      .from('activities')
      .update({
        polarity: input.polarity,
        metric_type: input.metric_type,
        metric_unit: input.metric_unit || null,
        target_value: input.target_value || null,
        direction: input.direction || (effectivePolarity === 'build' ? 'at_least' : 'at_most'),
        visibility_default: input.visibility_default || 'private',
      })
      .eq('id', activity.id);
  } catch (err) {
    // Columns may not exist yet - that's okay, metadata is the source of truth
    console.warn('[habitsService] Could not update activity columns (may not exist):', err);
  }

  // Create recurring schedule
  let recurrenceRule: string;
  if (input.repeatType === 'daily') {
    recurrenceRule = 'FREQ=DAILY;INTERVAL=1';
  } else if (input.repeatType === 'weekly') {
    recurrenceRule = 'FREQ=WEEKLY;INTERVAL=1';
  } else if (input.repeatType === 'monthly') {
    recurrenceRule = 'FREQ=MONTHLY;INTERVAL=1';
  } else {
    recurrenceRule = 'FREQ=DAILY;INTERVAL=1';
  }

  const schedule = await createActivitySchedule({
    activity_id: activity.id,
    schedule_type: 'recurring',
    start_at: input.startDate,
    end_at: input.endDate || null,
    recurrence_rule: recurrenceRule,
    metadata: {
      repeatType: input.repeatType,
      reminderEnabled: input.reminderEnabled || false,
      reminderTime: input.reminderTime || null,
    },
  });

  // Create reminder calendar events if enabled
  if (input.reminderEnabled && input.reminderTime) {
    try {
      await createHabitReminders(userId, activity, schedule, input.reminderTime);
    } catch (err) {
      console.error('[habitsService] Error creating habit reminders:', err);
      // Non-fatal - habit is created, reminders can be added later
    }
  }

  // Handle tags if feature is enabled
  if (FEATURE_CONTEXT_TAGGING) {
    const allTagIds: string[] = [];
    
    // Auto-generate tags from title/description if enabled
    if (input.autoGenerateTags) {
      try {
        const generatedTagIds = await autoGenerateAndLinkTags(
          userId,
          'habit',
          activity.id,
          input.title,
          input.description
        );
        allTagIds.push(...generatedTagIds);
      } catch (err) {
        console.error('[habitsService] Error auto-generating tags:', err);
        // Non-fatal, continue
      }
    }
    
    // Link manually selected tags
    if (input.tagIds && input.tagIds.length > 0) {
      try {
        await addTagsToEntity(userId, input.tagIds, 'habit', activity.id);
        allTagIds.push(...input.tagIds);
      } catch (err) {
        console.error('[habitsService] Error linking tags:', err);
        // Non-fatal, continue
      }
    }
  }

  // Project to calendar (optional - can be feature-flagged)
  // await projectActivitySchedulesToCalendar(userId, activity, [schedule]);

  return {
    activityId: activity.id,
    scheduleId: schedule.id,
  };
}

/**
 * Update habit activity
 */
export async function updateHabitActivity(
  habitId: string,
  input: UpdateHabitInput
): Promise<void> {
  const updates: Record<string, any> = {};

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.polarity !== undefined) updates.polarity = input.polarity;
  if (input.metric_type !== undefined) updates.metric_type = input.metric_type;
  if (input.metric_unit !== undefined) updates.metric_unit = input.metric_unit;
  if (input.target_value !== undefined) updates.target_value = input.target_value;
  if (input.direction !== undefined) updates.direction = input.direction;
  if (input.status !== undefined) updates.status = input.status;

  await updateActivity(habitId, {
    title: input.title,
    description: input.description,
    status: input.status,
    metadata: {
      ...updates,
    },
  });

  // Update activity fields directly
  if (Object.keys(updates).length > 0) {
    await supabase
      .from('activities')
      .update(updates)
      .eq('id', habitId);
  }

  // Emit change event for sync
  emitActivityChanged(habitId);
}

/**
 * Archive habit (soft delete)
 */
export async function archiveHabit(
  userId: string,
  habitId: string
): Promise<void> {
  // Hide calendar projections
  await hideActivityProjections(userId, habitId);

  // Archive activity
  await archiveActivity(habitId);
}

/**
 * List user's habits
 */
export async function listHabits(
  userId: string,
  filters?: {
    status?: 'active' | 'completed' | 'archived' | 'inactive';
    includeTags?: boolean;
  }
): Promise<Activity[]> {
  const habits = await getUserActivities(userId, {
    type: 'habit',
    status: filters?.status,
  });

  // Optionally enrich with tags
  if (FEATURE_CONTEXT_TAGGING && filters?.includeTags) {
    const habitsWithTags = await Promise.all(
      habits.map(async (habit) => {
        try {
          const tags = await getTagsForEntity('habit', habit.id);
          return { ...habit, tags };
        } catch (err) {
          console.error(`[habitsService] Error loading tags for habit ${habit.id}:`, err);
          return habit;
        }
      })
    );
    return habitsWithTags;
  }

  return habits;
}

// ============================================================================
// Habit Check-ins
// ============================================================================

/**
 * Upsert habit check-in (create or update)
 */
export async function upsertHabitCheckin(
  userId: string,
  activityId: string,
  local_date: string,
  payload: {
    status?: HabitCheckinStatus;
    value_numeric?: number;
    value_boolean?: boolean;
    notes?: string;
  }
): Promise<HabitCheckin> {
  // Check if check-in exists
  const { data: existing } = await supabase
    .from('habit_checkins')
    .select('*')
    .eq('activity_id', activityId)
    .eq('owner_id', userId)
    .eq('local_date', local_date)
    .maybeSingle();

  const checkinData: Record<string, any> = {
    activity_id: activityId,
    owner_id: userId,
    local_date: local_date,
    status: payload.status || 'done',
    notes: payload.notes || payload.metadata?.notes || null,
  };

  if (payload.value_numeric !== undefined) {
    checkinData.value_numeric = payload.value_numeric;
    checkinData.value_boolean = null;
  } else if (payload.value_boolean !== undefined) {
    checkinData.value_boolean = payload.value_boolean;
    checkinData.value_numeric = null;
  } else {
    checkinData.value_numeric = null;
    checkinData.value_boolean = null;
  }

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('habit_checkins')
      .update(checkinData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[habitsService] Error updating check-in:', error);
      throw error;
    }

    return data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('habit_checkins')
      .insert(checkinData)
      .select()
      .single();

    if (error) {
      console.error('[habitsService] Error creating check-in:', error);
      throw error;
    }

    return data;
  }
}

/**
 * Get habit check-ins for date range
 * Alias for getHabitCheckinsForRange (kept for backward compatibility)
 */
export async function getHabitCheckinsRange(
  userId: string,
  activityId: string,
  startLocalDate: string,
  endLocalDate: string
): Promise<HabitCheckin[]> {
  return getHabitCheckinsForRange(userId, activityId, startLocalDate, endLocalDate);
}

/**
 * Get habit check-ins for date range
 */
export async function getHabitCheckinsForRange(
  userId: string,
  activityId: string,
  startDate: string,
  endDate: string
): Promise<HabitCheckin[]> {
  const { data, error } = await supabase
    .from('habit_checkins')
    .select('*')
    .eq('activity_id', activityId)
    .eq('owner_id', userId)
    .gte('local_date', startDate)
    .lte('local_date', endDate)
    .order('local_date', { ascending: true });

  if (error) {
    console.error('[habitsService] Error fetching check-ins:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all check-ins for user in date range (for calendar)
 */
export async function getUserHabitCheckinsForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<HabitCheckin[]> {
  const { data, error } = await supabase
    .from('habit_checkins')
    .select('*')
    .eq('owner_id', userId)
    .gte('local_date', startDate)
    .lte('local_date', endDate)
    .order('local_date', { ascending: true });

  if (error) {
    console.error('[habitsService] Error fetching user check-ins:', error);
    throw error;
  }

  return data || [];
}

// ============================================================================
// Habit Summary & Analytics
// ============================================================================

/**
 * Get habit summary (streak, completion rate, trend)
 */
export async function getHabitSummary(
  userId: string,
  habitId: string,
  range?: { startDate: string; endDate: string }
): Promise<HabitSummary> {
  const habit = await getUserActivities(userId, { type: 'habit' }).then(
    habits => habits.find(h => h.id === habitId)
  );

  if (!habit) {
    throw new Error('Habit not found');
  }

  // Default to last 30 days
  const endDate = range?.endDate || new Date().toISOString().split('T')[0];
  const startDate = range?.startDate || (() => {
    const date = new Date(endDate);
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  })();

  const checkins = await getHabitCheckinsForRange(userId, habitId, startDate, endDate);

  // Calculate streaks
  const sortedCheckins = [...checkins]
    .sort((a, b) => new Date(a.local_date).getTime() - new Date(b.local_date).getTime())
    .filter(c => c.status === 'done');

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  // Calculate current streak (from today backwards)
  const today = new Date().toISOString().split('T')[0];
  let checkDate = new Date(today);
  
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const checkin = sortedCheckins.find(c => c.local_date === dateStr);
    
    if (checkin && checkin.status === 'done') {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate best streak
  for (const checkin of sortedCheckins) {
    if (checkin.status === 'done') {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Calculate completion rates
  const days7Start = new Date();
  days7Start.setDate(days7Start.getDate() - 7);
  const days7StartStr = days7Start.toISOString().split('T')[0];
  const checkins7d = checkins.filter(c => c.local_date >= days7StartStr && c.status === 'done');
  const completionRate7d = (checkins7d.length / 7) * 100;

  const checkins30d = checkins.filter(c => c.status === 'done');
  const completionRate30d = (checkins30d.length / 30) * 100;

  // Calculate trend (compare last 7 days to previous 7 days)
  const days14Start = new Date();
  days14Start.setDate(days14Start.getDate() - 14);
  const days14StartStr = days14Start.toISOString().split('T')[0];
  const checkinsPrev7d = checkins.filter(
    c => c.local_date >= days14StartStr && c.local_date < days7StartStr && c.status === 'done'
  );
  const prev7dRate = (checkinsPrev7d.length / 7) * 100;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (completionRate7d > prev7dRate + 5) trend = 'up';
  else if (completionRate7d < prev7dRate - 5) trend = 'down';

  return {
    habit,
    currentStreak,
    bestStreak,
    completionRate7d,
    completionRate30d,
    totalCheckins: checkins.filter(c => c.status === 'done').length,
    trend,
  };
}

/**
 * Delete habit instance from calendar (soft delete - marks as missed/skipped)
 */
export async function deleteHabitInstanceFromCalendar(
  userId: string,
  activityId: string,
  local_date: string,
  markAs: 'missed' | 'skipped' = 'skipped'
): Promise<void> {
  // Update or create check-in with missed/skipped status
  await upsertHabitCheckin(userId, activityId, local_date, {
    status: markAs,
  });
}

/**
 * Create recurring reminder calendar events for a habit
 * Generates reminder events based on the schedule's recurrence rule
 */
async function createHabitReminders(
  userId: string,
  activity: Activity,
  schedule: ActivitySchedule,
  reminderTime: string // HH:MM format
): Promise<void> {
  if (!schedule.start_at) {
    return;
  }

  // Get profile ID and household ID (required for calendar_events)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    console.error('[habitsService] Profile not found for user:', userId);
    return;
  }

  const { data: household } = await supabase
    .from('households')
    .select('id')
    .eq('owner_id', userId)
    .eq('space_type', 'personal')
    .maybeSingle();

  if (!household) {
    console.error('[habitsService] Personal household not found for user:', userId);
    return;
  }

  // Generate instances for the next 90 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 90);

  const instances = generateInstancesFromSchedule(
    schedule,
    activity.id,
    startDate.toISOString(),
    endDate.toISOString()
  );

  // Create a reminder calendar event for each instance
  for (const instance of instances) {
    try {
      // Parse reminder time (HH:MM)
      const [hours, minutes] = reminderTime.split(':').map(Number);
      const reminderDate = new Date(instance.local_date);
      reminderDate.setHours(hours, minutes, 0, 0);
      
      // End time is 15 minutes after reminder (short reminder window)
      const reminderEnd = new Date(reminderDate);
      reminderEnd.setMinutes(reminderEnd.getMinutes() + 15);

      // Check if reminder already exists for this date
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('user_id', userId)
        .eq('activity_id', activity.id)
        .eq('event_type', 'reminder')
        .gte('start_at', reminderDate.toISOString().split('T')[0] + 'T00:00:00')
        .lt('start_at', reminderDate.toISOString().split('T')[0] + 'T23:59:59')
        .maybeSingle();

      if (existing) {
        // Reminder already exists for this date
        continue;
      }

      // Create reminder calendar event directly
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: userId,
          household_id: household.id,
          created_by: profile.id,
          title: `Reminder: ${activity.title}`,
          description: `Don't forget to ${activity.title.toLowerCase()}`,
          start_at: reminderDate.toISOString(),
          end_at: reminderEnd.toISOString(),
          all_day: false,
          event_type: 'reminder',
          activity_id: activity.id, // Link to habit activity
          projection_state: 'active',
          source_type: 'personal',
          source_entity_id: null,
          source_project_id: null,
        });

      if (error) {
        console.error(`[habitsService] Error creating reminder for ${instance.local_date}:`, error);
        // Continue with next instance
      }
    } catch (err) {
      console.error(`[habitsService] Error creating reminder for ${instance.local_date}:`, err);
      // Continue with next instance
    }
  }
}


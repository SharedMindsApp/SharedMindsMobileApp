/**
 * Activity Service
 * 
 * Canonical CRUD operations for activities and schedules.
 * Activities are the source of truth; calendar events are projections.
 */

import { supabase } from '../supabase';
import type {
  Activity,
  ActivitySchedule,
  ActivityWithSchedules,
  CreateActivityInput,
  UpdateActivityInput,
  CreateActivityScheduleInput,
  UpdateActivityScheduleInput,
  ActivityStatus,
} from './activityTypes';

// ============================================================================
// Activity CRUD Operations
// ============================================================================

/**
 * Create a new activity
 */
export async function createActivity(
  userId: string,
  input: CreateActivityInput
): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert({
      type: input.type,
      title: input.title,
      description: input.description || null,
      owner_id: userId,
      status: input.status || 'active',
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('[activityService] Error creating activity:', error);
    throw error;
  }

  return data;
}

/**
 * Get activity by ID
 */
export async function getActivity(activityId: string): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .maybeSingle();

  if (error) {
    console.error('[activityService] Error fetching activity:', error);
    throw error;
  }

  return data;
}

/**
 * Get activities for user
 */
export async function getUserActivities(
  userId: string,
  filters?: {
    type?: string;
    status?: ActivityStatus;
    limit?: number;
  }
): Promise<Activity[]> {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[activityService] Error fetching activities:', error);
    throw error;
  }

  return data || [];
}

/**
 * Update activity
 */
export async function updateActivity(
  activityId: string,
  input: UpdateActivityInput
): Promise<Activity> {
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.status !== undefined) {
    updates.status = input.status;
    if (input.status === 'archived') {
      updates.archived_at = new Date().toISOString();
    } else if (input.status !== 'archived') {
      updates.archived_at = null;
    }
  }
  if (input.metadata !== undefined) updates.metadata = input.metadata;

  const { data, error } = await supabase
    .from('activities')
    .update(updates)
    .eq('id', activityId)
    .select()
    .single();

  if (error) {
    console.error('[activityService] Error updating activity:', error);
    throw error;
  }

  return data;
}

/**
 * Archive activity (soft delete)
 */
export async function archiveActivity(activityId: string): Promise<void> {
  await updateActivity(activityId, {
    status: 'archived',
  });
}

// ============================================================================
// Activity Schedule CRUD Operations
// ============================================================================

/**
 * Create activity schedule
 */
export async function createActivitySchedule(
  input: CreateActivityScheduleInput
): Promise<ActivitySchedule> {
  const { data, error } = await supabase
    .from('activity_schedules')
    .insert({
      activity_id: input.activity_id,
      schedule_type: input.schedule_type,
      start_at: input.start_at || null,
      end_at: input.end_at || null,
      recurrence_rule: input.recurrence_rule || null,
      timezone: input.timezone || 'UTC',
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('[activityService] Error creating schedule:', error);
    throw error;
  }

  return data;
}

/**
 * Get schedules for activity
 */
export async function getActivitySchedules(
  activityId: string
): Promise<ActivitySchedule[]> {
  const { data, error } = await supabase
    .from('activity_schedules')
    .select('*')
    .eq('activity_id', activityId)
    .order('start_at', { ascending: true });

  if (error) {
    console.error('[activityService] Error fetching schedules:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get activity with schedules
 */
export async function getActivityWithSchedules(
  activityId: string
): Promise<ActivityWithSchedules | null> {
  const activity = await getActivity(activityId);
  if (!activity) return null;

  const schedules = await getActivitySchedules(activityId);

  return {
    ...activity,
    schedules,
  };
}

/**
 * Update activity schedule
 */
export async function updateActivitySchedule(
  scheduleId: string,
  input: UpdateActivityScheduleInput
): Promise<ActivitySchedule> {
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.schedule_type !== undefined) updates.schedule_type = input.schedule_type;
  if (input.start_at !== undefined) updates.start_at = input.start_at;
  if (input.end_at !== undefined) updates.end_at = input.end_at;
  if (input.recurrence_rule !== undefined) updates.recurrence_rule = input.recurrence_rule;
  if (input.timezone !== undefined) updates.timezone = input.timezone;
  if (input.metadata !== undefined) updates.metadata = input.metadata;

  const { data, error } = await supabase
    .from('activity_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) {
    console.error('[activityService] Error updating schedule:', error);
    throw error;
  }

  return data;
}

/**
 * Delete activity schedule
 */
export async function deleteActivitySchedule(scheduleId: string): Promise<void> {
  const { error } = await supabase
    .from('activity_schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) {
    console.error('[activityService] Error deleting schedule:', error);
    throw error;
  }
}

// ============================================================================
// Calendar Projection Helpers
// ============================================================================

/**
 * Hide calendar projection (soft delete from calendar)
 * Does NOT delete the activity or schedule
 */
export async function hideCalendarProjection(
  userId: string,
  calendarEventId: string
): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .update({
      projection_state: 'hidden',
      updated_at: new Date().toISOString(),
    })
    .eq('id', calendarEventId)
    .eq('user_id', userId);

  if (error) {
    console.error('[activityService] Error hiding projection:', error);
    throw error;
  }
}

/**
 * Remove calendar projection (user explicitly removed)
 */
export async function removeCalendarProjection(
  userId: string,
  calendarEventId: string
): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .update({
      projection_state: 'removed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', calendarEventId)
    .eq('user_id', userId);

  if (error) {
    console.error('[activityService] Error removing projection:', error);
    throw error;
  }
}

/**
 * Restore calendar projection (make visible again)
 */
export async function restoreCalendarProjection(
  userId: string,
  calendarEventId: string
): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .update({
      projection_state: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', calendarEventId)
    .eq('user_id', userId);

  if (error) {
    console.error('[activityService] Error restoring projection:', error);
    throw error;
  }
}






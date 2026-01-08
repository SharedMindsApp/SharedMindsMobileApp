/**
 * Unified Activity System Types
 * 
 * Canonical types for activities (habits, goals, tasks, etc.)
 * that project to the calendar without duplication.
 */

export type ActivityType =
  | 'habit'
  | 'goal'
  | 'task'
  | 'meeting'
  | 'meal'
  | 'reminder'
  | 'time_block'
  | 'appointment'
  | 'milestone'
  | 'travel_segment'
  | 'event';

export type ActivityStatus = 'active' | 'completed' | 'archived' | 'inactive';

export type ScheduleType = 'single' | 'recurring' | 'deadline' | 'time_block';

export type ProjectionState = 'active' | 'hidden' | 'removed';

/**
 * Canonical Activity (source of truth)
 */
export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  owner_id: string;
  status: ActivityStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * Activity Schedule (when/how activity occurs)
 */
export interface ActivitySchedule {
  id: string;
  activity_id: string;
  schedule_type: ScheduleType;
  start_at: string | null;
  end_at: string | null;
  recurrence_rule: string | null; // RRULE format
  timezone: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Create Activity Input
 */
export interface CreateActivityInput {
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  status?: ActivityStatus;
}

/**
 * Update Activity Input
 */
export interface UpdateActivityInput {
  title?: string;
  description?: string;
  status?: ActivityStatus;
  metadata?: Record<string, any>;
}

/**
 * Create Activity Schedule Input
 */
export interface CreateActivityScheduleInput {
  activity_id: string;
  schedule_type: ScheduleType;
  start_at?: string;
  end_at?: string;
  recurrence_rule?: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

/**
 * Update Activity Schedule Input
 */
export interface UpdateActivityScheduleInput {
  schedule_type?: ScheduleType;
  start_at?: string;
  end_at?: string;
  recurrence_rule?: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

/**
 * Activity with Schedules (for queries)
 */
export interface ActivityWithSchedules extends Activity {
  schedules: ActivitySchedule[];
}







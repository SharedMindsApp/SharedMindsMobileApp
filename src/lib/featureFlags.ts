/**
 * Centralized Feature Flags
 * 
 * All feature flags are defined here. Do NOT hardcode feature flags in components.
 * Import from this file to check feature availability.
 */

/**
 * Enable Habits and Goals tracking features
 * When true: HabitTrackerCore and GoalTrackerCore are functional
 * When false: Components show disabled message
 */
export const FEATURE_HABITS_GOALS = true;

/**
 * Enable calendar extras (habit instances, goal deadlines)
 * When true: Calendar shows derived habit instances and goal deadlines
 * When false: Calendar shows only traditional events
 */
export const FEATURE_CALENDAR_EXTRAS = true;

/**
 * Enable realtime subscriptions for habits and goals
 * When true: Uses Supabase realtime for multi-device sync
 * When false: Falls back to activityEvents bus
 */
export const FEATURE_HABITS_GOALS_REALTIME = true;

/**
 * Enable unified context tagging system
 * When true: Tags can be applied to habits, goals, projects, trips, and calendar events
 * When false: Tagging UI is hidden and tag operations are disabled
 */
export const FEATURE_CONTEXT_TAGGING = true;


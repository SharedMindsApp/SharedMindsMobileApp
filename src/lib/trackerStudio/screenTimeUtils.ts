/**
 * Screen Time Tracker Utilities
 * 
 * Helper functions for identifying and working with Screen Time trackers.
 */

import type { Tracker, TrackerFieldSchema } from './types';

/**
 * Check if a tracker is a Screen Time tracker
 */
export function isScreenTimeTracker(tracker: Tracker | { name: string; field_schema_snapshot?: TrackerFieldSchema[] }): boolean {
  if (!tracker) return false;
  
  const name = tracker.name.toLowerCase();
  if (name.includes('screen time') || name.includes('screen-time')) {
    return true;
  }
  
  // Also check by field schema if available
  if ('field_schema_snapshot' in tracker && tracker.field_schema_snapshot) {
    return isScreenTimeTemplate(tracker.field_schema_snapshot);
  }
  
  return false;
}

/**
 * Check if a template is a Screen Time template by field schema
 */
export function isScreenTimeTemplate(fieldSchema: TrackerFieldSchema[]): boolean {
  // Screen Time template should have app_name, usage_minutes, and session_type fields
  const hasAppName = fieldSchema.some(f => f.id === 'app_name');
  const hasUsageMinutes = fieldSchema.some(f => f.id === 'usage_minutes');
  const hasSessionType = fieldSchema.some(f => f.id === 'session_type');
  
  return hasAppName && hasUsageMinutes && hasSessionType;
}

/**
 * Get lockout status from entry field values
 */
export function getLockoutStatus(fieldValues: Record<string, any>): {
  isActive: boolean;
  type: 'lockout' | 'focus' | 'none';
  duration?: number;
  blockedApps?: string[];
} {
  const sessionType = fieldValues?.session_type as string | undefined;
  
  if (sessionType === 'lockout' || sessionType === 'focus') {
    return {
      isActive: true,
      type: sessionType === 'focus' ? 'focus' : 'lockout',
      duration: fieldValues?.lockout_duration as number | undefined,
      blockedApps: fieldValues?.blocked_apps as string | undefined
        ? (fieldValues.blocked_apps as string).split(',').filter(Boolean)
        : [],
    };
  }
  
  return { isActive: false, type: 'none' };
}

/**
 * Format screen time in human-readable format
 */
export function formatScreenTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Calculate usage percentage of daily goal
 */
export function getUsagePercentage(current: number, goal: number | null): number {
  if (!goal || goal === 0) return 0;
  return Math.min((current / goal) * 100, 100);
}

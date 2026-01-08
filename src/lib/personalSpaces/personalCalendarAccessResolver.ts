/**
 * Personal Calendar Access Resolver
 * 
 * Phase 8: Determines access permissions for viewing/editing Personal Calendar events.
 * 
 * This resolver is pure, deterministic, and used everywhere calendar reads/writes occur.
 * 
 * Rules:
 * - Project-scoped overrides global
 * - Most restrictive wins
 * - Default = no access
 * 
 * Architecture:
 * - Personal Calendar Sharing is a permission overlay
 * - The calendar remains Personal
 * - Other users receive delegated access
 * - Sync logic remains unchanged
 */

import { getPersonalCalendarShareByKey } from './personalCalendarSharing';
import type { PersonalCalendarAccessLevel } from './personalCalendarSharing';

export interface PersonalCalendarAccessResult {
  canRead: boolean;
  canWrite: boolean;
  source: 'owner' | 'global_share' | 'project_share' | 'none';
  accessLevel?: PersonalCalendarAccessLevel;
  shareId?: string;
}

/**
 * Resolve personal calendar access for a viewer
 * 
 * @param ownerUserId - User who owns the personal calendar
 * @param viewerUserId - User requesting access
 * @param projectId - Optional project ID (for project-scoped events)
 * @returns Access result with canRead, canWrite, and source
 */
export async function resolvePersonalCalendarAccess(
  ownerUserId: string,
  viewerUserId: string,
  projectId?: string | null
): Promise<PersonalCalendarAccessResult> {
  // Owner always has full access
  if (ownerUserId === viewerUserId) {
    return {
      canRead: true,
      canWrite: true,
      source: 'owner',
    };
  }

  // Check project-scoped share first (more specific)
  if (projectId) {
    const projectShare = await getPersonalCalendarShareByKey(
      ownerUserId,
      viewerUserId,
      'project',
      projectId
    );

    if (projectShare) {
      return {
        canRead: true,
        canWrite: projectShare.access_level === 'write',
        source: 'project_share',
        accessLevel: projectShare.access_level,
        shareId: projectShare.id,
      };
    }
  }

  // Check global share (less specific, but applies if no project share)
  const globalShare = await getPersonalCalendarShareByKey(
    ownerUserId,
    viewerUserId,
    'global',
    null
  );

  if (globalShare) {
    return {
      canRead: true,
      canWrite: globalShare.access_level === 'write',
      source: 'global_share',
      accessLevel: globalShare.access_level,
      shareId: globalShare.id,
    };
  }

  // No access
  return {
    canRead: false,
    canWrite: false,
    source: 'none',
  };
}

/**
 * Check if user can read a specific calendar event
 * 
 * This is a convenience wrapper that:
 * 1. Extracts project_id from event metadata (if Guardrails-originated)
 * 2. Calls resolvePersonalCalendarAccess
 * 3. Returns canRead
 */
export async function canReadPersonalCalendarEvent(
  ownerUserId: string,
  viewerUserId: string,
  event: {
    source_project_id?: string | null;
    created_by?: string;
  }
): Promise<boolean> {
  const access = await resolvePersonalCalendarAccess(
    ownerUserId,
    viewerUserId,
    event.source_project_id || null
  );
  return access.canRead;
}

/**
 * Check if user can write to a specific calendar event
 * 
 * This is a convenience wrapper that:
 * 1. Extracts project_id from event metadata (if Guardrails-originated)
 * 2. Calls resolvePersonalCalendarAccess
 * 3. Returns canWrite
 */
export async function canWritePersonalCalendarEvent(
  ownerUserId: string,
  viewerUserId: string,
  event: {
    source_project_id?: string | null;
    created_by?: string;
  }
): Promise<boolean> {
  const access = await resolvePersonalCalendarAccess(
    ownerUserId,
    viewerUserId,
    event.source_project_id || null
  );
  return access.canWrite;
}

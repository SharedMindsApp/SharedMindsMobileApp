/**
 * Roadmap Service - Manages roadmap items (tasks, events, milestones, etc.)
 *
 * CALENDAR AUTHORITY NOTE (PROMPT 2 - IMPLEMENTED):
 * - calendar_events is the ONLY canonical time authority
 * - Roadmap events sync to calendar_events via guardrailsCalendarSync.ts
 * - Calendar sync settings (calendarSyncSettings.ts) control integration
 *
 * ✅ Calendar sync implemented (one-way: Guardrails → Calendar)
 * ✅ Respects user's sync settings
 * ✅ Idempotent (no duplicates)
 * ❌ Calendar → Guardrails NOT implemented (future prompt)
 *
 * Sync behavior:
 * - Event creation → optionally create calendar_event (based on settings)
 * - Event update → update existing calendar_event (if synced)
 * - Event deletion → delete calendar_event (if synced)
 * - Sync failures DO NOT block Guardrails mutations
 */

import { supabase } from '../supabase';
import type {
  RoadmapItem,
  RoadmapItemType,
  RoadmapItemStatus,
  CreateRoadmapItemInput,
  UpdateRoadmapItemInput,
  RoadmapItemDeadlineMeta,
  DeadlineExtension,
  DeadlineState,
  TrackDeadlineStats,
} from './coreTypes';
import { getTrack } from './trackService';
import {
  validateFullRoadmapItem,
  getDefaultStatusForType,
  canTypeAppearInTimeline,
  typeRequiresDates,
} from './roadmapItemValidation';
import {
  syncRoadmapItemToTaskFlow,
  archiveTaskFlowTaskForRoadmapItem,
} from './taskFlowSyncService';
import {
  syncRoadmapEventToCalendar,
  deleteCalendarEventForSource,
  type RoadmapItemForSync,
} from './guardrailsCalendarSync';

const TABLE_NAME = 'roadmap_items';

export function isTimelineEligible(type: RoadmapItemType): boolean {
  return canTypeAppearInTimeline(type);
}

/**
 * Safely attempt calendar sync without blocking Guardrails mutation
 * Logs results but does not throw on failure
 */
async function tryCalendarSync(roadmapItem: RoadmapItem): Promise<void> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[RoadmapService] Calendar sync skipped: No authenticated user');
      return;
    }

    // Only sync events (strict type check)
    if (roadmapItem.type !== 'event') {
      return;
    }

    // Prepare item for sync
    const itemForSync: RoadmapItemForSync = {
      id: roadmapItem.id,
      title: roadmapItem.title,
      description: roadmapItem.description,
      start_date: roadmapItem.startDate,
      end_date: roadmapItem.endDate,
      type: roadmapItem.type,
      status: roadmapItem.status,
      color: (roadmapItem.metadata as any)?.color,
      master_project_id: roadmapItem.masterProjectId,
      track_id: roadmapItem.trackId,
    };

    // Attempt sync
    const result = await syncRoadmapEventToCalendar(user.id, itemForSync);

    if (result.status === 'synced') {
      console.log(`[RoadmapService] Calendar sync succeeded: ${result.reason}`);
    } else if (result.status === 'skipped') {
      console.log(`[RoadmapService] Calendar sync skipped: ${result.reason}`);
    } else {
      console.error(`[RoadmapService] Calendar sync failed: ${result.error}`);
    }
  } catch (error) {
    console.error('[RoadmapService] Calendar sync error:', error);
    // DO NOT throw - sync failure should not block Guardrails mutation
  }
}

function transformKeysFromDb(row: any): RoadmapItem {
  return {
    id: row.id,
    masterProjectId: row.master_project_id,
    trackId: row.track_id,
    type: row.type || 'task',
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function transformKeysToSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}

export async function createRoadmapItem(input: CreateRoadmapItemInput): Promise<RoadmapItem> {
  const validation = validateFullRoadmapItem(input);
  if (!validation.valid) {
    throw new Error(
      `Validation failed:\n${validation.errors.map((e) => `- ${e.field}: ${e.message}`).join('\n')}`
    );
  }

  const track = await getTrack(input.trackId);

  if (!track) {
    throw new Error('Track not found');
  }

  if (!track.includeInRoadmap) {
    throw new Error(
      `Cannot create roadmap item for track '${track.name}' - track is not included in roadmap. ` +
      `Category: ${track.category}. Set includeInRoadmap=true first.`
    );
  }

  if (track.category === 'offshoot_idea') {
    throw new Error(
      `Cannot create roadmap items for offshoot idea tracks. Offshoot ideas never appear in the roadmap.`
    );
  }

  if (!isTimelineEligible(input.type) && (input.startDate || input.endDate)) {
    console.warn(
      `Item type '${input.type}' is content-only and will not appear on the timeline, even with dates provided.`
    );
  }

  const defaultStatus = input.status || getDefaultStatusForType(input.type);

  const dbInput = transformKeysToSnake({
    ...input,
    type: input.type,
    status: defaultStatus,
    metadata: input.metadata || {},
  });

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(dbInput)
    .select()
    .single();

  if (error) throw error;

  await createRoadmapItemConnection(data.id, input.trackId, input.masterProjectId);

  const createdItem = transformKeysFromDb(data);

  await syncRoadmapItemToTaskFlow(createdItem);

  // PROMPT 2: Sync to calendar (non-blocking)
  await tryCalendarSync(createdItem);

  return createdItem;
}

async function createRoadmapItemConnection(
  roadmapItemId: string,
  trackId: string,
  masterProjectId: string
): Promise<void> {
  const { error } = await supabase
    .from('mindmesh_connections')
    .insert({
      master_project_id: masterProjectId,
      source_type: 'track',
      source_id: trackId,
      target_type: 'roadmap_item',
      target_id: roadmapItemId,
      relationship: 'references',
      auto_generated: true,
    });

  if (error && !error.message.includes('duplicate')) {
    throw error;
  }
}

export async function updateRoadmapItem(
  id: string,
  input: UpdateRoadmapItemInput
): Promise<RoadmapItem> {
  const validation = validateFullRoadmapItem(input);
  if (!validation.valid) {
    throw new Error(
      `Validation failed:\n${validation.errors.map((e) => `- ${e.field}: ${e.message}`).join('\n')}`
    );
  }

  if (input.trackId) {
    const track = await getTrack(input.trackId);

    if (!track) {
      throw new Error('Track not found');
    }

    if (!track.includeInRoadmap) {
      throw new Error(
        `Cannot assign roadmap item to track '${track.name}' - track is not included in roadmap`
      );
    }
  }

  const dbInput = transformKeysToSnake(input);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(dbInput)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (input.trackId) {
    await updateRoadmapItemConnection(id, input.trackId, data.master_project_id);
  }

  if (input.status) {
    await updateMindMeshMetadata(id, input.status);
  }

  const updatedItem = transformKeysFromDb(data);

  await syncRoadmapItemToTaskFlow(updatedItem);

  // PROMPT 2: Sync to calendar (non-blocking)
  await tryCalendarSync(updatedItem);

  return updatedItem;
}

async function updateRoadmapItemConnection(
  roadmapItemId: string,
  newTrackId: string,
  masterProjectId: string
): Promise<void> {
  await supabase
    .from('mindmesh_connections')
    .delete()
    .eq('target_type', 'roadmap_item')
    .eq('target_id', roadmapItemId)
    .eq('auto_generated', true);

  await createRoadmapItemConnection(roadmapItemId, newTrackId, masterProjectId);
}

export async function deleteRoadmapItem(id: string): Promise<void> {
  await archiveTaskFlowTaskForRoadmapItem(id);

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) throw error;

  await supabase
    .from('mindmesh_connections')
    .delete()
    .eq('target_type', 'roadmap_item')
    .eq('target_id', id);

  // PROMPT 2: Delete calendar event if synced (non-blocking)
  try {
    await deleteCalendarEventForSource('roadmap_event', id);
  } catch (error) {
    console.error('[RoadmapService] Calendar event deletion failed:', error);
    // DO NOT throw - calendar deletion failure should not block Guardrails deletion
  }
}

export async function getRoadmapItem(id: string): Promise<RoadmapItem | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return transformKeysFromDb(data);
}

export async function getRoadmapItemsByProject(masterProjectId: string): Promise<RoadmapItem[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}

export async function getRoadmapItemsByTrack(trackId: string): Promise<RoadmapItem[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('track_id', trackId)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}

export async function getRoadmapItemsInDateRange(
  masterProjectId: string,
  startDate: string,
  endDate: string
): Promise<RoadmapItem[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('master_project_id', masterProjectId)
    .gte('end_date', startDate)
    .lte('start_date', endDate)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}

export async function getTimelineEligibleItems(masterProjectId: string): Promise<RoadmapItem[]> {
  const allItems = await getRoadmapItemsByProject(masterProjectId);

  return allItems.filter(item => {
    if (item.parentItemId) {
      return false;
    }

    if (!isTimelineEligible(item.type)) {
      return false;
    }

    if (item.type === 'goal') {
      return item.startDate !== undefined;
    }

    return true;
  });
}

const DUE_SOON_THRESHOLD_DAYS = 7;

const ACTIVE_STATUSES: RoadmapItemStatus[] = ['pending', 'in_progress', 'blocked'];

const DEADLINE_SOURCE_MAP: Record<RoadmapItemType, 'start_date' | 'end_date' | null> = {
  task: 'end_date',
  event: 'start_date',
  milestone: 'start_date',
  goal: 'end_date',
  habit: 'end_date',
  note: null,
  document: null,
  photo: null,
  grocery_list: null,
  review: null,
};

function isActiveStatus(status: RoadmapItemStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

function getDeadlineSourceDate(item: RoadmapItem): string | undefined {
  const source = DEADLINE_SOURCE_MAP[item.type];
  if (source === 'start_date') return item.startDate;
  if (source === 'end_date') return item.endDate || undefined;
  return undefined;
}

function calculateDaysUntil(deadline: string): number {
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  const diff = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function computeDeadlineState(daysUntil: number): DeadlineState {
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= DUE_SOON_THRESHOLD_DAYS) return 'due_soon';
  return 'on_track';
}

export async function getDeadlineExtensions(roadmapItemId: string): Promise<DeadlineExtension[]> {
  const { data, error } = await supabase
    .from('roadmap_item_deadline_extensions')
    .select('*')
    .eq('roadmap_item_id', roadmapItemId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    roadmapItemId: row.roadmap_item_id,
    previousDeadline: row.previous_deadline,
    newDeadline: row.new_deadline,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

export async function createDeadlineExtension(
  roadmapItemId: string,
  newDeadline: string,
  reason?: string
): Promise<DeadlineExtension> {
  const item = await getRoadmapItem(roadmapItemId);
  if (!item) throw new Error('Roadmap item not found');

  const currentDeadline = getDeadlineSourceDate(item);
  if (!currentDeadline) {
    throw new Error(`Item type '${item.type}' does not have a deadline`);
  }

  const { data, error } = await supabase
    .from('roadmap_item_deadline_extensions')
    .insert({
      roadmap_item_id: roadmapItemId,
      previous_deadline: currentDeadline,
      new_deadline: newDeadline,
      reason,
    })
    .select()
    .single();

  if (error) throw error;

  const deadlineSource = DEADLINE_SOURCE_MAP[item.type];
  const updateInput: UpdateRoadmapItemInput = {};
  if (deadlineSource === 'start_date') {
    updateInput.startDate = newDeadline;
  } else if (deadlineSource === 'end_date') {
    updateInput.endDate = newDeadline;
  }

  await updateRoadmapItem(roadmapItemId, updateInput);

  await updateMindMeshMetadata(roadmapItemId, item.status);

  return {
    id: data.id,
    roadmapItemId: data.roadmap_item_id,
    previousDeadline: data.previous_deadline,
    newDeadline: data.new_deadline,
    reason: data.reason,
    createdAt: data.created_at,
  };
}

export async function computeDeadlineMeta(item: RoadmapItem): Promise<RoadmapItemDeadlineMeta> {
  const extensions = await getDeadlineExtensions(item.id);
  const hasExtensions = extensions.length > 0;
  const extensionCount = extensions.length;

  const currentDeadline = getDeadlineSourceDate(item);

  let originalDeadline: string | undefined;
  if (hasExtensions) {
    originalDeadline = extensions[0].previousDeadline;
  } else {
    originalDeadline = currentDeadline;
  }

  const effectiveDeadline = currentDeadline;

  let deadlineState: DeadlineState | undefined;
  let daysUntilDeadline: number | undefined;

  if (effectiveDeadline && isActiveStatus(item.status)) {
    daysUntilDeadline = calculateDaysUntil(effectiveDeadline);
    deadlineState = computeDeadlineState(daysUntilDeadline);
  }

  return {
    effectiveDeadline,
    originalDeadline,
    hasExtensions,
    extensionCount,
    deadlineState,
    daysUntilDeadline,
  };
}

async function updateMindMeshMetadata(roadmapItemId: string, status: RoadmapItemStatus): Promise<void> {
  const item = await getRoadmapItem(roadmapItemId);
  if (!item) return;

  const deadlineMeta = await computeDeadlineMeta(item);

  const { error } = await supabase
    .from('mindmesh_connections')
    .update({
      metadata: {
        status,
        deadline_state: deadlineMeta.deadlineState,
        has_extensions: deadlineMeta.hasExtensions,
      },
    })
    .eq('target_type', 'roadmap_item')
    .eq('target_id', roadmapItemId)
    .eq('auto_generated', true);

  if (error && !error.message.includes('No rows found')) {
    console.warn('Failed to update Mind Mesh metadata:', error);
  }
}

export async function getRoadmapItemsWithDeadlines(
  masterProjectId: string,
  includeCompleted: boolean = false
): Promise<Array<RoadmapItem & { deadlineMeta: RoadmapItemDeadlineMeta }>> {
  const items = await getRoadmapItemsByProject(masterProjectId);

  const filtered = includeCompleted
    ? items
    : items.filter(item => isActiveStatus(item.status));

  const withDeadlines = filtered.filter(item => getDeadlineSourceDate(item) !== undefined);

  const withMeta = await Promise.all(
    withDeadlines.map(async item => ({
      ...item,
      deadlineMeta: await computeDeadlineMeta(item),
    }))
  );

  return withMeta;
}

export async function computeTrackDeadlineStats(
  trackId: string,
  includeDescendants: boolean = true
): Promise<TrackDeadlineStats> {
  const items = await getRoadmapItemsByTrack(trackId);

  const activeItems = items.filter(
    item => isActiveStatus(item.status) && getDeadlineSourceDate(item) !== undefined
  );

  const itemsWithMeta = await Promise.all(
    activeItems.map(async item => ({
      item,
      meta: await computeDeadlineMeta(item),
    }))
  );

  let overdueItems = 0;
  let dueSoonItems = 0;
  let extendedItems = 0;
  let nextDeadline: string | undefined;

  for (const { item, meta } of itemsWithMeta) {
    if (meta.deadlineState === 'overdue') overdueItems++;
    if (meta.deadlineState === 'due_soon') dueSoonItems++;
    if (meta.hasExtensions) extendedItems++;

    if (
      meta.effectiveDeadline &&
      meta.deadlineState &&
      meta.deadlineState !== 'overdue' &&
      (!nextDeadline || meta.effectiveDeadline < nextDeadline)
    ) {
      nextDeadline = meta.effectiveDeadline;
    }
  }

  return {
    nextDeadline,
    overdueItems,
    dueSoonItems,
    extendedItems,
  };
}

export async function getRoadmapItemsAssignedToPerson(
  trackId: string,
  personId: string
): Promise<RoadmapItem[]> {
  const { data, error } = await supabase
    .from('roadmap_item_assignees')
    .select(`
      roadmap_item_id,
      roadmap_items!inner (
        id,
        track_id,
        type,
        title,
        description,
        start_date,
        end_date,
        status,
        metadata,
        created_at,
        updated_at
      )
    `)
    .eq('person_id', personId)
    .eq('roadmap_items.track_id', trackId);

  if (error) throw error;

  return (data || [])
    .filter(row => row.roadmap_items)
    .map(row => {
      const item = row.roadmap_items;
      return {
        id: item.id,
        masterProjectId: '',
        trackId: item.track_id,
        type: item.type,
        title: item.title,
        description: item.description,
        startDate: item.start_date,
        endDate: item.end_date,
        status: item.status,
        metadata: item.metadata || {},
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });
}

export async function getRoadmapItemsByStatus(
  masterProjectId: string,
  status: RoadmapItemStatus
): Promise<RoadmapItem[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(`
      *,
      guardrails_tracks_v2!inner (
        master_project_id
      )
    `)
    .eq('guardrails_tracks_v2.master_project_id', masterProjectId)
    .eq('status', status)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformKeysFromDb);
}

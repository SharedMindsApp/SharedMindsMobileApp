/**
 * Phase 4B: Offline Action Queue
 * 
 * Simple write-behind queue for offline actions.
 * Stores actions in localStorage and replays them when online.
 * 
 * Rules:
 * - Only queue safe, append-only actions
 * - No conflict resolution
 * - Stop on first failure during sync
 */

const QUEUE_STORAGE_KEY = 'offline_action_queue';
const MAX_QUEUE_SIZE = 100; // Prevent unbounded growth

export interface QueuedAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount?: number;
}

/**
 * Get all queued actions from storage
 */
export function getQueuedActions(): QueuedAction[] {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[OfflineQueue] Error reading queue:', error);
    return [];
  }
}

/**
 * Add an action to the queue
 */
export function queueAction(
  type: string,
  payload: Record<string, unknown>
): QueuedAction {
  const actions = getQueuedActions();
  
  // Prevent queue from growing too large
  if (actions.length >= MAX_QUEUE_SIZE) {
    console.warn('[OfflineQueue] Queue full, dropping oldest action');
    actions.shift();
  }

  const action: QueuedAction = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  };

  actions.push(action);
  
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(actions));
  } catch (error) {
    console.error('[OfflineQueue] Error saving queue:', error);
    throw new Error('Failed to queue action');
  }

  return action;
}

/**
 * Remove an action from the queue (after successful sync)
 */
export function removeQueuedAction(actionId: string): void {
  const actions = getQueuedActions();
  const filtered = actions.filter(a => a.id !== actionId);
  
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[OfflineQueue] Error removing action:', error);
  }
}

/**
 * Clear all queued actions
 */
export function clearQueue(): void {
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch (error) {
    console.error('[OfflineQueue] Error clearing queue:', error);
  }
}

/**
 * Increment retry count for an action
 */
export function incrementRetryCount(actionId: string): void {
  const actions = getQueuedActions();
  const action = actions.find(a => a.id === actionId);
  if (action) {
    action.retryCount = (action.retryCount || 0) + 1;
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(actions));
    } catch (error) {
      console.error('[OfflineQueue] Error updating retry count:', error);
    }
  }
}




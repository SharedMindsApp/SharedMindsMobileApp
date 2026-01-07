/**
 * Phase 4B: Offline Sync Manager
 * 
 * Handles automatic syncing of queued actions when network reconnects.
 * 
 * Rules:
 * - Replay actions sequentially
 * - Stop on first failure
 * - Handle auth errors gracefully
 * - No silent data loss
 */

import { getQueuedActions, removeQueuedAction, incrementRetryCount } from './offlineQueue';
import { supabase } from './supabase';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  totalCount: number;
  failedActionId?: string;
  failedActionType?: string;
  error?: string;
}

/**
 * Action handlers map
 * Each handler receives the action payload and returns a promise
 */
type ActionHandler = (payload: Record<string, unknown>) => Promise<unknown>;

const actionHandlers: Map<string, ActionHandler> = new Map();

/**
 * Register an action handler
 */
export function registerActionHandler(type: string, handler: ActionHandler): void {
  actionHandlers.set(type, handler);
}

/**
 * Execute a single queued action
 */
async function executeAction(action: { type: string; payload: Record<string, unknown> }): Promise<boolean> {
  const handler = actionHandlers.get(action.type);
  
  if (!handler) {
    console.warn(`[OfflineSync] No handler registered for action type: ${action.type}`);
    return false;
  }

  try {
    await handler(action.payload);
    return true;
  } catch (error) {
    console.error(`[OfflineSync] Error executing action ${action.type}:`, error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
async function checkAuth(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error('[OfflineSync] Error checking auth:', error);
    return false;
  }
}

/**
 * Sync all queued actions
 * 
 * Returns:
 * - success: true if all actions synced, false if any failed
 * - syncedCount: number of actions successfully synced
 * - failedActionId: ID of the first action that failed (if any)
 * - error: error message (if any)
 */
export async function syncQueuedActions(): Promise<SyncResult> {
  const actions = getQueuedActions();
  const totalCount = actions.length;
  
  if (actions.length === 0) {
    return { success: true, syncedCount: 0, totalCount: 0 };
  }

  // Check auth first
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    return {
      success: false,
      syncedCount: 0,
      totalCount,
      error: 'Not authenticated. Please log in to sync.',
    };
  }

  let syncedCount = 0;
  let failedActionId: string | undefined;
  let error: string | undefined;

  // Process actions sequentially
  for (const action of actions) {
    try {
      const success = await executeAction(action);
      
      if (success) {
        removeQueuedAction(action.id);
        syncedCount++;
      } else {
        failedActionId = action.id;
        failedActionType = action.type;
        error = `Failed to execute action: ${action.type}`;
        break;
      }
    } catch (err) {
      // Check if it's an auth error
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('auth') || errorMessage.includes('session') || errorMessage.includes('token')) {
        error = 'Authentication expired. Please log in to continue syncing.';
      } else {
        error = errorMessage;
      }
      
      failedActionId = action.id;
      failedActionType = action.type;
      incrementRetryCount(action.id);
      break; // Stop on first failure
    }
  }

  return {
    success: syncedCount === totalCount,
    syncedCount,
    totalCount,
    failedActionId,
    failedActionType,
    error,
  };
}


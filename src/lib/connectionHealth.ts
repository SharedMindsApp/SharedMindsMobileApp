/**
 * Connection Health Monitor
 * 
 * Monitors connection health, implements exponential backoff retry,
 * and proactively refreshes sessions before expiration.
 */

import { supabase } from './supabase';
import { logError, logWarning, logInfo } from './errorLogger';

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const SESSION_REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000; // 5 minutes before expiry
const MAX_RETRY_DELAY = 30000; // 30 seconds max delay
const INITIAL_RETRY_DELAY = 1000; // 1 second initial delay

let healthCheckInterval: NodeJS.Timeout | null = null;
let isMonitoring = false;
let retryAttempts = 0;
let lastHealthCheck: number | null = null;
let connectionStatus: 'healthy' | 'degraded' | 'offline' = 'healthy';

export interface ConnectionHealthState {
  isHealthy: boolean;
  lastCheck: number | null;
  retryAttempts: number;
  status: 'healthy' | 'degraded' | 'offline';
}

type HealthCheckCallback = (state: ConnectionHealthState) => void;

const healthCheckCallbacks: Set<HealthCheckCallback> = new Set();

/**
 * Notify all subscribers of health state change
 */
function notifyHealthState(state: ConnectionHealthState): void {
  healthCheckCallbacks.forEach(callback => {
    try {
      callback(state);
    } catch (error) {
      console.error('[ConnectionHealth] Error in health check callback:', error);
    }
  });
}

/**
 * Perform a health check by attempting a lightweight API call
 */
async function performHealthCheck(): Promise<boolean> {
  try {
    // Use a lightweight check - get current session
    const { data, error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      ),
    ]) as { data: { session: any } | null; error: any };

    if (error) {
      logWarning('Health check failed', {
        component: 'ConnectionHealth',
        action: 'performHealthCheck',
        error: error.message || String(error),
      });
      return false;
    }

    // If we have a session, check if it's close to expiring
    if (data?.session) {
      const session = data.session;
      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      
      if (expiresAt) {
        const timeUntilExpiry = expiresAt - Date.now();
        
        // If session expires within refresh window, proactively refresh
        if (timeUntilExpiry > 0 && timeUntilExpiry < SESSION_REFRESH_BEFORE_EXPIRY) {
          try {
            await supabase.auth.refreshSession(session);
            logInfo('Proactively refreshed session before expiry', {
              component: 'ConnectionHealth',
              action: 'refreshSession',
              timeUntilExpiry: `${Math.floor(timeUntilExpiry / 1000)}s`,
            });
          } catch (refreshError) {
            logError(
              'Failed to refresh session',
              refreshError instanceof Error ? refreshError : new Error(String(refreshError)),
              {
                component: 'ConnectionHealth',
                action: 'refreshSession',
                timeUntilExpiry: `${Math.floor(timeUntilExpiry / 1000)}s`,
              }
            );
            return false;
          }
        }
      }
    }

    lastHealthCheck = Date.now();
    retryAttempts = 0;
    connectionStatus = 'healthy';
    notifyHealthState({
      isHealthy: true,
      lastCheck: lastHealthCheck,
      retryAttempts: 0,
      status: 'healthy',
    });
    logInfo('Health check successful', {
      component: 'ConnectionHealth',
      action: 'performHealthCheck',
    });
    return true;
  } catch (error) {
    retryAttempts++;
    logError(
      'Health check error',
      error instanceof Error ? error : new Error(String(error)),
      {
        component: 'ConnectionHealth',
        action: 'performHealthCheck',
        retryAttempts,
      }
    );
    
    // Determine connection status based on retry attempts
    if (retryAttempts >= 3) {
      connectionStatus = navigator.onLine ? 'degraded' : 'offline';
    } else {
      connectionStatus = 'degraded';
    }

    notifyHealthState({
      isHealthy: false,
      lastCheck: lastHealthCheck,
      retryAttempts,
      status: connectionStatus,
    });
    
    return false;
  }
}

/**
 * Exponential backoff retry for failed operations
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = INITIAL_RETRY_DELAY,
  context?: { component?: string; action?: string }
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on auth errors or client errors (4xx)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status >= 400 && status < 500 && status !== 408) {
          logWarning(`Operation failed with client error (${status}), not retrying`, {
            ...context,
            action: context?.action || 'retryWithBackoff',
            attempt,
            maxRetries,
            status,
          });
          throw error; // Don't retry client errors
        }
      }

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          initialDelay * Math.pow(2, attempt),
          MAX_RETRY_DELAY
        );
        
        logWarning(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
          ...context,
          action: context?.action || 'retryWithBackoff',
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: error instanceof Error ? error.message : String(error),
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logError(
          `Operation failed after ${maxRetries} retries`,
          error instanceof Error ? error : new Error(String(error)),
          {
            ...context,
            action: context?.action || 'retryWithBackoff',
            attempts: maxRetries,
          }
        );
      }
    }
  }

  throw lastError;
}

/**
 * Start monitoring connection health
 */
export function startHealthMonitoring(): void {
  if (isMonitoring) {
    logWarning('Health monitoring already started', {
      component: 'ConnectionHealth',
      action: 'startHealthMonitoring',
    });
    return;
  }

  isMonitoring = true;
  retryAttempts = 0;
  
  logInfo('Connection health monitoring started', {
    component: 'ConnectionHealth',
    action: 'startHealthMonitoring',
  });
  
  // Perform initial health check
  performHealthCheck();

  // Set up periodic health checks
  healthCheckInterval = setInterval(() => {
    performHealthCheck();
  }, HEALTH_CHECK_INTERVAL);

  // Listen for online/offline events
  const handleOnline = () => {
    logInfo('Network came online, performing health check', {
      component: 'ConnectionHealth',
      action: 'network.online',
    });
    performHealthCheck();
  };

  const handleOffline = () => {
    logWarning('Network went offline', {
      component: 'ConnectionHealth',
      action: 'network.offline',
    });
    connectionStatus = 'offline';
    notifyHealthState({
      isHealthy: false,
      lastCheck: lastHealthCheck,
      retryAttempts,
      status: 'offline',
    });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Cleanup function stored for later
  (healthCheckInterval as any).cleanup = () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };

  console.log('[ConnectionHealth] Health monitoring started');
}

/**
 * Stop monitoring connection health
 */
export function stopHealthMonitoring(): void {
  if (!isMonitoring) return;

  isMonitoring = false;
  
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    
    // Run cleanup if stored
    if ((healthCheckInterval as any).cleanup) {
      (healthCheckInterval as any).cleanup();
    }
    
    healthCheckInterval = null;
  }

  logInfo('Connection health monitoring stopped', {
    component: 'ConnectionHealth',
    action: 'stopHealthMonitoring',
  });
}

/**
 * Subscribe to health state changes
 */
export function subscribeToHealthState(callback: HealthCheckCallback): () => void {
  healthCheckCallbacks.add(callback);
  
  // Immediately call with current state
  callback({
    isHealthy: connectionStatus === 'healthy',
    lastCheck: lastHealthCheck,
    retryAttempts,
    status: connectionStatus,
  });

  // Return unsubscribe function
  return () => {
    healthCheckCallbacks.delete(callback);
  };
}

/**
 * Get current health state
 */
export function getHealthState(): ConnectionHealthState {
  return {
    isHealthy: connectionStatus === 'healthy',
    lastCheck: lastHealthCheck,
    retryAttempts,
    status: connectionStatus,
  };
}

/**
 * Force a health check immediately
 */
export async function forceHealthCheck(): Promise<boolean> {
  return performHealthCheck();
}


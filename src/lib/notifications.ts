/**
 * Notifications API
 * 
 * Client-side functions for interacting with the notifications system.
 * Handles CRUD operations, preferences, and push token management.
 */

import { supabase } from './supabase';
import type { Notification, NotificationPreferences, PushToken, NotificationStats } from './notificationTypes';

// ============================================================================
// Notification CRUD
// ============================================================================

/**
 * Get notifications for the current user
 */
export async function getNotifications(limit = 50): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getNotifications] Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get unread notifications count
 */
export async function getUnreadCount(): Promise<number> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);

  if (error) {
    console.error('[getUnreadCount] Error:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(): Promise<NotificationStats> {
  const [totalResult, unreadResult] = await Promise.all([
    supabase.from('notifications').select('id', { count: 'exact', head: true }),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
  ]);

  return {
    total: totalResult.data || 0,
    unread: unreadResult.data || 0,
  };
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('[markNotificationRead] Error:', error);
    throw error;
  }
}

/**
 * Mark multiple notifications as read
 */
export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', notificationIds);

  if (error) {
    console.error('[markNotificationsRead] Error:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_all_notifications_read', {
    p_user_id: userId,
  });

  if (error) {
    console.error('[markAllNotificationsRead] Error:', error);
    throw error;
  }
}

/**
 * Create a notification (typically called by system/service)
 */
export async function createNotification(
  notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single();

  if (error) {
    console.error('[createNotification] Error:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// Notification Preferences
// ============================================================================

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No preferences found, return default
      return null;
    }
    console.error('[getNotificationPreferences] Error:', error);
    throw error;
  }

  return data;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<Omit<NotificationPreferences, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[updateNotificationPreferences] Error:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// Push Tokens
// ============================================================================

/**
 * Register a push token
 */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web',
  deviceName?: string
): Promise<PushToken> {
  const { data, error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id: userId,
      token,
      platform,
      device_name: deviceName,
      last_used_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[registerPushToken] Error:', error);
    throw error;
  }

  return data;
}

/**
 * Remove a push token
 */
export async function removePushToken(token: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('token', token);

  if (error) {
    console.error('[removePushToken] Error:', error);
    throw error;
  }
}

/**
 * Get user's push tokens
 */
export async function getUserPushTokens(userId: string): Promise<PushToken[]> {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('*')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false });

  if (error) {
    console.error('[getUserPushTokens] Error:', error);
    throw error;
  }

  return data || [];
}

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to notification changes
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
) {
  const subscription = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

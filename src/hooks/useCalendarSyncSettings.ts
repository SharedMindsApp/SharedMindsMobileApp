import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface CalendarSyncSettings {
  userId: string;
  syncGuardrailsToPersonal: boolean;
  syncRoadmapEvents: boolean;
  syncTasksWithDates: boolean;
  syncMindMeshEvents: boolean;
  syncPersonalToGuardrails: boolean;
  requireConfirmationForPersonalSync: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UseCalendarSyncSettingsResult {
  settings: CalendarSyncSettings | null;
  isLoading: boolean;
  error: string | null;
  updateSetting: (key: keyof Omit<CalendarSyncSettings, 'userId' | 'createdAt' | 'updatedAt'>, value: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCalendarSyncSettings(): UseCalendarSyncSettingsResult {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CalendarSyncSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('calendar_sync_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from('calendar_sync_settings')
          .insert({
            user_id: user.id,
            sync_guardrails_to_personal: true,
            sync_roadmap_events: true,
            sync_tasks_with_dates: true,
            sync_mindmesh_events: true,
            sync_personal_to_guardrails: false,
            require_confirmation_for_personal_sync: true,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        setSettings({
          userId: newSettings.user_id,
          syncGuardrailsToPersonal: newSettings.sync_guardrails_to_personal,
          syncRoadmapEvents: newSettings.sync_roadmap_events,
          syncTasksWithDates: newSettings.sync_tasks_with_dates,
          syncMindMeshEvents: newSettings.sync_mindmesh_events,
          syncPersonalToGuardrails: newSettings.sync_personal_to_guardrails,
          requireConfirmationForPersonalSync: newSettings.require_confirmation_for_personal_sync,
          createdAt: newSettings.created_at,
          updatedAt: newSettings.updated_at,
        });
      } else {
        setSettings({
          userId: data.user_id,
          syncGuardrailsToPersonal: data.sync_guardrails_to_personal,
          syncRoadmapEvents: data.sync_roadmap_events,
          syncTasksWithDates: data.sync_tasks_with_dates,
          syncMindMeshEvents: data.sync_mindmesh_events,
          syncPersonalToGuardrails: data.sync_personal_to_guardrails,
          requireConfirmationForPersonalSync: data.require_confirmation_for_personal_sync,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }
    } catch (err) {
      console.error('[useCalendarSyncSettings] Error loading settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load calendar sync settings');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = async (
    key: keyof Omit<CalendarSyncSettings, 'userId' | 'createdAt' | 'updatedAt'>,
    value: boolean
  ): Promise<void> => {
    if (!user || !settings) {
      throw new Error('No user or settings available');
    }

    try {
      const dbKey = key
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');

      const { error: updateError } = await supabase
        .from('calendar_sync_settings')
        .update({ [dbKey]: value, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      setSettings({
        ...settings,
        [key]: value,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[useCalendarSyncSettings] Error updating setting:', err);
      throw err;
    }
  };

  return {
    settings,
    isLoading,
    error,
    updateSetting,
    refetch: loadSettings,
  };
}

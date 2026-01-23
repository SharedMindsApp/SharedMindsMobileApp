/**
 * Hook for managing meal schedules
 */

import { useState, useEffect, useRef } from 'react';
import { getDefaultMealScheduleForSpace, type MealSchedule } from '../lib/mealScheduleService';
import { getAllSlotsForDay, getActiveMealSlots, type MealSlot } from '../lib/mealScheduleTypes';

export function useMealSchedule(spaceId: string | null) {
  const [schedule, setSchedule] = useState<MealSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Prevent double-run inserts (React StrictMode)
  // Only mark as initialized on success, allowing retries on failure
  const hasInitializedRef = useRef(false);
  const currentSpaceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!spaceId) {
      setSchedule(null);
      setLoading(false);
      hasInitializedRef.current = false;
      currentSpaceIdRef.current = null;
      return;
    }

    // Reset if spaceId changed
    if (currentSpaceIdRef.current !== spaceId) {
      hasInitializedRef.current = false;
      currentSpaceIdRef.current = spaceId;
    }

    // Guard against double-run in React StrictMode
    // Only skip if we've already successfully initialized for this spaceId
    // If first attempt failed (e.g., auth not ready), allow retry
    if (hasInitializedRef.current && currentSpaceIdRef.current === spaceId) {
      return;
    }

    let cancelled = false;

    async function loadSchedule() {
      try {
        setLoading(true);
        setError(null);
        const defaultSchedule = await getDefaultMealScheduleForSpace(spaceId);
        if (!cancelled) {
          setSchedule(defaultSchedule);
          // Mark as initialized only on success
          // This prevents React StrictMode double-run, but allows retry if first attempt failed
          hasInitializedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Failed to load meal schedule');
          setError(error);
          console.error('Failed to load meal schedule:', err);
          // Don't mark as initialized on error - allows React StrictMode retry to proceed
          // This is important: first call may fail if auth not ready, second call should succeed
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  const getSlotsForDay = (dayOfWeek: number): MealSlot[] => {
    if (!schedule) return [];
    return getAllSlotsForDay(schedule, dayOfWeek);
  };

  const getMealSlotsForDay = (dayOfWeek: number): MealSlot[] => {
    if (!schedule) return [];
    return getActiveMealSlots(schedule, dayOfWeek);
  };

  return {
    schedule,
    loading,
    error,
    getSlotsForDay,
    getMealSlotsForDay,
    refresh: async () => {
      if (!spaceId) return;
      try {
        setError(null);
        const defaultSchedule = await getDefaultMealScheduleForSpace(spaceId);
        setSchedule(defaultSchedule);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to refresh meal schedule'));
      }
    },
  };
}

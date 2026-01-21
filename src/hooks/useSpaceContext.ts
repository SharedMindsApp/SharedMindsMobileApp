/**
 * useSpaceContext Hook
 * 
 * Centralizes space context logic for multi-context widgets.
 * Provides a stable API for managing Personal, Household, and Team contexts.
 * 
 * Features:
 * - Defaults to provided initialSpaceId
 * - Persists last-used space in sessionStorage
 * - Provides stable API for all widgets
 * - Handles loading states
 * - Prevents cross-space data leakage
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPersonalSpace, getSharedSpaces, type Household } from '../lib/household';
import { useAuth } from '../contexts/AuthContext';

export type SpaceType = 'personal' | 'household' | 'team';

export interface SpaceOption {
  id: string;
  name: string;
  type: SpaceType;
}

export interface UseSpaceContextReturn {
  currentSpaceId: string;
  currentSpaceType: SpaceType | null;
  availableSpaces: SpaceOption[];
  setCurrentSpace: (spaceId: string) => void;
  isLoading: boolean;
  error: string | null;
  getAbortSignal: () => AbortSignal | null;
  isSwitching: () => boolean;
}

const STORAGE_KEY = 'last_used_space_id';

export function useSpaceContext(initialSpaceId: string): UseSpaceContextReturn {
  const { user, profile } = useAuth();
  const [currentSpaceId, setCurrentSpaceIdState] = useState<string>(initialSpaceId);
  const [availableSpaces, setAvailableSpaces] = useState<SpaceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSpaceType, setCurrentSpaceType] = useState<SpaceType | null>(null);
  
  // Track if we're in the middle of a context switch to prevent race conditions
  const switchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load available spaces
  useEffect(() => {
    loadSpaces();
  }, [user, profile]);

  // Sync currentSpaceId when initialSpaceId changes (e.g., from route changes)
  useEffect(() => {
    if (initialSpaceId && initialSpaceId !== currentSpaceId) {
      setCurrentSpaceIdState(initialSpaceId);
    }
  }, [initialSpaceId]);

  // Update current space type when currentSpaceId or availableSpaces change
  useEffect(() => {
    const currentSpace = availableSpaces.find(s => s.id === currentSpaceId);
    setCurrentSpaceType(currentSpace?.type || null);
  }, [currentSpaceId, availableSpaces]);

  const loadSpaces = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const allSpaces: SpaceOption[] = [];

      // Get personal space
      const personalSpace = await getPersonalSpace();
      if (personalSpace) {
        allSpaces.push({
          id: personalSpace.id,
          name: profile?.full_name || 'Personal Space',
          type: 'personal',
        });
      }

      // Get shared spaces (households and teams)
      const sharedSpaces = await getSharedSpaces();
      sharedSpaces.forEach(space => {
        // Determine if it's household or team based on space_type or context_type
        const isTeam = (space as any).space_type === 'team' || (space as any).context_type === 'team';
        allSpaces.push({
          id: space.id,
          name: space.name || 'Unnamed Space',
          type: isTeam ? 'team' : 'household',
        });
      });

      setAvailableSpaces(allSpaces);

      // If currentSpaceId is not in available spaces, try to restore from storage or use first available
      if (allSpaces.length > 0) {
        const isValidSpace = allSpaces.some(s => s.id === currentSpaceId);
        if (!isValidSpace) {
          // Try to restore from sessionStorage
          const lastUsedSpaceId = sessionStorage.getItem(STORAGE_KEY);
          const restoredSpace = lastUsedSpaceId && allSpaces.find(s => s.id === lastUsedSpaceId);
          
          if (restoredSpace) {
            setCurrentSpaceIdState(restoredSpace.id);
          } else if (allSpaces.length > 0) {
            // Default to first available space (usually personal)
            setCurrentSpaceIdState(allSpaces[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error loading spaces:', err);
      setError('Failed to load spaces');
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentSpace = useCallback((spaceId: string) => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Set switching flag to prevent race conditions
    switchingRef.current = true;

    // Create new abort controller for new context
    abortControllerRef.current = new AbortController();

    // Update state
    setCurrentSpaceIdState(spaceId);

    // Persist to sessionStorage
    sessionStorage.setItem(STORAGE_KEY, spaceId);

    // Clear switching flag after a brief delay
    setTimeout(() => {
      switchingRef.current = false;
    }, 100);
  }, []);

  // Get abort signal for current context (useful for canceling requests)
  const getAbortSignal = useCallback(() => {
    return abortControllerRef.current?.signal || null;
  }, []);

  // Check if we're currently switching contexts
  const isSwitching = useCallback(() => {
    return switchingRef.current;
  }, []);

  return {
    currentSpaceId,
    currentSpaceType,
    availableSpaces,
    setCurrentSpace,
    isLoading,
    error,
    getAbortSignal,
    isSwitching,
  };
}

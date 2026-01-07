import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useActiveProject } from './ActiveProjectContext';
import type {
  RegulationState,
  RegulationNotification,
  BehaviorEnforcement,
  StrictnessLevelConfig,
} from '../lib/regulationTypes';
import {
  getRegulationState,
  getBehaviorEnforcement,
  getLevelConfig,
  checkBehaviorAllowed,
  logRegulationEvent,
} from '../lib/regulationEngine';
import { supabase } from '../lib/supabase';

interface RegulationContextType {
  regulationState: RegulationState | null;
  isLoading: boolean;
  enforcement: BehaviorEnforcement | null;
  levelConfig: StrictnessLevelConfig | null;
  notification: RegulationNotification | null;
  refreshState: () => Promise<void>;
  checkBehavior: (behavior: keyof BehaviorEnforcement) => Promise<{ allowed: boolean; message: string | null }>;
  logEvent: (eventType: string, metadata?: Record<string, any>) => Promise<void>;
  dismissNotification: () => void;
}

const RegulationContext = createContext<RegulationContextType | null>(null);

export function RegulationProvider({ children }: { children: ReactNode }) {
  const { activeProject } = useActiveProject();
  const [regulationState, setRegulationState] = useState<RegulationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enforcement, setEnforcement] = useState<BehaviorEnforcement | null>(null);
  const [levelConfig, setLevelConfig] = useState<StrictnessLevelConfig | null>(null);
  const [notification, setNotification] = useState<RegulationNotification | null>(null);

  useEffect(() => {
    loadRegulationState();
  }, [activeProject?.id]);

  useEffect(() => {
    if (!regulationState) return;

    const channel = supabase
      .channel(`regulation:${regulationState.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'regulation_state',
          filter: `id=eq.${regulationState.id}`,
        },
        (payload) => {
          const newState = payload.new as RegulationState;
          const oldLevel = regulationState.current_level;
          const newLevel = newState.current_level;

          setRegulationState(newState);
          setEnforcement(getBehaviorEnforcement(newLevel));
          setLevelConfig(getLevelConfig(newLevel));

          if (oldLevel !== newLevel) {
            showLevelChangeNotification(oldLevel, newLevel);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [regulationState?.id]);

  async function loadRegulationState() {
    try {
      setIsLoading(true);
      const state = await getRegulationState(undefined, activeProject?.id);

      if (state) {
        setRegulationState(state);
        setEnforcement(getBehaviorEnforcement(state.current_level));
        setLevelConfig(getLevelConfig(state.current_level));
      }
    } catch (error) {
      console.error('Failed to load regulation state:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshState() {
    await loadRegulationState();
  }

  async function checkBehavior(behavior: keyof BehaviorEnforcement) {
    const result = await checkBehaviorAllowed(behavior, undefined, activeProject?.id);

    if (!result.allowed && result.message) {
      setNotification({
        type: 'warning',
        level: result.level,
        message: result.message,
        dismissible: true,
      });
    }

    return { allowed: result.allowed, message: result.message };
  }

  async function logEvent(eventType: string, metadata?: Record<string, any>) {
    await logRegulationEvent(eventType as any, {
      projectId: activeProject?.id,
      metadata,
    });
    await refreshState();
  }

  function showLevelChangeNotification(oldLevel: number, newLevel: number) {
    const config = getLevelConfig(newLevel as any);
    const isEscalation = newLevel > oldLevel;

    setNotification({
      type: isEscalation ? 'escalation' : 'deescalation',
      level: newLevel as any,
      message: isEscalation ? config.escalationMessage : config.deescalationMessage,
      dismissible: true,
    });
  }

  function dismissNotification() {
    setNotification(null);
  }

  return (
    <RegulationContext.Provider
      value={{
        regulationState,
        isLoading,
        enforcement,
        levelConfig,
        notification,
        refreshState,
        checkBehavior,
        logEvent,
        dismissNotification,
      }}
    >
      {children}
    </RegulationContext.Provider>
  );
}

export function useRegulation() {
  const context = useContext(RegulationContext);
  if (!context) {
    throw new Error('useRegulation must be used within RegulationProvider');
  }
  return context;
}

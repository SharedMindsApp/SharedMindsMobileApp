import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { FocusSession, SessionEvent } from '../lib/guardrails/focusTypes';
import { supabase } from '../lib/supabase';

interface FocusSessionContextType {
  activeSession: FocusSession | null;
  isPaused: boolean;
  driftActive: boolean;
  pendingNudge: { type: 'soft' | 'hard' | 'regulation'; message: string } | null;
  timerSecondsRemaining: number;
  sessionEvents: SessionEvent[];
  driftCount: number;
  distractionCount: number;
  setActiveSession: (session: FocusSession | null) => void;
  setIsPaused: (paused: boolean) => void;
  setDriftActive: (active: boolean) => void;
  setPendingNudge: (nudge: { type: 'soft' | 'hard' | 'regulation'; message: string } | null) => void;
  setTimerSecondsRemaining: (seconds: number) => void;
  addSessionEvent: (event: SessionEvent) => void;
  loadSessionEvents: (sessionId: string) => Promise<void>;
  clearSession: () => void;
}

const FocusSessionContext = createContext<FocusSessionContextType | null>(null);

export function FocusSessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [driftActive, setDriftActive] = useState(false);
  const [pendingNudge, setPendingNudge] = useState<{ type: 'soft' | 'hard' | 'regulation'; message: string } | null>(null);
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState(0);
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const [driftCount, setDriftCount] = useState(0);
  const [distractionCount, setDistractionCount] = useState(0);

  useEffect(() => {
    if (activeSession) {
      const targetTime = new Date(activeSession.target_end_time).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((targetTime - now) / 1000));
        setTimerSecondsRemaining(remaining);

        if (remaining === 0 && !activeSession.ended_at) {
          setPendingNudge({
            type: 'hard',
            message: 'Session time is up! End your session or extend it.',
          });
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      const sessionSubscription = supabase
        .channel(`focus_session:${activeSession.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'focus_sessions',
            filter: `id=eq.${activeSession.id}`,
          },
          (payload) => {
            setActiveSession(payload.new as FocusSession);
          }
        )
        .subscribe();

      const eventsSubscription = supabase
        .channel(`session_events:${activeSession.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'session_events',
            filter: `session_id=eq.${activeSession.id}`,
          },
          (payload) => {
            addSessionEvent(payload.new as any);
          }
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        sessionSubscription.unsubscribe();
        eventsSubscription.unsubscribe();
      };
    }
  }, [activeSession?.id]);

  useEffect(() => {
    const counts = sessionEvents.reduce(
      (acc, event) => {
        if (event.event_type === 'drift') acc.driftCount++;
        if (event.event_type === 'distraction') acc.distractionCount++;
        return acc;
      },
      { driftCount: 0, distractionCount: 0 }
    );
    setDriftCount(counts.driftCount);
    setDistractionCount(counts.distractionCount);
  }, [sessionEvents]);

  async function loadSessionEvents(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('session_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSessionEvents(data || []);
    } catch (error) {
      console.error('Failed to load session events:', error);
    }
  }

  function addSessionEvent(event: SessionEvent) {
    setSessionEvents(prev => [...prev, event]);
  }

  function clearSession() {
    setActiveSession(null);
    setIsPaused(false);
    setDriftActive(false);
    setPendingNudge(null);
    setTimerSecondsRemaining(0);
    setSessionEvents([]);
    setDriftCount(0);
    setDistractionCount(0);
  }

  return (
    <FocusSessionContext.Provider
      value={{
        activeSession,
        isPaused,
        driftActive,
        pendingNudge,
        timerSecondsRemaining,
        sessionEvents,
        driftCount,
        distractionCount,
        setActiveSession,
        setIsPaused,
        setDriftActive,
        setPendingNudge,
        setTimerSecondsRemaining,
        addSessionEvent,
        loadSessionEvents,
        clearSession,
      }}
    >
      {children}
    </FocusSessionContext.Provider>
  );
}

export function useFocusSession() {
  const context = useContext(FocusSessionContext);
  if (!context) {
    throw new Error('useFocusSession must be used within FocusSessionProvider');
  }
  return context;
}

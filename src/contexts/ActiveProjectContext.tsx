import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { setActiveProjectId as setADCProjectId } from '../state/activeDataContext';
import type { MasterProject } from '../lib/guardrailsTypes';

interface ActiveProjectContextType {
  activeProjectId: string | null;
  activeProject: MasterProject | null;
  setActiveProject: (project: MasterProject | null) => void;
  clearActiveProject: () => void;
}

const ActiveProjectContext = createContext<ActiveProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'guardrails_active_project_id';
const STORAGE_PROJECT_KEY = 'guardrails_active_project';

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  const [activeProject, setActiveProjectState] = useState<MasterProject | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PROJECT_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('[ActiveProjectContext] Failed to parse stored project:', e);
          return null;
        }
      }
    }
    return null;
  });

  const [initialized, setInitialized] = useState(false);

  // Log only when activeProject reference actually changes
  useEffect(() => {
    console.log('[ActiveProjectContext] activeProject changed:', activeProject ? {
      id: activeProject.id,
      name: activeProject.name
    } : null);
  }, [activeProject]);

  // Initialize ADC on mount
  useEffect(() => {
    if (!initialized) {
      if (activeProject) {
        setADCProjectId(activeProject.id, activeProject.domain_id);
      } else {
        setADCProjectId(null, null);
      }
      setInitialized(true);
    }
  }, [initialized, activeProject]);

  // Sync to ADC when project changes after initialization
  useEffect(() => {
    if (initialized) {
      if (activeProject) {
        setADCProjectId(activeProject.id, activeProject.domain_id);
      } else {
        setADCProjectId(null, null);
      }
    }
  }, [activeProject, initialized]);

  // Guarded setter: only updates if project ID is different
  const setActiveProjectSafe = useCallback((project: MasterProject | null) => {
    let projectChanged = false;

    setActiveProjectState(prev => {
      // If the project ID is the same, don't update (preserve reference)
      if (prev?.id === project?.id) {
        return prev;
      }
      projectChanged = true;
      return project;
    });

    setActiveProjectId(prevId => {
      // If the ID is the same, don't update
      const nextId = project?.id || null;
      if (prevId === nextId) {
        return prevId;
      }
      return nextId;
    });

    // Only update localStorage and ADC if project actually changed
    if (projectChanged) {
      if (project) {
        localStorage.setItem(STORAGE_KEY, project.id);
        localStorage.setItem(STORAGE_PROJECT_KEY, JSON.stringify(project));
        setADCProjectId(project.id, project.domain_id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_PROJECT_KEY);
        setADCProjectId(null, null);
      }
    }
  }, []);

  // Exposed setter (wraps the safe setter for API compatibility)
  const setActiveProject = useCallback((project: MasterProject | null) => {
    setActiveProjectSafe(project);
  }, [setActiveProjectSafe]);

  const clearActiveProject = useCallback(() => {
    setActiveProjectState(null);
    setActiveProjectId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_PROJECT_KEY);
    setADCProjectId(null, null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      activeProjectId,
      activeProject,
      setActiveProject,
      clearActiveProject,
    }),
    [activeProjectId, activeProject, setActiveProject, clearActiveProject]
  );

  return (
    <ActiveProjectContext.Provider value={value}>
      {children}
    </ActiveProjectContext.Provider>
  );
}

export function useActiveProject() {
  const context = useContext(ActiveProjectContext);
  if (context === undefined) {
    throw new Error('useActiveProject must be used within an ActiveProjectProvider');
  }
  return context;
}

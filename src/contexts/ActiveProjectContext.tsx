import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
      const id = localStorage.getItem(STORAGE_KEY);
      console.log('[ActiveProjectContext] Initial activeProjectId from localStorage:', id);
      return id;
    }
    return null;
  });

  const [activeProject, setActiveProjectState] = useState<MasterProject | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_PROJECT_KEY);
      console.log('[ActiveProjectContext] Raw localStorage value:', stored);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          console.log('[ActiveProjectContext] Initial activeProject from localStorage:', {
            id: parsed?.id,
            name: parsed?.name,
            domain_id: parsed?.domain_id
          });
          return parsed;
        } catch (e) {
          console.error('[ActiveProjectContext] Failed to parse stored project:', e);
          return null;
        }
      }
    }
    console.log('[ActiveProjectContext] No stored project found');
    return null;
  });

  const [initialized, setInitialized] = useState(false);

  console.log('[ActiveProjectContext] Rendering with activeProject:', activeProject ? {
    id: activeProject.id,
    name: activeProject.name
  } : null);

  useEffect(() => {
    console.log('[ActiveProjectContext] useEffect running, initialized:', initialized, 'activeProject:', activeProject ? activeProject.id : null);
    if (!initialized) {
      if (activeProject) {
        console.log('[ActiveProjectContext] Initializing with project:', {
          id: activeProject.id,
          name: activeProject.name,
          domain_id: activeProject.domain_id
        });
        setADCProjectId(activeProject.id, activeProject.domain_id);
      } else {
        console.log('[ActiveProjectContext] Initializing with no project - clearing ADC');
        setADCProjectId(null, null);
      }
      setInitialized(true);
    }
  }, [initialized, activeProject]);

  useEffect(() => {
    if (initialized) {
      if (activeProject) {
        console.log('[ActiveProjectContext] Project changed:', activeProject.id);
        setADCProjectId(activeProject.id, activeProject.domain_id);
      } else {
        console.log('[ActiveProjectContext] Project cleared');
        setADCProjectId(null, null);
      }
    }
  }, [activeProject, initialized]);

  const setActiveProject = (project: MasterProject | null) => {
    console.log('[ActiveProjectContext] setActiveProject called with:', project ? {
      id: project.id,
      name: project.name,
      domain_id: project.domain_id
    } : null);

    setActiveProjectState(project);
    setActiveProjectId(project?.id || null);

    if (project) {
      localStorage.setItem(STORAGE_KEY, project.id);
      localStorage.setItem(STORAGE_PROJECT_KEY, JSON.stringify(project));
      console.log('[ActiveProjectContext] Stored in localStorage:', STORAGE_PROJECT_KEY, project.id);
      setADCProjectId(project.id, project.domain_id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_PROJECT_KEY);
      console.log('[ActiveProjectContext] Removed from localStorage');
      setADCProjectId(null, null);
    }
  };

  const clearActiveProject = () => {
    setActiveProjectState(null);
    setActiveProjectId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_PROJECT_KEY);
    setADCProjectId(null, null);
  };

  return (
    <ActiveProjectContext.Provider
      value={{
        activeProjectId,
        activeProject,
        setActiveProject,
        clearActiveProject,
      }}
    >
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

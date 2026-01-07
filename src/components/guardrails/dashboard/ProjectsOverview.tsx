import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, ChevronUp, GripVertical } from 'lucide-react';
import type { Domain, MasterProject, RoadmapItem } from '../../../lib/guardrailsTypes';
import { ProjectCard } from './ProjectCard';
import { useUIPreferences } from '../../../contexts/UIPreferencesContext';
import { getDomainConfig } from '../../../lib/guardrails/domainConfig';
import { reorderDomains } from '../../../lib/guardrails';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProjectWithStats {
  project: MasterProject;
  stats: {
    totalItems: number;
    completedItems: number;
    inProgressItems: number;
    blockedItems: number;
  };
}

interface DomainProjects {
  domain: Domain;
  activeProject: ProjectWithStats | null;
  completedProjects: ProjectWithStats[];
  abandonedProjects: ProjectWithStats[];
}

interface ProjectsOverviewProps {
  domainsWithProjects: DomainProjects[];
  activeProjectId: string | null;
  onCreateProject: (domainId: string) => void;
  onOpenRoadmap: (projectId: string) => void;
  onOpenMindMesh: (projectId: string) => void;
  onOpenTaskFlow: (projectId: string) => void;
  onRefresh: () => void;
}

function SortableCollapsedProject({ domainProject, onExpand }: {
  domainProject: DomainProjects;
  onExpand: (domainId: string) => void;
}) {
  const { domain, activeProject } = domainProject;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: domain.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!activeProject) return null;

  const domainConfig = getDomainConfig(domain.name);
  const DomainIcon = domainConfig.icon;
  const progress = activeProject.stats.totalItems > 0
    ? Math.round((activeProject.stats.completedItems / activeProject.stats.totalItems) * 100)
    : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-gradient-to-br ${domainConfig.colors.gradient} border ${domainConfig.colors.border} rounded-lg hover:shadow-md transition-shadow text-left relative`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/50"
      >
        <GripVertical size={16} className={domainConfig.colors.text} />
      </div>
      <button
        onClick={() => onExpand(domain.id)}
        className="w-full text-left"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${domainConfig.colors.light} border ${domainConfig.colors.border}`}>
            <DomainIcon size={16} className={domainConfig.colors.text} />
          </div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${domainConfig.colors.text}`}>
            {domainConfig.name}
          </p>
        </div>
        <h4 className="font-semibold text-gray-900 line-clamp-1 mb-3">
          {activeProject.project.name}
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${domainConfig.colors.primary} transition-all`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </button>
    </div>
  );
}

function SortableExpandedProject({ domainProject, onCollapse, expandedDomains, toggleDomain, activeProjectId, onOpenRoadmap, onOpenMindMesh, onOpenTaskFlow, onRefresh }: {
  domainProject: DomainProjects;
  onCollapse: (domainId: string) => void;
  expandedDomains: Record<string, boolean>;
  toggleDomain: (domainId: string) => void;
  activeProjectId: string | null;
  onOpenRoadmap: (projectId: string) => void;
  onOpenMindMesh: (projectId: string) => void;
  onOpenTaskFlow: (projectId: string) => void;
  onRefresh: () => void;
}) {
  const { domain, activeProject, completedProjects, abandonedProjects } = domainProject;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: domain.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasInactive = completedProjects.length > 0 || abandonedProjects.length > 0;
  const isExpanded = expandedDomains[domain.id];
  const domainConfig = getDomainConfig(domain.name);
  const DomainIcon = domainConfig.icon;

  return (
    <div ref={setNodeRef} style={style} className={`bg-white rounded-xl border-2 ${domainConfig.colors.border} overflow-hidden`}>
      <div className={`p-6 border-b ${domainConfig.colors.border} bg-gradient-to-r ${domainConfig.colors.gradient}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2 rounded-lg hover:bg-white/50"
            >
              <GripVertical size={20} className={domainConfig.colors.text} />
            </div>
            <div className={`p-2.5 rounded-xl ${domainConfig.colors.light} border ${domainConfig.colors.border}`}>
              <DomainIcon size={24} className={domainConfig.colors.text} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {domainConfig.name}
              </h3>
              <p className="text-sm text-gray-600">
                Active project
                {hasInactive && ` • ${completedProjects.length + abandonedProjects.length} inactive`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onCollapse(domain.id)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium ${domainConfig.colors.text} bg-white border ${domainConfig.colors.border} rounded-lg hover:${domainConfig.colors.light} transition-colors`}
            title="Collapse project"
          >
            <ChevronUp size={16} />
            Collapse
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeProject && (
          <div className="mb-4">
            <ProjectCard
              project={activeProject.project}
              domain={domain}
              stats={activeProject.stats}
              activeProjectId={activeProjectId}
              onOpenRoadmap={onOpenRoadmap}
              onOpenMindMesh={onOpenMindMesh}
              onOpenTaskFlow={onOpenTaskFlow}
              onRefresh={onRefresh}
            />
          </div>
        )}

        {hasInactive && (
          <div className="mt-4">
            <button
              onClick={() => toggleDomain(domain.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                {isExpanded ? 'Hide' : 'Show'} Completed & Abandoned Projects ({completedProjects.length + abandonedProjects.length})
              </span>
              {isExpanded ? (
                <ChevronDown size={20} className="text-gray-600" />
              ) : (
                <ChevronRight size={20} className="text-gray-600" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-4 space-y-4">
                {completedProjects.map(({ project, stats }) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    domain={domain}
                    stats={stats}
                    activeProjectId={activeProjectId}
                    onOpenRoadmap={onOpenRoadmap}
                    onOpenMindMesh={onOpenMindMesh}
                    onOpenTaskFlow={onOpenTaskFlow}
                    onRefresh={onRefresh}
                  />
                ))}
                {abandonedProjects.map(({ project, stats }) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    domain={domain}
                    stats={stats}
                    activeProjectId={activeProjectId}
                    onOpenRoadmap={onOpenRoadmap}
                    onOpenMindMesh={onOpenMindMesh}
                    onOpenTaskFlow={onOpenTaskFlow}
                    onRefresh={onRefresh}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SortableDomainWithoutActiveProject({ domainProject, expandedDomains, toggleDomain, activeProjectId, onCreateProject, onOpenRoadmap, onOpenMindMesh, onOpenTaskFlow, onRefresh }: {
  domainProject: DomainProjects;
  expandedDomains: Record<string, boolean>;
  toggleDomain: (domainId: string) => void;
  activeProjectId: string | null;
  onCreateProject: (domainId: string) => void;
  onOpenRoadmap: (projectId: string) => void;
  onOpenMindMesh: (projectId: string) => void;
  onOpenTaskFlow: (projectId: string) => void;
  onRefresh: () => void;
}) {
  const { domain, completedProjects, abandonedProjects } = domainProject;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: domain.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasInactive = completedProjects.length > 0 || abandonedProjects.length > 0;
  const isExpanded = expandedDomains[domain.id];
  const domainConfig = getDomainConfig(domain.name);
  const DomainIcon = domainConfig.icon;

  return (
    <div ref={setNodeRef} style={style} className={`bg-white rounded-xl border-2 ${domainConfig.colors.border} overflow-hidden`}>
      <div className={`p-6 border-b ${domainConfig.colors.border} bg-gradient-to-r ${domainConfig.colors.gradient}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2 rounded-lg hover:bg-white/50"
            >
              <GripVertical size={20} className={domainConfig.colors.text} />
            </div>
            <div className={`p-2.5 rounded-xl ${domainConfig.colors.light} border ${domainConfig.colors.border}`}>
              <DomainIcon size={24} className={domainConfig.colors.text} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {domainConfig.name}
              </h3>
              <p className="text-sm text-gray-600">
                No active projects
                {hasInactive && ` • ${completedProjects.length + abandonedProjects.length} inactive`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {hasInactive && (
          <div className="mb-4">
            <button
              onClick={() => toggleDomain(domain.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                {isExpanded ? 'Hide' : 'Show'} Completed & Abandoned Projects ({completedProjects.length + abandonedProjects.length})
              </span>
              {isExpanded ? (
                <ChevronDown size={20} className="text-gray-600" />
              ) : (
                <ChevronRight size={20} className="text-gray-600" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-4 space-y-4">
                {completedProjects.map(({ project, stats }) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    domain={domain}
                    stats={stats}
                    activeProjectId={activeProjectId}
                    onOpenRoadmap={onOpenRoadmap}
                    onOpenMindMesh={onOpenMindMesh}
                    onOpenTaskFlow={onOpenTaskFlow}
                    onRefresh={onRefresh}
                  />
                ))}
                {abandonedProjects.map(({ project, stats }) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    domain={domain}
                    stats={stats}
                    activeProjectId={activeProjectId}
                    onOpenRoadmap={onOpenRoadmap}
                    onOpenMindMesh={onOpenMindMesh}
                    onOpenTaskFlow={onOpenTaskFlow}
                    onRefresh={onRefresh}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!hasInactive && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No projects yet</p>
            <button
              onClick={() => onCreateProject(domain.id)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Create Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectsOverview({
  domainsWithProjects,
  activeProjectId,
  onCreateProject,
  onOpenRoadmap,
  onOpenMindMesh,
  onOpenTaskFlow,
  onRefresh,
}: ProjectsOverviewProps) {
  const { updateCustomOverride, getCustomOverride } = useUIPreferences();
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});
  const [collapsedDomains, setCollapsedDomains] = useState<Record<string, boolean>>({});
  const [orderedDomains, setOrderedDomains] = useState<DomainProjects[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const domainCollapseStates = getCustomOverride('domainCollapseStates', {});
    setCollapsedDomains(domainCollapseStates);
  }, [getCustomOverride]);

  useEffect(() => {
    setOrderedDomains(domainsWithProjects);
  }, [domainsWithProjects]);

  function toggleDomain(domainId: string) {
    setExpandedDomains(prev => ({
      ...prev,
      [domainId]: !prev[domainId],
    }));
  }

  async function expandAllProjects() {
    const allExpanded: Record<string, boolean> = {};
    domainsWithAnyProject.forEach(({ domain }) => {
      allExpanded[domain.id] = false;
    });
    setCollapsedDomains(allExpanded);
    await updateCustomOverride('domainCollapseStates', allExpanded);
  }

  async function collapseAllProjects() {
    const allCollapsed: Record<string, boolean> = {};
    domainsWithAnyProject.forEach(({ domain }) => {
      allCollapsed[domain.id] = true;
    });
    setCollapsedDomains(allCollapsed);
    await updateCustomOverride('domainCollapseStates', allCollapsed);
  }

  async function toggleDomainCollapse(domainId: string) {
    const newState = { ...collapsedDomains, [domainId]: !collapsedDomains[domainId] };
    setCollapsedDomains(newState);
    await updateCustomOverride('domainCollapseStates', newState);
  }

  async function expandSingleDomain(domainId: string) {
    const newState = { ...collapsedDomains, [domainId]: false };
    setCollapsedDomains(newState);
    await updateCustomOverride('domainCollapseStates', newState);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = orderedDomains.findIndex(d => d.domain.id === active.id);
    const newIndex = orderedDomains.findIndex(d => d.domain.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(orderedDomains, oldIndex, newIndex);
    setOrderedDomains(newOrder);

    try {
      const domainIds = newOrder.map(d => d.domain.id);
      await reorderDomains(domainIds);
      onRefresh();
    } catch (error) {
      console.error('Failed to reorder domains:', error);
      setOrderedDomains(orderedDomains);
    }
  }

  const domainsWithAnyProject = orderedDomains.filter(
    ({ activeProject, completedProjects, abandonedProjects }) =>
      activeProject || completedProjects.length > 0 || abandonedProjects.length > 0
  );

  const collapsedProjects = domainsWithAnyProject.filter(
    ({ domain, activeProject }) => activeProject && collapsedDomains[domain.id]
  );

  const expandedProjects = domainsWithAnyProject.filter(
    ({ domain, activeProject }) => activeProject && !collapsedDomains[domain.id]
  );

  const domainsWithoutActiveProject = domainsWithAnyProject.filter(
    ({ activeProject }) => !activeProject
  );

  const allCollapsed = domainsWithAnyProject
    .filter(({ activeProject }) => activeProject)
    .every(({ domain }) => collapsedDomains[domain.id]);

  const hasAnyCollapsed = collapsedProjects.length > 0;

  const hasAnyProjects = domainsWithAnyProject.length > 0;

  if (!hasAnyProjects) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Projects</h2>
          <p className="text-gray-600">Manage and track all your master projects across domains</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-12">
          <div className="text-center max-w-lg mx-auto">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus size={40} className="text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Create Your First Project
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Start by creating a project in one of your domains: Work, Personal, Startup, or Health.
              Each project helps you track progress, manage tasks, and achieve your goals.
            </p>
            <button
              onClick={() => onCreateProject('')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
            >
              <Plus size={24} />
              Create Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Projects</h2>
          <p className="text-gray-600">Manage and track all your master projects across domains</p>
        </div>
        {domainsWithAnyProject.some(({ activeProject }) => activeProject) && (
          <button
            onClick={allCollapsed ? expandAllProjects : collapseAllProjects}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {allCollapsed ? (
              <>
                <ChevronDown size={18} />
                Expand All
              </>
            ) : (
              <>
                <ChevronUp size={18} />
                Collapse All
              </>
            )}
          </button>
        )}
      </div>

      {hasAnyCollapsed && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <SortableContext
              items={collapsedProjects.map(d => d.domain.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {collapsedProjects.map((domainProject) => (
                  <SortableCollapsedProject
                    key={domainProject.domain.id}
                    domainProject={domainProject}
                    onExpand={expandSingleDomain}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        </DndContext>
      )}

      {(expandedProjects.length > 0 || domainsWithoutActiveProject.length > 0) && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={[...expandedProjects, ...domainsWithoutActiveProject].map(d => d.domain.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-6">
              {expandedProjects.map((domainProject) => (
                <SortableExpandedProject
                  key={domainProject.domain.id}
                  domainProject={domainProject}
                  onCollapse={toggleDomainCollapse}
                  expandedDomains={expandedDomains}
                  toggleDomain={toggleDomain}
                  activeProjectId={activeProjectId}
                  onOpenRoadmap={onOpenRoadmap}
                  onOpenMindMesh={onOpenMindMesh}
                  onOpenTaskFlow={onOpenTaskFlow}
                  onRefresh={onRefresh}
                />
              ))}

              {domainsWithoutActiveProject.map((domainProject) => (
                <SortableDomainWithoutActiveProject
                  key={domainProject.domain.id}
                  domainProject={domainProject}
                  expandedDomains={expandedDomains}
                  toggleDomain={toggleDomain}
                  activeProjectId={activeProjectId}
                  onCreateProject={onCreateProject}
                  onOpenRoadmap={onOpenRoadmap}
                  onOpenMindMesh={onOpenMindMesh}
                  onOpenTaskFlow={onOpenTaskFlow}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

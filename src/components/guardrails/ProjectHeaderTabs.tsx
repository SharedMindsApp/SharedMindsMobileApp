import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Map, Network, Kanban, Target, Activity, Zap, Share2, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSharingDrawer } from '../../hooks/useSharingDrawer';
import { SharingDrawer } from '../sharing/SharingDrawer';
import { PermissionIndicator } from '../sharing/PermissionIndicator';
import { getUserProjectPermissions } from '../../lib/guardrails/projectUserService';
import { ProjectSettingsDrawer } from './settings/ProjectSettingsDrawer';

interface ProjectHeaderTabsProps {
  masterProjectId: string;
  projectName: string;
}

export function ProjectHeaderTabs({ masterProjectId, projectName }: ProjectHeaderTabsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user } = useAuth();
  const { isOpen: isSharingOpen, adapter: sharingAdapter, openDrawer: openSharing, closeDrawer: closeSharing } = useSharingDrawer('project', masterProjectId);
  const [canManageProject, setCanManageProject] = useState(false);
  const [projectPermissionFlags, setProjectPermissionFlags] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (user && masterProjectId) {
      checkProjectPermissions();
    }
  }, [user, masterProjectId]);

  async function checkProjectPermissions() {
    if (!user || !masterProjectId) return;
    
    try {
      const permission = await getUserProjectPermissions(user.id, masterProjectId);
      if (permission) {
        setCanManageProject(permission.canManageUsers);
        setProjectPermissionFlags({
          can_view: permission.canView,
          can_edit: permission.canEdit,
          can_manage: permission.canManageUsers,
          detail_level: 'detailed',
          scope: 'include_children',
        });
      } else {
        setCanManageProject(false);
        setProjectPermissionFlags(null);
      }
    } catch (error) {
      console.error('Error checking project permissions:', error);
    }
  }

  const tabs = [
    {
      name: 'Roadmap',
      path: `/guardrails/projects/${masterProjectId}/roadmap`,
      icon: Map,
    },
    {
      name: 'Nodes',
      path: `/guardrails/projects/${masterProjectId}/nodes`,
      icon: Network,
    },
    {
      name: 'Task Flow',
      path: `/guardrails/projects/${masterProjectId}/taskflow`,
      icon: Kanban,
    },
    {
      name: 'Reality Check',
      path: `/guardrails/projects/${masterProjectId}/reality`,
      icon: Activity,
    },
    {
      name: 'Settings',
      path: null, // Settings opens drawer, not a route
      icon: Settings,
      onClick: () => setIsSettingsOpen(true),
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{projectName}</h1>
                <PermissionIndicator
                  entityType="project"
                  entityId={masterProjectId}
                  flags={projectPermissionFlags}
                  canManage={canManageProject}
                />
              </div>
              <p className="text-sm text-gray-600">Master project workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManageProject && (
              <button
                onClick={openSharing}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Share2 size={16} />
                Share Project
              </button>
            )}
            <button
              onClick={() => navigate('/interventions/use')}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Zap size={16} />
              Use Interventions
            </button>
          </div>
          
          {sharingAdapter && (
            <SharingDrawer
              adapter={sharingAdapter}
              isOpen={isSharingOpen}
              onClose={closeSharing}
            />
          )}
        </div>

        {/* Project Settings Drawer */}
        <ProjectSettingsDrawer
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          projectId={masterProjectId}
          projectName={projectName}
        />

        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.path ? currentPath.includes(tab.path) : isSettingsOpen;

            if (tab.onClick) {
              return (
                <button
                  key={tab.name}
                  onClick={tab.onClick}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon size={16} />
                  {tab.name}
                </button>
              );
            }

            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon size={16} />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

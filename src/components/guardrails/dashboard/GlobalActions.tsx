import { Plus, Focus, Lightbulb, Settings } from 'lucide-react';

interface GlobalActionsProps {
  onCreateProject: () => void;
  onOpenFocusMode: () => void;
  onViewIdeas: () => void;
  onOpenSettings: () => void;
}

export function GlobalActions({ onCreateProject, onOpenFocusMode, onViewIdeas, onOpenSettings }: GlobalActionsProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>

      <div className="space-y-2">
        <button
          onClick={onCreateProject}
          className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          <span>Create Project</span>
        </button>

        <button
          onClick={onOpenFocusMode}
          className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors font-medium"
        >
          <Focus size={20} />
          <span>Open Focus Mode</span>
        </button>

        <button
          onClick={onViewIdeas}
          className="w-full flex items-center gap-3 px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors font-medium"
        >
          <Lightbulb size={20} />
          <span>View All Ideas</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}

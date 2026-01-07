/**
 * Goal Tracker Component (Legacy - Use GoalTrackerCore instead)
 * 
 * @deprecated This component is deprecated. Use GoalTrackerCore or context-specific widgets:
 * - Planner: src/components/planner/widgets/GoalTrackerWidget.tsx
 * - Personal Spaces: src/components/personal-spaces/widgets/GoalTrackerWidget.tsx
 * - Shared Spaces: src/components/shared/widgets/GoalTrackerWidget.tsx
 * 
 * This file is kept for backward compatibility only.
 */

import { GoalTrackerWidget } from '../planner/widgets/GoalTrackerWidget';

let deprecationWarningShown = false;

export function GoalTracker() {
  // Show deprecation warning once
  if (!deprecationWarningShown && typeof window !== 'undefined') {
    console.warn(
      '[GoalTracker] Deprecated: Use GoalTrackerWidget from planner/personal-spaces/shared widgets instead. ' +
      'This component will be removed in a future version.'
    );
    deprecationWarningShown = true;
  }

  // Redirect to canonical widget
  return <GoalTrackerWidget layout="full" />;
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Goal Tracker</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          New Goal
        </button>
      </div>

      {showCreateForm && (
        <CreateGoalForm
          userId={user!.id}
          onClose={() => {
            setShowCreateForm(false);
            loadGoals();
          }}
        />
      )}

      <div className="grid gap-4">
        {goals.map(goal => (
          <GoalCard key={goal.id} goalId={goal.id} userId={user!.id} onUpdate={loadGoals} />
        ))}
      </div>

      {goals.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Target size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No goals yet. Create your first goal to get started!</p>
        </div>
      )}
    </div>
  );
}

function CreateGoalForm({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await createGoalActivity(userId, {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Error creating goal:', err);
      alert('Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Create New Goal</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Goal Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Build Daily Exercise Habit"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="What do you want to achieve?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date (Deadline)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </form>
    </div>
  );
}

function GoalCard({
  goalId,
  userId,
  onUpdate,
}: {
  goalId: string;
  userId: string;
  onUpdate: () => void;
}) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [goalId]);

  const loadProgress = async () => {
    try {
      const goalProgress = await computeGoalProgress(userId, goalId);
      setProgress(goalProgress);
    } catch (err) {
      console.error('Error loading goal progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      await markGoalCompleted(userId, goalId);
      loadProgress();
      onUpdate();
    } catch (err) {
      console.error('Error completing goal:', err);
    }
  };

  const handleExtend = async () => {
    const newEndDate = prompt('Enter new end date (YYYY-MM-DD):');
    if (newEndDate) {
      try {
        await extendGoal(userId, goalId, { newEndDate });
        loadProgress();
        onUpdate();
      } catch (err) {
        console.error('Error extending goal:', err);
      }
    }
  };

  if (loading || !progress) {
    return <div className="bg-white rounded-lg border border-gray-200 p-4">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{progress.activity.title}</h3>
          {progress.activity.description && (
            <p className="text-sm text-gray-600 mt-1">{progress.activity.description}</p>
          )}
        </div>
        {progress.goal.status === 'completed' && (
          <CheckCircle2 size={24} className="text-green-600" />
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-bold text-blue-600">
              {Math.round(progress.overallProgress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress.overallProgress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Target size={16} />
            <span>{progress.completedCount}/{progress.totalCount} requirements</span>
          </div>
          {progress.remainingDays !== null && (
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              <span>{progress.remainingDays} days remaining</span>
            </div>
          )}
        </div>

        {progress.requirementProgress.length > 0 && (
          <div className="pt-2 border-t border-gray-200 space-y-2">
            <span className="text-xs font-medium text-gray-500 uppercase">Requirements</span>
            {progress.requirementProgress.map((req, idx) => (
              <div key={idx} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">
                    {req.requirement.requirement_type === 'habit_streak' ? 'Streak' : 'Count'}
                  </span>
                  <span className={req.status === 'completed' ? 'text-green-600' : 'text-gray-600'}>
                    {req.completed}/{req.target}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {progress.goal.status === 'active' && progress.overallProgress >= 100 && (
          <div className="pt-2 border-t border-gray-200 flex gap-2">
            <button
              onClick={handleComplete}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              Mark Done
            </button>
            <button
              onClick={handleExtend}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
            >
              Extend
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


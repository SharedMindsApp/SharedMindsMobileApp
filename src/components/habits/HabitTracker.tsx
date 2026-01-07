/**
 * Habit Tracker Component (Legacy - Use HabitTrackerCore instead)
 * 
 * @deprecated This component is deprecated. Use HabitTrackerCore or context-specific widgets:
 * - Planner: src/components/planner/widgets/HabitTrackerWidget.tsx
 * - Personal Spaces: src/components/personal-spaces/widgets/HabitTrackerWidget.tsx
 * - Shared Spaces: src/components/shared/widgets/HabitTrackerWidget.tsx
 * 
 * This file is kept for backward compatibility only.
 */

import { HabitTrackerWidget } from '../planner/widgets/HabitTrackerWidget';

let deprecationWarningShown = false;

export function HabitTracker() {
  // Show deprecation warning once
  if (!deprecationWarningShown && typeof window !== 'undefined') {
    console.warn(
      '[HabitTracker] Deprecated: Use HabitTrackerWidget from planner/personal-spaces/shared widgets instead. ' +
      'This component will be removed in a future version.'
    );
    deprecationWarningShown = true;
  }

  // Redirect to canonical widget
  return <HabitTrackerWidget layout="full" />;
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Habit Tracker</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          New Habit
        </button>
      </div>

      {showCreateForm && (
        <CreateHabitForm
          userId={user!.id}
          onClose={() => {
            setShowCreateForm(false);
            loadHabits();
          }}
        />
      )}

      <div className="grid gap-4">
        {habits.map(habit => (
          <HabitCard key={habit.id} habit={habit} userId={user!.id} onUpdate={loadHabits} />
        ))}
      </div>

      {habits.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Activity size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No habits yet. Create your first habit to get started!</p>
        </div>
      )}
    </div>
  );
}

function CreateHabitForm({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [polarity, setPolarity] = useState<HabitPolarity>('build');
  const [metricType, setMetricType] = useState<HabitMetricType>('boolean');
  const [metricUnit, setMetricUnit] = useState('');
  const [targetValue, setTargetValue] = useState<number>(1);
  const [direction, setDirection] = useState<HabitDirection>('at_least');
  const [repeatType, setRepeatType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await createHabitActivity(userId, {
        title: title.trim(),
        description: description.trim() || undefined,
        polarity,
        metric_type: metricType,
        metric_unit: metricUnit.trim() || undefined,
        target_value: metricType !== 'boolean' ? targetValue : undefined,
        direction: metricType !== 'boolean' ? direction : undefined,
        startDate: new Date().toISOString(),
        repeatType,
      });
      onClose();
    } catch (err) {
      console.error('Error creating habit:', err);
      alert('Failed to create habit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Create New Habit</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Habit Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Morning Meditation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="build"
                checked={polarity === 'build'}
                onChange={(e) => setPolarity(e.target.value as HabitPolarity)}
              />
              Build (Good habit)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="break"
                checked={polarity === 'break'}
                onChange={(e) => setPolarity(e.target.value as HabitPolarity)}
              />
              Break (Bad habit)
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Metric Type
          </label>
          <select
            value={metricType}
            onChange={(e) => setMetricType(e.target.value as HabitMetricType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="boolean">Yes/No (Did I do it?)</option>
            <option value="count">Count (e.g., pushups)</option>
            <option value="minutes">Minutes (e.g., meditation time)</option>
            <option value="rating">Rating (1-10)</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {metricType !== 'boolean' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit (optional)
              </label>
              <input
                type="text"
                value={metricUnit}
                onChange={(e) => setMetricUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., pushups, pages, cups"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Value
                </label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Direction
                </label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as HabitDirection)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="at_least">At least (≥)</option>
                  <option value="at_most">At most (≤)</option>
                  <option value="exactly">Exactly (=)</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Frequency
          </label>
          <select
            value={repeatType}
            onChange={(e) => setRepeatType(e.target.value as 'daily' | 'weekly' | 'monthly')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
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
            {saving ? 'Creating...' : 'Create Habit'}
          </button>
        </div>
      </form>
    </div>
  );
}

function HabitCard({
  habit,
  userId,
  onUpdate,
}: {
  habit: Activity;
  userId: string;
  onUpdate: () => void;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadSummary();
  }, [habit.id]);

  const loadSummary = async () => {
    try {
      const habitSummary = await getHabitSummary(userId, habit.id);
      setSummary(habitSummary);
    } catch (err) {
      console.error('Error loading habit summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (status: HabitCheckinStatus) => {
    try {
      await upsertHabitCheckin(userId, habit.id, today, {
        status,
        value_boolean: status === 'done' ? true : undefined,
      });
      loadSummary();
      onUpdate();
    } catch (err) {
      console.error('Error checking in:', err);
    }
  };

  const metricType = habit.metadata?.metric_type || 'boolean';
  const polarity = habit.metadata?.polarity || 'build';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{habit.title}</h3>
          {habit.description && (
            <p className="text-sm text-gray-600 mt-1">{habit.description}</p>
          )}
        </div>
        <button
          onClick={() => archiveHabit(userId, habit.id).then(onUpdate)}
          className="text-gray-400 hover:text-red-600"
          title="Archive habit"
        >
          <XCircle size={20} />
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : summary ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Activity size={16} className="text-blue-600" />
              <span className="font-medium">{summary.currentStreak} day streak</span>
            </div>
            <div className="flex items-center gap-1">
              {summary.trend === 'up' ? (
                <TrendingUp size={16} className="text-green-600" />
              ) : summary.trend === 'down' ? (
                <TrendingDown size={16} className="text-red-600" />
              ) : null}
              <span className="text-gray-600">
                {Math.round(summary.completionRate7d)}% (7d)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Today:</span>
            <button
              onClick={() => handleCheckIn('done')}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1 text-sm"
            >
              <CheckCircle2 size={16} />
              Done
            </button>
            <button
              onClick={() => handleCheckIn('missed')}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1 text-sm"
            >
              <XCircle size={16} />
              Missed
            </button>
            <button
              onClick={() => handleCheckIn('skipped')}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1 text-sm"
            >
              <Minus size={16} />
              Skip
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


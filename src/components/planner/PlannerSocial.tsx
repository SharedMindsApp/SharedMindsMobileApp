import { useState, useEffect, useRef } from 'react';
import { Calendar, Users, Heart, MessageCircle, Sparkles, BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { PlannerShell } from './PlannerShell';
import { useAuth } from '../../contexts/AuthContext';
import {
  getLifeAreaOverview,
  updateLifeAreaOverview,
  getLifeAreaGoals,
  getLifeAreaTasks,
  updateLifeAreaTask,
  type LifeAreaGoal,
  type LifeAreaTask,
} from '../../lib/lifeAreas';
import { useNavigate } from 'react-router-dom';

export function PlannerSocial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [socialNotes, setSocialNotes] = useState('');
  const [peopleNotes, setPeopleNotes] = useState('');
  const [goals, setGoals] = useState<LifeAreaGoal[]>([]);
  const [tasks, setTasks] = useState<LifeAreaTask[]>([]);

  // Collapsible sections state
  const [eventsOpen, setEventsOpen] = useState(false);
  const [reachOutOpen, setReachOutOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [interactionsOpen, setInteractionsOpen] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false);

  // Auto-save indicators
  const [peopleSaved, setPeopleSaved] = useState(true);
  const [reflectionSaved, setReflectionSaved] = useState(true);

  // Auto-save timers
  const peopleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reflectionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    if (!user) return;

    const [overviewData, goalsData, tasksData] = await Promise.all([
      getLifeAreaOverview(user.id, 'social'),
      getLifeAreaGoals(user.id, 'social'),
      getLifeAreaTasks(user.id, 'social'),
    ]);

    if (overviewData) {
      setSocialNotes(overviewData.notes || '');
      setPeopleNotes(overviewData.summary || '');
    }
    setGoals(goalsData);
    setTasks(tasksData);
  }

  // Auto-save functions
  async function autoSavePeople() {
    if (!user) return;
    await updateLifeAreaOverview(user.id, 'social', { summary: peopleNotes });
    setPeopleSaved(true);
  }

  async function autoSaveReflection() {
    if (!user) return;
    await updateLifeAreaOverview(user.id, 'social', { notes: socialNotes });
    setReflectionSaved(true);
  }

  // Handle text changes with auto-save debounce
  function handlePeopleChange(value: string) {
    setPeopleNotes(value);
    setPeopleSaved(false);
    if (peopleTimerRef.current) clearTimeout(peopleTimerRef.current);
    peopleTimerRef.current = setTimeout(autoSavePeople, 1500);
  }

  function handleReflectionChange(value: string) {
    setSocialNotes(value);
    setReflectionSaved(false);
    if (reflectionTimerRef.current) clearTimeout(reflectionTimerRef.current);
    reflectionTimerRef.current = setTimeout(autoSaveReflection, 1500);
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (peopleTimerRef.current) clearTimeout(peopleTimerRef.current);
      if (reflectionTimerRef.current) clearTimeout(reflectionTimerRef.current);
    };
  }, []);

  async function toggleTask(task: LifeAreaTask) {
    if (!user) return;
    await updateLifeAreaTask(task.id, { completed: !task.completed });
    loadData();
  }

  // Filter tasks by context
  const reachOutTasks = tasks.filter(t => !t.completed);
  const socialGoals = goals.filter(g => g.status === 'active');

  return (
    <PlannerShell>
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        {/* Hero Header */}
        <div className="text-center py-8 space-y-2">
          <h1 className="text-4xl md:text-5xl font-light text-gray-800 tracking-wide">
            Social & Relationships
          </h1>
          <p className="text-lg text-gray-500 font-light italic">
            A space for connection, presence, and meaningful relationships
          </p>
        </div>

        {/* People on Your Mind - Primary Canvas */}
        <section className="bg-gradient-to-br from-amber-50/30 to-orange-50/30 rounded-2xl shadow-sm border border-amber-100/50 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-rose-400" />
                <h2 className="text-xl font-light text-gray-700">
                  People on Your Mind
                </h2>
              </div>
              {!peopleSaved && (
                <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
              )}
              {peopleSaved && peopleNotes && (
                <span className="text-xs text-gray-400">Saved</span>
              )}
            </div>
            <textarea
              value={peopleNotes}
              onChange={(e) => handlePeopleChange(e.target.value)}
              className="w-full border-0 focus:outline-none focus:ring-0 font-serif text-base leading-loose text-gray-800 placeholder-gray-400 resize-none bg-transparent"
              rows={8}
              placeholder="Who have you been thinking about?"
              style={{ minHeight: '200px' }}
            />
          </div>
        </section>

        {/* Upcoming Social Events - Collapsible */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setEventsOpen(!eventsOpen)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-light text-gray-700">
                Upcoming Social Events
              </h2>
            </div>
            {eventsOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {eventsOpen && (
            <div className="px-5 pb-5 border-t border-gray-50">
              <div className="pt-4 text-center py-8">
                <p className="text-sm text-gray-500 mb-3">
                  Your social calendar lives in your main calendar
                </p>
                <button
                  onClick={() => navigate('/calendar')}
                  className="text-sm text-sky-600 hover:text-sky-700 underline"
                >
                  Open Calendar
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Reach-Out Reminders - Collapsible */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setReachOutOpen(!reachOutOpen)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-light text-gray-700">
                Reach Out
              </h2>
            </div>
            {reachOutOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {reachOutOpen && (
            <div className="px-5 pb-5 border-t border-gray-50">
              <div className="pt-4 space-y-3">
                {reachOutTasks.length > 0 ? (
                  reachOutTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 bg-emerald-50/30 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
                      />
                      <span className="flex-1 text-sm text-gray-700 leading-relaxed">{task.title}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500">
                      No one on your list right now
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Important Dates - Collapsible */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setDatesOpen(!datesOpen)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-light text-gray-700">
                Important Dates
              </h2>
            </div>
            {datesOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {datesOpen && (
            <div className="px-5 pb-5 border-t border-gray-50">
              <div className="pt-4 text-center py-8">
                <p className="text-sm text-gray-500 mb-3">
                  Birthdays, anniversaries, and special moments
                </p>
                <button
                  onClick={() => navigate('/calendar')}
                  className="text-sm text-amber-600 hover:text-amber-700 underline"
                >
                  Open Calendar
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Social Goals - Collapsible */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setGoalsOpen(!goalsOpen)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-light text-gray-700">
                Social Goals
              </h2>
            </div>
            {goalsOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {goalsOpen && (
            <div className="px-5 pb-5 border-t border-gray-50">
              <div className="pt-4 space-y-3">
                {socialGoals.length > 0 ? (
                  socialGoals.map((goal) => (
                    <div key={goal.id} className="p-4 bg-pink-50/30 rounded-lg">
                      <div className="text-sm font-medium text-gray-800 mb-3">{goal.title}</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-pink-400 transition-all"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 min-w-[3ch]">{goal.progress}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500">
                      No goals set yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Recent Interactions - Collapsible */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setInteractionsOpen(!interactionsOpen)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-light text-gray-700">
                Moments Worth Remembering
              </h2>
            </div>
            {interactionsOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {interactionsOpen && (
            <div className="px-5 pb-5 border-t border-gray-50">
              <div className="pt-4 text-center py-8">
                <p className="text-sm text-gray-500 mb-3">
                  Some conversations leave an impression
                </p>
                <button
                  onClick={() => navigate('/planner/journal')}
                  className="text-sm text-yellow-600 hover:text-yellow-700 underline"
                >
                  Reflect in your Journal
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Relationship Reflection - Collapsible with Bridge to Journal */}
        <section className="bg-gradient-to-br from-blue-50/30 to-sky-50/30 rounded-2xl shadow-sm border border-blue-100/50 overflow-hidden">
          <button
            onClick={() => setReflectionOpen(!reflectionOpen)}
            className="w-full p-5 flex items-center justify-between hover:bg-blue-50/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-light text-gray-700">
                Relationship Reflection
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {!reflectionSaved && reflectionOpen && (
                <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
              )}
              {reflectionSaved && socialNotes && reflectionOpen && (
                <span className="text-xs text-gray-400">Saved</span>
              )}
              {reflectionOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>
          {reflectionOpen && (
            <div className="px-5 pb-5 border-t border-blue-50">
              <p className="text-xs text-gray-500 italic mb-4 pt-4">
                How are you showing up? What patterns are you noticing?
              </p>
              <textarea
                value={socialNotes}
                onChange={(e) => handleReflectionChange(e.target.value)}
                className="w-full border-0 focus:outline-none focus:ring-0 font-serif text-base leading-loose text-gray-800 placeholder-gray-400 resize-none bg-transparent"
                rows={8}
                placeholder="Reflect on your relationships..."
              />
              <div className="mt-4 pt-4 border-t border-blue-100/50 text-center">
                <p className="text-xs text-gray-500 mb-2">
                  Want more space for reflection?
                </p>
                <button
                  onClick={() => navigate('/planner/journal')}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Continue in your Journal
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Footer Note */}
        <div className="text-center py-8">
          <p className="text-sm text-gray-400 font-light italic">
            Relationships don't need managing. They need remembering.
          </p>
        </div>
      </div>
    </PlannerShell>
  );
}

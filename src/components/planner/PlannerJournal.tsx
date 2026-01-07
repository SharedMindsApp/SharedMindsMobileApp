import { useState, useEffect, useRef } from 'react';
import { BookOpen, CalendarDays, Smile, Sparkles, PenLine, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { PlannerShell } from './PlannerShell';
import { useAuth } from '../../contexts/AuthContext';
import {
  getLifeAreaOverview,
  updateLifeAreaOverview,
} from '../../lib/lifeAreas';
import { useNavigate } from 'react-router-dom';

export function PlannerJournal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dailyEntry, setDailyEntry] = useState('');
  const [weeklyReflection, setWeeklyReflection] = useState('');
  const [gratitudeEntry, setGratitudeEntry] = useState('');
  const [freeWriting, setFreeWriting] = useState('');

  // Collapsible sections state (Daily Journal always open)
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [gratitudeOpen, setGratitudeOpen] = useState(false);
  const [freeOpen, setFreeOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);

  // Auto-save indicators
  const [dailySaved, setDailySaved] = useState(true);
  const [weeklySaved, setWeeklySaved] = useState(true);
  const [gratitudeSaved, setGratitudeSaved] = useState(true);
  const [freeSaved, setFreeSaved] = useState(true);

  // Auto-save timers
  const dailyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const weeklyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gratitudeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const freeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    if (!user) return;

    const overviewData = await getLifeAreaOverview(user.id, 'journal');

    if (overviewData) {
      setDailyEntry(overviewData.summary || '');
      setWeeklyReflection(overviewData.notes || '');
    }

    // Load gratitude and free writing from separate areas
    const [gratitudeData, freeData] = await Promise.all([
      getLifeAreaOverview(user.id, 'gratitude'),
      getLifeAreaOverview(user.id, 'freewriting'),
    ]);

    if (gratitudeData) {
      setGratitudeEntry(gratitudeData.summary || '');
    }
    if (freeData) {
      setFreeWriting(freeData.summary || '');
    }
  }

  // Auto-save functions
  async function autoSaveDaily() {
    if (!user) return;
    await updateLifeAreaOverview(user.id, 'journal', { summary: dailyEntry });
    setDailySaved(true);
  }

  async function autoSaveWeekly() {
    if (!user) return;
    await updateLifeAreaOverview(user.id, 'journal', { notes: weeklyReflection });
    setWeeklySaved(true);
  }

  async function autoSaveGratitude() {
    if (!user) return;
    await updateLifeAreaOverview(user.id, 'gratitude', { summary: gratitudeEntry });
    setGratitudeSaved(true);
  }

  async function autoSaveFree() {
    if (!user) return;
    await updateLifeAreaOverview(user.id, 'freewriting', { summary: freeWriting });
    setFreeSaved(true);
  }

  // Handle text changes with auto-save debounce
  function handleDailyChange(value: string) {
    setDailyEntry(value);
    setDailySaved(false);
    if (dailyTimerRef.current) clearTimeout(dailyTimerRef.current);
    dailyTimerRef.current = setTimeout(autoSaveDaily, 1500);
  }

  function handleWeeklyChange(value: string) {
    setWeeklyReflection(value);
    setWeeklySaved(false);
    if (weeklyTimerRef.current) clearTimeout(weeklyTimerRef.current);
    weeklyTimerRef.current = setTimeout(autoSaveWeekly, 1500);
  }

  function handleGratitudeChange(value: string) {
    setGratitudeEntry(value);
    setGratitudeSaved(false);
    if (gratitudeTimerRef.current) clearTimeout(gratitudeTimerRef.current);
    gratitudeTimerRef.current = setTimeout(autoSaveGratitude, 1500);
  }

  function handleFreeChange(value: string) {
    setFreeWriting(value);
    setFreeSaved(false);
    if (freeTimerRef.current) clearTimeout(freeTimerRef.current);
    freeTimerRef.current = setTimeout(autoSaveFree, 1500);
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (dailyTimerRef.current) clearTimeout(dailyTimerRef.current);
      if (weeklyTimerRef.current) clearTimeout(weeklyTimerRef.current);
      if (gratitudeTimerRef.current) clearTimeout(gratitudeTimerRef.current);
      if (freeTimerRef.current) clearTimeout(freeTimerRef.current);
    };
  }, []);

  return (
    <PlannerShell>
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        {/* Hero Header */}
        <div className="text-center py-8 space-y-2">
          <h1 className="text-4xl md:text-5xl font-light text-gray-800 tracking-wide">
            Journal
          </h1>
          <p className="text-lg text-gray-500 font-light italic">
            A space to think, write, and reflect
          </p>
          <p className="text-sm text-gray-400 pt-2">{today}</p>
        </div>

        {/* Daily Journal - Primary Canvas */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-light text-gray-700">
                  Daily Journal
                </h2>
              </div>
              {!dailySaved && (
                <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
              )}
              {dailySaved && dailyEntry && (
                <span className="text-xs text-gray-400">Saved</span>
              )}
            </div>
            <textarea
              value={dailyEntry}
              onChange={(e) => handleDailyChange(e.target.value)}
              className="w-full border-0 focus:outline-none focus:ring-0 font-serif text-base leading-loose text-gray-800 placeholder-gray-300 resize-none"
              rows={12}
              placeholder="What's on your mind today?"
              style={{ minHeight: '300px' }}
              // Phase 4A: Auto-focus on mobile for faster daily entry
              autoFocus={typeof window !== 'undefined' && window.innerWidth < 1024 && !dailyEntry}
            />
          </div>
        </section>

        {/* Weekly Reflection - Collapsible */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setWeeklyOpen(!weeklyOpen)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-light text-gray-700">
                Weekly Reflection
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {!weeklySaved && weeklyOpen && (
                <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
              )}
              {weeklySaved && weeklyReflection && weeklyOpen && (
                <span className="text-xs text-gray-400">Saved</span>
              )}
              {weeklyOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>
          {weeklyOpen && (
            <div className="px-5 pb-5 border-t border-gray-50">
              <p className="text-xs text-gray-500 italic mb-4 pt-4">
                What went well this week? What challenged you? What did you learn?
              </p>
              <textarea
                value={weeklyReflection}
                onChange={(e) => handleWeeklyChange(e.target.value)}
                className="w-full border-0 focus:outline-none focus:ring-0 font-serif text-base leading-loose text-gray-800 placeholder-gray-300 resize-none bg-gray-50/30 rounded-lg p-4"
                rows={8}
                placeholder="Reflect on your week..."
              />
            </div>
          )}
        </section>

        {/* Gratitude - Collapsible */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setGratitudeOpen(!gratitudeOpen)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-light text-gray-700">
                Gratitude
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {!gratitudeSaved && gratitudeOpen && (
                <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
              )}
              {gratitudeSaved && gratitudeEntry && gratitudeOpen && (
                <span className="text-xs text-gray-400">Saved</span>
              )}
              {gratitudeOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>
          {gratitudeOpen && (
            <div className="px-5 pb-5 border-t border-gray-50">
              <p className="text-xs text-gray-500 italic mb-4 pt-4">
                What are you grateful for today?
              </p>
              <textarea
                value={gratitudeEntry}
                onChange={(e) => handleGratitudeChange(e.target.value)}
                className="w-full border-0 focus:outline-none focus:ring-0 font-serif text-base leading-loose text-gray-800 placeholder-gray-300 resize-none bg-gray-50/30 rounded-lg p-4"
                rows={6}
                placeholder="Three things I'm grateful for..."
              />
            </div>
          )}
        </section>

        {/* Free Writing - Collapsible */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setFreeOpen(!freeOpen)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <PenLine className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-light text-gray-700">
                Free Writing
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {!freeSaved && freeOpen && (
                <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
              )}
              {freeSaved && freeWriting && freeOpen && (
                <span className="text-xs text-gray-400">Saved</span>
              )}
              {freeOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>
          {freeOpen && (
            <div className="px-5 pb-5 border-t border-gray-50">
              <p className="text-xs text-gray-500 italic mb-4 pt-4">
                No structure. No rules. Just write whatever comes to mind.
              </p>
              <textarea
                value={freeWriting}
                onChange={(e) => handleFreeChange(e.target.value)}
                className="w-full border-0 focus:outline-none focus:ring-0 font-serif text-base leading-loose text-gray-800 placeholder-gray-300 resize-none bg-gray-50/30 rounded-lg p-4"
                rows={10}
                placeholder="Start writing..."
              />
            </div>
          )}
        </section>

        {/* Mood & Energy - Collapsible Placeholder */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setMoodOpen(!moodOpen)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Smile className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-light text-gray-700">
                Mood & Energy
              </h2>
            </div>
            {moodOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {moodOpen && (
            <div className="px-5 pb-5 border-t border-gray-50">
              <div className="pt-4 text-center py-8">
                <p className="text-sm text-gray-500 mb-2">
                  Track your mood and energy levels throughout the day
                </p>
                <p className="text-xs text-gray-400 italic">
                  Coming soon
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Past Entries - Collapsible */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setPastOpen(!pastOpen)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-light text-gray-700">
                Past Entries
              </h2>
            </div>
            {pastOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {pastOpen && (
            <div className="px-5 pb-5 border-t border-gray-50">
              <div className="pt-4 text-center py-8">
                <p className="text-sm text-gray-500 mb-2">
                  Your journal entries are saved automatically as you write
                </p>
                <p className="text-xs text-gray-400">
                  Tip: Use the Weekly and Monthly planners to review past reflections
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Footer Note */}
        <div className="text-center py-8">
          <p className="text-sm text-gray-400 font-light italic">
            This is your private space.
          </p>
        </div>
      </div>
    </PlannerShell>
  );
}

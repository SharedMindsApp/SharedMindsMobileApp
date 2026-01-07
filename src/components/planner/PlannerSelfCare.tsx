import { PlannerShell } from './PlannerShell';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Activity,
  Utensils,
  Moon,
  Brain,
  Sparkles,
  ListChecks,
  BookHeart,
  Flower2,
  CloudOff,
} from 'lucide-react';

interface SelfCareFeature {
  id: string;
  title: string;
  description: string;
  icon: any;
  route: string;
  color: string;
}

const features: SelfCareFeature[] = [
  {
    id: 'goals',
    title: 'Wellness Goals',
    description: 'Set gentle intentions for your wellbeing',
    icon: Heart,
    route: '/planner/selfcare/goals',
    color: 'from-rose-400 to-pink-500',
  },
  {
    id: 'exercise',
    title: 'Exercise Tracker',
    description: 'Support movement without obsession',
    icon: Activity,
    route: '/planner/selfcare/exercise',
    color: 'from-orange-400 to-amber-500',
  },
  {
    id: 'nutrition',
    title: 'Nutrition Log',
    description: 'Encourage awareness, not restriction',
    icon: Utensils,
    route: '/planner/selfcare/nutrition',
    color: 'from-green-400 to-emerald-500',
  },
  {
    id: 'sleep',
    title: 'Sleep Tracker',
    description: 'Track rest gently',
    icon: Moon,
    route: '/planner/selfcare/sleep',
    color: 'from-blue-400 to-cyan-500',
  },
  {
    id: 'mental',
    title: 'Mental Health Check-Ins',
    description: 'Emotional awareness, not diagnosis',
    icon: Brain,
    route: '/planner/selfcare/mental',
    color: 'from-violet-400 to-purple-500',
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness & Meditation',
    description: 'Presence, not performance',
    icon: Sparkles,
    route: '/planner/selfcare/mindfulness',
    color: 'from-teal-400 to-cyan-500',
  },
  {
    id: 'routines',
    title: 'Self-Care Routines',
    description: 'Build repeatable care habits',
    icon: ListChecks,
    route: '/planner/selfcare/routines',
    color: 'from-indigo-400 to-blue-500',
  },
  {
    id: 'gratitude',
    title: 'Gratitude Journal',
    description: 'Cultivate positive awareness',
    icon: BookHeart,
    route: '/planner/selfcare/gratitude',
    color: 'from-amber-400 to-yellow-500',
  },
  {
    id: 'beauty',
    title: 'Beauty & Skincare',
    description: 'Practical self-maintenance tracking',
    icon: Flower2,
    route: '/planner/selfcare/beauty',
    color: 'from-pink-400 to-rose-500',
  },
  {
    id: 'rest',
    title: 'Rest & Recovery',
    description: 'Normalise rest as intentional',
    icon: CloudOff,
    route: '/planner/selfcare/rest',
    color: 'from-slate-400 to-gray-500',
  },
];

export function PlannerSelfCare() {
  const navigate = useNavigate();

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
              <Heart className="w-7 h-7 text-rose-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800">Self-Care & Wellness</h1>
              <p className="text-slate-600 mt-1">Nurture your physical, mental, and emotional wellbeing</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Privacy Note:</span> All self-care data is private by default.
              You control what gets shared and with whom.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => navigate(feature.route)}
                className="group relative bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300 text-left overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                <div className="relative">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 transform group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-slate-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>

                  <div className="mt-4 flex items-center text-sm font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
                    <span>Explore</span>
                    <svg className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-12 bg-slate-50 rounded-xl p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">How Self-Care Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center mb-3">
                <span className="text-rose-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Track What Matters</h3>
              <p className="text-sm text-slate-600">
                Log wellness activities at your own pace. No pressure, no judgment.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Stay Private</h3>
              <p className="text-sm text-slate-600">
                Everything is private by default. Share only what you choose.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                <span className="text-green-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Build Awareness</h3>
              <p className="text-sm text-slate-600">
                Reflect on patterns and find what truly supports your wellbeing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PlannerShell>
  );
}

import { useState, useEffect } from 'react';
import { Target, Heart, Sparkles, Trophy, BookOpen, TrendingUp, Star, Lightbulb, Award, Calendar, ArrowLeft } from 'lucide-react';
import { PlannerShell } from './PlannerShell';
import { LifeAreaFeatureCard } from './LifeAreaFeatureCard';
import { LifeAreaMobileMenu, type LifeAreaFeature } from './LifeAreaMobileMenu';
import { GoalTrackerView } from './personal/GoalTrackerView';
import { MotivationBoardView } from './personal/MotivationBoardView';
import { PersonalJournalView } from './personal/PersonalJournalView';
import { LifeMilestonesView } from './personal/LifeMilestonesView';
import { GrowthTrackingView } from './personal/GrowthTrackingView';
import { SkillsDevelopmentView } from './personal/SkillsDevelopmentView';
import {
  HobbiesView,
  ValuesView,
  IdeasView,
  HabitsView
} from './personal/PersonalDevelopmentFeatures';

type View = 'dashboard' | 'goals' | 'motivation' | 'hobbies' | 'milestones' | 'journal' | 'growth' | 'values' | 'habits' | 'ideas' | 'skills';

export function PlannerPersonal() {
  // Phase 4A: Remember last used section for faster access
  const [currentView, setCurrentView] = useState<View>(() => {
    if (typeof window !== 'undefined') {
      const lastSection = localStorage.getItem('last_personal_section');
      if (lastSection && ['dashboard', 'goals', 'motivation', 'hobbies', 'milestones', 'journal', 'growth', 'values', 'habits', 'ideas', 'skills'].includes(lastSection)) {
        return lastSection as View;
      }
    }
    return 'dashboard';
  });

  // Phase 4A: Save section when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_personal_section', currentView);
    }
  }, [currentView]);

  const renderView = () => {
    switch (currentView) {
      case 'goals':
        return <GoalTrackerView />;
      case 'motivation':
        return <MotivationBoardView />;
      case 'hobbies':
        return <HobbiesView />;
      case 'milestones':
        return <LifeMilestonesView />;
      case 'journal':
        return <PersonalJournalView />;
      case 'growth':
        return <GrowthTrackingView />;
      case 'values':
        return <ValuesView />;
      case 'ideas':
        return <IdeasView />;
      case 'skills':
        return <SkillsDevelopmentView />;
      case 'habits':
        return <HabitsView />;
      default:
        return null;
    }
  };

  if (currentView !== 'dashboard') {
    return (
      <PlannerShell>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Personal Development</span>
        </button>
        {renderView()}
      </PlannerShell>
    );
  }

  const features: LifeAreaFeature[] = [
    {
      id: 'goals',
      icon: Target,
      label: 'Goal Tracker',
      description: 'Set and track personal development goals with progress monitoring',
      onClick: () => setCurrentView('goals'),
    },
    {
      id: 'motivation',
      icon: Heart,
      label: 'Motivation Board',
      description: 'Visual inspiration board with quotes, images, and affirmations',
      onClick: () => setCurrentView('motivation'),
      badge: 'NEW',
    },
    {
      id: 'hobbies',
      icon: Sparkles,
      label: 'Hobbies & Interests',
      description: 'Track hobbies, interests, and time spent on personal activities',
      onClick: () => setCurrentView('hobbies'),
    },
    {
      id: 'milestones',
      icon: Trophy,
      label: 'Life Milestones',
      description: 'Record and celebrate major life achievements and milestones',
      onClick: () => setCurrentView('milestones'),
    },
    {
      id: 'journal',
      icon: BookOpen,
      label: 'Personal Journal',
      description: 'Daily journaling for reflection, gratitude, and self-awareness',
      onClick: () => setCurrentView('journal'),
    },
    {
      id: 'growth',
      icon: TrendingUp,
      label: 'Growth Tracking',
      description: 'Measure personal growth across different life dimensions',
      onClick: () => setCurrentView('growth'),
    },
    {
      id: 'values',
      icon: Star,
      label: 'Values & Principles',
      description: 'Define and align actions with your core values and beliefs',
      onClick: () => setCurrentView('values'),
    },
    {
      id: 'ideas',
      icon: Lightbulb,
      label: 'Ideas & Inspiration',
      description: 'Capture creative ideas and personal project inspirations',
      onClick: () => setCurrentView('ideas'),
    },
    {
      id: 'skills',
      icon: Award,
      label: 'Skills Development',
      description: 'Track skills you want to develop and progress made',
      onClick: () => setCurrentView('skills'),
    },
    {
      id: 'habits',
      icon: Calendar,
      label: 'Habit Tracker',
      description: 'Build positive habits and break negative ones with daily tracking',
      onClick: () => setCurrentView('habits'),
    },
  ];

  return (
    <PlannerShell>
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-semibold text-slate-800 mb-1 md:mb-2">Personal Development</h1>
          <p className="text-xs md:text-sm text-gray-500">Your journey of growth, discovery, and self-improvement</p>
        </div>

        {/* Mobile Menu */}
        <LifeAreaMobileMenu features={features} themeColor="indigo" />

        {/* Desktop Grid - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LifeAreaFeatureCard
            icon={Target}
            title="Goal Tracker"
            description="Set and track personal development goals with progress monitoring"
            color="bg-blue-500"
            onClick={() => setCurrentView('goals')}
          />

          <LifeAreaFeatureCard
            icon={Heart}
            title="Motivation Board"
            description="Visual inspiration board with quotes, images, and affirmations"
            color="bg-rose-500"
            onClick={() => setCurrentView('motivation')}
            badge="NEW"
          />

          <LifeAreaFeatureCard
            icon={Sparkles}
            title="Hobbies & Interests"
            description="Track hobbies, interests, and time spent on personal activities"
            color="bg-purple-500"
            onClick={() => setCurrentView('hobbies')}
          />

          <LifeAreaFeatureCard
            icon={Trophy}
            title="Life Milestones"
            description="Record and celebrate major life achievements and milestones"
            color="bg-amber-500"
            onClick={() => setCurrentView('milestones')}
          />

          <LifeAreaFeatureCard
            icon={BookOpen}
            title="Personal Journal"
            description="Daily journaling for reflection, gratitude, and self-awareness"
            color="bg-teal-500"
            onClick={() => setCurrentView('journal')}
          />

          <LifeAreaFeatureCard
            icon={TrendingUp}
            title="Growth Tracking"
            description="Measure personal growth across different life dimensions"
            color="bg-green-500"
            onClick={() => setCurrentView('growth')}
          />

          <LifeAreaFeatureCard
            icon={Star}
            title="Values & Principles"
            description="Define and align actions with your core values and beliefs"
            color="bg-indigo-500"
            onClick={() => setCurrentView('values')}
          />

          <LifeAreaFeatureCard
            icon={Lightbulb}
            title="Ideas & Inspiration"
            description="Capture creative ideas and personal project inspirations"
            color="bg-yellow-500"
            onClick={() => setCurrentView('ideas')}
          />

          <LifeAreaFeatureCard
            icon={Award}
            title="Skills Development"
            description="Track skills you want to develop and progress made"
            color="bg-cyan-500"
            onClick={() => setCurrentView('skills')}
          />

          <LifeAreaFeatureCard
            icon={Calendar}
            title="Habit Tracker"
            description="Build positive habits and break negative ones with daily tracking"
            color="bg-emerald-500"
            onClick={() => setCurrentView('habits')}
          />
        </div>
      </div>
    </PlannerShell>
  );
}

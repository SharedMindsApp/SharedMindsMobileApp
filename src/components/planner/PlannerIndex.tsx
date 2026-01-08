import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CalendarDays, ChevronRight } from 'lucide-react';
import { PlannerShell } from './PlannerShell';
import { BottomSheet } from '../shared/BottomSheet';

export function PlannerIndex() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const openAreaBottomSheet = (areaTitle: string) => {
    setSelectedArea(areaTitle);
  };

  const closeAreaBottomSheet = () => {
    setSelectedArea(null);
  };

  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const navigateToMonth = (monthIndex: number) => {
    navigate('/planner/monthly', { state: { monthIndex } });
  };

  const navigateToQuarter = (quarterIndex: number) => {
    navigate('/planner/quarterly', { state: { quarterIndex } });
  };

  const lifeAreas = {
    personal: {
      title: 'PERSONAL',
      route: '/planner/personal',
      color: 'bg-yellow-50 border-yellow-200',
      items: [
        { label: 'Goal Tracker', route: '/planner/personal' },
        { label: 'Self-Discovery Journal', route: '/planner/personal' },
        { label: 'Motivation Board', route: '/planner/personal' },
        { label: 'Hobbies & Interests Tracker', route: '/planner/personal' },
        { label: 'Life Milestones Tracker', route: '/planner/personal' },
        { label: 'Personal Values List', route: '/planner/personal' },
        { label: 'Personal SWOT Analysis', route: '/planner/personal' },
        { label: 'Personal Manifesto', route: '/planner/personal' },
      ],
    },
    work: {
      title: 'WORK',
      route: '/planner/work',
      color: 'bg-cyan-50 border-cyan-200',
      items: [
        { label: 'Daily Work Planner', route: '/planner/work' },
        { label: 'Work Planner', route: '/planner/work' },
        { label: 'Project Tracker', route: '/planner/work' },
        { label: 'Inbox Tracker', route: '/planner/work' },
        { label: 'Meeting Notes Template', route: '/planner/work' },
        { label: 'Task List', route: '/planner/work' },
        { label: 'Brainstorming', route: '/planner/work' },
        { label: 'Contact List', route: '/planner/work' },
      ],
    },
    education: {
      title: 'EDUCATION',
      route: '/planner/education',
      color: 'bg-pink-50 border-pink-200',
      items: [
        { label: 'Study Schedule', route: '/planner/education' },
        { label: 'Assignment Planner', route: '/planner/education' },
        { label: 'Class Information', route: '/planner/education' },
        { label: 'Revision Tracker', route: '/planner/education' },
        { label: 'Research Projects', route: '/planner/education' },
        { label: 'Grade Tracker', route: '/planner/education' },
        { label: 'Reading List', route: '/planner/education' },
        { label: 'Lesson Planner', route: '/planner/education' },
      ],
    },
    finance: {
      title: 'FINANCE',
      route: '/planner/finance',
      color: 'bg-purple-50 border-purple-200',
      items: [
        { label: 'Financial Overview', route: '/planner/finance' },
        { label: 'Monthly Budget', route: '/planner/finance' },
        { label: 'Expense Tracker', route: '/planner/finance' },
        { label: 'Savings Goals', route: '/planner/finance' },
        { label: 'Debt Tracker', route: '/planner/finance' },
        { label: 'Investment Tracker', route: '/planner/finance' },
        { label: 'Bill Payments', route: '/planner/finance' },
        { label: 'Emergency Fund', route: '/planner/finance' },
      ],
    },
    budget: {
      title: 'BUDGET',
      route: '/planner/budget',
      color: 'bg-pink-100 border-pink-300',
      items: [
        { label: 'Weekly Budget', route: '/planner/budget' },
        { label: 'Grocery Budget', route: '/planner/budget' },
        { label: 'Holiday Budget', route: '/planner/budget' },
        { label: 'Event Budget', route: '/planner/budget' },
        { label: 'Gift Budget', route: '/planner/budget' },
        { label: 'Pet Care Budget', route: '/planner/budget' },
        { label: 'Clothing Budget', route: '/planner/budget' },
      ],
    },
    vision: {
      title: 'VISION',
      route: '/planner/vision',
      color: 'bg-purple-100 border-purple-300',
      items: [
        { label: 'Vision Board', route: '/planner/vision' },
        { label: 'Long-term Goals', route: '/planner/vision' },
        { label: '5-Year Plan', route: '/planner/vision' },
        { label: 'Monthly Reflection', route: '/planner/vision' },
        { label: 'Dream Journal', route: '/planner/vision' },
        { label: 'Career Vision', route: '/planner/vision' },
        { label: 'Relationship Vision', route: '/planner/vision' },
      ],
    },
    planning: {
      title: 'PLANNING',
      route: '/planner/planning',
      color: 'bg-blue-50 border-blue-200',
      items: [
        { label: 'Goal Planner', route: '/planner/planning' },
        { label: 'Priority Planner', route: '/planner/planning' },
        { label: 'To-Do List', route: '/planner/planning' },
        { label: 'Project Planner', route: '/planner/planning' },
        { label: 'Event Planner', route: '/planner/planning' },
        { label: 'Weekly Overview', route: '/planner/planning' },
        { label: 'Daily Timeline', route: '/planner/planning' },
        { label: 'Goal Action Plan', route: '/planner/planning' },
      ],
    },
    household: {
      title: 'HOUSEHOLD',
      route: '/planner/household',
      color: 'bg-cyan-100 border-cyan-300',
      items: [
        { label: 'Household Overview', route: '/planner/household' },
        { label: 'Meal Planner', route: '/planner/household/meals' },
        { label: 'Chore Chart', route: '/planner/household' },
        { label: 'Cleaning Tracker', route: '/planner/household' },
        { label: 'Family Calendar', route: '/planner/household' },
        { label: 'Appointments', route: '/planner/household' },
        { label: 'Grocery List', route: '/planner/household' },
        { label: 'Maintenance Jobs', route: '/planner/household' },
      ],
    },
    selfCare: {
      title: 'SELF-CARE',
      route: '/planner/selfcare',
      color: 'bg-orange-50 border-orange-200',
      items: [
        { label: 'Wellness Goals', route: '/planner/selfcare/goals' },
        { label: 'Exercise Tracker', route: '/planner/selfcare/exercise' },
        { label: 'Mental Health Check-ins', route: '/planner/selfcare/mental' },
        { label: 'Nutrition Log', route: '/planner/selfcare/nutrition' },
        { label: 'Sleep Tracker', route: '/planner/selfcare/sleep' },
        { label: 'Mindfulness & Meditation', route: '/planner/selfcare/mindfulness' },
        { label: 'Self-Care Routines', route: '/planner/selfcare/routines' },
        { label: 'Gratitude Journal', route: '/planner/selfcare/gratitude' },
      ],
    },
    travel: {
      title: 'TRAVEL',
      route: '/planner/travel',
      color: 'bg-green-50 border-green-200',
      items: [
        { label: 'Travel Itinerary', route: '/planner/travel' },
        { label: 'Packing Checklist', route: '/planner/travel' },
        { label: 'Travel Budget', route: '/planner/travel' },
        { label: 'Trip Overview', route: '/planner/travel' },
        { label: 'Weekly Planner', route: '/planner/travel' },
        { label: 'Accommodation', route: '/planner/travel' },
        { label: 'Places to Visit', route: '/planner/travel' },
        { label: 'Road Trip Planner', route: '/planner/travel' },
      ],
    },
    social: {
      title: 'SOCIAL',
      route: '/planner/social',
      color: 'bg-blue-50 border-blue-300',
      items: [
        { label: 'Upcoming Social Events', route: '/planner/social' },
        { label: 'Reach-Out Reminders', route: '/planner/social' },
        { label: 'Important Dates', route: '/planner/social' },
        { label: 'People Notes', route: '/planner/social' },
        { label: 'Social Goals', route: '/planner/social' },
        { label: 'Recent Interactions', route: '/planner/social' },
        { label: 'Relationship Reflection', route: '/planner/social' },
      ],
    },
    journal: {
      title: 'JOURNAL',
      route: '/planner/journal',
      color: 'bg-amber-50 border-amber-300',
      items: [
        { label: 'Daily Journal', route: '/planner/journal' },
        { label: 'Weekly Reflection', route: '/planner/journal' },
        { label: 'Monthly Review', route: '/planner/journal' },
        { label: 'Mood & Energy Log', route: '/planner/journal' },
        { label: 'Gratitude', route: '/planner/journal' },
        { label: 'Free Writing', route: '/planner/journal' },
        { label: 'Past Entries', route: '/planner/journal' },
      ],
    },
  };

  // Get selected area data
  const selectedAreaData = selectedArea
    ? Object.values(lifeAreas).find((area) => area.title === selectedArea)
    : null;

  // Mobile-first layout
  if (isMobile) {
    return (
      <PlannerShell>
        {/* Mobile: Single Column, Quick Launch Hub */}
        <div className="space-y-4 pb-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Planner</h1>
            <p className="text-sm text-gray-600 mt-1">Quick navigation</p>
          </div>

          {/* Primary Quick Actions - Most Common */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-1">
              Quick Access
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/planner/daily')}
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex flex-col items-center gap-2 min-h-[100px]"
              >
                <Calendar size={28} />
                <span className="font-semibold text-base">Daily</span>
              </button>
              <button
                onClick={() => navigate('/planner/weekly')}
                className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex flex-col items-center gap-2 min-h-[100px]"
              >
                <CalendarDays size={28} />
                <span className="font-semibold text-base">Weekly</span>
              </button>
              <button
                onClick={() => navigate('/planner/monthly')}
                className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-xl p-4 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex flex-col items-center gap-2 min-h-[100px]"
              >
                <Clock size={28} />
                <span className="font-semibold text-base">Monthly</span>
              </button>
              <button
                onClick={() => navigate('/planner')}
                className="bg-gradient-to-br from-gray-500 to-gray-600 text-white rounded-xl p-4 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex flex-col items-center gap-2 min-h-[100px]"
              >
                <ChevronRight size={28} />
                <span className="font-semibold text-base">Index</span>
              </button>
            </div>
          </div>

          {/* Calendar Navigation - Compact */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-1">
              Calendar
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <button
                onClick={() => navigate('/planner/monthly')}
                className="w-full text-left px-4 py-3 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100 active:scale-[0.98] transition-all flex items-center justify-between min-h-[44px]"
              >
                <span className="font-medium text-gray-900">Monthly Planner</span>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
              <button
                onClick={() => navigate('/planner/quarterly')}
                className="w-full text-left px-4 py-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 active:scale-[0.98] transition-all flex items-center justify-between min-h-[44px]"
              >
                <span className="font-medium text-gray-900">Year Calendar</span>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Life Areas - Collapsible Sections */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-1">
              Life Areas
            </h2>
            <div className="space-y-2">
              {Object.values(lifeAreas).map((area) => {
                const displayItems = area.items.slice(0, 3); // Show first 3 items
                const hasMore = area.items.length > 3;

                return (
                  <div
                    key={area.title}
                    className={`${area.color} border border-gray-200 rounded-xl overflow-hidden`}
                  >
                    {/* Area Header - Always Visible */}
                    <button
                      onClick={() => {
                        if (hasMore) {
                          openAreaBottomSheet(area.title);
                        } else {
                          navigate(area.route);
                        }
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between min-h-[44px] active:bg-white/20 transition-colors"
                    >
                      <span className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                        {area.title}
                      </span>
                      {hasMore ? (
                        <ChevronRight size={20} className="text-gray-600" />
                      ) : (
                        <ChevronRight size={20} className="text-gray-400" />
                      )}
                    </button>

                    {/* Quick Items - Always Visible (First 3) */}
                    {displayItems.length > 0 && (
                      <div className="px-4 pb-3 space-y-1.5">
                        {displayItems.map((item) => {
                          const itemLabel = typeof item === 'string' ? item : item.label;
                          const itemRoute = typeof item === 'string' ? '/planner/areas' : item.route;
                          return (
                            <button
                              key={itemLabel}
                              onClick={() => navigate(itemRoute)}
                              className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 bg-white/60 hover:bg-white rounded-lg border border-gray-200/40 active:scale-[0.98] transition-all min-h-[44px]"
                            >
                              {itemLabel}
                            </button>
                          );
                        })}
                        {hasMore && (
                          <button
                            onClick={() => openAreaBottomSheet(area.title)}
                            className="w-full text-center px-3 py-2 text-xs font-medium text-gray-600 bg-white/40 hover:bg-white/60 rounded-lg border border-gray-200/30 active:scale-[0.98] transition-all min-h-[44px]"
                          >
                            View all {area.items.length} items
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Life Area Bottom Sheet - Full Item List */}
        {selectedAreaData && (
          <BottomSheet
            isOpen={!!selectedAreaData}
            onClose={closeAreaBottomSheet}
            title={selectedAreaData.title}
            maxHeight="85vh"
          >
            <div className="space-y-2 p-4">
              {selectedAreaData.items.map((item) => {
                const itemLabel = typeof item === 'string' ? item : item.label;
                const itemRoute = typeof item === 'string' ? '/planner/areas' : item.route;
                return (
                  <button
                    key={itemLabel}
                    onClick={() => {
                      navigate(itemRoute);
                      closeAreaBottomSheet();
                    }}
                    className="w-full text-left px-4 py-3 text-base font-medium text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 active:scale-[0.98] transition-all min-h-[44px]"
                  >
                    {itemLabel}
                  </button>
                );
              })}
            </div>
          </BottomSheet>
        )}
      </PlannerShell>
    );
  }

  // Desktop: Keep existing grid layout
  return (
    <PlannerShell>
      {/* Index Title */}
      <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-4 sm:mb-5 md:mb-6">
        Index
      </h1>

      {/* Auto-Fill Grid Layout - Compact & Visually Appealing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 4xl:grid-cols-7 5xl:grid-cols-8 gap-3 sm:gap-4">
        {/* Monthly Planner Card */}
        <div className="bg-gradient-to-br from-pink-50 to-pink-100/50 border border-pink-200/60 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-pink-300 transition-all duration-200 group">
          <button
            onClick={() => navigate('/planner/monthly')}
            className="w-full text-xs font-bold text-gray-700 mb-2.5 text-center uppercase tracking-wider hover:text-pink-700 transition-colors"
          >
            Monthly Planner
          </button>
          <div className="grid grid-cols-3 sm:grid-cols-2 gap-1.5">
            {months.map((month, index) => (
              <button
                key={month}
                onClick={() => navigateToMonth(index)}
                className="text-center py-1.5 px-2 text-[10px] sm:text-xs font-medium text-gray-700 bg-white/70 hover:bg-white rounded-md border border-pink-200/50 transition-all hover:scale-105 hover:shadow-sm hover:border-pink-300"
              >
                {month.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Year Calendar Card */}
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/60 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-red-300 transition-all duration-200 group">
          <button
            onClick={() => navigate('/planner/quarterly')}
            className="w-full text-xs font-bold text-gray-700 mb-2.5 text-center uppercase tracking-wider hover:text-red-700 transition-colors"
          >
            Year Calendar
          </button>
          <div className="space-y-1">
            <button
              onClick={() => navigate('/planner/quarterly')}
              className="w-full text-center py-1.5 px-2 text-[10px] sm:text-xs font-medium text-gray-700 bg-white/70 hover:bg-white rounded-md border border-red-200/50 transition-all hover:scale-105 hover:shadow-sm hover:border-red-300"
            >
              Yearly
            </button>
            <button
              onClick={() => navigate('/planner/review')}
              className="w-full text-center py-1.5 px-2 text-[10px] sm:text-xs font-medium text-gray-700 bg-white/70 hover:bg-white rounded-md border border-red-200/50 transition-all hover:scale-105 hover:shadow-sm hover:border-red-300"
            >
              Review
            </button>
            <button
              onClick={() => navigate('/planner/quarterly')}
              className="w-full text-center py-1.5 px-2 text-[10px] sm:text-xs font-medium text-gray-700 bg-white/70 hover:bg-white rounded-md border border-red-200/50 transition-all hover:scale-105 hover:shadow-sm hover:border-red-300"
            >
              Quarterly
            </button>
            <div className="grid grid-cols-2 gap-1">
              {['1Q', '2Q', '3Q', '4Q'].map((quarter, index) => (
                <button
                  key={quarter}
                  onClick={() => navigateToQuarter(index)}
                  className="text-center py-1.5 px-2 text-[10px] sm:text-xs font-medium text-gray-700 bg-white/70 hover:bg-white rounded-md border border-red-200/50 transition-all hover:scale-105 hover:shadow-sm hover:border-red-300"
                >
                  {quarter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Life Areas - Compact & Polished Cards */}
        {Object.values(lifeAreas).map((area) => (
          <div
            key={area.title}
            className={`${area.color} border border-gray-200/60 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group backdrop-blur-sm`}
          >
            <button
              onClick={() => navigate(area.route)}
              className="w-full text-xs font-bold text-gray-700 mb-2 text-center uppercase tracking-wider hover:text-gray-900 transition-colors"
            >
              {area.title}
            </button>
            <div className="space-y-1">
              {area.items.slice(0, 6).map((item) => {
                const itemLabel = typeof item === 'string' ? item : item.label;
                const itemRoute = typeof item === 'string' ? '/planner/areas' : item.route;
                return (
                  <button
                    key={itemLabel}
                    onClick={() => navigate(itemRoute)}
                    className="w-full text-left px-2.5 py-1.5 text-[11px] sm:text-xs font-medium text-gray-700 bg-white/60 hover:bg-white rounded-md border border-gray-200/40 transition-all hover:scale-[1.02] hover:shadow-sm hover:border-gray-300/60"
                  >
                    {itemLabel}
                  </button>
                );
              })}
              {area.items.length > 6 && (
                <button
                  onClick={() => navigate(area.route)}
                  className="w-full text-center px-2.5 py-1.5 text-[10px] font-medium text-gray-500 bg-white/40 hover:bg-white/60 rounded-md border border-gray-200/30 transition-all"
                >
                  +{area.items.length - 6} more
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </PlannerShell>
  );
}

/**
 * CalendarModeBar - Top-Level Calendar Mode Navigation
 * 
 * Provides a native mobile-style tab bar for switching between calendar views.
 * This is the primary navigation surface for calendar modes.
 * 
 * Tabs:
 * - Day: Day view
 * - Week: Week view
 * - Month: Month view
 * - Events: Agenda/Events list view
 * - Tasks: Placeholder (stub for future tasks integration)
 */

import type { CalendarView } from './types';

interface CalendarModeBarProps {
  currentView: CalendarView;
  onModeChange: (view: CalendarView) => void;
}

export function CalendarModeBar({ currentView, onModeChange }: CalendarModeBarProps) {
  const tabs = [
    { label: 'Day', view: 'day' as CalendarView },
    { label: 'Week', view: 'week' as CalendarView },
    { label: 'Month', view: 'month' as CalendarView },
    { label: 'Year', view: 'year' as CalendarView },
    { label: 'Events', view: 'agenda' as CalendarView },
    { label: 'Tasks', view: 'tasks' as 'tasks' }, // Stub - not a real view yet
  ];

  const handleTabClick = (view: CalendarView | 'tasks') => {
    // Tasks is a stub - do nothing for now
    if (view === 'tasks') {
      return;
    }
    onModeChange(view);
  };

  return (
    <div 
      className="sticky top-0 z-40 bg-white border-b border-gray-200 safe-top"
      data-calendar-mode-bar
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isTasks = tab.view === 'tasks';
          const isActive = !isTasks && currentView === tab.view;

          return (
            <button
              key={tab.label}
              onClick={() => handleTabClick(tab.view)}
              disabled={isTasks}
              className={`
                flex-1 px-3 py-2 min-h-[44px] rounded-lg
                text-sm font-medium transition-all
                flex items-center justify-center
                ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isTasks
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                }
              `}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

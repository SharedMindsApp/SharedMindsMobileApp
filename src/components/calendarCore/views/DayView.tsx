import { ChevronLeft, ChevronRight, Search, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CalendarEventWithMembers } from '../../../lib/calendarTypes';
import {
  getDayEvents,
  formatTime,
  isToday
} from '../../../lib/calendarUtils';
import { useEventTypeColors } from '../../../hooks/useEventTypeColors';
import type { CalendarEventType } from '../../../lib/personalSpaces/calendarService';

// Helper functions for hex color handling
function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getContrastColor(hex: string): string {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1F2937' : '#FFFFFF';
}

interface DayViewProps {
  currentDate: Date;
  events: CalendarEventWithMembers[];
  onEventClick: (event: CalendarEventWithMembers) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  onSearchOpen?: () => void;
  onQuickAddEvent?: () => void;
}

export function DayView({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
  onPrevious,
  onNext,
  onToday,
  onSearchOpen,
  onQuickAddEvent
}: DayViewProps) {
  const { colors: eventTypeColors } = useEventTypeColors();

  // Helper to get event type color
  const getEventTypeColor = (event: CalendarEventWithMembers): string => {
    const eventType = (event as any).event_type as CalendarEventType | undefined;
    if (eventType && eventTypeColors[eventType]) {
      return eventTypeColors[eventType];
    }
    // Fallback to event.color if available, otherwise default
    if (typeof event.color === 'string' && event.color.startsWith('#')) {
      return event.color;
    }
    return eventTypeColors.event; // Default to 'event' type color
  };
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayEvents = getDayEvents(events, currentDate);
  const isTodayDate = isToday(currentDate);
  const [modeBarHeight, setModeBarHeight] = useState(56); // Default fallback: py-2 (8px) + min-h-[44px] + py-2 (8px) ≈ 60px, rounded down for safety

  // Measure CalendarModeBar height dynamically
  useEffect(() => {
    const measureModeBar = () => {
      // Find the CalendarModeBar element (it's rendered before DayView in CalendarShell)
      const modeBar = document.querySelector('[data-calendar-mode-bar]') as HTMLElement;
      if (modeBar) {
        const height = modeBar.offsetHeight;
        setModeBarHeight(height);
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      measureModeBar();
    });

    // Re-measure on resize with debounce
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(measureModeBar, 100);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  const handleTimeSlotClick = (hour: number) => {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    onTimeSlotClick(currentDate, timeString);
  };

  // Format date as "Jan · Fri 9"
  const formatCompactDate = (date: Date): string => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const day = date.getDate();
    return `${month} · ${weekday} ${day}`;
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Compact Sticky Day Header */}
      {/* Sticky position accounts for CalendarModeBar height (measured dynamically) */}
      <div 
        className="sticky z-30 bg-white border-b border-gray-200 flex-shrink-0"
        style={{ top: `${modeBarHeight}px` }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevious}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeft size={20} className="text-gray-700" />
              </button>
              
              {onToday && (
                <button
                  onClick={onToday}
                  className="px-3 py-1.5 min-h-[44px] text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg active:bg-blue-100 transition-colors"
                >
                  Today
                </button>
              )}
              
              <button
                onClick={onNext}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Next day"
              >
                <ChevronRight size={20} className="text-gray-700" />
              </button>
            </div>

            {/* Compact Date Display */}
            <div className="flex-1 text-center">
              <div className={`text-base font-semibold ${isTodayDate ? 'text-blue-600' : 'text-gray-900'}`}>
                {formatCompactDate(currentDate)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Quick Add Event button */}
              {onQuickAddEvent && (
                <button
                  onClick={onQuickAddEvent}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  aria-label="Add event"
                  title="Add event"
                >
                  <Plus size={20} className="text-gray-700" />
                </button>
              )}
              {/* Search button */}
              {onSearchOpen && (
                <button
                  onClick={onSearchOpen}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  aria-label="Search calendar events"
                  title="Search events"
                >
                  <Search size={20} className="text-gray-700" />
                </button>
              )}
              {/* Spacer for balance if no buttons */}
              {!onQuickAddEvent && !onSearchOpen && <div className="w-[100px]"></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Hourly Grid - ONLY this scrolls */}
      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
        <div className="flex">
          {/* Time Column */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50/30">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-20 border-b border-gray-100 text-xs text-gray-500 text-right pr-2 pt-1"
              >
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Events Column */}
          <div className="flex-1 relative">
            {/* Time Slots */}
            {hours.map(hour => (
              <div
                key={hour}
                className="h-20 border-b border-gray-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
                onClick={() => handleTimeSlotClick(hour)}
              ></div>
            ))}

            {/* Current Time Indicator */}
            {isTodayDate && (() => {
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinutes = now.getMinutes();
              const timePosition = (currentHour * 80) + (currentMinutes / 60 * 80);
              
              return (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                  style={{
                    top: `${timePosition}px`,
                  }}
                >
                  <div className="absolute -left-1.5 -top-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                </div>
              );
            })()}

            {/* Events */}
            {dayEvents.map(({ event, startMinutes, endMinutes }) => {
              const top = (startMinutes / 60) * 80;
              const height = Math.max(((endMinutes - startMinutes) / 60) * 80, 40);
              const start = new Date(event.start_at);
              const end = new Date(event.end_at);
              const eventColor = getEventTypeColor(event);
              const textColor = getContrastColor(eventColor);

              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="absolute left-2 right-2 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    zIndex: 10,
                    backgroundColor: eventColor,
                    color: textColor,
                  }}
                >
                  <div className="p-2.5">
                    <div className="font-semibold text-sm mb-0.5">{event.title}</div>
                    {!event.all_day && (
                      <div className="text-xs opacity-75 mb-1">
                        {formatTime(start)} - {formatTime(end)}
                      </div>
                    )}
                    {event.location && (
                      <div className="text-xs opacity-70 truncate">
                        {event.location}
                      </div>
                    )}
                    {event.description && height > 100 && (
                      <div className="text-xs opacity-65 mt-1.5 line-clamp-2">
                        {event.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

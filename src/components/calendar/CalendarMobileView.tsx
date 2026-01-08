/**
 * CalendarMobileView
 * 
 * Mobile-first calendar application view.
 * This is NOT a widget - it's a full standalone mobile calendar app experience.
 * 
 * Features:
 * - App-style sticky header with month picker
 * - Gesture-based navigation (swipe left/right)
 * - Day View (primary) and Agenda View
 * - Bottom sheets for event creation/editing
 * - Touch-first interactions with large tap targets (≥44px)
 * - Safe area awareness
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Grid } from 'lucide-react';
import { getUpcomingEvents, getEventsByDateRange } from '../../lib/calendar';
import type { CalendarEventWithMembers } from '../../lib/calendarTypes';
import { getEventColorDot, isToday, formatTime, getDayEvents } from '../../lib/calendarUtils';
import { BottomSheet } from '../shared/BottomSheet';
import { EventModalCompact } from './EventModalCompact';

type MobileCalendarView = 'day' | 'agenda';

interface CalendarMobileViewProps {
  householdId?: string;
}

export function CalendarMobileView({ householdId }: CalendarMobileViewProps) {
  const [events, setEvents] = useState<CalendarEventWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<MobileCalendarView>('day');
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithMembers | undefined>(undefined);
  const [eventModalInitialHour, setEventModalInitialHour] = useState<number | undefined>(undefined);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  // Swipe gesture state
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (householdId) {
      loadEvents();
    }
  }, [householdId, currentDate, view]);

  const loadEvents = async () => {
    if (!householdId) return;

    setLoading(true);
    setError(null);

    try {
      if (view === 'agenda') {
        const upcomingEvents = await getUpcomingEvents(householdId, 30);
        setEvents(upcomingEvents || []);
      } else {
        // Day view - load events for the current week
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const weekEvents = await getEventsByDateRange(
          householdId,
          startOfWeek.toISOString(),
          endOfWeek.toISOString()
        );
        setEvents(weekEvents || []);
      }
    } catch (err) {
      console.error('Failed to load calendar events:', err);
      setError('Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwipeStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStart) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStart.x;
    const deltaY = touch.clientY - swipeStart.y;

    // Only handle horizontal swipes (ignore if vertical movement is greater)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setSwipeOffset(deltaX);
      e.preventDefault();
    }
  }, [swipeStart]);

  const handleTouchEnd = useCallback(() => {
    if (!swipeStart) return;

    const deltaX = swipeOffset;
    const threshold = 50; // Minimum swipe distance
    const timeDelta = Date.now() - swipeStart.time;
    const maxTime = 300; // Maximum swipe time in ms

    if (Math.abs(deltaX) > threshold && timeDelta < maxTime) {
      if (deltaX > 0) {
        // Swipe right - go to previous day/week
        navigatePrevious();
      } else {
        // Swipe left - go to next day/week
        navigateNext();
      }
    }

    setSwipeStart(null);
    setSwipeOffset(0);
  }, [swipeStart, swipeOffset]);

  const navigatePrevious = () => {
    if (view === 'day') {
      const prevDay = new Date(currentDate);
      prevDay.setDate(currentDate.getDate() - 1);
      setCurrentDate(prevDay);
    } else {
      // Agenda view - go back a week
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevWeek);
    }
  };

  const navigateNext = () => {
    if (view === 'day') {
      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);
      setCurrentDate(nextDay);
    } else {
      // Agenda view - go forward a week
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextWeek);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleNewEvent = (hour?: number) => {
    setSelectedEvent(undefined);
    setEventModalInitialHour(hour);
    setEventModalOpen(true);
  };

  const handleEventClick = (event: CalendarEventWithMembers) => {
    setSelectedEvent(event);
    setEventModalInitialHour(undefined);
    setEventModalOpen(true);
  };

  const handleTimeSlotClick = (hour: number) => {
    handleNewEvent(hour);
  };

  const handleEventChange = () => {
    loadEvents();
  };

  const handleEventModalClose = () => {
    setEventModalOpen(false);
    setSelectedEvent(undefined);
    setEventModalInitialHour(undefined);
  };

  const formatHeaderDate = () => {
    if (view === 'day') {
      const isTodayDate = isToday(currentDate);
      if (isTodayDate) {
        return 'Today';
      }
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    } else {
      // Agenda view - show week range
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;
      }
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  };

  const formatMonthYear = () => {
    return currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  if (!householdId) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-gray-600 text-center">Please join a household to use the calendar.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-white safe-top safe-bottom"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
        transition: swipeStart ? 'none' : 'transform 0.2s ease-out',
      }}
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 safe-top">
        <div className="px-4 py-3">
          {/* Top row: Month/Date and Add button */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setMonthPickerOpen(true)}
              className="flex-1 text-left min-h-[44px] flex items-center"
            >
              <div>
                <div className="text-sm font-medium text-gray-600">{formatMonthYear()}</div>
                <div className="text-lg font-bold text-gray-900">{formatHeaderDate()}</div>
              </div>
            </button>
            <button
              onClick={() => handleNewEvent()}
              className="ml-4 min-w-[44px] min-h-[44px] flex items-center justify-center bg-blue-600 text-white rounded-full shadow-lg active:bg-blue-700 transition-colors"
              aria-label="Add event"
            >
              <Plus size={24} />
            </button>
          </div>

          {/* Navigation and View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={navigatePrevious}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft size={20} className="text-gray-700" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 min-h-[44px] text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg active:bg-blue-100 transition-colors"
              >
                Today
              </button>
              <button
                onClick={navigateNext}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Next"
              >
                <ChevronRight size={20} className="text-gray-700" />
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('day')}
                className={`px-3 py-1.5 min-h-[44px] rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  view === 'day'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid size={16} />
                Day
              </button>
              <button
                onClick={() => setView('agenda')}
                className={`px-3 py-1.5 min-h-[44px] rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  view === 'agenda'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List size={16} />
                Agenda
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Loading events...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center">
              <p className="text-red-600 text-sm font-medium mb-2">{error}</p>
              <button
                onClick={loadEvents}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : view === 'day' ? (
          <DayViewMobile
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
          />
        ) : (
          <AgendaViewMobile
            events={events}
            onEventClick={handleEventClick}
          />
        )}
      </main>

      {/* Month Picker Bottom Sheet */}
      <BottomSheet
        isOpen={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        title="Select Month"
        maxHeight="50vh"
      >
        <MonthPicker
          currentDate={currentDate}
          onSelect={(date) => {
            setCurrentDate(date);
            setMonthPickerOpen(false);
          }}
        />
      </BottomSheet>

      {/* Event Modal (Bottom Sheet on mobile) */}
      {householdId && (
        <EventModalCompact
          householdId={householdId}
          isOpen={eventModalOpen}
          onClose={handleEventModalClose}
          onEventChange={handleEventChange}
          initialDate={currentDate}
          initialHour={eventModalInitialHour}
          event={selectedEvent}
        />
      )}
    </div>
  );
}

/**
 * Mobile Day View
 * Vertical timeline with large tap targets
 */
function DayViewMobile({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
}: {
  currentDate: Date;
  events: CalendarEventWithMembers[];
  onEventClick: (event: CalendarEventWithMembers) => void;
  onTimeSlotClick: (hour: number) => void;
}) {
  const dayEvents = getDayEvents(events, currentDate);
  const isTodayDate = isToday(currentDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="flex">
        {/* Time column */}
        <div className="w-16 flex-shrink-0 bg-white border-r border-gray-200">
          {hours.map(hour => (
            <div
              key={hour}
              className="h-20 border-b border-gray-100 text-xs text-gray-500 text-right pr-2 pt-1"
            >
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </div>
          ))}
        </div>

        {/* Events column */}
        <div className="flex-1 relative">
          {hours.map(hour => (
            <button
              key={hour}
              onClick={() => onTimeSlotClick(hour)}
              className="w-full h-20 border-b border-gray-100 hover:bg-blue-50/50 active:bg-blue-100 transition-colors min-h-[44px]"
              aria-label={`Create event at ${hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}`}
            />
          ))}

          {/* Render events */}
          {dayEvents.map(({ event, startMinutes, endMinutes }) => {
            const top = (startMinutes / 60) * 80;
            const height = Math.max(((endMinutes - startMinutes) / 60) * 80, 48);
            const start = new Date(event.start_at);
            const end = new Date(event.end_at);

            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className={`absolute left-2 right-2 border-l-4 rounded-lg shadow-md active:shadow-lg transition-shadow overflow-hidden min-h-[48px] ${getEventColorDot(event.color)}`}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  zIndex: 10
                }}
              >
                <div className="p-3">
                  <div className="font-bold text-sm mb-1 text-gray-900">{event.title}</div>
                  {!event.all_day && (
                    <div className="text-xs text-gray-600 mb-1">
                      {formatTime(start)} - {formatTime(end)}
                    </div>
                  )}
                  {event.location && (
                    <div className="text-xs text-gray-500 truncate">
                      {event.location}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile Agenda View
 * Chronological list grouped by date
 */
function AgendaViewMobile({
  events,
  onEventClick,
}: {
  events: CalendarEventWithMembers[];
  onEventClick: (event: CalendarEventWithMembers) => void;
}) {
  const groupEventsByDate = () => {
    const grouped = new Map<string, CalendarEventWithMembers[]>();

    events.forEach(event => {
      const date = new Date(event.start_at);
      const dateKey = date.toDateString();

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }

      grouped.get(dateKey)!.push(event);
    });

    const sorted = Array.from(grouped.entries()).sort((a, b) => {
      return new Date(a[0]).getTime() - new Date(b[0]).getTime();
    });

    return sorted;
  };

  const groupedEvents = groupEventsByDate();

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center px-6">
          <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium mb-1">No upcoming events</p>
          <p className="text-gray-400 text-sm">Create your first event to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      {groupedEvents.map(([dateKey, dayEvents]) => {
        const date = new Date(dateKey);
        const isTodayDate = isToday(date);

        return (
          <div key={dateKey} className="border-b border-gray-200 last:border-b-0">
            {/* Date header */}
            <div className={`sticky top-0 px-4 py-3 border-b border-gray-200 ${isTodayDate ? 'bg-blue-50' : 'bg-white'} z-10`}>
              <div className="flex items-center gap-3">
                <div className={`text-center ${isTodayDate ? 'text-blue-600' : 'text-gray-700'}`}>
                  <div className="text-xs font-medium uppercase">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-2xl font-bold ${isTodayDate ? 'bg-blue-600 text-white w-10 h-10 rounded-full inline-flex items-center justify-center' : ''}`}>
                    {date.getDate()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                  </div>
                </div>
              </div>
            </div>

            {/* Events list */}
            <div className="divide-y divide-gray-100 bg-white">
              {dayEvents.map(event => {
                const eventDate = new Date(event.start_at);
                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="w-full text-left px-4 py-4 active:bg-gray-50 transition-colors min-h-[64px]"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-1 h-full min-h-16 rounded-full flex-shrink-0 ${getEventColorDot(event.color)}`}></div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="text-base font-semibold text-gray-900">
                            {event.title}
                          </h3>
                          {!event.all_day && (
                            <div className="text-sm text-gray-600 flex-shrink-0">
                              {formatTime(eventDate)}
                            </div>
                          )}
                        </div>

                        {event.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}

                        {event.location && (
                          <div className="text-xs text-gray-500 truncate">
                            📍 {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Month Picker Component
 */
function MonthPicker({
  currentDate,
  onSelect,
}: {
  currentDate: Date;
  onSelect: (date: Date) => void;
}) {
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    const newDate = new Date(selectedYear, month, 1);
    onSelect(newDate);
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    const newDate = new Date(year, selectedMonth, 1);
    onSelect(newDate);
  };

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-3">Year</div>
        <div className="grid grid-cols-5 gap-2">
          {years.map(year => (
            <button
              key={year}
              onClick={() => handleYearSelect(year)}
              className={`py-3 px-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                year === selectedYear
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Month selector */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-3">Month</div>
        <div className="grid grid-cols-3 gap-2">
          {months.map((month, index) => (
            <button
              key={month}
              onClick={() => handleMonthSelect(index)}
              className={`py-3 px-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                index === selectedMonth
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {month}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

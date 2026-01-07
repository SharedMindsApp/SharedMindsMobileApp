import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Grid, List, Maximize2, Minimize2 } from 'lucide-react';
import type { WidgetRenderMode, WidgetViewMode } from '../../lib/fridgeCanvasTypes';
import { getUpcomingEvents, getEventsByDateRange } from '../../lib/calendar';
import type { CalendarEventWithMembers } from '../../lib/calendarTypes';
import { getEventColorDot } from '../../lib/calendarUtils';
import { EventModalCompact } from '../calendar/EventModalCompact';
import { DayTimelineView } from '../calendar/DayTimelineView';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

interface CalendarWidgetCoreProps {
  mode: WidgetRenderMode;
  householdId?: string;
  viewMode?: WidgetViewMode;
  onViewModeChange?: (mode: WidgetViewMode) => void;
  onNewEvent?: () => void;
}

export function CalendarWidgetCore({
  mode,
  householdId,
  viewMode = 'large',
  onViewModeChange,
  onNewEvent
}: CalendarWidgetCoreProps) {
  const [events, setEvents] = useState<CalendarEventWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>(mode === 'mobile' ? 'agenda' : 'month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithMembers | undefined>(undefined);
  const [eventModalInitialHour, setEventModalInitialHour] = useState<number | undefined>(undefined);

  const { appTheme } = useUIPreferences();
  const isNeonMode = appTheme === 'neon-dark';

  useEffect(() => {
    if (householdId) {
      loadEvents();
    }
  }, [householdId, calendarView, currentDate]);

  const loadEvents = async () => {
    if (!householdId) return;

    setLoading(true);
    setError(null);

    try {
      if (calendarView === 'week' || calendarView === 'agenda') {
        const upcomingEvents = await getUpcomingEvents(householdId, mode === 'mobile' ? 30 : 10);
        setEvents(upcomingEvents || []);
      } else {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
        const monthEvents = await getEventsByDateRange(householdId, startOfMonth.toISOString(), endOfMonth.toISOString());
        setEvents(monthEvents || []);
      }
    } catch (err) {
      console.error('Failed to load calendar events:', err);
      setError('Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDay = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toDateString();
    return events.filter(event => new Date(event.start_at).toDateString() === dateStr);
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === new Date().toDateString();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleExpand = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (viewMode === 'xlarge') {
      onViewModeChange?.('large');
    } else {
      onViewModeChange?.('xlarge');
    }
  };

  const handleDayClick = (date: Date | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!date) return;

    setSelectedDate(date);
    if (mode === 'fridge') {
      setCalendarView('day');
      if (viewMode === 'mini') {
        onViewModeChange?.('large');
      }
    } else {
      setCalendarView('agenda');
    }
  };

  const handleBackToMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCalendarView('month');
    setSelectedDate(null);
  };

  const handleNewEvent = (e?: React.MouseEvent, hour?: number) => {
    e?.stopPropagation();
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
    handleNewEvent(undefined, hour);
  };

  const handleEventModalClose = () => {
    setEventModalOpen(false);
    setSelectedEvent(undefined);
    setEventModalInitialHour(undefined);
  };

  const handleEventChange = () => {
    loadEvents();
  };

  const groupEventsByDate = () => {
    const grouped: { [key: string]: CalendarEventWithMembers[] } = {};
    const filteredEvents = selectedDate
      ? getEventsForDay(selectedDate)
      : events;

    filteredEvents.forEach(event => {
      const dateKey = new Date(event.start_at).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return Object.entries(grouped).sort(([dateA], [dateB]) =>
      new Date(dateA).getTime() - new Date(dateB).getTime()
    );
  };

  if (mode === 'fridge') {
    if (viewMode === 'icon') {
      return (
        <button
          onClick={handleExpand}
          className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 border-blue-600 border-2 rounded-2xl flex flex-col items-center justify-center hover:scale-105 transition-all shadow-lg hover:shadow-xl group"
          title="Open Calendar"
        >
          <Calendar size={36} className="text-white mb-1 group-hover:scale-110 transition-transform" />
          {!loading && events.length > 0 && (
            <div className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
              {events.length > 9 ? '9+' : events.length}
            </div>
          )}
        </button>
      );
    }

    if (viewMode === 'mini') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 border-2 rounded-2xl p-3 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 p-1.5 rounded-lg">
                <Calendar size={14} className="text-white" />
              </div>
              <h3 className="font-bold text-blue-900 text-sm">Calendar</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewEvent}
                className="p-1 bg-blue-500 hover:bg-blue-600 rounded-lg transition-all"
                title="Add new event"
              >
                <Plus size={12} className="text-white" />
              </button>
              {!loading && events.length > 0 && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-200 px-2 py-0.5 rounded-full">
                  {events.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setCalendarView('month')}
              className={`flex-1 px-2 py-1 rounded text-xs font-semibold transition-all ${
                calendarView === 'month'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-blue-700 hover:bg-blue-100'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`flex-1 px-2 py-1 rounded text-xs font-semibold transition-all ${
                calendarView === 'week'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-blue-700 hover:bg-blue-100'
              }`}
            >
              Events
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-xs text-blue-600 italic animate-pulse">Loading...</div>
            </div>
          ) : error ? (
            <div className="text-xs text-red-600 italic">{error}</div>
          ) : calendarView === 'month' ? (
            <div className="flex-1 flex flex-col">
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-[10px] font-bold text-blue-800">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5 flex-1">
                {getDaysInMonth(currentDate).map((date, index) => {
                  const dayEvents = getEventsForDay(date);
                  const isTodayDate = isToday(date);

                  return (
                    <button
                      key={index}
                      onClick={date ? (e) => handleDayClick(date, e) : undefined}
                      disabled={!date}
                      className={`relative aspect-square rounded text-[10px] font-medium transition-all ${
                        !date
                          ? 'bg-transparent cursor-default'
                          : isTodayDate
                            ? 'bg-blue-500 text-white'
                            : dayEvents.length > 0
                              ? 'bg-blue-200 text-blue-900'
                              : 'bg-white text-gray-700 hover:bg-blue-50'
                      }`}
                    >
                      {date && (
                        <>
                          <div className={isTodayDate ? 'font-bold' : ''}>{date.getDate()}</div>
                          {dayEvents.length > 0 && (
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                              <div className={`w-1 h-1 rounded-full ${isTodayDate ? 'bg-white' : 'bg-blue-500'}`}></div>
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : calendarView === 'day' && selectedDate ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={handleBackToMonth}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                >
                  <ChevronLeft size={12} />
                  Back
                </button>
                <div className="text-xs font-bold text-blue-900">
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {getEventsForDay(selectedDate).length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-600">
                    <Calendar size={20} className="text-blue-400 mx-auto mb-1" />
                    <p>No events</p>
                  </div>
                ) : (
                  getEventsForDay(selectedDate).map((event) => {
                    const date = new Date(event.start_at);
                    return (
                      <button
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="w-full bg-white/60 p-2 rounded-lg hover:bg-white transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${getEventColorDot(event.color)}`}></div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-semibold text-gray-800 text-xs leading-tight">{event.title}</p>
                            {!event.all_day && (
                              <p className="text-gray-600 text-[10px] mt-0.5 flex items-center gap-1">
                                <Clock size={10} />
                                {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex-1 overflow-hidden">
              {events.length === 0 ? (
                <button
                  onClick={handleNewEvent}
                  className="w-full text-center py-6 hover:bg-blue-200/30 rounded-lg transition-colors"
                >
                  <Calendar size={24} className="text-blue-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">No events yet</p>
                  <p className="text-xs text-blue-600 mt-1">Tap to add</p>
                </button>
              ) : (
                events.slice(0, 3).map((event) => {
                  const date = new Date(event.start_at);

                  return (
                    <button
                      key={event.id}
                      onClick={(e) => handleDayClick(new Date(event.start_at), e)}
                      className="text-left w-full hover:bg-white/60 bg-white/40 p-2 rounded-lg transition-all hover:shadow-sm"
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${getEventColorDot(event.color)}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate text-xs leading-tight">{event.title}</p>
                          <p className="text-gray-600 text-xs mt-0.5">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {!event.all_day && ` • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 border-2 rounded-2xl p-4 flex flex-col shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Calendar size={20} className="text-white" />
            </div>
            <h3 className="font-bold text-blue-900 text-base">Calendar</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewEvent}
              className="p-2 bg-green-500 hover:bg-green-600 rounded-lg transition-all shadow-sm"
              title="Add new event"
            >
              <Plus size={16} className="text-white" />
            </button>
            <button
              onClick={handleExpand}
              className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-all shadow-sm"
              title={viewMode === 'xlarge' ? 'Minimize' : 'Maximize'}
            >
              {viewMode === 'xlarge' ? <Minimize2 size={16} className="text-white" /> : <Maximize2 size={16} className="text-white" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setCalendarView('month')}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
              calendarView === 'month'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-blue-700 hover:bg-blue-100'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Grid size={14} />
              <span>Month</span>
            </div>
          </button>
          <button
            onClick={() => setCalendarView('week')}
            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
              calendarView === 'week'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-blue-700 hover:bg-blue-100'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <List size={14} />
              <span>Events</span>
            </div>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-blue-600 font-medium">Loading events...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500 text-sm font-medium mb-2">{error}</div>
            <button
              onClick={loadEvents}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Try again
            </button>
          </div>
        ) : calendarView === 'month' ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <button onClick={previousMonth} className="p-1 hover:bg-blue-200 rounded transition-colors">
                <ChevronLeft size={18} className="text-blue-700" />
              </button>
              <h4 className="font-bold text-blue-900 text-sm">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h4>
              <button onClick={nextMonth} className="p-1 hover:bg-blue-200 rounded transition-colors">
                <ChevronRight size={18} className="text-blue-700" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-blue-800 py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 flex-1">
              {getDaysInMonth(currentDate).map((date, index) => {
                const dayEvents = getEventsForDay(date);
                const isTodayDate = isToday(date);

                return (
                  <button
                    key={index}
                    onClick={date ? (e) => handleDayClick(date, e) : undefined}
                    disabled={!date}
                    className={`relative aspect-square p-1 rounded-lg text-xs font-medium transition-all ${
                      !date
                        ? 'bg-transparent cursor-default'
                        : isTodayDate
                          ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md'
                          : dayEvents.length > 0
                            ? 'bg-blue-200 text-blue-900 hover:bg-blue-300'
                            : 'bg-white text-gray-700 hover:bg-blue-100'
                    }`}
                  >
                    {date && (
                      <>
                        <div className={isTodayDate ? 'font-bold' : ''}>{date.getDate()}</div>
                        {dayEvents.length > 0 && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {dayEvents.slice(0, 3).map((event, i) => (
                              <div
                                key={i}
                                className={`w-1 h-1 rounded-full ${isTodayDate ? 'bg-white' : getEventColorDot(event.color)}`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : calendarView === 'day' && selectedDate ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handleBackToMonth}
                className="text-sm font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Back to Month
              </button>
              <div className="text-sm font-bold text-blue-900">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-white rounded-lg border border-gray-200">
              <DayTimelineView
                date={selectedDate}
                events={events}
                onEventClick={handleEventClick}
                onTimeSlotClick={handleTimeSlotClick}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {events.length === 0 ? (
              <button
                onClick={handleNewEvent}
                className="w-full text-center py-10 hover:bg-blue-200/30 rounded-xl transition-all group"
              >
                <div className="bg-blue-200 w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-base text-gray-700 font-semibold mb-1">No events this week</p>
                <p className="text-sm text-blue-600 font-medium">Click to create an event</p>
              </button>
            ) : (
              events.map((event, index) => {
                const date = new Date(event.start_at);
                const isTodayEvent = new Date().toDateString() === date.toDateString();

                return (
                  <button
                    key={event.id}
                    onClick={(e) => handleDayClick(new Date(event.start_at), e)}
                    className="w-full text-left bg-white rounded-lg p-3 border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-1 h-full min-h-[50px] rounded-full ${getEventColorDot(event.color)}`}></div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-bold text-gray-900 text-sm leading-tight group-hover:text-blue-700">
                            {event.title}
                          </p>
                          {index === 0 && isTodayEvent && (
                            <span className="text-xs font-bold text-white bg-blue-500 px-2 py-0.5 rounded-full">
                              Today
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar size={10} className="text-blue-500" />
                            {date.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>

                          {!event.all_day && (
                            <div className="flex items-center gap-1">
                              <Clock size={10} className="text-blue-500" />
                              {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </div>
                          )}
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 truncate mt-1">
                            <MapPin size={10} className="text-gray-400" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }

  if (!householdId) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-gray-600 text-center">Please join a household to use the calendar.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${
      isNeonMode ? 'neon-dark-widget' : 'bg-gray-50'
    }`}>
      <div className="bg-white border-b border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Calendar</h2>
          <button
            onClick={handleNewEvent}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex gap-2">
          {(['month', 'week', 'agenda'] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setCalendarView(v)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                calendarView === v
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {v === 'month' && 'Month'}
              {v === 'week' && 'Week'}
              {v === 'agenda' && 'Agenda'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        ) : calendarView === 'month' ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={previousMonth} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <ChevronLeft size={20} className="text-gray-700" />
              </button>
              <h3 className="font-bold text-gray-900">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <ChevronRight size={20} className="text-gray-700" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentDate).map((date, index) => {
                const dayEvents = getEventsForDay(date);
                const isTodayDate = isToday(date);

                return (
                  <button
                    key={index}
                    onClick={() => handleDayClick(date)}
                    disabled={!date}
                    className={`relative aspect-square p-2 rounded-lg text-sm font-medium transition-all ${
                      !date
                        ? 'bg-transparent cursor-default'
                        : isTodayDate
                        ? 'bg-blue-500 text-white'
                        : dayEvents.length > 0
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {date && (
                      <>
                        <div className={isTodayDate ? 'font-bold' : ''}>{date.getDate()}</div>
                        {dayEvents.length > 0 && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {dayEvents.slice(0, 3).map((event, i) => (
                              <div
                                key={i}
                                className={`w-1 h-1 rounded-full ${isTodayDate ? 'bg-white' : getEventColorDot(event.color)}`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {selectedDate && (
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  All Events
                </button>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>
            )}

            {groupEventsByDate().length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-1">No events</p>
                <p className="text-sm text-gray-500">Tap + to create one</p>
              </div>
            ) : (
              groupEventsByDate().map(([dateKey, dayEvents]) => {
                const date = new Date(dateKey);
                const isTodayDate = isToday(date);

                return (
                  <div key={dateKey}>
                    <h3 className={`text-sm font-semibold mb-2 ${isTodayDate ? 'text-blue-600' : 'text-gray-700'}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      {isTodayDate && ' (Today)'}
                    </h3>
                    <div className="space-y-2">
                      {dayEvents.map((event) => {
                        const eventDate = new Date(event.start_at);

                        return (
                          <button
                            key={event.id}
                            onClick={() => handleEventClick(event)}
                            className="w-full text-left bg-white rounded-lg p-3 border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all"
                          >
                            <div className="flex items-start gap-2">
                              <div className={`w-1 h-full min-h-[40px] rounded-full ${getEventColorDot(event.color)}`}></div>

                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                  {!event.all_day && (
                                    <div className="flex items-center gap-1">
                                      <Clock size={12} />
                                      {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                    </div>
                                  )}
                                  {event.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin size={12} />
                                      <span className="truncate">{event.location}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <EventModalCompact
        householdId={householdId}
        isOpen={eventModalOpen}
        onClose={handleEventModalClose}
        onEventChange={handleEventChange}
        initialDate={selectedDate || currentDate}
        event={selectedEvent}
      />
    </div>
  );
}

/**
 * Planner Daily V2 - Focus Mode Day View
 * 
 * Single-day time-grid view with:
 * - Time-based vertical timeline (6 AM - 11 PM, 30-min slots)
 * - Container + nested event support
 * - Drag & resize (permission-aware)
 * - Quick add
 * - Shared EventDetailModal
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X, Lock, Share2, ArrowLeft } from 'lucide-react';
import { PlannerShell } from './PlannerShell';
import { useAuth } from '../../contexts/AuthContext';
import {
  getPersonalEventsForDateRange,
  createPersonalCalendarEvent,
  updatePersonalCalendarEvent,
  type PersonalCalendarEvent,
} from '../../lib/personalSpaces/calendarService';
import { updateContextEvent } from '../../lib/contextSovereign/contextEventsService';
import { enforceVisibility, assertCanEdit, PermissionError } from '../../lib/permissions/enforcement';
import { EventDetailModal } from '../calendar/EventDetailModal';
import { FEATURE_CALENDAR_EXTRAS } from '../../lib/featureFlags';
import { subscribeActivityChanged } from '../../lib/activities/activityEvents';

interface DraggingState {
  eventId: string;
  startY: number;
  originalStart: Date;
  originalEnd: Date;
}

interface ResizingState {
  eventId: string;
  startY: number;
  originalStart: Date;
  originalEnd: Date;
  resizeEdge: 'top' | 'bottom';
}

export function PlannerDailyV2() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const state = location.state as { date?: string } | null;
    if (state?.date) {
      return new Date(state.date);
    }
    return new Date();
  });
  const [events, setEvents] = useState<PersonalCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [resizing, setResizing] = useState<ResizingState | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PersonalCalendarEvent | null>(null);
  const [quickAddSlot, setQuickAddSlot] = useState<{ hour: number; minute: number } | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadDailyData();
    }
  }, [user, selectedDate]);

  // Subscribe to activity changes for live sync
  useEffect(() => {
    if (!user || !FEATURE_CALENDAR_EXTRAS) return;

    const unsubscribe = subscribeActivityChanged(() => {
      // Refresh calendar when activities change
      loadDailyData();
    });

    return unsubscribe;
  }, [user, selectedDate]);

  // Update current time every minute for the time indicator
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    updateTime(); // Initial update
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Calculate current time indicator position
  const getCurrentTimePosition = useCallback(() => {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    // Each time slot is 64px (h-16), starting from 6 AM
    const startHour = 6;
    if (hour < startHour) return null;
    const hoursFromStart = hour - startHour;
    const minutesFraction = minute / 60;
    const position = (hoursFromStart + minutesFraction) * 64; // 64px per hour
    return position;
  }, [currentTime]);

  const loadDailyData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const startDate = startOfDay.toISOString().split('T')[0];
      const endDate = endOfDay.toISOString().split('T')[0];

      const personalEvents = await getPersonalEventsForDateRange(user.id, startDate, endDate);

      // Apply permission filtering
      const visibleEvents = personalEvents
        .map(event => enforceVisibility(event, event.permissions))
        .filter((e): e is PersonalCalendarEvent => e !== null);

      setEvents(visibleEvents);
    } catch (err) {
      console.error('Error loading daily data:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'prev' ? -1 : 1));
    setSelectedDate(newDate);
  };

  const goToWeek = () => {
    navigate('/planner/weekly', {
      state: { date: selectedDate.toISOString() },
    });
  };

  const goToMonth = () => {
    navigate('/planner/monthly', {
      state: { monthIndex: selectedDate.getMonth() },
    });
  };

  // Time slots: 6 AM to 11 PM (30-minute intervals)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour < 24; hour++) {
      slots.push({ hour, minute: 0 });
      if (hour < 23) {
        slots.push({ hour, minute: 30 });
      }
    }
    return slots;
  }, []);

  // Group events by type
  const { containerEvents, nestedEvents, regularEvents } = useMemo(() => {
    const containers: PersonalCalendarEvent[] = [];
    const nested: PersonalCalendarEvent[] = [];
    const regular: PersonalCalendarEvent[] = [];

    for (const event of events) {
      if (event.event_scope === 'container') {
        containers.push(event);
      } else if (event.event_scope === 'item') {
        nested.push(event);
      } else {
        regular.push(event);
      }
    }

    return { containerEvents: containers, nestedEvents: nested, regularEvents: regular };
  }, [events]);

  // Calculate event position and height
  const getEventPosition = (event: PersonalCalendarEvent) => {
    const start = new Date(event.startAt);
    const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
    
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    
    // Position from 6 AM (360 minutes)
    const topMinutes = Math.max(0, startMinutes - 360);
    const durationMinutes = endMinutes - startMinutes;
    
    // Each 30-minute slot is 60px
    const top = (topMinutes / 30) * 60;
    const height = Math.max(30, (durationMinutes / 30) * 60);
    
    return { top, height, start, end };
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, event: PersonalCalendarEvent) => {
    const permissions = event.permissions;
    if (!permissions?.can_edit) {
      return;
    }

    const start = new Date(event.startAt);
    const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
    
    setDragging({
      eventId: event.id,
      startY: e.clientY,
      originalStart: start,
      originalEnd: end,
    });
  };

  // Handle drag
  const handleDrag = useCallback((e: MouseEvent) => {
    if (!dragging || !gridRef.current) return;

    const gridRect = gridRef.current.getBoundingClientRect();
    const relativeY = e.clientY - gridRect.top;
    
    const slotHeight = 60;
    const slotIndex = Math.round(relativeY / slotHeight);
    const newMinutes = 360 + (slotIndex * 30);
    const newHours = Math.floor(newMinutes / 60);
    const newMins = newMinutes % 60;

    const duration = dragging.originalEnd.getTime() - dragging.originalStart.getTime();
    const newStart = new Date(selectedDate);
    newStart.setHours(newHours, newMins, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    setEvents(prev => prev.map(ev => {
      if (ev.id === dragging.eventId) {
        return { ...ev, startAt: newStart.toISOString(), endAt: newEnd.toISOString() };
      }
      return ev;
    }));
  }, [dragging, selectedDate]);

  // Handle drag end
  const handleDragEnd = useCallback(async () => {
    if (!dragging || !user) {
      setDragging(null);
      return;
    }

    const event = events.find(e => e.id === dragging.eventId);
    if (!event) {
      setDragging(null);
      return;
    }

    try {
      assertCanEdit(event.permissions, 'event');

      if (event.sourceType === 'context' && event.sourceEntityId) {
        const result = await updateContextEvent(event.sourceEntityId, {
          start_at: event.startAt,
          end_at: event.endAt || undefined,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        await updatePersonalCalendarEvent(user.id, event.id, {
          startAt: event.startAt,
          endAt: event.endAt || undefined,
        });
      }

      await loadDailyData();
    } catch (err) {
      console.error('Error updating event:', err);
      if (err instanceof PermissionError) {
        alert('You do not have permission to edit this event');
      }
      await loadDailyData();
    } finally {
      setDragging(null);
    }
  }, [dragging, events, user]);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, event: PersonalCalendarEvent, edge: 'top' | 'bottom') => {
    e.stopPropagation();
    
    const permissions = event.permissions;
    if (!permissions?.can_edit) {
      return;
    }

    const start = new Date(event.startAt);
    const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
    
    setResizing({
      eventId: event.id,
      startY: e.clientY,
      originalStart: start,
      originalEnd: end,
      resizeEdge: edge,
    });
  };

  // Handle resize
  const handleResize = useCallback((e: MouseEvent) => {
    if (!resizing || !gridRef.current) return;

    const gridRect = gridRef.current.getBoundingClientRect();
    const relativeY = e.clientY - gridRect.top;
    
    const slotHeight = 60;
    const slotIndex = Math.round(relativeY / slotHeight);
    const newMinutes = 360 + (slotIndex * 30);
    const newHours = Math.floor(newMinutes / 60);
    const newMins = newMinutes % 60;

    setEvents(prev => prev.map(ev => {
      if (ev.id === resizing.eventId) {
        const newTime = new Date(selectedDate);
        newTime.setHours(newHours, newMins, 0, 0);

        if (resizing.resizeEdge === 'top') {
          const duration = resizing.originalEnd.getTime() - resizing.originalStart.getTime();
          return {
            ...ev,
            startAt: newTime.toISOString(),
            endAt: new Date(newTime.getTime() + duration).toISOString(),
          };
        } else {
          return {
            ...ev,
            endAt: newTime.toISOString(),
          };
        }
      }
      return ev;
    }));
  }, [resizing, selectedDate]);

  // Handle resize end
  const handleResizeEnd = useCallback(async () => {
    if (!resizing || !user) {
      setResizing(null);
      return;
    }

    const event = events.find(e => e.id === resizing.eventId);
    if (!event) {
      setResizing(null);
      return;
    }

    try {
      assertCanEdit(event.permissions, 'event');

      if (event.sourceType === 'context' && event.sourceEntityId) {
        const result = await updateContextEvent(event.sourceEntityId, {
          start_at: event.startAt,
          end_at: event.endAt || undefined,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        await updatePersonalCalendarEvent(user.id, event.id, {
          startAt: event.startAt,
          endAt: event.endAt || undefined,
        });
      }

      await loadDailyData();
    } catch (err) {
      console.error('Error resizing event:', err);
      if (err instanceof PermissionError) {
        alert('You do not have permission to edit this event');
      }
      await loadDailyData();
    } finally {
      setResizing(null);
    }
  }, [resizing, events, user]);

  // Mouse event handlers
  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragging, handleDrag, handleDragEnd]);

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizing, handleResize, handleResizeEnd]);

  // Handle time slot click
  const handleTimeSlotClick = (hour: number, minute: number) => {
    setQuickAddSlot({ hour, minute });
    setQuickAddTitle('');
  };

  // Handle quick add submit
  const handleQuickAddSubmit = async () => {
    if (!user || !quickAddSlot || !quickAddTitle.trim()) return;

    try {
      const startAt = new Date(selectedDate);
      startAt.setHours(quickAddSlot.hour, quickAddSlot.minute, 0, 0);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

      await createPersonalCalendarEvent(user.id, {
        title: quickAddTitle,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        allDay: false,
        event_type: 'event', // Default to 'event', can be changed when editing
      });

      setQuickAddSlot(null);
      setQuickAddTitle('');
      await loadDailyData();
    } catch (err) {
      console.error('Error adding event:', err);
    }
  };

  // Get events for the day
  const getDayEvents = useCallback(() => {
    const containers: PersonalCalendarEvent[] = [];
    const nested: PersonalCalendarEvent[] = [];
    const regular: PersonalCalendarEvent[] = [];

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dateTime = new Date(dateStr).getTime();
    const nextDayTime = dateTime + 24 * 60 * 60 * 1000;

    // Container events
    for (const container of containerEvents) {
      const startTime = new Date(container.startAt).getTime();
      const endTime = container.endAt ? new Date(container.endAt).getTime() : startTime;
      
      if (dateTime >= startTime && dateTime <= endTime) {
        containers.push(container);
      }
    }

    // Nested and regular events
    for (const event of [...nestedEvents, ...regularEvents]) {
      const eventDate = new Date(event.startAt).toISOString().split('T')[0];
      if (eventDate === dateStr) {
        if (event.event_scope === 'item') {
          nested.push(event);
        } else {
          regular.push(event);
        }
      }
    }

    return { containers, nested, regular };
  }, [containerEvents, nestedEvents, regularEvents, selectedDate]);

  const { containers, nested, regular } = getDayEvents();
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dayDate = selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <PlannerShell>
        <div className="max-w-full">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={goToMonth}
              className="p-1 md:p-2 hover:bg-gray-100 rounded"
              title="Back to month"
            >
              <ArrowLeft size={20} className="md:w-6 md:h-6" />
            </button>
            <button onClick={() => navigateDay('prev')} className="p-1 md:p-2 hover:bg-gray-100 rounded">
              <ChevronLeft size={20} className="md:w-6 md:h-6" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">{dayName}</h1>
              <p className="text-xs md:text-sm text-gray-600 mt-1">{dayDate}</p>
            </div>
            <button onClick={() => navigateDay('next')} className="p-1 md:p-2 hover:bg-gray-100 rounded">
              <ChevronRight size={20} className="md:w-6 md:h-6" />
            </button>
          </div>
          <button
            onClick={goToWeek}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Week View
          </button>
        </div>

        {/* Day Time Grid */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden" ref={gridRef}>
          {/* All-Day Lane */}
          <div className="flex border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
            <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex items-center justify-center py-3">
              <span className="text-xs text-gray-500 font-medium">All Day</span>
            </div>
            <div className="flex-1 p-3 min-h-[70px]">
              <div className="space-y-2">
                {/* Show all-day events (containers + events without specific time) */}
                {[...containers, ...regular].filter(e => {
                  const start = new Date(e.startAt);
                  const end = e.endAt ? new Date(e.endAt) : start;
                  const duration = end.getTime() - start.getTime();
                  return duration >= 24 * 60 * 60 * 1000 || (start.getHours() === 0 && start.getMinutes() === 0);
                }).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="w-full px-3 py-2 text-sm font-medium rounded-lg text-left truncate transition-all hover:shadow-md"
                    style={{
                      backgroundColor: event.event_scope === 'container' ? '#dbeafe' : '#e0e7ff',
                      border: `1.5px solid ${event.event_scope === 'container' ? '#60a5fa' : '#818cf8'}`,
                    }}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timezone Label */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs text-gray-500">
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
            {isToday && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                Today
              </span>
            )}
          </div>

          <div className="flex overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            {/* Time Column */}
            <div className="w-20 flex-shrink-0 border-r-2 border-gray-300 bg-gray-50 sticky left-0 z-10">
              {timeSlots.map((slot, idx) => (
                <div
                  key={idx}
                  className="h-16 border-b border-gray-200 text-xs text-gray-500 text-right pr-2 pt-1"
                >
                  {slot.minute === 0 &&
                    (slot.hour === 0
                      ? '12 AM'
                      : slot.hour < 12
                      ? `${slot.hour} AM`
                      : slot.hour === 12
                      ? '12 PM'
                      : `${slot.hour - 12} PM`)}
                </div>
              ))}
            </div>

            {/* Day Column */}
            <div className="flex-1 relative">
              {/* Current Time Indicator */}
              {isToday && getCurrentTimePosition() !== null && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: `${getCurrentTimePosition()}px` }}
                >
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 shadow-md"></div>
                    <div className="flex-1 h-0.5 bg-red-500 shadow-sm"></div>
                  </div>
                </div>
              )}
              {/* Time Slots */}
              {timeSlots.map((slot, slotIdx) => {
                const isQuickAdd =
                  quickAddSlot &&
                  quickAddSlot.hour === slot.hour &&
                  quickAddSlot.minute === slot.minute;

                return (
                  <div
                    key={slotIdx}
                    className={`h-16 border-b border-gray-200 hover:bg-blue-50/30 cursor-pointer transition-colors relative ${
                      isToday ? 'bg-blue-50/10' : ''
                    }`}
                    onClick={() => handleTimeSlotClick(slot.hour, slot.minute)}
                  >
                    {isQuickAdd && (
                      <div
                        className="absolute inset-x-2 top-0 z-30"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={quickAddTitle}
                          onChange={(e) => setQuickAddTitle(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleQuickAddSubmit()}
                          onBlur={() => setQuickAddSlot(null)}
                          placeholder="Event title..."
                          className="w-full px-2 py-1 text-xs border border-blue-400 rounded bg-white shadow-lg"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Container Events (Background Bands) */}
              {containers.map((container) => {
                const permissions = container.permissions;
                const canView = permissions?.can_view ?? true;
                if (!canView) return null;

                return (
                  <ContainerBand
                    key={container.id}
                    container={container}
                    date={selectedDate}
                  />
                );
              })}

              {/* Nested and Regular Events (Time-Positioned) */}
              {[...nested, ...regular].map((event) => {
                const permissions = event.permissions;
                const canView = permissions?.can_view ?? true;
                if (!canView) return null;

                // Hide nested if detail_level is overview
                if (event.event_scope === 'item') {
                  const parentContainer = containers.find(
                    c => c.id === event.parent_context_event_id
                  );
                  if (parentContainer?.permissions?.detail_level === 'overview') {
                    return null;
                  }
                }

                const { top, height } = getEventPosition(event);
                const isDragging = dragging?.eventId === event.id;
                const isResizing = resizing?.eventId === event.id;

                return (
                  <EventBlock
                    key={event.id}
                    event={event}
                    top={top}
                    height={height}
                    isDragging={isDragging}
                    isResizing={isResizing}
                    onDragStart={(e) => handleDragStart(e, event)}
                    onResizeStart={(e, edge) => handleResizeStart(e, event, edge)}
                    onClick={() => setSelectedEvent(event)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Shared Event Detail Modal */}
        {selectedEvent && user && (
          <EventDetailModal
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            event={selectedEvent}
            mode="day"
            userId={user.id}
            onUpdated={() => {
              loadDailyData();
              setSelectedEvent(null);
            }}
            onDeleted={() => {
              loadDailyData();
              setSelectedEvent(null);
            }}
          />
        )}
      </div>
    </PlannerShell>
  );
}

// Container Band Component (Background)
function ContainerBand({
  container,
  date,
}: {
  container: PersonalCalendarEvent;
  date: Date;
}) {
  const start = new Date(container.startAt);
  const end = container.endAt ? new Date(container.endAt) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setHours(23, 59, 59, 999);

  if (start > dateEnd || end < dateStart) {
    return null;
  }

  const permissions = container.permissions;
  const isReadOnly = !(permissions?.can_edit ?? true);

  return (
    <div
      className={`absolute left-0 right-0 top-0 bottom-0 pointer-events-none ${
        isReadOnly
          ? 'bg-gradient-to-b from-blue-50/40 to-blue-100/40 border-l-4 border-dashed border-blue-300'
          : 'bg-gradient-to-b from-blue-100/40 to-blue-200/40 border-l-4 border-blue-400'
      }`}
      style={{ zIndex: 1 }}
    >
      <div className="absolute top-1 left-2 right-2 flex items-center gap-1">
        <span className="text-[10px] font-medium text-blue-900 truncate">{container.title}</span>
        {container.contextType && (
          <span className="px-1 py-0.5 bg-white/60 rounded text-[8px] font-medium">
            {container.contextType}
          </span>
        )}
        {isReadOnly && <Lock size={8} className="text-blue-600" />}
        {container.sourceType === 'context' && <Share2 size={8} className="text-blue-600" />}
      </div>
    </div>
  );
}

// Event Block Component (Time-Positioned)
function EventBlock({
  event,
  top,
  height,
  isDragging,
  isResizing,
  onDragStart,
  onResizeStart,
  onClick,
}: {
  event: PersonalCalendarEvent;
  top: number;
  height: number;
  isDragging: boolean;
  isResizing: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent, edge: 'top' | 'bottom') => void;
  onClick: () => void;
}) {
  const permissions = event.permissions;
  const canEdit = permissions?.can_edit ?? true;
  const isReadOnly = !canEdit;
  const isNested = event.event_scope === 'item';

  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
  const timeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div
      className={`absolute left-2 right-2 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${
        isNested
          ? isReadOnly
            ? 'bg-gray-50 border border-dashed border-gray-300'
            : 'bg-gray-100 border border-gray-400'
          : isReadOnly
          ? 'bg-purple-50 border border-dashed border-purple-300'
          : 'bg-purple-100 border border-purple-400'
      } ${isDragging || isResizing ? 'opacity-50' : ''}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        zIndex: isNested ? 5 : 10,
      }}
      onMouseDown={canEdit ? onDragStart : undefined}
      onClick={onClick}
      title={isReadOnly ? 'Read-only access' : undefined}
    >
      <div className="p-1.5 text-xs h-full flex flex-col">
        <div className="flex items-center justify-between gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {isNested && <span className="text-gray-500">└</span>}
            <span className="font-semibold truncate">{event.title}</span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {isReadOnly && <Lock size={10} className="text-gray-500" />}
            {event.sourceType === 'context' && <Share2 size={10} className="text-gray-500" />}
          </div>
        </div>
        <div className="text-[10px] opacity-75 mt-0.5">{timeStr}</div>
      </div>

      {/* Resize Handles */}
      {canEdit && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-200/50"
            onMouseDown={(e) => onResizeStart(e, 'top')}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-200/50"
            onMouseDown={(e) => onResizeStart(e, 'bottom')}
          />
        </>
      )}
    </div>
  );
}


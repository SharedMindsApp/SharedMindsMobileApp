import { ChevronLeft, ChevronRight, Search, Plus, CheckSquare, Square, Clock, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CalendarEventWithMembers } from '../../../lib/calendarTypes';
import {
  getDayEvents,
  formatTime,
  isToday
} from '../../../lib/calendarUtils';
import { useEventTypeColors } from '../../../hooks/useEventTypeColors';
import { useSwipeGesture } from '../../../hooks/useSwipeGesture';
import type { CalendarEventType } from '../../../lib/personalSpaces/calendarService';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getStandaloneTasksForDate,
  updateEventTask,
  deleteEventTask,
  type EventTask,
} from '../../../lib/personalSpaces/eventTasksService';
import { TaskCreationModal } from '../../tasks/TaskCreationModal';
import { TaskProgressSlider } from '../../tasks/TaskProgressSlider';

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
  onTimeSlotClick?: (date: Date, time: string) => void;
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
  const { user } = useAuth();
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

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
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set()); // Track expanded collapsed sections (keyed by start hour)
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load tasks for the current date
  useEffect(() => {
    const loadTasksForDate = async () => {
      if (!user) return;
      const dateStr = currentDate.toISOString().split('T')[0];
      setLoadingTasks(true);
      try {
        const dateTasks = await getStandaloneTasksForDate(user.id, dateStr);
        setTasks(dateTasks);
      } catch (err) {
        console.error('[DayView] Error loading tasks:', err);
      } finally {
        setLoadingTasks(false);
      }
    };
    loadTasksForDate();
  }, [user, currentDate]);

  // Toggle task completion (Phase 6: Sets progress to 100% or previous value)
  const handleToggleTask = async (task: EventTask) => {
    try {
      const updatedTask = await updateEventTask(task.id, {
        completed: !task.completed,
        // Progress will be synced automatically: completed=true → progress=100, completed=false → preserve or 0
      });
      
      // Update task in list (keep completed tasks visible so user can adjust progress)
      setTasks(tasks.map(t => 
        t.id === task.id 
          ? { ...t, ...updatedTask }
          : t
      ));
    } catch (err) {
      console.error('[DayView] Error updating task:', err);
      // Reload on error
      const dateStr = currentDate.toISOString().split('T')[0];
      if (user) {
        try {
          const dateTasks = await getStandaloneTasksForDate(user.id, dateStr);
          setTasks(dateTasks);
        } catch (reloadErr) {
          console.error('[DayView] Error reloading tasks:', reloadErr);
        }
      }
    }
  };

  // Handle progress change (Phase 6: Progress slider)
  const handleProgressChange = async (taskId: string, progress: number) => {
    try {
      const updatedTask = await updateEventTask(taskId, {
        progress: progress,
        // Status and completed will be synced automatically: progress=100 → completed=true, progress<100 → completed=false
      });
      
      // Update task in list
      setTasks(tasks.map(t => 
        t.id === taskId 
          ? { ...t, ...updatedTask }
          : t
      ));
    } catch (err) {
      console.error('[DayView] Error updating task progress:', err);
      // Reload on error to ensure consistency
      const dateStr = currentDate.toISOString().split('T')[0];
      if (user) {
        try {
          const dateTasks = await getStandaloneTasksForDate(user.id, dateStr);
          setTasks(dateTasks);
        } catch (reloadErr) {
          console.error('[DayView] Error reloading tasks:', reloadErr);
        }
      }
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteEventTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('[DayView] Error deleting task:', err);
    }
  };

  // Format time for display
  const formatTaskTime = (timeString: string | null): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

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
    if (!onTimeSlotClick) return; // Read-only mode
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

  // Detect mobile and add horizontal swipe gesture for navigation
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Horizontal swipe gesture for navigation (mobile only)
  const { ref: swipeRef } = useSwipeGesture({
    onSwipeLeft: () => {
      if (isMobile && onNext) {
        onNext();
      }
    },
    onSwipeRight: () => {
      if (isMobile && onPrevious) {
        onPrevious();
      }
    },
    threshold: 50,
    enabled: isMobile,
    preventDefault: false,
    axisLock: true,
  });

  // Calculate which hours have events or tasks
  const getHoursWithContent = (): Set<number> => {
    const hoursSet = new Set<number>();
    
    // Add hours with events
    dayEvents.forEach(({ startMinutes, endMinutes }) => {
      const startHour = Math.floor(startMinutes / 60);
      const endHour = Math.ceil(endMinutes / 60);
      for (let h = startHour; h <= endHour && h < 24; h++) {
        hoursSet.add(h);
      }
    });
    
    // Add hours with tasks
    tasks.forEach((task) => {
      if (task.start_time) {
        const [hours] = task.start_time.split(':').map(Number);
        hoursSet.add(hours);
      }
    });
    
    return hoursSet;
  };

  // Calculate collapsed sections
  const calculateCollapsedSections = (): Array<{ start: number; end: number }> => {
    if (!isTodayDate) {
      // For non-today dates, collapse hours before first event/task
      const hoursWithContent = getHoursWithContent();
      if (hoursWithContent.size === 0) return [];
      
      const firstHourWithContent = Math.min(...Array.from(hoursWithContent));
      if (firstHourWithContent > 0) {
        return [{ start: 0, end: firstHourWithContent - 1 }];
      }
      return [];
    }
    
    // For today, start from current hour
    const now = new Date();
    const currentHour = now.getHours();
    const hoursWithContent = getHoursWithContent();
    
    // Find next hour with content after current hour
    let nextHourWithContent: number | null = null;
    for (let h = currentHour + 1; h < 24; h++) {
      if (hoursWithContent.has(h)) {
        nextHourWithContent = h;
        break;
      }
    }
    
    // If no next hour with content, don't collapse anything
    if (nextHourWithContent === null) {
      return [];
    }
    
    // Collapse hours between current hour and next hour with content
    if (nextHourWithContent > currentHour + 1) {
      return [{ start: currentHour + 1, end: nextHourWithContent - 1 }];
    }
    
    return [];
  };

  const collapsedSections = calculateCollapsedSections();
  
  // Check if a section is expanded
  const isSectionExpanded = (start: number): boolean => {
    return expandedSections.has(start);
  };
  
  // Toggle section expansion
  const toggleSection = (start: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(start)) {
        next.delete(start);
      } else {
        next.add(start);
      }
      return next;
    });
  };

  // Check if an hour should be visible
  const isHourVisible = (hour: number): boolean => {
    if (!isTodayDate) {
      // For non-today, show all hours (or collapse before first event)
      const section = collapsedSections.find(s => hour >= s.start && hour <= s.end);
      if (section) {
        return hour === section.start || hour === section.end || isSectionExpanded(section.start);
      }
      return true;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Always show current hour
    if (hour === currentHour) return true;
    
    // Check if hour is in a collapsed section
    const section = collapsedSections.find(s => hour >= s.start && hour <= s.end);
    if (section) {
      // Show first and last hour of section (for expand/collapse buttons)
      if (hour === section.start || hour === section.end) {
        return true;
      }
      // Show middle hours only if expanded
      return isSectionExpanded(section.start);
    }
    
    // Show hours with content
    const hoursWithContent = getHoursWithContent();
    if (hoursWithContent.has(hour)) return true;
    
    // Show next hour after current hour (for collapsed section start)
    if (hour === currentHour + 1 && collapsedSections.length > 0) {
      return true;
    }
    
    return false;
  };

  // Get collapsed section for an hour
  const getCollapsedSection = (hour: number): { start: number; end: number } | null => {
    return collapsedSections.find(s => hour >= s.start && hour <= s.end) || null;
  };

  // Calculate pixel position for a given hour and minutes (accounting for collapsed sections)
  const calculatePixelPosition = (hour: number, minutes: number = 0): number => {
    let position = 0;
    
    // Sum up heights of all visible hours before this one
    for (let h = 0; h < hour; h++) {
      if (isHourVisible(h)) {
        const section = getCollapsedSection(h);
        const isSectionStart = section && h === section.start;
        const isExpanded = isSectionStart ? isSectionExpanded(section.start) : true;
        
        if (isSectionStart && !isExpanded) {
          position += 48; // Collapsed height
        } else {
          position += 80; // Normal height
        }
      }
    }
    
    // Add position within the current hour
    if (isHourVisible(hour)) {
      const section = getCollapsedSection(hour);
      const isSectionStart = section && hour === section.start;
      const isExpanded = isSectionStart ? isSectionExpanded(section.start) : true;
      
      const hourHeight = (isSectionStart && !isExpanded) ? 48 : 80;
      position += (minutes / 60) * hourHeight;
    }
    
    return position;
  };

  // Auto-scroll to current hour on mount (today only)
  // Show the entire current hour (from :00 to :59), not just the current time
  useEffect(() => {
    if (isTodayDate && scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Calculate position of the start of the current hour (0 minutes)
      const hourStartPosition = calculatePixelPosition(currentHour, 0);
      
      // Scroll to the start of the current hour with a small offset for better visibility
      // This ensures the whole hour is visible, not cut off
      const scrollOffset = Math.max(0, hourStartPosition - 20); // Small offset to avoid cutting off at the very top
      
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollOffset;
        }
      }, 150); // Slightly longer timeout to ensure collapsed sections are rendered
    }
  }, [isTodayDate, collapsedSections.length, expandedSections.size]);

  return (
    <div 
      className="flex flex-col h-full bg-white overflow-hidden"
      ref={swipeRef}
    >
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
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain min-h-0"
      >
        <div className="flex">
          {/* Time Column */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50/30">
            {hours.map(hour => {
              const section = getCollapsedSection(hour);
              const isVisible = isHourVisible(hour);
              
              if (!isVisible) return null;
              
              // Check if this is the start of a collapsed section
              const isSectionStart = section && hour === section.start;
              
              return (
                <div
                  key={hour}
                  className={`border-b border-gray-100 text-xs text-gray-500 text-right pr-2 pt-1 ${
                    isSectionStart && !isSectionExpanded(section.start) 
                      ? 'h-12' 
                      : 'h-20'
                  }`}
                >
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
              );
            })}
          </div>

          {/* Events Column */}
          <div className="flex-1 relative">
            {/* Time Slots - Regular block elements that stack */}
            {hours.map(hour => {
              const section = getCollapsedSection(hour);
              const isVisible = isHourVisible(hour);
              
              if (!isVisible) return null;
              
              // Check if this is the start of a collapsed section
              const isSectionStart = section && hour === section.start;
              const isExpanded = isSectionStart ? isSectionExpanded(section.start) : true;
              const collapsedHeight = isSectionStart && !isExpanded ? 48 : 80;
              
              return (
                <div key={hour} className="relative">
                  {/* Time Slot */}
                  <div
                    className={`border-b border-gray-100 hover:bg-blue-50/30 cursor-pointer transition-colors relative z-0 ${
                      isSectionStart && !isExpanded ? 'h-12' : 'h-20'
                    }`}
                    onClick={() => handleTimeSlotClick(hour)}
                  ></div>
                  
                  {/* Collapsed Section Indicator */}
                  {isSectionStart && section && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(section.start);
                      }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center gap-1.5 min-h-[32px]"
                      aria-label={isExpanded ? 'Collapse hours' : 'Expand hours'}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} className="text-gray-600" />
                          <span className="text-xs font-medium text-gray-600">
                            Collapse {section.end - section.start + 1} hours
                          </span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} className="text-gray-600" />
                          <span className="text-xs font-medium text-gray-600">
                            {section.end - section.start + 1} hours
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
            
            {/* Maintain full height for proper scrolling calculations */}
            <div style={{ minHeight: `${hours.length * 80}px` }} className="absolute inset-0 pointer-events-none" />

            {/* Current Time Indicator */}
            {isTodayDate && (() => {
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinutes = now.getMinutes();
              
              // Only show if current hour is visible
              if (!isHourVisible(currentHour)) {
                return null;
              }
              
              const timePosition = calculatePixelPosition(currentHour, currentMinutes);
              
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
              const startHour = Math.floor(startMinutes / 60);
              const startMin = startMinutes % 60;
              const endHour = Math.floor(endMinutes / 60);
              const endMin = endMinutes % 60;
              
              // Calculate pixel positions accounting for collapsed sections
              const top = calculatePixelPosition(startHour, startMin);
              const bottom = calculatePixelPosition(endHour, endMin);
              const height = Math.max(bottom - top, 40);
              
              // Skip event if start hour is not visible
              if (!isHourVisible(startHour)) {
                return null;
              }
              
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

      {/* Tasks Section - Always visible below the hourly grid, separate from scrollable area */}
      <div className="border-t-2 border-gray-300 bg-white flex-shrink-0 relative z-50 pointer-events-auto">
        {/* Tasks Header - Always visible with Add Task button */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Tasks</h3>
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center gap-1.5 min-h-[32px] min-w-[100px] justify-center pointer-events-auto cursor-pointer"
            aria-label="Add new task"
          >
            <Plus size={14} />
            Add Task
          </button>
        </div>

        {/* Tasks Content */}
        <div className="px-4 py-4 min-h-[120px] pointer-events-auto">
          {loadingTasks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <CheckSquare size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No tasks for today</p>
              <p className="text-xs text-gray-500 mb-4 text-center max-w-[280px]">
                Add a task to plan what you need to do for this day.
              </p>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center gap-2 min-h-[40px] pointer-events-auto cursor-pointer"
              >
                <Plus size={16} />
                Add Task
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const isCompleted = task.status === 'completed' || task.completed || (task.progress ?? 0) === 100;
                const progress = task.progress ?? 0;
                
                return (
                  <div
                    key={task.id}
                    className={`p-3 bg-white border rounded-lg hover:border-gray-300 transition-colors group ${
                      isCompleted 
                        ? 'border-gray-100 opacity-75' 
                        : 'border-gray-200'
                    }`}
                  >
                    {/* Top Row: Checkbox + Title + Delete */}
                    <div className="flex items-start gap-3 mb-2">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task)}
                        className="flex-shrink-0 mt-0.5 p-1 hover:bg-gray-100 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center pointer-events-auto cursor-pointer"
                        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {isCompleted ? (
                          <CheckSquare size={18} className="text-green-600" />
                        ) : (
                          <Square size={18} className="text-gray-400" />
                        )}
                      </button>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <p className={`text-sm font-medium flex-1 ${
                            isCompleted 
                              ? 'text-gray-500 line-through' 
                              : 'text-gray-900'
                          }`}>
                            {task.title}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center pointer-events-auto cursor-pointer"
                            aria-label="Delete task"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        
                        {/* Task Time */}
                        {task.start_time && (
                          <div className={`flex items-center gap-1.5 text-xs mb-2 ${
                            isCompleted ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <Clock size={12} />
                            <span>{formatTaskTime(task.start_time)}</span>
                            {task.duration_minutes && (
                              <span>({task.duration_minutes} min)</span>
                            )}
                          </div>
                        )}

                        {/* Progress Slider (Phase 6) - Hidden for completed tasks (progress = 100), shown for pending/partial */}
                        {!isCompleted && progress < 100 && (
                          <div className="mt-1">
                            <TaskProgressSlider
                              taskId={task.id}
                              currentProgress={progress}
                              onProgressChange={handleProgressChange}
                              disabled={false}
                              size="sm"
                              showLabel={true}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Task Creation Modal */}
      {user && (
        <TaskCreationModal
          userId={user.id}
          initialDate={currentDate.toISOString().split('T')[0]}
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSaved={() => {
            const dateStr = currentDate.toISOString().split('T')[0];
            getStandaloneTasksForDate(user.id, dateStr).then(setTasks);
            setIsTaskModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

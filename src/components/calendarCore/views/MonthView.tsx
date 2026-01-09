import { CalendarEventWithMembers } from '../../../lib/calendarTypes';
import { getMonthDays, isSameDay, isToday, getEventsForDay } from '../../../lib/calendarUtils';
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

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEventWithMembers[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEventWithMembers) => void;
  onDayDoubleClick: (date: Date) => void;
  selectedDate?: Date | null;
  onDaySelect?: (date: Date | null) => void;
}

export function MonthView({
  currentDate,
  events,
  onDayClick,
  onEventClick,
  onDayDoubleClick,
  selectedDate,
  onDaySelect
}: MonthViewProps) {
  const { colors: eventTypeColors } = useEventTypeColors();
  const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  const handleDayClick = (date: Date, e: React.MouseEvent) => {
    // Single click: select day (only in month view)
    if (onDaySelect) {
      onDaySelect(date);
    }
    onDayClick(date);
  };

  const handleDayDoubleClick = (date: Date) => {
    // Double click: navigate to day view
    onDayDoubleClick(date);
    // Clear selection when navigating
    if (onDaySelect) {
      onDaySelect(null);
    }
  };

  // Check if a day is selected
  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekDays.map(day => (
          <div
            key={day}
            className="py-3 text-center text-sm font-semibold text-gray-700"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((date, idx) => {
          const dayEvents = getEventsForDay(events, date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isTodayDate = isToday(date);

          const isSelectedDate = isSelected(date);

          return (
            <div
              key={idx}
              className={`border-b border-r border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                !isCurrentMonth ? 'bg-gray-50/50' : ''
              } ${isTodayDate ? 'bg-blue-50/30' : ''} ${
                isSelectedDate && !isTodayDate ? 'bg-blue-50' : ''
              } ${isSelectedDate && isTodayDate ? 'bg-blue-100/50' : ''}`}
              onClick={(e) => handleDayClick(date, e)}
              onDoubleClick={() => handleDayDoubleClick(date)}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium ${
                    !isCurrentMonth
                      ? 'text-gray-400'
                      : isTodayDate
                      ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                      : 'text-gray-900'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Event Type Dots - Show up to 3 unique event types */}
              {(() => {
                // Get unique event types for this day
                const eventTypes = new Map<CalendarEventType, string>();
                dayEvents.forEach(event => {
                  const eventType = (event as any).event_type as CalendarEventType | undefined;
                  const type = eventType || 'event';
                  if (!eventTypes.has(type)) {
                    eventTypes.set(type, getEventTypeColor(event));
                  }
                });

                const uniqueTypes = Array.from(eventTypes.entries()).slice(0, 3);
                const remainingCount = eventTypes.size - 3;

                return (
                  <div className="flex items-center gap-1 flex-wrap">
                    {uniqueTypes.map(([eventType, color], idx) => (
                      <div
                        key={`${eventType}-${idx}`}
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                        title={eventType.charAt(0).toUpperCase() + eventType.slice(1).replace('_', ' ')}
                      />
                    ))}
                    {remainingCount > 0 && (
                      <span className="text-[10px] text-gray-500 font-medium">
                        +{remainingCount}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

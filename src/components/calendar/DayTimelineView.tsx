import { useState, useRef, useEffect } from 'react';
import { Clock, Plus } from 'lucide-react';
import type { CalendarEventWithMembers } from '../../lib/calendarTypes';
import { getEventColorDot } from '../../lib/calendarUtils';

interface DayTimelineViewProps {
  date: Date;
  events: CalendarEventWithMembers[];
  onEventClick: (event: CalendarEventWithMembers) => void;
  onTimeSlotClick: (hour: number) => void;
}

interface EventPosition {
  event: CalendarEventWithMembers;
  top: number;
  height: number;
  left: number;
  width: number;
}

export function DayTimelineView({ date, events, onEventClick, onTimeSlotClick }: DayTimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    if (scrollRef.current) {
      const currentHour = new Date().getHours();
      const scrollPosition = currentHour * 60;
      scrollRef.current.scrollTop = scrollPosition;
    }

    return () => clearInterval(interval);
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventPosition = (event: CalendarEventWithMembers): EventPosition | null => {
    const startDate = new Date(event.start_at);
    const endDate = new Date(event.end_at);

    const eventDateStr = startDate.toDateString();
    const selectedDateStr = date.toDateString();

    if (eventDateStr !== selectedDateStr && !event.all_day) {
      return null;
    }

    if (event.all_day) {
      return {
        event,
        top: 0,
        height: 60,
        left: 0,
        width: 100
      };
    }

    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    const duration = endMinutes - startMinutes;

    return {
      event,
      top: startMinutes,
      height: Math.max(duration, 30),
      left: 0,
      width: 100
    };
  };

  const positionedEvents = events
    .map(getEventPosition)
    .filter((pos): pos is EventPosition => pos !== null);

  const calculateOverlappingColumns = (positions: EventPosition[]): EventPosition[] => {
    const sorted = [...positions].sort((a, b) => a.top - b.top);
    const columns: EventPosition[][] = [];

    sorted.forEach(pos => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        const lastInColumn = column[column.length - 1];

        if (lastInColumn.top + lastInColumn.height <= pos.top) {
          column.push(pos);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([pos]);
      }
    });

    const totalColumns = columns.length;
    const columnWidth = totalColumns > 0 ? 100 / totalColumns : 100;

    columns.forEach((column, colIndex) => {
      column.forEach(pos => {
        pos.left = colIndex * columnWidth;
        pos.width = columnWidth - 1;
      });
    });

    return sorted;
  };

  const layoutedEvents = calculateOverlappingColumns(positionedEvents);

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const isToday = date.toDateString() === new Date().toDateString();
  const currentTimePosition = isToday
    ? currentTime.getHours() * 60 + currentTime.getMinutes()
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="relative">
          {hours.map(hour => (
            <button
              key={hour}
              onClick={() => onTimeSlotClick(hour)}
              className="flex w-full hover:bg-blue-50/50 transition-colors group"
            >
              <div className="w-16 flex-shrink-0 text-xs text-gray-600 font-semibold pr-2 pt-1 text-right border-r border-gray-200">
                {formatHour(hour)}
              </div>
              <div className="flex-1 border-b border-gray-200 relative h-[60px]">
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-blue-500 text-white p-1 rounded-full shadow-md">
                    <Plus size={12} />
                  </div>
                </div>
              </div>
            </button>
          ))}

          <div className="absolute top-0 left-16 right-0 pointer-events-none">
            {layoutedEvents.map(({ event, top, height, left, width }) => (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                className="absolute pointer-events-auto text-left"
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `${left}%`,
                  width: `${width}%`,
                  zIndex: 10
                }}
              >
                <div className={`h-full rounded-lg shadow-sm border-l-4 p-1.5 overflow-hidden hover:shadow-md transition-all ${getEventColorDot(event.color).replace('w-2 h-2 rounded-full', 'border-l-4')}`}>
                  <div className="bg-white/95 h-full rounded-r px-2 py-1 overflow-hidden">
                    <div className="font-semibold text-xs text-gray-900 truncate leading-tight">
                      {event.title}
                    </div>
                    {height > 40 && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-600 mt-0.5">
                        <Clock size={8} />
                        <span>
                          {new Date(event.start_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    {height > 60 && event.location && (
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">
                        {event.location}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {currentTimePosition !== null && (
              <div
                className="absolute left-0 right-0 border-t-2 border-red-500 pointer-events-none z-20"
                style={{ top: `${currentTimePosition}px` }}
              >
                <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

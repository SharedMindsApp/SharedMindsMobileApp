import { useState, useRef, useCallback } from 'react';
import { CalendarEventWithMembers } from '../../lib/calendarTypes';
import {
  getWeekDays,
  isToday,
  getDayEvents,
  formatTime,
  getEventColor,
  addDays,
  roundToNearestHalfHour
} from '../../lib/calendarUtils';
import { moveEvent, resizeEvent } from '../../lib/calendar';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEventWithMembers[];
  onEventClick: (event: CalendarEventWithMembers) => void;
  onRefresh: () => void;
  onTimeSlotClick: (date: Date, time: string) => void;
}

export function WeekView({
  currentDate,
  events,
  onEventClick,
  onRefresh,
  onTimeSlotClick
}: WeekViewProps) {
  const weekDays = getWeekDays(currentDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const [draggingEvent, setDraggingEvent] = useState<string | null>(null);
  const [resizingEvent, setResizingEvent] = useState<string | null>(null);

  const handleEventDragStart = (e: React.DragEvent, event: CalendarEventWithMembers) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('eventId', event.id);
    setDraggingEvent(event.id);
  };

  const handleDayDrop = async (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('eventId');

    if (!eventId) return;

    const event = events.find(ev => ev.id === eventId);
    if (!event) return;

    const eventStart = new Date(event.start_at);
    const eventEnd = new Date(event.end_at);
    const duration = eventEnd.getTime() - eventStart.getTime();

    const newStart = new Date(date);
    newStart.setHours(hour, 0, 0, 0);

    const newEnd = new Date(newStart.getTime() + duration);

    try {
      await moveEvent(eventId, newStart, newEnd);
      onRefresh();
    } catch (error) {
      console.error('Failed to move event:', error);
    } finally {
      setDraggingEvent(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    onTimeSlotClick(date, timeString);
  };

  return (
    <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className="w-16 flex-shrink-0"></div>

        {weekDays.map((date, idx) => {
          const isTodayDate = isToday(date);

          return (
            <div
              key={idx}
              className={`flex-1 py-3 text-center border-l border-gray-200 ${
                isTodayDate ? 'bg-blue-50' : ''
              }`}
            >
              <div className="text-xs font-medium text-gray-600">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div
                className={`text-lg font-bold ${
                  isTodayDate
                    ? 'bg-blue-600 text-white w-8 h-8 rounded-full inline-flex items-center justify-center'
                    : 'text-gray-900'
                }`}
              >
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          <div className="w-16 flex-shrink-0 border-r border-gray-200">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-16 border-b border-gray-200 text-xs text-gray-500 text-right pr-2 pt-1"
              >
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {weekDays.map((date, dayIdx) => {
            const dayEvents = getDayEvents(events, date);

            return (
              <div
                key={dayIdx}
                className="flex-1 relative border-l border-gray-200"
              >
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="h-16 border-b border-gray-200 hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDayDrop(e, date, hour)}
                    onClick={() => handleTimeSlotClick(date, hour)}
                  ></div>
                ))}

                {dayEvents.map(({ event, startMinutes, endMinutes }) => {
                  const top = (startMinutes / 60) * 64;
                  const height = Math.max(((endMinutes - startMinutes) / 60) * 64, 32);
                  const start = new Date(event.start_at);
                  const end = new Date(event.end_at);

                  return (
                    <div
                      key={event.id}
                      draggable
                      onDragStart={(e) => handleEventDragStart(e, event)}
                      onClick={() => onEventClick(event)}
                      className={`absolute left-1 right-1 border-l-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${getEventColor(
                        event.color
                      )} ${draggingEvent === event.id ? 'opacity-50' : ''}`}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        zIndex: 10
                      }}
                    >
                      <div className="p-2 text-xs">
                        <div className="font-semibold truncate">{event.title}</div>
                        {!event.all_day && (
                          <div className="text-xs opacity-75">
                            {formatTime(start)} - {formatTime(end)}
                          </div>
                        )}
                        {event.location && (
                          <div className="text-xs opacity-75 truncate mt-1">
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

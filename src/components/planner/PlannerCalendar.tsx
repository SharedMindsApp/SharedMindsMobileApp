/**
 * PlannerCalendar - Unified Calendar View for Planner
 * 
 * Uses CalendarShell from calendarCore - the single source of truth for calendar UI.
 * Planner composes CalendarShell, it does not re-implement calendar logic.
 * 
 * ❌ DO NOT add calendar rendering logic here
 * ✅ All calendar UI comes from calendarCore/CalendarShell
 */

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlannerShell } from './PlannerShell';
import { useAuth } from '../../contexts/AuthContext';
import { CalendarShell } from '../calendarCore';
import { PersonalEventModal } from '../personal-spaces/PersonalEventModal';
import { EventDetailModal } from '../calendar/EventDetailModal';
import type { PersonalCalendarEvent } from '../../lib/personalSpaces/calendarService';
import type { CalendarView } from '../calendarCore/types';

export function PlannerCalendar() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Get view from URL query param, default to 'month'
  const viewParam = searchParams.get('view');
  const initialView: CalendarView = (viewParam === 'day' || viewParam === 'week' || viewParam === 'month' || viewParam === 'agenda') 
    ? viewParam 
    : 'month';
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PersonalCalendarEvent | null>(null);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<PersonalCalendarEvent | null>(null);
  const [newEventDate, setNewEventDate] = useState<string | undefined>();

  // Memoize scope to prevent unnecessary re-renders
  const scope = useMemo(() => ({ userId: user?.id || '' }), [user?.id]);

  const handleCreateEvent = (date?: Date) => {
    setSelectedEvent(null);
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      setNewEventDate(dateStr);
    } else {
      setNewEventDate(undefined);
    }
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: any) => {
    // Convert CalendarEvent to PersonalCalendarEvent for detail modal
    const personalEvent: PersonalCalendarEvent = {
      id: event.id,
      userId: event.created_by,
      title: event.title,
      description: event.description || null,
      startAt: event.start_at,
      endAt: event.end_at,
      allDay: event.all_day,
      sourceType: 'personal',
      sourceEntityId: null,
      sourceProjectId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedEventForDetail(personalEvent);
    setIsEventDetailOpen(true);
  };

  const handleModalClose = () => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
    setNewEventDate(undefined);
  };

  const handleEventDetailClose = () => {
    setIsEventDetailOpen(false);
    setSelectedEventForDetail(null);
  };

  if (!user) {
    return (
      <PlannerShell>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-600">Please sign in to view your calendar.</p>
        </div>
      </PlannerShell>
    );
  }

  return (
    <PlannerShell>
      <CalendarShell
        context="planner"
        scope={scope}
        ui={{
          showQuickActions: false,
          showHeader: true,
          showViewSelector: true,
          defaultView: initialView,
          enableGestures: true,
        }}
        handlers={{
          onEventClick: handleEventClick,
          onTimeSlotClick: (date) => handleCreateEvent(date),
          onDayDoubleClick: handleCreateEvent,
          onEventCreate: (date) => handleCreateEvent(date),
        }}
      />

      {/* Event Create/Edit Modal */}
      {isEventModalOpen && (
        <PersonalEventModal
          userId={user.id}
          event={selectedEvent}
          initialDate={newEventDate}
          onClose={handleModalClose}
          onSaved={handleModalClose}
        />
      )}

      {/* Event Detail Modal */}
      {selectedEventForDetail && (
        <EventDetailModal
          isOpen={isEventDetailOpen}
          onClose={handleEventDetailClose}
          event={selectedEventForDetail}
          mode="personalSpaces"
          userId={user.id}
          onUpdated={() => {
            handleEventDetailClose();
          }}
          onDeleted={() => {
            handleEventDetailClose();
          }}
        />
      )}
    </PlannerShell>
  );
}

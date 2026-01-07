import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Calendar as CalendarIcon,
  User,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getHouseholdMembers } from '../../lib/household';
import { getHouseholdEvents } from '../../lib/calendar';
import type { CalendarView, CalendarEventWithMembers, CalendarFilters, EventColor } from '../../lib/calendarTypes';
import {
  formatMonthYear,
  formatWeekRange,
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  endOfWeek
} from '../../lib/calendarUtils';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';
import { EventModal } from './EventModal';

interface CalendarPageProps {
  householdId: string | null;
}

export function CalendarPage({ householdId }: CalendarPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [events, setEvents] = useState<CalendarEventWithMembers[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEventWithMembers[]>([]);
  const [householdMembers, setHouseholdMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithMembers | null>(null);
  const [newEventDate, setNewEventDate] = useState<Date | undefined>();
  const [newEventStartTime, setNewEventStartTime] = useState<string | undefined>();
  const [newEventEndTime, setNewEventEndTime] = useState<string | undefined>();

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CalendarFilters>({
    memberIds: [],
    colors: [],
    myEventsOnly: false
  });

  useEffect(() => {
    loadData();
  }, [householdId]);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const loadData = async () => {
    setLoading(true);

    try {
      if (!householdId) {
        setEvents([]);
        setHouseholdMembers([]);
        setLoading(false);
        return;
      }

      const [eventsData, membersData] = await Promise.all([
        getHouseholdEvents(householdId),
        getHouseholdMembers(householdId)
      ]);

      setEvents(eventsData);
      setHouseholdMembers(membersData);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    if (filters.memberIds && filters.memberIds.length > 0) {
      filtered = filtered.filter(event =>
        event.members?.some(m => filters.memberIds?.includes(m.member_profile_id))
      );
    }

    if (filters.colors && filters.colors.length > 0) {
      filtered = filtered.filter(event => filters.colors?.includes(event.color));
    }

    if (filters.myEventsOnly && user) {
      filtered = filtered.filter(event => event.created_by === user.id);
    }

    setFilteredEvents(filtered);
  };

  const handlePrevious = () => {
    switch (view) {
      case 'month':
        setCurrentDate(addMonths(currentDate, -1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, -1));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, -1));
        break;
      case 'agenda':
        setCurrentDate(addMonths(currentDate, -1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case 'agenda':
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = (date?: Date, startTime?: string, endTime?: string) => {
    if (!householdId) {
      if (confirm('You need to create a household first to use the calendar. Would you like to create one now?')) {
        navigate('/onboarding/household');
      }
      return;
    }

    setSelectedEvent(null);
    setNewEventDate(date);
    setNewEventStartTime(startTime);
    setNewEventEndTime(endTime);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: CalendarEventWithMembers) => {
    setSelectedEvent(event);
    setNewEventDate(undefined);
    setNewEventStartTime(undefined);
    setNewEventEndTime(undefined);
    setIsEventModalOpen(true);
  };

  const handleDayClick = (date: Date) => {
    if (view !== 'day') {
      setCurrentDate(date);
      setView('day');
    }
  };

  const handleDayDoubleClick = (date: Date) => {
    handleCreateEvent(date, '09:00', '10:00');
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    const [hours] = time.split(':').map(Number);
    const endHours = hours + 1;
    const endTime = `${endHours.toString().padStart(2, '0')}:00`;
    handleCreateEvent(date, time, endTime);
  };

  const handleModalClose = () => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
    setNewEventDate(undefined);
    setNewEventStartTime(undefined);
    setNewEventEndTime(undefined);
  };

  const handleModalSave = () => {
    loadData();
  };

  const toggleMemberFilter = (memberId: string) => {
    setFilters(prev => ({
      ...prev,
      memberIds: prev.memberIds?.includes(memberId)
        ? prev.memberIds.filter(id => id !== memberId)
        : [...(prev.memberIds || []), memberId]
    }));
  };

  const toggleColorFilter = (color: EventColor) => {
    setFilters(prev => ({
      ...prev,
      colors: prev.colors?.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...(prev.colors || []), color]
    }));
  };

  const clearFilters = () => {
    setFilters({
      memberIds: [],
      colors: [],
      myEventsOnly: false
    });
  };

  const getDateRangeText = () => {
    switch (view) {
      case 'month':
        return formatMonthYear(currentDate);
      case 'week':
        return formatWeekRange(startOfWeek(currentDate));
      case 'day':
        return currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      case 'agenda':
        return 'Upcoming Events';
    }
  };

  const colors: EventColor[] = ['blue', 'red', 'yellow', 'green', 'purple', 'gray', 'orange', 'pink'];

  const colorStyles: Record<EventColor, string> = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/household-dashboard')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Dashboard</span>
          </button>
        </div>

        {!householdId && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-6 flex items-start gap-3">
            <CalendarIcon size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Create a household to use the calendar</h3>
              <p className="text-sm text-blue-800 mb-3">
                The calendar requires a household to organize and share events with family members.
              </p>
              <button
                onClick={() => navigate('/onboarding/household')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Create Household
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevious}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} />
              </button>

              <h1 className="text-2xl font-bold text-gray-900 min-w-64 text-center">
                {getDateRangeText()}
              </h1>

              <button
                onClick={handleNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={24} />
              </button>

              <button
                onClick={handleToday}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setView('month')}
                  className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                    view === 'month' ? 'bg-white shadow' : 'hover:bg-gray-200'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setView('week')}
                  className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                    view === 'week' ? 'bg-white shadow' : 'hover:bg-gray-200'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setView('day')}
                  className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                    view === 'day' ? 'bg-white shadow' : 'hover:bg-gray-200'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setView('agenda')}
                  className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                    view === 'agenda' ? 'bg-white shadow' : 'hover:bg-gray-200'
                  }`}
                >
                  Agenda
                </button>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                }`}
                title="Filters"
              >
                <Filter size={20} />
              </button>

              <button
                onClick={() => handleCreateEvent()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                <span className="font-medium">New Event</span>
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <User size={16} />
                    Filter by Members
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {householdMembers.map(member => (
                      <label
                        key={member.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filters.memberIds?.includes(member.id)}
                          onChange={() => toggleMemberFilter(member.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{member.full_name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Color</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => toggleColorFilter(color)}
                        className={`w-10 h-10 rounded-lg ${colorStyles[color]} ${
                          filters.colors?.includes(color)
                            ? 'ring-2 ring-gray-900 ring-offset-2'
                            : 'opacity-50 hover:opacity-100'
                        } transition-all`}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Filters</h3>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.myEventsOnly}
                      onChange={(e) =>
                        setFilters(prev => ({ ...prev, myEventsOnly: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">My Events Only</span>
                  </label>

                  <button
                    onClick={clearFilters}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-[calc(100vh-20rem)]">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-white rounded-xl shadow-lg">
              <div className="text-center">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-500">Loading calendar...</p>
              </div>
            </div>
          ) : (
            <>
              {view === 'month' && (
                <MonthView
                  currentDate={currentDate}
                  events={filteredEvents}
                  onDayClick={handleDayClick}
                  onEventClick={handleEventClick}
                  onDayDoubleClick={handleDayDoubleClick}
                />
              )}

              {view === 'week' && (
                <WeekView
                  currentDate={currentDate}
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                  onRefresh={loadData}
                  onTimeSlotClick={handleTimeSlotClick}
                />
              )}

              {view === 'day' && (
                <DayView
                  currentDate={currentDate}
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                  onTimeSlotClick={handleTimeSlotClick}
                />
              )}

              {view === 'agenda' && (
                <AgendaView events={filteredEvents} onEventClick={handleEventClick} />
              )}
            </>
          )}
        </div>
      </div>

      <EventModal
        isOpen={isEventModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        event={selectedEvent}
        householdId={householdId}
        householdMembers={householdMembers}
        initialDate={newEventDate}
        initialStartTime={newEventStartTime}
        initialEndTime={newEventEndTime}
      />
    </div>
  );
}

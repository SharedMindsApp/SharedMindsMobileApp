import { useState, useEffect } from 'react';
import { X, Calendar, Loader2, AlertCircle, Link as LinkIcon, Share2 } from 'lucide-react';
import { useCalendarSyncSettings } from '../../hooks/useCalendarSyncSettings';
import {
  createPersonalCalendarEvent,
  updatePersonalCalendarEvent,
  type PersonalCalendarEvent,
  type CreatePersonalEventInput,
  type UpdatePersonalEventInput,
  type CalendarEventType,
} from '../../lib/personalSpaces/calendarService';
import { EventTypeSelector } from '../calendar/EventTypeSelector';
import { useSharingDrawer } from '../../hooks/useSharingDrawer';
import { SharingDrawer } from '../sharing/SharingDrawer';
import { PermissionIndicator } from '../sharing/PermissionIndicator';
import { BottomSheet } from '../shared/BottomSheet';

interface PersonalEventModalProps {
  userId: string;
  event?: PersonalCalendarEvent | null;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

type IntegrationType = 'personal' | 'roadmap_event' | 'task';

export function PersonalEventModal({
  userId,
  event,
  initialDate,
  onClose,
  onSaved,
}: PersonalEventModalProps) {
  const { settings: syncSettings } = useCalendarSyncSettings();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [eventType, setEventType] = useState<CalendarEventType>('event');
  const [integrationType, setIntegrationType] = useState<IntegrationType>('personal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isEditing = !!event;
  const isIntegrated = event?.sourceType === 'guardrails';
  const isContextEvent = event?.sourceType === 'context';
  const canIntegrateWithGuardrails =
    syncSettings?.syncPersonalToGuardrails && !isEditing && !isIntegrated;
  
  // Sharing state (only for context events)
  const { isOpen: isSharingOpen, adapter: sharingAdapter, openDrawer: openSharing, closeDrawer: closeSharing } = useSharingDrawer(
    'calendar_event',
    isContextEvent && event ? event.id : null
  );
  const canManageEvent = isContextEvent && event ? (event.userId === userId) : false;

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.event_type || 'event');

      const startDt = new Date(event.startAt);
      setStartDate(startDt.toISOString().split('T')[0]);
      setStartTime(startDt.toTimeString().slice(0, 5));
      setAllDay(event.allDay);

      if (event.endAt) {
        const endDt = new Date(event.endAt);
        setEndDate(endDt.toISOString().split('T')[0]);
        setEndTime(endDt.toTimeString().slice(0, 5));
      }
    } else if (initialDate) {
      setStartDate(initialDate);
      setEndDate(initialDate);
      setEventType('event');
    }
  }, [event, initialDate]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      let startAt: string;
      let endAt: string | undefined;

      if (allDay) {
        startAt = `${startDate}T00:00:00Z`;
        if (endDate) {
          endAt = `${endDate}T23:59:59Z`;
        }
      } else {
        startAt = `${startDate}T${startTime}:00Z`;
        if (endDate && endTime) {
          endAt = `${endDate}T${endTime}:00Z`;
        }
      }

      if (isEditing && event) {
        const updateInput: UpdatePersonalEventInput = {
          title,
          description,
          startAt,
          endAt,
          allDay,
          event_type: eventType,
        };

        await updatePersonalCalendarEvent(userId, event.id, updateInput);
        onSaved();
      } else {
        const createInput: CreatePersonalEventInput = {
          title,
          description,
          startAt,
          endAt,
          allDay,
          event_type: eventType,
        };

        const createdEvent = await createPersonalCalendarEvent(userId, createInput);

        if (integrationType !== 'personal') {
          console.log(
            `[PersonalEventModal] Guardrails integration selected: ${integrationType}`
          );
          console.log('[PersonalEventModal] Integration via MindMesh V2 not yet implemented');
        }

        onSaved();
      }
    } catch (err) {
      console.error('[PersonalEventModal] Error saving event:', err);
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  // Render form content (shared between mobile and desktop)
  const renderFormContent = () => (
    <>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {isIntegrated && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            This event is part of a Guardrails project. Changes here will update your work
            calendar.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Optional details"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="allDay"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="allDay" className="text-sm font-medium text-gray-700">
          All-day event
        </label>
      </div>

      <EventTypeSelector
        value={eventType}
        onChange={setEventType}
        disabled={isIntegrated || isContextEvent}
      />

      <div className={`${isMobile ? 'grid grid-cols-1' : 'grid grid-cols-2'} gap-4`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {!allDay && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      <div className={`${isMobile ? 'grid grid-cols-1' : 'grid grid-cols-2'} gap-4`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {!allDay && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {canIntegrateWithGuardrails && (
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Should this affect your work projects?
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="integrationType"
                value="personal"
                checked={integrationType === 'personal'}
                onChange={(e) => setIntegrationType(e.target.value as IntegrationType)}
                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Personal only</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Keep this event private (default)
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="integrationType"
                value="roadmap_event"
                checked={integrationType === 'roadmap_event'}
                onChange={(e) => setIntegrationType(e.target.value as IntegrationType)}
                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Add to Guardrails as Roadmap Event
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Create a work commitment with dates
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="integrationType"
                value="task"
                checked={integrationType === 'task'}
                onChange={(e) => setIntegrationType(e.target.value as IntegrationType)}
                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Add to Guardrails as Task
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Create a task with this as the deadline
                </p>
              </div>
            </label>
          </div>

          {integrationType !== 'personal' && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                Note: Guardrails integration is not yet implemented. Your event will be created
                as personal-only for now.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Mobile: Bottom Sheet (Full-height 80-90vh per audit)
  if (isMobile) {
    const header = (
      <div className="flex items-center gap-3 flex-1">
        <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-2 py-1 text-base font-semibold text-gray-900 border-0 border-b-2 border-transparent focus:border-blue-500 focus:outline-none bg-transparent"
            placeholder="Event title"
          />
        </div>
        {isIntegrated && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded flex items-center gap-1 flex-shrink-0">
            <LinkIcon className="w-3 h-3" />
            Linked
          </span>
        )}
        {isContextEvent && event && (
          <div className="flex-shrink-0">
            <PermissionIndicator
              entityType="calendar_event"
              entityId={event.id}
              flags={event.permissions}
              canManage={canManageEvent}
            />
          </div>
        )}
      </div>
    );

    const footer = (
      <div className="flex gap-3 w-full">
        {isContextEvent && canManageEvent && (
          <button
            onClick={openSharing}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all font-medium flex items-center justify-center gap-2 min-h-[44px] flex-shrink-0"
            type="button"
          >
            <Share2 size={18} />
            Share
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 text-gray-700 font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all min-h-[44px]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={saving || !title || !startDate}
          className="flex-1 px-4 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEditing ? 'Save' : 'Create'}
        </button>
      </div>
    );

    return (
      <>
        <BottomSheet
          isOpen={true}
          onClose={onClose}
          header={header}
          footer={footer}
          maxHeight="90vh"
          closeOnBackdrop={!saving}
          preventClose={saving}
        >
          <div className="px-4 py-4 space-y-4">
            {renderFormContent()}
          </div>
        </BottomSheet>

        {sharingAdapter && (
          <SharingDrawer
            adapter={sharingAdapter}
            isOpen={isSharingOpen}
            onClose={closeSharing}
          />
        )}
      </>
    );
  }

  // Desktop: Centered modal (unchanged)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Event' : 'New Event'}
            </h2>
            {isIntegrated && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                Linked to Guardrails
              </span>
            )}
            {isContextEvent && event && (
              <PermissionIndicator
                entityType="calendar_event"
                entityId={event.id}
                flags={event.permissions}
                canManage={canManageEvent}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            {isContextEvent && canManageEvent && (
              <button
                onClick={openSharing}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                type="button"
              >
                <Share2 size={16} />
                Share
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {sharingAdapter && (
          <SharingDrawer
            adapter={sharingAdapter}
            isOpen={isSharingOpen}
            onClose={closeSharing}
          />
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Meeting with team"
            />
          </div>

          {renderFormContent()}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title || !startDate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

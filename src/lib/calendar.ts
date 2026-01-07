import { supabase } from './supabase';
import type {
  CalendarEvent,
  CalendarEventWithMembers,
  CreateEventData,
  UpdateEventData,
  CalendarFilters
} from './calendarTypes';

export async function getHouseholdEvents(
  householdId: string,
  startDate?: Date,
  endDate?: Date,
  filters?: CalendarFilters
): Promise<CalendarEventWithMembers[]> {
  let query = supabase
    .from('calendar_events')
    .select(`
      *,
      members:calendar_event_members(event_id, member_profile_id),
      member_profiles:calendar_event_members(
        member_profile_id,
        profiles:member_profile_id(id, full_name, email)
      )
    `)
    .eq('household_id', householdId)
    .order('start_at', { ascending: true });

  if (startDate) {
    query = query.gte('start_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('start_at', endDate.toISOString());
  }

  if (filters?.colors && filters.colors.length > 0) {
    query = query.in('color', filters.colors);
  }

  if (filters?.myEventsOnly) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      query = query.eq('created_by', user.id);
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  const events = (data || []).map((event: any) => {
    const memberProfiles = event.member_profiles
      ?.map((mp: any) => mp.profiles)
      .filter((p: any) => p) || [];

    return {
      ...event,
      member_profiles: memberProfiles
    };
  });

  if (filters?.memberIds && filters.memberIds.length > 0) {
    return events.filter((event: CalendarEventWithMembers) =>
      event.members?.some(m =>
        filters.memberIds?.includes(m.member_profile_id)
      )
    );
  }

  return events;
}

export async function getEvent(eventId: string): Promise<CalendarEventWithMembers | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      members:calendar_event_members(event_id, member_profile_id),
      member_profiles:calendar_event_members(
        member_profile_id,
        profiles:member_profile_id(id, full_name, email)
      )
    `)
    .eq('id', eventId)
    .single();

  if (error) throw error;

  if (!data) return null;

  const memberProfiles = data.member_profiles
    ?.map((mp: any) => mp.profiles)
    .filter((p: any) => p) || [];

  return {
    ...data,
    member_profiles: memberProfiles
  };
}

export async function createEvent(eventData: CreateEventData): Promise<CalendarEvent> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { member_ids, ...eventFields } = eventData;

  const { data: event, error: eventError } = await supabase
    .from('calendar_events')
    .insert({
      ...eventFields,
      created_by: user.id,
      description: eventFields.description || '',
      location: eventFields.location || '',
      all_day: eventFields.all_day || false,
      color: eventFields.color || 'blue',
      event_type: eventFields.event_type || 'event'
    })
    .select()
    .single();

  if (eventError) throw eventError;

  if (member_ids && member_ids.length > 0) {
    const memberInserts = member_ids.map(memberId => ({
      event_id: event.id,
      member_profile_id: memberId
    }));

    const { error: membersError } = await supabase
      .from('calendar_event_members')
      .insert(memberInserts);

    if (membersError) throw membersError;
  }

  return event;
}

export async function updateEvent(
  eventId: string,
  updates: UpdateEventData
): Promise<CalendarEvent> {
  const { member_ids, ...eventUpdates } = updates;

  const { data: event, error: eventError } = await supabase
    .from('calendar_events')
    .update(eventUpdates)
    .eq('id', eventId)
    .select()
    .single();

  if (eventError) throw eventError;

  if (member_ids !== undefined) {
    await supabase
      .from('calendar_event_members')
      .delete()
      .eq('event_id', eventId);

    if (member_ids.length > 0) {
      const memberInserts = member_ids.map(memberId => ({
        event_id: eventId,
        member_profile_id: memberId
      }));

      const { error: membersError } = await supabase
        .from('calendar_event_members')
        .insert(memberInserts);

      if (membersError) throw membersError;
    }
  }

  return event;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

export async function moveEvent(
  eventId: string,
  newStartDate: Date,
  newEndDate: Date
): Promise<CalendarEvent> {
  return updateEvent(eventId, {
    start_at: newStartDate.toISOString(),
    end_at: newEndDate.toISOString()
  });
}

export async function resizeEvent(
  eventId: string,
  newEndDate: Date
): Promise<CalendarEvent> {
  return updateEvent(eventId, {
    end_at: newEndDate.toISOString()
  });
}

export async function getUpcomingEvents(
  householdId: string,
  limit: number = 3
): Promise<CalendarEventWithMembers[]> {
  const now = new Date();
  const events = await getHouseholdEvents(householdId, now);
  return events.slice(0, limit);
}

export async function getEventsByDateRange(
  householdId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEventWithMembers[]> {
  return getHouseholdEvents(
    householdId,
    new Date(startDate),
    new Date(endDate)
  );
}

import { supabase } from '../supabase';
import { getCalendarExtrasForRange, type CalendarExtras } from '../calendar/calendarExtras';

import { FEATURE_CALENDAR_EXTRAS } from '../featureFlags';

/**
 * Feature flag for context-sovereign calendar integration
 * When true: Personal calendar includes accepted context projections
 * When false: Personal calendar shows only calendar_events table (existing behavior)
 */
const CONTEXT_CALENDAR_ENABLED = false; // TODO: Move to feature flags system

/**
 * Calendar Projection Permissions
 * 
 * ⚠️ CRITICAL: Permissions come ONLY from projection metadata.
 * Calendar views do NOT define permissions.
 * 
 * Re-export from canonical permission types.
 */
import type { PermissionFlags } from '../permissions/types';

export type CalendarProjectionPermissions = PermissionFlags;

/**
 * Calendar Event Types
 * Semantic types for calendar events (non-breaking, additive only)
 * Defaults to 'event' for backward compatibility
 */
export type CalendarEventType =
  | 'event'
  | 'meeting'
  | 'appointment'
  | 'time_block'
  | 'goal'
  | 'habit'
  | 'meal'
  | 'task'
  | 'reminder'
  | 'travel_segment'
  | 'milestone';

export interface PersonalCalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  sourceType: 'personal' | 'guardrails' | 'context';
  sourceEntityId: string | null;
  sourceProjectId: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Context projection metadata (only present when sourceType === 'context')
  contextId?: string;
  contextName?: string;
  contextType?: 'trip' | 'project' | 'personal' | 'shared_space';
  projectionId?: string;
  
  /**
   * Event scope (only present for context events)
   * - 'container': Multi-day container event
   * - 'item': Nested event inside a container
   */
  event_scope?: 'container' | 'item';
  
  /**
   * Parent container ID (only present for nested events)
   */
  parent_context_event_id?: string | null;
  
  /**
   * Event type (semantic classification)
   * Optional for backward compatibility - defaults to 'event' at runtime
   */
  event_type?: CalendarEventType;
  
  /**
   * Explicit permissions from projection metadata
   * Service layer enforces these - UI should never infer permissions
   * 
   * For own events (sourceType !== 'context'): full permissions
   * For projected events: permissions from projection
   */
  permissions?: CalendarProjectionPermissions;

  /**
   * Derived instance metadata (for habit instances, goal deadlines)
   * Only present when event is derived from activity schedules
   */
  is_derived_instance?: boolean;
  derived_type?: 'habit_instance' | 'task_instance' | 'goal_marker';
  activity_id?: string;
  schedule_id?: string;
  local_date?: string; // YYYY-MM-DD for habit instances
}

export interface CreatePersonalEventInput {
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  allDay?: boolean;
  event_type?: CalendarEventType;
}

export interface UpdatePersonalEventInput {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  event_type?: CalendarEventType;
}

export async function getPersonalCalendarEvents(userId: string): Promise<PersonalCalendarEvent[]> {
  // Fetch existing calendar_events (existing behavior)
  // Filter out hidden/removed projections (only show active projections)
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .or('projection_state.is.null,projection_state.eq.active')
    .order('start_at', { ascending: true });

  if (error) {
    console.error('[calendarService] Error fetching personal events:', error);
    throw error;
  }

  const existingEvents = data.map(mapDbToPersonalEvent);

  // If context calendar feature is disabled, return existing events only
  if (!CONTEXT_CALENDAR_ENABLED) {
    return existingEvents;
  }

  // Fetch accepted context projections
  try {
    const projectedEvents = await fetchAcceptedProjections(userId);
    
    // Merge and deduplicate (existing events take precedence)
    const eventMap = new Map<string, PersonalCalendarEvent>();
    
    // Add existing events first
    existingEvents.forEach(event => {
      eventMap.set(event.id, event);
    });
    
    // Add projected events (won't override existing)
    projectedEvents.forEach(event => {
      if (!eventMap.has(event.id)) {
        eventMap.set(event.id, event);
      }
    });
    
    // Convert to array and sort by start time
    return Array.from(eventMap.values()).sort((a, b) => {
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });
  } catch (projectionError) {
    console.error('[calendarService] Error fetching projections (non-fatal):', projectionError);
    // Return existing events if projection fetch fails
    return existingEvents;
  }
}

/**
 * Fetch accepted context projections for user
 * Only called when CONTEXT_CALENDAR_ENABLED is true
 * 
 * Personal calendar rules:
 * - Shows container events (macro time blocks)
 * - Shows nested events (micro detail items) - ONLY if projected to personal calendar
 * - Nested events are NEVER shown in shared calendars (filtered by target_space_id = null)
 */
async function fetchAcceptedProjections(userId: string): Promise<PersonalCalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_projections')
    .select(`
      id,
      scope,
      can_edit,
      detail_level,
      nested_scope,
      event:context_events(
        id,
        event_scope,
        parent_context_event_id,
        title,
        description,
        start_at,
        end_at,
        event_type,
        time_scope,
        created_by,
        context_id,
        context:contexts(
          id,
          name,
          type
        )
      )
    `)
    .eq('target_user_id', userId)
    .eq('status', 'accepted')
    .is('target_space_id', null);  // Personal calendar only (not shared space)

  if (error) {
    console.error('[calendarService] Error fetching accepted projections:', error);
    throw error;
  }

  if (!data) {
    return [];
  }

  // Map projections to PersonalCalendarEvent format
  return data
    .filter(p => p.event) // Only include projections with valid events
    .map(projection => {
      const event = projection.event as any;
      const context = event.context as any;
      
      // Determine allDay based on time_scope
      const allDay = event.time_scope === 'all_day';
      
      // Compute permissions from projection metadata
      const isOwner = event.created_by === userId;
      const canEdit = projection.can_edit ?? false;
      const detailLevel = projection.detail_level || (
        projection.scope === 'full' ? 'detailed' : 'overview'
      );
      const nestedScope = projection.nested_scope || 'container';
      
      // Map nested_scope to ShareScope
      const shareScope: 'this_only' | 'include_children' = 
        nestedScope === 'container+items' ? 'include_children' : 'this_only';
      
      const permissions: CalendarProjectionPermissions = {
        can_view: true,  // If projection is accepted, user can view
        can_comment: false,  // Calendar events don't support comments yet
        can_edit: isOwner || canEdit,  // Owner always can edit, others depend on projection
        can_manage: isOwner,  // Only owner can manage
        detail_level: detailLevel,
        scope: shareScope,
      };
      
      // Strip detail fields if detail_level === 'overview' (service layer enforcement)
      const title = event.title;
      const description = permissions.detail_level === 'detailed' 
        ? (event.description || null) 
        : null;
      
      // Default event_type to 'event' if not present (backward compatibility)
      const eventType: CalendarEventType = event.event_type ?? 'event';
      
      return {
        id: event.id,
        userId: userId,
        title,
        description,
        startAt: event.start_at,
        endAt: event.end_at,
        allDay: allDay,
        sourceType: 'context' as const,
        sourceEntityId: event.id,
        sourceProjectId: null,
        createdAt: event.created_at || new Date().toISOString(),
        updatedAt: event.updated_at || new Date().toISOString(),
        
        // Context projection metadata
        contextId: context.id,
        contextName: context.name,
        contextType: context.type,
        projectionId: projection.id,
        
        // Event scope info (for container/nested support)
        event_scope: event.event_scope,
        parent_context_event_id: event.parent_context_event_id,
        
        // Event type (with default)
        event_type: eventType,
        
        // Explicit permissions from projection
        permissions,
      };
    });
}

export async function getPersonalCalendarEvent(
  userId: string,
  eventId: string
): Promise<PersonalCalendarEvent | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[calendarService] Error fetching personal event:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapDbToPersonalEvent(data, userId);
}

export async function createPersonalCalendarEvent(
  userId: string,
  input: CreatePersonalEventInput
): Promise<PersonalCalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description || null,
      start_at: input.startAt,
      end_at: input.endAt || null,
      all_day: input.allDay || false,
      event_type: input.event_type || 'event', // Default to 'event' if not provided
      source_type: 'personal',
      source_entity_id: null,
      source_project_id: null,
    })
    .select()
    .single();

  if (error) {
    console.error('[calendarService] Error creating personal event:', error);
    throw error;
  }

  return mapDbToPersonalEvent(data, userId);
}

export async function updatePersonalCalendarEvent(
  userId: string,
  eventId: string,
  input: UpdatePersonalEventInput
): Promise<PersonalCalendarEvent> {
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.startAt !== undefined) updates.start_at = input.startAt;
  if (input.endAt !== undefined) updates.end_at = input.endAt;
  if (input.allDay !== undefined) updates.all_day = input.allDay;
  if (input.event_type !== undefined) updates.event_type = input.event_type;

  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', eventId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('[calendarService] Error updating personal event:', error);
    throw error;
  }

  return mapDbToPersonalEvent(data, userId);
}

export async function deletePersonalCalendarEvent(
  userId: string,
  eventId: string
): Promise<void> {
  // Check if this is an activity projection
  const { data: event } = await supabase
    .from('calendar_events')
    .select('activity_id, projection_state')
    .eq('id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (event?.activity_id) {
    // This is an activity projection - hide it instead of deleting
    const { error } = await supabase
      .from('calendar_events')
      .update({
        projection_state: 'hidden',
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('[calendarService] Error hiding activity projection:', error);
      throw error;
    }
  } else {
    // Standalone calendar event - can be deleted
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('[calendarService] Error deleting personal event:', error);
      throw error;
    }
  }
}

/**
 * Get personal events for date range with optional calendar extras
 */
export async function getPersonalEventsForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<PersonalCalendarEvent[]> {
  const result = await getPersonalEventsForDateRangeWithExtras(userId, startDate, endDate);
  return result.events;
}

/**
 * Get personal events with calendar extras (habits/goals)
 */
export async function getPersonalEventsForDateRangeWithExtras(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{
  events: PersonalCalendarEvent[];
  extras?: CalendarExtras;
}> {
  // Fetch existing calendar_events (existing behavior)
  // Filter out hidden/removed projections (only show active projections)
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_at', startDate)
    .lte('start_at', endDate)
    .or('projection_state.is.null,projection_state.eq.active')
    .order('start_at', { ascending: true });

  if (error) {
    console.error('[calendarService] Error fetching events for date range:', error);
    throw error;
  }

  const existingEvents = data.map(mapDbToPersonalEvent);

  // If context calendar feature is disabled, return existing events only
  if (!CONTEXT_CALENDAR_ENABLED) {
    // Get calendar extras if enabled
    let extras: CalendarExtras | undefined;
    if (FEATURE_CALENDAR_EXTRAS) {
      try {
        extras = await getCalendarExtrasForRange(userId, startDate, endDate);
      } catch (extrasError) {
        console.error('[calendarService] Error fetching calendar extras (non-fatal):', extrasError);
      }
    }
    return {
      events: existingEvents,
      extras,
    };
  }

  // Fetch accepted context projections for date range
  try {
    const projectedEvents = await fetchAcceptedProjectionsForDateRange(userId, startDate, endDate);
    
    // Merge and deduplicate
    const eventMap = new Map<string, PersonalCalendarEvent>();
    
    existingEvents.forEach(event => {
      eventMap.set(event.id, event);
    });
    
    projectedEvents.forEach(event => {
      if (!eventMap.has(event.id)) {
        eventMap.set(event.id, event);
      }
    });
    
    const sortedEvents = Array.from(eventMap.values()).sort((a, b) => {
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });

    // Get calendar extras if enabled (even with context calendar)
    if (FEATURE_CALENDAR_EXTRAS && !extras) {
      try {
        extras = await getCalendarExtrasForRange(userId, startDate, endDate);
      } catch (extrasError) {
        console.error('[calendarService] Error fetching calendar extras (non-fatal):', extrasError);
      }
    }

    // Convert habit instances to PersonalCalendarEvent format (derived instances)
    if (FEATURE_CALENDAR_EXTRAS && extras) {
      const derivedEvents: PersonalCalendarEvent[] = extras.habits.map(habit => ({
        id: habit.id,
        userId,
        title: habit.title,
        description: null,
        startAt: `${habit.local_date}T00:00:00Z`,
        endAt: null,
        allDay: true,
        sourceType: 'personal',
        sourceEntityId: habit.activity_id,
        sourceProjectId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        permissions: {
          can_view: true,
          can_comment: false,
          can_edit: true,
          can_manage: true,
          detail_level: 'detailed',
          scope: 'this_only',
        },
        event_type: 'habit',
        is_derived_instance: true,
        derived_type: 'habit_instance',
        activity_id: habit.activity_id,
        schedule_id: habit.schedule_id,
        local_date: habit.local_date,
      }));

      // Merge derived events with regular events
      sortedEvents.push(...derivedEvents);
      sortedEvents.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }

    return {
      events: sortedEvents,
      extras,
    };
  } catch (projectionError) {
    console.error('[calendarService] Error fetching projections for date range (non-fatal):', projectionError);
    
    // Get calendar extras even on error
    if (FEATURE_CALENDAR_EXTRAS && !extras) {
      try {
        extras = await getCalendarExtrasForRange(userId, startDate, endDate);
      } catch (extrasError) {
        console.error('[calendarService] Error fetching calendar extras (non-fatal):', extrasError);
      }
    }
    
    return {
      events: existingEvents,
      extras,
    };
  }
}

/**
 * Fetch accepted context projections for date range
 * Only called when CONTEXT_CALENDAR_ENABLED is true
 */
async function fetchAcceptedProjectionsForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<PersonalCalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_projections')
    .select(`
      id,
      scope,
      can_edit,
      detail_level,
      nested_scope,
      event:context_events!inner(
        id,
        event_scope,
        parent_context_event_id,
        title,
        description,
        start_at,
        end_at,
        event_type,
        time_scope,
        created_by,
        context_id,
        created_at,
        updated_at,
        context:contexts(
          id,
          name,
          type
        )
      )
    `)
    .eq('target_user_id', userId)
    .eq('status', 'accepted')
    .is('target_space_id', null)  // Personal calendar only (not shared space)
    .gte('event.start_at', startDate)
    .lte('event.start_at', endDate);

  if (error) {
    console.error('[calendarService] Error fetching projections for date range:', error);
    throw error;
  }

  if (!data) {
    return [];
  }

  return data
    .filter(p => p.event)
    .map(projection => {
      const event = projection.event as any;
      const context = event.context as any;
      
      const allDay = event.time_scope === 'all_day';
      
      // Compute permissions from projection metadata
      const isOwner = event.created_by === userId;
      const canEdit = projection.can_edit ?? false;
      const detailLevel = projection.detail_level || (
        projection.scope === 'full' ? 'detailed' : 'overview'
      );
      const nestedScope = projection.nested_scope || 'container';
      
      const shareScope: 'this_only' | 'include_children' = 
        nestedScope === 'container+items' ? 'include_children' : 'this_only';
      
      const permissions: CalendarProjectionPermissions = {
        can_view: true,  // If projection is accepted, user can view
        can_comment: false,  // Calendar events don't support comments yet
        can_edit: isOwner || canEdit,  // Owner always can edit, others depend on projection
        can_manage: isOwner,  // Only owner can manage
        detail_level: detailLevel,
        scope: shareScope,
      };
      
      // Strip detail fields if detail_level === 'overview' (service layer enforcement)
      const title = event.title;
      const description = permissions.detail_level === 'detailed' 
        ? (event.description || null) 
        : null;
      
      // Default event_type to 'event' if not present (backward compatibility)
      const eventType: CalendarEventType = event.event_type ?? 'event';
      
      return {
        id: event.id,
        userId: userId,
        title,
        description,
        startAt: event.start_at,
        endAt: event.end_at,
        allDay: allDay,
        sourceType: 'context' as const,
        sourceEntityId: event.id,
        sourceProjectId: null,
        createdAt: event.created_at || new Date().toISOString(),
        updatedAt: event.updated_at || new Date().toISOString(),
        contextId: context.id,
        contextName: context.name,
        contextType: context.type,
        projectionId: projection.id,
        event_scope: event.event_scope,
        parent_context_event_id: event.parent_context_event_id,
        event_type: eventType,
        permissions,
      };
    });
}

function mapDbToPersonalEvent(data: any, userId?: string): PersonalCalendarEvent {
  // Personal events always have full permissions for the owner
  const isOwner = userId ? data.user_id === userId : true;
  
  const permissions: CalendarProjectionPermissions = {
    can_view: true,
    can_comment: false, // Calendar events don't support comments yet
    can_edit: isOwner, // Owner can always edit their own events
    can_manage: isOwner, // Owner can manage their own events
    detail_level: 'detailed', // Own events always show full detail
    scope: 'this_only', // Personal events don't have nested children
  };
  
  // Default event_type to 'event' if not present (backward compatibility)
  const eventType: CalendarEventType = data.event_type ?? 'event';
  
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    description: data.description,
    startAt: data.start_at,
    endAt: data.end_at,
    allDay: data.all_day,
    sourceType: data.source_type || 'personal',
    sourceEntityId: data.source_entity_id,
    sourceProjectId: data.source_project_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    event_type: eventType, // Include event_type with default
    permissions, // Always include permissions
  };
}

// ============================================================================
// Context Projection Management
// ============================================================================

export interface PendingProjection {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDescription: string | null;
  eventStartAt: string;
  eventEndAt: string | null;
  contextId: string;
  contextName: string;
  contextType: 'trip' | 'project' | 'personal' | 'shared_space';
  createdAt: string;
}

/**
 * Get pending projections for user (awaiting acceptance)
 * Only available when CONTEXT_CALENDAR_ENABLED is true
 */
export async function getPendingProjections(userId: string): Promise<PendingProjection[]> {
  if (!CONTEXT_CALENDAR_ENABLED) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('calendar_projections')
      .select(`
        id,
        created_at,
        event:context_events(
          id,
          title,
          description,
          start_at,
          end_at,
          context_id,
          context:contexts(
            id,
            name,
            type
          )
        )
      `)
      .eq('target_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[calendarService] Error fetching pending projections:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data
      .filter(p => p.event)
      .map(projection => {
        const event = projection.event as any;
        const context = event.context as any;
        
        return {
          id: projection.id,
          eventId: event.id,
          eventTitle: event.title,
          eventDescription: event.description,
          eventStartAt: event.start_at,
          eventEndAt: event.end_at,
          contextId: context.id,
          contextName: context.name,
          contextType: context.type,
          createdAt: projection.created_at,
        };
      });
  } catch (err) {
    console.error('[calendarService] Error fetching pending projections:', err);
    return [];
  }
}

/**
 * Accept a projection (add event to personal calendar)
 */
export async function acceptProjection(projectionId: string): Promise<void> {
  if (!CONTEXT_CALENDAR_ENABLED) {
    throw new Error('Context calendar feature is not enabled');
  }

  const { error } = await supabase
    .from('calendar_projections')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', projectionId);

  if (error) {
    console.error('[calendarService] Error accepting projection:', error);
    throw error;
  }
}

/**
 * Decline a projection (reject event from personal calendar)
 */
export async function declineProjection(projectionId: string): Promise<void> {
  if (!CONTEXT_CALENDAR_ENABLED) {
    throw new Error('Context calendar feature is not enabled');
  }

  const { error } = await supabase
    .from('calendar_projections')
    .update({
      status: 'declined',
      declined_at: new Date().toISOString(),
    })
    .eq('id', projectionId);

  if (error) {
    console.error('[calendarService] Error declining projection:', error);
    throw error;
  }
}

/**
 * Pantry Locations Service
 * 
 * Manages pantry locations (e.g. Fridge, Freezer, Cupboard) scoped to spaces.
 * Lightweight spatial organization without inventory pressure.
 * 
 * ADHD-First Principles:
 * - No pressure or required fields
 * - All actions are optional
 * - Locations are memory aids, not management tools
 * 
 * Ownership Invariant:
 * - exactly one of profile_id (personal) OR household_id (household)
 * - never both
 * - never neither
 * - ownership must match space context
 */

import { supabase } from './supabase';
import { getProfileIdFromAuthUserId } from './recipeGeneratorService';

export interface PantryLocation {
  id: string;
  space_id: string;
  profile_id: string | null; // For personal spaces
  household_id: string | null; // For household spaces
  name: string;
  icon: string | null;
  order_index: number;
  created_by: string | null;
  created_at: string;
}

/**
 * Require authenticated user before performing authenticated operations
 * Single source of truth for auth readiness checks
 */
async function requireAuthenticatedUser(): Promise<{ id: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error(
      '[pantry_locations] Attempted to perform authenticated operation before auth was ready'
    );
  }
  return data.user;
}

/**
 * Resolve ownership for a pantry location based on space type
 * Returns exactly one of: profile_id (personal) OR household_id (household)
 * 
 * Invariant:
 * - Spaces are NOT households
 * - Household ownership is always via space.context_id
 * - Invalid household references are legacy data and must degrade safely
 * 
 * CRITICAL: household_id must come from space.context_id, NOT space.id
 * Spaces are not households - context_id references the actual household
 * 
 * @param space - Space object with context_type and context_id
 * @param authUid - Authenticated user ID
 * @returns Ownership object with exactly one of profile_id or household_id set
 */
async function resolvePantryLocationOwnership(
  space: { id: string; context_type: string; context_id: string | null },
  authUid: string
): Promise<{ profile_id: string | null; household_id: string | null }> {
  if (space.context_type === 'household') {
    // Household location: use household_id from space.context_id (NOT space.id)
    if (!space.context_id) {
      // Invalid state: household space with null context_id
      // Gracefully downgrade to personal ownership
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[pantry_locations] Household space ${space.id} has null context_id. ` +
          'Downgrading to personal ownership.'
        );
      }
      
      // Resolve as personal location
      const profileId = await getProfileIdFromAuthUserId(authUid);
      if (!profileId) {
        throw new Error('[pantry_locations] Profile not found for authenticated user');
      }
      return {
        profile_id: profileId,
        household_id: null,
      };
    }

    // Validate that context_id references an existing household space
    // For household spaces, context_id = space.id (self-reference)
    // So we check if a space exists with id = context_id and context_type = 'household'
    const { data: householdSpace, error: householdError } = await supabase
      .from('spaces')
      .select('id, context_type')
      .eq('id', space.context_id)
      .eq('context_type', 'household')
      .maybeSingle();

    if (householdError) {
      // Database error - log but don't crash, downgrade to personal
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[pantry_locations] Failed to validate household space ${space.context_id}: ${householdError.message}. ` +
          'Downgrading to personal ownership.'
        );
      }
      
      // Resolve as personal location
      const profileId = await getProfileIdFromAuthUserId(authUid);
      if (!profileId) {
        throw new Error('[pantry_locations] Profile not found for authenticated user');
      }
      return {
        profile_id: profileId,
        household_id: null,
      };
    }

    if (!householdSpace) {
      // Invalid state: household space doesn't exist (legacy data)
      // Gracefully downgrade to personal ownership
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[pantry_locations] Household space ${space.context_id} referenced by space ${space.id} does not exist. ` +
          'This is likely legacy data. Downgrading to personal ownership.'
        );
      }
      
      // Resolve as personal location
      const profileId = await getProfileIdFromAuthUserId(authUid);
      if (!profileId) {
        throw new Error('[pantry_locations] Profile not found for authenticated user');
      }
      return {
        profile_id: profileId,
        household_id: null,
      };
    }

    // Validate household membership explicitly (pre-insert check)
    // This ensures failures happen before hitting RLS
    const { data: membershipCheck, error: membershipError } = await supabase
      .rpc('is_user_household_member', { hid: space.context_id });

    if (membershipError) {
      // RPC error - log but don't crash, downgrade to personal
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[pantry_locations] Failed to check household membership: ${membershipError.message}. ` +
          'Downgrading to personal ownership.'
        );
      }
      
      // Resolve as personal location
      const profileId = await getProfileIdFromAuthUserId(authUid);
      if (!profileId) {
        throw new Error('[pantry_locations] Profile not found for authenticated user');
      }
      return {
        profile_id: profileId,
        household_id: null,
      };
    }

    if (!membershipCheck) {
      // User is not a member - this is a security check, throw error
      throw new Error(
        `[pantry_locations] User is not a member of household ${space.context_id} associated with space ${space.id}. ` +
        'Cannot create pantry location without household membership.'
      );
    }

    // All validations passed - return household ownership
    return {
      household_id: space.context_id, // Use context_id, NOT space.id
      profile_id: null,
    };
  } else {
    // Personal location: resolve profile_id from auth user
    const profileId = await getProfileIdFromAuthUserId(authUid);
    if (!profileId) {
      throw new Error('[pantry_locations] Profile not found for authenticated user');
    }
    return {
      profile_id: profileId,
      household_id: null,
    };
  }
}

/**
 * Validate pantry location ownership before insert
 * Ensures exactly one of profile_id or household_id is set
 * 
 * @param insertData - Insert payload to validate
 * @throws Error if ownership is invalid
 */
function validatePantryLocationOwnership(insertData: {
  profile_id?: string | null;
  household_id?: string | null;
}): void {
  const hasProfileId = insertData.profile_id !== null && insertData.profile_id !== undefined;
  const hasHouseholdId = insertData.household_id !== null && insertData.household_id !== undefined;

  if (hasProfileId && hasHouseholdId) {
    throw new Error(
      '[pantry_locations] Invalid ownership: both profile_id and household_id cannot be set. ' +
      'Exactly one must be set, never both.'
    );
  }

  if (!hasProfileId && !hasHouseholdId) {
    throw new Error(
      '[pantry_locations] Invalid ownership: neither profile_id nor household_id is set. ' +
      'Exactly one must be set, never neither.'
    );
  }
}

export interface CreatePantryLocationParams {
  spaceId: string;
  name: string;
  icon?: string;
}

export interface UpdatePantryLocationParams {
  name?: string;
  icon?: string;
  order_index?: number;
}

/**
 * Get all pantry locations for a space
 */
export async function getPantryLocations(spaceId: string): Promise<PantryLocation[]> {
  const { data, error } = await supabase
    .from('pantry_locations')
    .select('*')
    .eq('space_id', spaceId)
    .order('order_index', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new pantry location
 * 
 * Note: If a location with the same name already exists for this space,
 * this will throw a unique constraint error. Use ensureDefaultLocations
 * for idempotent default creation.
 */
export async function createPantryLocation(
  params: CreatePantryLocationParams
): Promise<PantryLocation> {
  // 1️⃣ HARD AUTH GATE: Block ALL inserts until auth is ready
  // This ensures auth.uid() is available in RLS policies
  const user = await requireAuthenticatedUser();
  const authUid = user.id;

  // 2️⃣ Resolve space and ownership explicitly
  // Fetch full space record to get id, context_type and context_id
  const { data: space } = await supabase
    .from('spaces')
    .select('id, context_type, context_id')
    .eq('id', params.spaceId)
    .maybeSingle();

  if (!space) {
    throw new Error(`[pantry_locations] Space ${params.spaceId} not found`);
  }

  // 3️⃣ Resolve ownership explicitly (exactly one of profile_id OR household_id)
  // CRITICAL: household_id comes from space.context_id, NOT space.id
  // Spaces are not households - context_id references the actual household
  const ownership = await resolvePantryLocationOwnership(space, authUid);

  // 4️⃣ Construct insert payload with explicit ownership
  const insertData: {
    space_id: string;
    profile_id: string | null;
    household_id: string | null;
    name: string;
    icon: string | null;
    order_index: number;
  } = {
    space_id: params.spaceId,
    ...ownership,
    name: params.name,
    icon: params.icon || null,
    order_index: 0, // Will be updated below
  };

  // 5️⃣ Validate ownership before insert
  validatePantryLocationOwnership(insertData);

  // Get the next order_index
  const existingLocations = await getPantryLocations(params.spaceId);
  insertData.order_index = existingLocations.length > 0
    ? Math.max(...existingLocations.map(l => l.order_index)) + 1
    : 0;

  // 6️⃣ Insert with explicit ownership
  // Dev-only diagnostic logging
  if (process.env.NODE_ENV === 'development') {
    console.debug('[pantry_locations insert]', {
      spaceId: params.spaceId,
      spaceContextType: space.context_type,
      spaceContextId: space.context_id,
      resolvedOwnership: ownership,
      insertData: {
        space_id: insertData.space_id,
        profile_id: insertData.profile_id,
        household_id: insertData.household_id,
        name: insertData.name,
      },
    });
  }

  const { data, error } = await supabase
    .from('pantry_locations')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    // Check if this is a conflict error (unique constraint violation)
    // These are expected in concurrent scenarios and should be handled by the caller
    const isConflictError = 
      error?.code === '23505' || 
      error?.code === 'PGRST204' || 
      error?.status === 409 ||
      error?.statusCode === 409 ||
      (error?.message && (
        error.message.includes('unique constraint') ||
        error.message.includes('duplicate key') ||
        error.message.includes('already exists') ||
        error.message.toLowerCase().includes('conflict')
      ));

    // Only log non-conflict errors (conflict errors are expected and handled by callers)
    if (!isConflictError) {
      console.error('[pantry_locations] Insert failed:', {
        error,
        insertData: {
          space_id: insertData.space_id,
          profile_id: insertData.profile_id,
          household_id: insertData.household_id,
          name: insertData.name,
        },
      });
    }
    throw error;
  }

  return data;
}

/**
 * Update a pantry location
 */
export async function updatePantryLocation(
  id: string,
  updates: UpdatePantryLocationParams
): Promise<PantryLocation> {
  const { data, error } = await supabase
    .from('pantry_locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a pantry location
 * Items with this location will have location_id set to NULL (handled by FK constraint)
 */
export async function deletePantryLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from('pantry_locations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reorder locations
 */
export async function reorderPantryLocations(
  spaceId: string,
  locationIds: string[]
): Promise<PantryLocation[]> {
  // Update order_index for each location
  const updates = locationIds.map((id, index) => ({
    id,
    order_index: index,
  }));

  for (const update of updates) {
    await updatePantryLocation(update.id, { order_index: update.order_index });
  }

  return getPantryLocations(spaceId);
}

/**
 * Ensure default locations exist for a space
 * Creates default locations silently if none exist
 * This is called automatically on first pantry load
 * 
 * Idempotent: Safe to call multiple times, handles conflicts gracefully
 */
export async function ensureDefaultLocations(spaceId: string): Promise<PantryLocation[]> {
  // Always refresh locations first to handle concurrent calls
  let existingLocations = await getPantryLocations(spaceId);

  // If locations already exist, return them
  if (existingLocations.length > 0) {
    return existingLocations;
  }

  // Create default locations silently
  // Handle race conditions (multiple simultaneous calls)
  const defaults = [
    { name: 'Fridge', icon: '🧊' },
    { name: 'Freezer', icon: '❄️' },
    { name: 'Cupboard', icon: '🧺' },
  ];

  const created: PantryLocation[] = [];
  for (let i = 0; i < defaults.length; i++) {
    try {
      // Re-check existing locations on each iteration to catch concurrent creations
      const currentLocations = await getPantryLocations(spaceId);
      const existing = currentLocations.find(l => l.name === defaults[i].name);
      if (existing) {
        created.push(existing);
        continue;
      }

      const location = await createPantryLocation({
        spaceId,
        name: defaults[i].name,
        icon: defaults[i].icon,
      });
      created.push(location);
    } catch (error: any) {
      // Handle unique constraint violation (23505) or PostgREST conflict (409/PGRST204) gracefully
      // This can happen if another process created the location simultaneously
      // The unique constraint on (space_id, name) prevents duplicates
      const isConflictError = 
        error?.code === '23505' || 
        error?.code === 'PGRST204' || 
        error?.status === 409 ||
        error?.statusCode === 409 ||
        (error?.message && (
          error.message.includes('unique constraint') ||
          error.message.includes('duplicate key') ||
          error.message.includes('already exists') ||
          error.message.toLowerCase().includes('conflict')
        ));

      if (isConflictError) {
        // Location was created by another process, fetch it
        try {
          const refreshed = await getPantryLocations(spaceId);
          const found = refreshed.find(l => l.name === defaults[i].name);
          if (found) {
            created.push(found);
          }
        } catch (refreshError) {
          // If refresh fails, silently continue - location might not exist yet
          // This is still idempotent behavior
        }
        // Silently continue - this is expected in concurrent scenarios
        // No error thrown - idempotent behavior
      } else {
        // Re-throw unexpected errors
        throw error;
      }
    }
  }

  // Return all locations (may include ones created by concurrent calls)
  return getPantryLocations(spaceId);
}

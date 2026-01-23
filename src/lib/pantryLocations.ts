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
 */

import { supabase } from './supabase';

export interface PantryLocation {
  id: string;
  space_id: string;
  name: string;
  icon: string | null;
  order_index: number;
  created_by: string | null;
  created_at: string;
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
  // Get the next order_index
  const existingLocations = await getPantryLocations(params.spaceId);
  const nextOrderIndex = existingLocations.length > 0
    ? Math.max(...existingLocations.map(l => l.order_index)) + 1
    : 0;

  const { data, error } = await supabase
    .from('pantry_locations')
    .insert({
      space_id: params.spaceId,
      name: params.name,
      icon: params.icon || null,
      order_index: nextOrderIndex,
    })
    .select()
    .single();

  if (error) throw error;
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

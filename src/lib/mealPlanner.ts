import { supabase } from './supabase';

export interface MealLibraryItem {
  id: string;
  name: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  categories: string[];
  cuisine: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  prep_time: number | null;
  cook_time: number | null;
  servings: number;
  ingredients: Array<{ 
    food_item_id?: string; // Preferred - use this
    name?: string; // Deprecated - kept for backward compatibility
    quantity: string; 
    unit: string;
    optional?: boolean;
  }>;
  instructions: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  allergies: string[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

import type { Recipe } from './recipeGeneratorTypes';

export interface MealPlan {
  id: string;
  space_id: string;
  household_id?: string; // Alternative name for space_id
  meal_id: string | null;
  recipe_id: string | null; // New: support for recipe_id
  custom_meal_name: string | null;
  meal_source?: 'recipe' | 'meal_library' | 'external' | 'custom'; // Source type
  external_name?: string | null; // Name of external meal (shop/restaurant)
  external_vendor?: string | null; // Vendor/source (e.g., "Tesco", "Nando's")
  external_type?: 'restaurant' | 'shop' | 'cafe' | 'takeaway' | 'other' | null; // Type of external meal
  is_prepared?: boolean; // Whether meal requires preparation (false for external)
  scheduled_at?: string | null; // Optional specific time for meal
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  day_of_week: number;
  week_start_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  meal?: MealLibraryItem;
  recipe?: Recipe; // New: recipe data when recipe_id is set
}

export interface MealFavourite {
  id: string;
  meal_id: string | null;
  recipe_id: string | null; // New: support for recipe_id
  space_id: string;
  household_id?: string; // Alternative name for space_id
  user_id: string;
  vote_count: number;
  created_at: string;
  meal?: MealLibraryItem;
  recipe?: Recipe; // New: recipe data when recipe_id is set
}

export async function getMealLibrary(filters?: {
  mealType?: string;
  categories?: string[];
  searchQuery?: string;
}): Promise<MealLibraryItem[]> {
  let query = supabase.from('meal_library').select('*');

  if (filters?.mealType) {
    query = query.eq('meal_type', filters.mealType);
  }

  if (filters?.categories && filters.categories.length > 0) {
    query = query.overlaps('categories', filters.categories);
  }

  if (filters?.searchQuery) {
    query = query.ilike('name', `%${filters.searchQuery}%`);
  }

  query = query.order('name', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

export async function getMealById(mealId: string): Promise<MealLibraryItem | null> {
  const { data, error } = await supabase
    .from('meal_library')
    .select('*')
    .eq('id', mealId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function getWeeklyMealPlan(
  householdId: string,
  weekStartDate: string
): Promise<MealPlan[]> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select(`
      *,
      meal:meal_id (*),
      recipe:recipe_id (*)
    `)
    .eq('space_id', householdId)
    .eq('week_start_date', weekStartDate)
    .order('day_of_week', { ascending: true })
    .order('meal_type', { ascending: true });

  if (error) throw error;

  return data || [];
}

/**
 * Verify that a mealId exists in meal_library table
 * This prevents foreign key violations when mealId is set
 */
async function verifyMealExists(mealId: string): Promise<boolean> {
  if (!mealId || mealId.trim() === '') {
    return false;
  }

  const { data, error } = await supabase
    .from('meal_library')
    .select('id')
    .eq('id', mealId)
    .maybeSingle();

  if (error) {
    console.error('[verifyMealExists] Error checking meal:', error);
    return false;
  }

  return !!data;
}

export async function addMealToPlan(
  householdId: string,
  mealId: string | null,
  customMealName: string | null,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  dayOfWeek: number,
  weekStartDate: string,
  createdBy: string,
  recipeId?: string | null // New: optional recipe_id parameter
): Promise<MealPlan> {
  // Defensive validation: if mealId is provided, verify it exists in meal_library
  if (mealId !== null && mealId !== undefined && mealId.trim() !== '') {
    const mealExists = await verifyMealExists(mealId);
    if (!mealExists) {
      throw new Error(
        `[addMealToPlan] Invalid mealId "${mealId}": not found in meal_library. ` +
        `meal_id must only reference meal_library.id. ` +
        `If adding a recipe, use recipeId parameter instead. ` +
        `If adding a custom meal, use customMealName parameter instead.`
      );
    }
  }

  const { data: existing } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('space_id', householdId)
    .eq('week_start_date', weekStartDate)
    .eq('day_of_week', dayOfWeek)
    .eq('meal_type', mealType)
    .maybeSingle();

  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  // Prioritize recipe_id over meal_id if both are provided
  // Ensure at least one of meal_id, recipe_id, or custom_meal_name is set (constraint requirement)
  // Always explicitly set both to null first, then set the appropriate one
  updateData.meal_id = null;
  updateData.recipe_id = null;
  
  if (recipeId !== undefined && recipeId !== null && recipeId.trim() !== '') {
    updateData.recipe_id = recipeId;
    // meal_id already set to null above
  } else if (mealId !== null && mealId !== undefined && mealId.trim() !== '') {
    updateData.meal_id = mealId;
    // recipe_id already set to null above
  }
  // custom_meal_name can be set regardless (it's part of the constraint check)
  updateData.custom_meal_name = customMealName || null;

  console.log('[addMealToPlan] Update data for existing record:', JSON.stringify(updateData, null, 2));

  if (existing) {
    const { data, error } = await supabase
      .from('meal_plans')
      .update(updateData)
      .eq('id', existing.id)
      .select(`
        *,
        meal:meal_id (*),
        recipe:recipe_id (*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Build insert data with explicit null handling
  const insertData: any = {
    space_id: householdId,
    meal_type: mealType,
    day_of_week: dayOfWeek,
    week_start_date: weekStartDate,
    created_by: createdBy,
    // Explicitly set all three fields to ensure constraint is satisfied
    meal_id: null,
    recipe_id: null,
    custom_meal_name: customMealName || null,
  };

  // Prioritize recipe_id over meal_id if both are provided
  // Ensure at least one of meal_id, recipe_id, or custom_meal_name is set (constraint requirement)
  if (recipeId !== undefined && recipeId !== null && recipeId.trim() !== '') {
    insertData.recipe_id = recipeId;
    insertData.meal_id = null; // Explicitly null
  } else if (mealId !== null && mealId !== undefined && mealId.trim() !== '') {
    insertData.meal_id = mealId;
    insertData.recipe_id = null; // Explicitly null
  } else if (customMealName && customMealName.trim() !== '') {
    // If neither recipe_id nor meal_id, ensure custom_meal_name is set
    insertData.meal_id = null;
    insertData.recipe_id = null;
  } else {
    // Fallback: if nothing is provided, this will fail the constraint
    throw new Error('Cannot create meal plan: must provide recipe_id, meal_id, or custom_meal_name');
  }

  console.log('[addMealToPlan] Insert data:', {
    space_id: insertData.space_id,
    meal_id: insertData.meal_id,
    recipe_id: insertData.recipe_id,
    custom_meal_name: insertData.custom_meal_name,
    meal_type: insertData.meal_type,
    day_of_week: insertData.day_of_week,
    week_start_date: insertData.week_start_date,
  });

  console.log('[addMealToPlan] Final insert data before database:', JSON.stringify(insertData, null, 2));

  const { data, error } = await supabase
    .from('meal_plans')
    .insert(insertData)
    .select(`
      *,
      meal:meal_id (*),
      recipe:recipe_id (*)
    `)
    .single();

  if (error) {
    console.error('[addMealToPlan] Insert failed:', {
      error,
      insertData,
      recipeId,
      mealId,
      customMealName,
    });
    throw error;
  }

  return data;
}

/**
 * Add a recipe to meal plan (convenience function)
 */
export async function addRecipeToPlan(
  householdId: string,
  recipeId: string,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  dayOfWeek: number,
  weekStartDate: string,
  createdBy: string
): Promise<MealPlan> {
  // Validate recipeId is provided
  if (!recipeId || recipeId.trim() === '') {
    throw new Error('recipeId is required to add a recipe to meal plan');
  }

  return addMealToPlan(
    householdId,
    null, // mealId - not used when adding a recipe
    null, // customMealName - not used when adding a recipe
    mealType,
    dayOfWeek,
    weekStartDate,
    createdBy,
    recipeId // This will be used
  );
}

export async function removeMealFromPlan(mealPlanId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('id', mealPlanId);

  if (error) throw error;
}

/**
 * Add an external meal (bought/restaurant) to meal plan
 */
export async function addExternalMealToPlan({
  name,
  vendor,
  type,
  mealType,
  dayOfWeek,
  weekStartDate,
  profileId,
  householdId,
  scheduledAt,
  notes,
}: {
  name: string;
  vendor?: string | null;
  type: 'restaurant' | 'shop' | 'cafe' | 'takeaway' | 'other';
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dayOfWeek: number;
  weekStartDate: string;
  profileId: string;
  householdId: string;
  scheduledAt?: string | null; // Optional specific time
  notes?: string | null;
}): Promise<MealPlan> {
  if (!name || name.trim() === '') {
    throw new Error('External meal name is required');
  }

  // Check for existing meal at this slot
  const { data: existing } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('space_id', householdId)
    .eq('week_start_date', weekStartDate)
    .eq('day_of_week', dayOfWeek)
    .eq('meal_type', mealType)
    .maybeSingle();

  const mealData: any = {
    space_id: householdId,
    meal_source: 'external',
    external_name: name.trim(),
    external_vendor: vendor?.trim() || null,
    external_type: type,
    is_prepared: false, // External meals are not prepared by user
    meal_type: mealType,
    day_of_week: dayOfWeek,
    week_start_date: weekStartDate,
    scheduled_at: scheduledAt || null,
    notes: notes || null,
    created_by: profileId,
    // Explicitly set other fields to null for external meals
    meal_id: null,
    recipe_id: null,
    custom_meal_name: null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // Update existing meal
    const { data, error } = await supabase
      .from('meal_plans')
      .update(mealData)
      .eq('id', existing.id)
      .select(`
        *,
        meal:meal_id (*),
        recipe:recipe_id (*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Insert new meal
  const { data, error } = await supabase
    .from('meal_plans')
    .insert(mealData)
    .select(`
      *,
      meal:meal_id (*),
      recipe:recipe_id (*)
    `)
    .single();

  if (error) {
    console.error('[addExternalMealToPlan] Insert failed:', {
      error,
      mealData,
    });
    throw error;
  }

  return data;
}

export async function getHouseholdFavourites(householdId: string): Promise<MealFavourite[]> {
  const { data, error } = await supabase
    .from('meal_favourites')
    .select(`
      *,
      meal:meal_id (*),
      recipe:recipe_id (*)
    `)
    .eq('space_id', householdId)
    .order('vote_count', { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Get current user's favorites (both meals and recipes) for a space
 * Uses the current authenticated user's profile ID
 */
export async function getCurrentUserFavourites(spaceId: string, userId?: string): Promise<MealFavourite[]> {
  // If userId is provided, use it; otherwise fetch from auth context
  let profileId = userId;
  
  if (!profileId) {
    // Get current user's profile ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!profile) return [];
    profileId = profile.id;
  }

  const { data, error } = await supabase
    .from('meal_favourites')
    .select(`
      *,
      meal:meal_id (*),
      recipe:recipe_id (*)
    `)
    .eq('user_id', profileId)
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getCurrentUserFavourites] Error fetching favorites:', error);
    throw error;
  }

  return data || [];
}

export async function toggleMealFavourite(
  mealId: string,
  householdId: string,
  userId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('meal_favourites')
    .select('id')
    .eq('meal_id', mealId)
    .eq('space_id', householdId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('meal_favourites')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('meal_favourites')
    .insert({
      meal_id: mealId,
      space_id: householdId,
      user_id: userId,
      vote_count: 1
    });

  if (error) throw error;
  return true;
}

/**
 * Toggle recipe favorite (convenience function)
 */
export async function toggleRecipeFavourite(
  recipeId: string,
  householdId: string,
  userId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('meal_favourites')
    .select('id')
    .eq('recipe_id', recipeId)
    .eq('space_id', householdId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('meal_favourites')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('meal_favourites')
    .insert({
      recipe_id: recipeId,
      space_id: householdId,
      user_id: userId,
      vote_count: 1
    });

  if (error) throw error;
  return true;
}

export async function isMealFavourite(
  mealId: string,
  householdId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('meal_favourites')
    .select('id')
    .eq('meal_id', mealId)
    .eq('space_id', householdId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

/**
 * Check if recipe is favorited
 */
export async function isRecipeFavourite(
  recipeId: string,
  householdId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('meal_favourites')
    .select('id')
    .eq('recipe_id', recipeId)
    .eq('space_id', householdId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

export function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayOfWeek] || '';
}

export function getMealTypeLabel(mealType: string): string {
  const labels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack'
  };
  return labels[mealType] || mealType;
}

export function getCategoryBadgeColor(category: string): string {
  const colors: Record<string, string> = {
    home_cooked: 'bg-blue-100 text-blue-800',
    healthy: 'bg-green-100 text-green-800',
    vegetarian: 'bg-emerald-100 text-emerald-800',
    vegan: 'bg-lime-100 text-lime-800',
    gluten_free: 'bg-amber-100 text-amber-800',
    high_protein: 'bg-red-100 text-red-800',
    budget_friendly: 'bg-purple-100 text-purple-800',
    takeaway: 'bg-orange-100 text-orange-800'
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    home_cooked: 'Home Cooked',
    healthy: 'Healthy',
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    gluten_free: 'Gluten Free',
    high_protein: 'High Protein',
    budget_friendly: 'Budget Friendly',
    takeaway: 'Takeaway'
  };
  return labels[category] || category;
}

export async function createCustomMeal(
  name: string,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  householdId: string,
  createdBy: string,
  options?: {
    categories?: string[];
    cuisine?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    ingredients?: Array<{ 
      food_item_id?: string;
      name?: string; // Deprecated - kept for backward compatibility
      quantity: string; 
      unit: string;
      optional?: boolean;
    }>;
    instructions?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    allergies?: string[];
    imageUrl?: string;
  }
): Promise<MealLibraryItem> {
  const { data, error } = await supabase
    .from('meal_library')
    .insert({
      name,
      meal_type: mealType,
      household_id: householdId,
      created_by: createdBy,
      is_public: false,
      categories: options?.categories || [],
      cuisine: options?.cuisine || null,
      difficulty: options?.difficulty || 'medium',
      prep_time: options?.prepTime || null,
      cook_time: options?.cookTime || null,
      servings: options?.servings || 4,
      ingredients: options?.ingredients || [],
      instructions: options?.instructions || null,
      calories: options?.calories || null,
      protein: options?.protein || null,
      carbs: options?.carbs || null,
      fat: options?.fat || null,
      allergies: options?.allergies || [],
      image_url: options?.imageUrl || null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomMeal(
  mealId: string,
  updates: {
    name?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    categories?: string[];
    cuisine?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    ingredients?: Array<{ 
      food_item_id?: string;
      name?: string; // Deprecated - kept for backward compatibility
      quantity: string; 
      unit: string;
      optional?: boolean;
    }>;
    instructions?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    allergies?: string[];
    imageUrl?: string;
  }
): Promise<MealLibraryItem> {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.name) updateData.name = updates.name;
  if (updates.mealType) updateData.meal_type = updates.mealType;
  if (updates.categories) updateData.categories = updates.categories;
  if (updates.cuisine !== undefined) updateData.cuisine = updates.cuisine;
  if (updates.difficulty) updateData.difficulty = updates.difficulty;
  if (updates.prepTime !== undefined) updateData.prep_time = updates.prepTime;
  if (updates.cookTime !== undefined) updateData.cook_time = updates.cookTime;
  if (updates.servings) updateData.servings = updates.servings;
  if (updates.ingredients) updateData.ingredients = updates.ingredients;
  if (updates.instructions !== undefined) updateData.instructions = updates.instructions;
  if (updates.calories !== undefined) updateData.calories = updates.calories;
  if (updates.protein !== undefined) updateData.protein = updates.protein;
  if (updates.carbs !== undefined) updateData.carbs = updates.carbs;
  if (updates.fat !== undefined) updateData.fat = updates.fat;
  if (updates.allergies) updateData.allergies = updates.allergies;
  if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;

  const { data, error } = await supabase
    .from('meal_library')
    .update(updateData)
    .eq('id', mealId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomMeal(mealId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_library')
    .delete()
    .eq('id', mealId);

  if (error) throw error;
}

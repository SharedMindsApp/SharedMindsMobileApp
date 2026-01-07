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
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
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

export interface MealPlan {
  id: string;
  space_id: string;
  meal_id: string | null;
  custom_meal_name: string | null;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  day_of_week: number;
  week_start_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  meal?: MealLibraryItem;
}

export interface MealFavourite {
  id: string;
  meal_id: string;
  space_id: string;
  user_id: string;
  vote_count: number;
  created_at: string;
  meal?: MealLibraryItem;
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
      meal:meal_id (*)
    `)
    .eq('space_id', householdId)
    .eq('week_start_date', weekStartDate)
    .order('day_of_week', { ascending: true })
    .order('meal_type', { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function addMealToPlan(
  householdId: string,
  mealId: string | null,
  customMealName: string | null,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  dayOfWeek: number,
  weekStartDate: string,
  createdBy: string
): Promise<MealPlan> {
  const { data: existing } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('space_id', householdId)
    .eq('week_start_date', weekStartDate)
    .eq('day_of_week', dayOfWeek)
    .eq('meal_type', mealType)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('meal_plans')
      .update({
        meal_id: mealId,
        custom_meal_name: customMealName,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select(`
        *,
        meal:meal_id (*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      space_id: householdId,
      meal_id: mealId,
      custom_meal_name: customMealName,
      meal_type: mealType,
      day_of_week: dayOfWeek,
      week_start_date: weekStartDate,
      created_by: createdBy
    })
    .select(`
      *,
      meal:meal_id (*)
    `)
    .single();

  if (error) throw error;

  return data;
}

export async function removeMealFromPlan(mealPlanId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('id', mealPlanId);

  if (error) throw error;
}

export async function getHouseholdFavourites(householdId: string): Promise<MealFavourite[]> {
  const { data, error } = await supabase
    .from('meal_favourites')
    .select(`
      *,
      meal:meal_id (*)
    `)
    .eq('space_id', householdId)
    .order('vote_count', { ascending: false });

  if (error) throw error;

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
    ingredients?: Array<{ name: string; quantity: string; unit: string }>;
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
    ingredients?: Array<{ name: string; quantity: string; unit: string }>;
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

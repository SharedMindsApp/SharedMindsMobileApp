import { supabase } from './supabase';
import { getOrCreateFoodItem, getFoodItemName, getFoodItemNames, type FoodItem } from './foodItems';

export interface GroceryTemplate {
  id: string;
  item_name: string;
  category: string;
  typical_quantity: string | null;
  keywords: string[];
  purchase_frequency_days: number | null;
  is_system_template: boolean;
  household_id: string | null;
}

export interface GroceryItem {
  id: string;
  household_id: string;
  shopping_list_id: string | null;
  food_item_id: string; // References food_items table
  item_name?: string; // Deprecated - kept for backward compatibility, use food_item.name
  quantity: string | null;
  unit: string | null;
  category: string;
  auto_categorized: boolean;
  checked: boolean;
  is_recurring: boolean;
  recurrence_days: number | null;
  last_purchased_date: string | null;
  estimated_price: number | null;
  notes: string | null;
  source: string | null;
  meal_plan_id: string | null;
  added_by: string | null;
  added_by_name: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined from food_items
  food_item?: FoodItem;
}

export interface ShoppingList {
  id: string;
  household_id: string;
  list_name: string;
  list_type: string;
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PantryItem {
  id: string;
  household_id: string;
  food_item_id: string; // References food_items table
  item_name?: string; // Deprecated - kept for backward compatibility, use food_item.name
  category: string;
  quantity: string | null; // Legacy - kept for backward compatibility
  unit: string | null; // Legacy - kept for backward compatibility
  quantity_value: string | null; // Preferred: natural language quantity (e.g. "3", "half", "a few")
  quantity_unit: string | null; // Preferred: unit (e.g. "tins", "packs", "kg")
  expiration_date: string | null; // Legacy - kept for backward compatibility
  expires_on: string | null; // Preferred: date (YYYY-MM-DD format)
  location: string | null; // Legacy: 'fridge' | 'freezer' | 'cupboard' (backward compatibility)
  location_id: string | null; // References pantry_locations table (preferred)
  status?: 'have' | 'low' | 'out'; // Optional status
  notes: string | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined from food_items
  food_item?: FoodItem;
  // Joined from pantry_locations
  pantry_location?: {
    id: string;
    name: string;
    icon: string | null;
    order_index: number;
  };
}

export interface SmartSuggestion {
  item_name: string;
  category: string;
  typical_quantity: string | null;
  days_since_last_purchase: number;
  purchase_frequency: number;
}

export interface PurchaseHistory {
  id: string;
  household_id: string;
  item_name: string;
  category: string;
  quantity: string | null;
  price: number | null;
  purchased_date: string;
  purchased_by: string | null;
  store_name: string | null;
}

export async function getOrCreateDefaultList(householdId: string, memberId?: string): Promise<ShoppingList> {
  const { data: existingList } = await supabase
    .from('household_shopping_lists')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_default', true)
    .maybeSingle();

  if (existingList) return existingList;

  const { data: newList, error } = await supabase
    .from('household_shopping_lists')
    .insert({
      household_id: householdId,
      list_name: 'Main Shopping List',
      list_type: 'regular',
      is_active: true,
      is_default: true,
      created_by: memberId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return newList;
}

export async function getGroceryItems(householdId: string, listId?: string): Promise<GroceryItem[]> {
  let query = supabase
    .from('household_grocery_list_items')
    .select(`
      *,
      food_item:food_items(*)
    `)
    .eq('household_id', householdId)
    .order('checked', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (listId) {
    query = query.eq('shopping_list_id', listId);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  // Map results to include food_item and ensure item_name is available for backward compatibility
  const items = (data || []).map((item: any) => ({
    ...item,
    food_item: item.food_item || null,
    item_name: item.food_item?.name || item.item_name || 'Unknown Item',
  }));
  
  return items;
}

export async function autoCategorizeItem(itemName: string): Promise<string> {
  const { data, error } = await supabase.rpc('auto_categorize_grocery_item', {
    item_name_input: itemName,
  });

  if (error) {
    console.warn('Auto-categorization failed:', error);
    return 'other';
  }

  return data || 'other';
}

export async function searchTemplates(query: string, limit: number = 10): Promise<GroceryTemplate[]> {
  const { data, error } = await supabase
    .from('household_grocery_templates')
    .select('*')
    .or(`item_name.ilike.%${query}%`)
    .eq('is_system_template', true)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getSmartSuggestions(householdId: string, limit: number = 10): Promise<SmartSuggestion[]> {
  const { data, error } = await supabase.rpc('get_smart_grocery_suggestions', {
    household_id_input: householdId,
    limit_count: limit,
  });

  if (error) {
    console.warn('Failed to get smart suggestions:', error);
    return [];
  }

  return data || [];
}

export async function addGroceryItem(params: {
  householdId: string;
  listId?: string;
  itemName?: string; // Deprecated - use foodItemId instead
  foodItemId?: string; // Preferred - use this
  quantity?: string;
  unit?: string;
  category?: string;
  notes?: string;
  isRecurring?: boolean;
  recurrenceDays?: number;
  estimatedPrice?: number;
  source?: string;
  memberId?: string;
  memberName?: string;
}): Promise<GroceryItem> {
  // Get or create food item
  let foodItemId: string;
  if (params.foodItemId) {
    foodItemId = params.foodItemId;
  } else if (params.itemName) {
    // Backward compatibility - create food item from name
    const foodItem = await getOrCreateFoodItem(params.itemName, params.category);
    foodItemId = foodItem.id;
  } else {
    throw new Error('Either foodItemId or itemName must be provided');
  }

  // Get food item to determine category if not provided
  const foodItem = await supabase
    .from('food_items')
    .select('category')
    .eq('id', foodItemId)
    .single();

  let category = params.category || foodItem.data?.category;
  let autoCategorized = false;

  if (!category) {
    // Fallback to auto-categorization if needed
    const foodItemName = await getFoodItemName(foodItemId);
    category = await autoCategorizeItem(foodItemName);
    autoCategorized = true;
  }

  const { data, error } = await supabase
    .from('household_grocery_list_items')
    .insert({
      household_id: params.householdId,
      shopping_list_id: params.listId || null,
      food_item_id: foodItemId,
      item_name: null, // No longer storing item_name directly
      quantity: params.quantity || null,
      unit: params.unit || null,
      category: category,
      auto_categorized: autoCategorized,
      notes: params.notes || null,
      is_recurring: params.isRecurring || false,
      recurrence_days: params.recurrenceDays || null,
      estimated_price: params.estimatedPrice || null,
      source: params.source || 'manual',
      added_by: params.memberId ? params.memberId : null,
      added_by_name: params.memberName || null,
      checked: false,
    })
    .select(`
      *,
      food_item:food_items(*),
      pantry_location:pantry_locations(id, name, icon, order_index)
    `)
    .single();

  if (error) throw error;

  // Ensure item_name is available for backward compatibility
  return {
    ...data,
    food_item: data.food_item || null,
    item_name: data.food_item?.name || 'Unknown Item',
    pantry_location: data.pantry_location || null,
  };
}

export async function updateGroceryItem(itemId: string, updates: Partial<GroceryItem>): Promise<void> {
  // If updating food_item_id, ensure we don't also update item_name
  const cleanUpdates = { ...updates };
  if (cleanUpdates.food_item_id) {
    // Don't update item_name when food_item_id is being set
    delete (cleanUpdates as any).item_name;
  }

  const { error } = await supabase
    .from('household_grocery_list_items')
    .update(cleanUpdates)
    .eq('id', itemId);

  if (error) throw error;
}

export async function deleteGroceryItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('household_grocery_list_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function toggleItemChecked(itemId: string, checked: boolean): Promise<void> {
  const { error } = await supabase
    .from('household_grocery_list_items')
    .update({
      checked,
      last_purchased_date: checked ? new Date().toISOString() : null,
    })
    .eq('id', itemId);

  if (error) throw error;
}

export async function clearCheckedItems(householdId: string, listId?: string): Promise<void> {
  let query = supabase
    .from('household_grocery_list_items')
    .delete()
    .eq('household_id', householdId)
    .eq('checked', true);

  if (listId) {
    query = query.eq('shopping_list_id', listId);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function recordPurchase(params: {
  householdId: string;
  foodItemId: string; // Use food_item_id instead of itemName
  itemName?: string; // Deprecated - kept for backward compatibility
  category?: string;
  quantity?: string;
  price?: number;
  storeName?: string;
  memberId?: string;
}): Promise<void> {
  // Get food item name if not provided
  let itemName = params.itemName;
  if (!itemName && params.foodItemId) {
    itemName = await getFoodItemName(params.foodItemId);
  }

  // Get category from food item if not provided
  let category = params.category;
  if (!category && params.foodItemId) {
    const foodItem = await supabase
      .from('food_items')
      .select('category')
      .eq('id', params.foodItemId)
      .single();
    category = foodItem.data?.category || 'other';
  }

  const { error } = await supabase
    .from('household_grocery_purchase_history')
    .insert({
      household_id: params.householdId,
      item_name: itemName || 'Unknown Item', // Keep for backward compatibility
      category: category || 'other',
      quantity: params.quantity || null,
      price: params.price || null,
      store_name: params.storeName || null,
      purchased_by: params.memberId || null,
      purchased_date: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function completeShoppingTrip(
  householdId: string,
  checkedItems: GroceryItem[],
  storeName?: string,
  memberId?: string
): Promise<void> {
  for (const item of checkedItems) {
    await recordPurchase({
      householdId,
      foodItemId: item.food_item_id,
      itemName: item.item_name || item.food_item?.name, // Backward compatibility
      category: item.category,
      quantity: item.quantity || undefined,
      price: item.estimated_price || undefined,
      storeName,
      memberId,
    });
  }
}

export async function getPantryItems(householdId: string): Promise<PantryItem[]> {
  const { data, error } = await supabase
    .from('household_pantry_items')
    .select(`
      *,
      food_item:food_items(*),
      pantry_location:pantry_locations(id, name, icon, order_index)
    `)
    .eq('household_id', householdId)
    .order('expiration_date', { ascending: true, nullsFirst: false })
    .order('food_item_id', { ascending: true });

  if (error) throw error;
  
  // Map results to include food_item and ensure item_name is available for backward compatibility
  const items = (data || []).map((item: any) => ({
    ...item,
    food_item: item.food_item || null,
    item_name: item.food_item?.name || item.item_name || 'Unknown Item',
    pantry_location: item.pantry_location || null,
  }));
  
  return items;
}

export async function addPantryItem(params: {
  householdId: string;
  foodItemId?: string; // Preferred - use this
  itemName?: string; // Deprecated - kept for backward compatibility
  category?: string;
  quantity?: string; // Legacy - kept for backward compatibility
  unit?: string; // Legacy - kept for backward compatibility
  quantityValue?: string; // Preferred: natural language quantity
  quantityUnit?: string; // Preferred: unit
  expirationDate?: string; // Legacy - kept for backward compatibility
  expiresOn?: string; // Preferred: date (YYYY-MM-DD)
  location?: 'fridge' | 'freezer' | 'cupboard' | string; // Legacy support
  locationId?: string; // Preferred - use this (references pantry_locations)
  status?: 'have' | 'low' | 'out';
  notes?: string;
  memberId?: string;
}): Promise<PantryItem> {
  // Get or create food item
  let foodItemId: string;
  if (params.foodItemId) {
    foodItemId = params.foodItemId;
  } else if (params.itemName) {
    // Backward compatibility - create food item from name
    const foodItem = await getOrCreateFoodItem(params.itemName, params.category);
    foodItemId = foodItem.id;
  } else {
    throw new Error('Either foodItemId or itemName must be provided');
  }

  // Get food item to determine category and name if not provided
  const foodItem = await supabase
    .from('food_items')
    .select('category, name')
    .eq('id', foodItemId)
    .single();

  const category = params.category || foodItem.data?.category || 'other';
  const itemName = foodItem.data?.name || null; // For backward compatibility

  // Parse quantity if provided in "3 x tins" format (gentle parsing, no errors if fails)
  let quantityValue = params.quantityValue || null;
  let quantityUnit = params.quantityUnit || null;
  
  // If quantity is provided but not parsed, try gentle parsing
  if (params.quantity && !quantityValue) {
    const quantityStr = params.quantity.trim();
    // Try to parse "3 x tins" or "3 tins" format
    const match = quantityStr.match(/^(\d+(?:\.\d+)?)\s*(?:x\s*)?(.+)$/i);
    if (match) {
      quantityValue = match[1];
      quantityUnit = match[2].trim() || null;
    } else {
      // Store as-is if parsing fails
      quantityValue = quantityStr;
    }
  }

  const { data, error } = await supabase
    .from('household_pantry_items')
    .insert({
      household_id: params.householdId,
      food_item_id: foodItemId,
      item_name: itemName, // Store for backward compatibility (can be NULL after migration)
      category: category,
      quantity: params.quantity || null, // Legacy support
      unit: params.unit || null, // Legacy support
      quantity_value: quantityValue || null,
      quantity_unit: quantityUnit || null,
      expiration_date: params.expirationDate || null, // Legacy support
      expires_on: params.expiresOn || null,
      location: params.location || null, // Legacy support
      location_id: params.locationId || null, // Preferred
      status: params.status || null,
      notes: params.notes || null,
      added_by: params.memberId || null,
    })
    .select(`
      *,
      food_item:food_items(*),
      pantry_location:pantry_locations(id, name, icon, order_index)
    `)
    .single();

  if (error) throw error;
  
  // Ensure item_name is available for backward compatibility
  return {
    ...data,
    food_item: data.food_item || null,
    item_name: data.food_item?.name || 'Unknown Item',
  };
}

export async function updatePantryItem(itemId: string, updates: Partial<PantryItem>): Promise<void> {
  const { error } = await supabase
    .from('household_pantry_items')
    .update(updates)
    .eq('id', itemId);

  if (error) throw error;
}

export async function deletePantryItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('household_pantry_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Get normalized ingredient names from user's pantry
 * Returns array of unique, normalized ingredient names for recipe search
 */
export async function getUserPantryIngredients(spaceId: string): Promise<string[]> {
  // Convert spaceId to householdId for pantry lookup
  // Note: For personal spaces, we still need to get pantry items
  // Personal spaces may have pantry items stored with household_id = personal space context_id
  const { getHouseholdIdFromSpaceId } = await import('./recipeAIService');
  const householdId = await getHouseholdIdFromSpaceId(spaceId);
  
  // If no householdId (personal space), try to get pantry items by spaceId directly
  // or return empty array if pantry is not available for personal spaces
  if (!householdId) {
    // For personal spaces, pantry might be stored differently
    // For now, return empty - can be enhanced later if personal pantry is supported
    return [];
  }

  try {
    const pantryItems = await getPantryItems(householdId);
    
    // Extract and normalize ingredient names
    const ingredientNames = new Set<string>();
    
    for (const item of pantryItems) {
      if (item.food_item?.name) {
        // Normalize ingredient name (lowercase, trim)
        const normalized = item.food_item.name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ');
        
        if (normalized.length > 0) {
          ingredientNames.add(normalized);
        }
      }
    }
    
    return Array.from(ingredientNames).sort();
  } catch (error) {
    console.error('[getUserPantryIngredients] Failed to load pantry ingredients:', error);
    return [];
  }
}

export async function moveToPantry(groceryItem: GroceryItem, householdId: string, memberId?: string): Promise<void> {
  // Pre-fill quantity from grocery item if it exists
  let quantityValue: string | undefined;
  let quantityUnit: string | undefined;
  
  if (groceryItem.quantity) {
    // Try gentle parsing of "3 x tins" or "3 tins" format
    const quantityStr = groceryItem.quantity.trim();
    const match = quantityStr.match(/^(\d+(?:\.\d+)?)\s*(?:x\s*)?(.+)$/i);
    if (match) {
      quantityValue = match[1];
      quantityUnit = match[2].trim() || groceryItem.unit || undefined;
    } else {
      quantityValue = quantityStr;
      quantityUnit = groceryItem.unit || undefined;
    }
  }
  
  await addPantryItem({
    householdId,
    foodItemId: groceryItem.food_item_id,
    category: groceryItem.category,
    quantityValue,
    quantityUnit,
    memberId,
  });

  await deleteGroceryItem(groceryItem.id);
}

export async function addFromTemplate(
  template: GroceryTemplate,
  householdId: string,
  listId?: string,
  memberId?: string,
  memberName?: string
): Promise<GroceryItem> {
  // Get or create food item from template
  const foodItem = await getOrCreateFoodItem(template.item_name, template.category);
  
  return addGroceryItem({
    householdId,
    listId,
    foodItemId: foodItem.id,
    quantity: template.typical_quantity || undefined,
    category: template.category,
    source: 'template',
    memberId,
    memberName,
  });
}

export async function bulkAddFromSuggestions(
  suggestions: SmartSuggestion[],
  householdId: string,
  listId?: string,
  memberId?: string,
  memberName?: string
): Promise<void> {
  for (const suggestion of suggestions) {
    // Get or create food item from suggestion
    const foodItem = await getOrCreateFoodItem(suggestion.item_name, suggestion.category);
    
    await addGroceryItem({
      householdId,
      listId,
      foodItemId: foodItem.id,
      quantity: suggestion.typical_quantity || undefined,
      category: suggestion.category,
      source: 'suggestion',
      memberId,
      memberName,
    });
  }
}

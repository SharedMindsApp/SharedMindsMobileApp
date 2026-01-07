import { supabase } from './supabase';

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
  item_name: string;
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
  item_name: string;
  category: string;
  quantity: string | null;
  unit: string | null;
  expiration_date: string | null;
  location: string | null;
  notes: string | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
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
    .select('*')
    .eq('household_id', householdId)
    .order('checked', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (listId) {
    query = query.eq('shopping_list_id', listId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
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
  itemName: string;
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
  let category = params.category;
  let autoCategorized = false;

  if (!category) {
    category = await autoCategorizeItem(params.itemName);
    autoCategorized = true;
  }

  const { data, error } = await supabase
    .from('household_grocery_list_items')
    .insert({
      household_id: params.householdId,
      shopping_list_id: params.listId || null,
      item_name: params.itemName,
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
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGroceryItem(itemId: string, updates: Partial<GroceryItem>): Promise<void> {
  const { error } = await supabase
    .from('household_grocery_list_items')
    .update(updates)
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
  itemName: string;
  category: string;
  quantity?: string;
  price?: number;
  storeName?: string;
  memberId?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('household_grocery_purchase_history')
    .insert({
      household_id: params.householdId,
      item_name: params.itemName,
      category: params.category,
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
      itemName: item.item_name,
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
    .select('*')
    .eq('household_id', householdId)
    .order('expiration_date', { ascending: true, nullsFirst: false })
    .order('item_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addPantryItem(params: {
  householdId: string;
  itemName: string;
  category: string;
  quantity?: string;
  unit?: string;
  expirationDate?: string;
  location?: string;
  notes?: string;
  memberId?: string;
}): Promise<PantryItem> {
  const { data, error } = await supabase
    .from('household_pantry_items')
    .insert({
      household_id: params.householdId,
      item_name: params.itemName,
      category: params.category,
      quantity: params.quantity || null,
      unit: params.unit || null,
      expiration_date: params.expirationDate || null,
      location: params.location || null,
      notes: params.notes || null,
      added_by: params.memberId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
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

export async function moveToPantry(groceryItem: GroceryItem, householdId: string, memberId?: string): Promise<void> {
  await addPantryItem({
    householdId,
    itemName: groceryItem.item_name,
    category: groceryItem.category,
    quantity: groceryItem.quantity || undefined,
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
  return addGroceryItem({
    householdId,
    listId,
    itemName: template.item_name,
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
    await addGroceryItem({
      householdId,
      listId,
      itemName: suggestion.item_name,
      quantity: suggestion.typical_quantity || undefined,
      category: suggestion.category,
      source: 'suggestion',
      memberId,
      memberName,
    });
  }
}

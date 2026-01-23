/**
 * Pantry Widget
 * 
 * Lightweight inventory view - what exists, not tasks.
 * Zero pressure, no warnings, no required quantities.
 * Uses unified food_items system.
 */

import { useState, useEffect, useRef } from 'react';
import { Package, Plus, X, Square, Snowflake, Box, Edit2, Search, ShoppingCart, ChevronDown } from 'lucide-react';
import type { WidgetViewMode } from '../../../lib/fridgeCanvasTypes';
import { 
  getPantryItems, 
  addPantryItem, 
  updatePantryItem, 
  deletePantryItem,
  getGroceryItems,
  moveToPantry,
  type PantryItem 
} from '../../../lib/intelligentGrocery';
import { FoodPicker } from '../../shared/FoodPicker';
import { getFoodItemNames, getOrCreateFoodItem, type FoodItem } from '../../../lib/foodItems';
import { getPantryBasedRecipeSuggestions } from '../../../lib/foodIntelligence';
import { getMealLibrary } from '../../../lib/mealPlanner';
import { showToast } from '../../Toast';
import { Sparkles, ChefHat } from 'lucide-react';
import { useSpaceContext } from '../../../hooks/useSpaceContext';
import { WidgetHeader } from '../../shared/WidgetHeader';
import { MakeableRecipesModal } from '../../shared/MakeableRecipesModal';
import { 
  getPantryLocations, 
  createPantryLocation, 
  updatePantryLocation, 
  deletePantryLocation,
  ensureDefaultLocations,
  type PantryLocation 
} from '../../../lib/pantryLocations';
import { PantryLocationSelector } from '../../shared/PantryLocationSelector';
import { PantryLocationManager } from '../../shared/PantryLocationManager';
import { Settings } from 'lucide-react';

interface PantryWidgetProps {
  householdId: string;
  viewMode: WidgetViewMode;
}

// Group pantry items by location
const LOCATION_GROUPS: Record<string, { label: string; icon: any; color: string }> = {
  fridge: { label: 'Fridge', icon: Square, color: 'bg-blue-50 border-blue-200' },
  freezer: { label: 'Freezer', icon: Snowflake, color: 'bg-cyan-50 border-cyan-200' },
  cupboard: { label: 'Cupboard', icon: Box, color: 'bg-amber-50 border-amber-200' },
};

// Comprehensive list of common pantry items organized by category
const COMMON_PANTRY_ITEMS: Record<string, string[]> = {
  'Dairy & Eggs': [
    'Milk', 'Eggs', 'Butter', 'Cheese', 'Yogurt', 'Greek Yogurt',
    'Sour Cream', 'Cream Cheese', 'Cottage Cheese', 'Heavy Cream',
    'Whipping Cream', 'Mozzarella', 'Cheddar', 'Parmesan', 'Feta'
  ],
  'Produce - Fruits': [
    'Bananas', 'Apples', 'Oranges', 'Lemons', 'Limes', 'Strawberries',
    'Blueberries', 'Grapes', 'Watermelon', 'Pineapple', 'Mango',
    'Peaches', 'Pears', 'Cherries', 'Avocado', 'Kiwi', 'Raspberries',
    'Blackberries', 'Cranberries'
  ],
  'Produce - Vegetables': [
    'Lettuce', 'Tomatoes', 'Carrots', 'Onions', 'Potatoes', 'Broccoli',
    'Spinach', 'Bell Peppers', 'Cucumber', 'Celery', 'Garlic', 'Corn',
    'Mushrooms', 'Green Beans', 'Asparagus', 'Zucchini', 'Eggplant',
    'Cabbage', 'Cauliflower', 'Sweet Potatoes', 'Brussels Sprouts',
    'Kale', 'Arugula', 'Radishes', 'Beets'
  ],
  'Meat & Seafood': [
    'Chicken Breast', 'Chicken Thighs', 'Ground Beef', 'Steak', 'Salmon',
    'Bacon', 'Ground Turkey', 'Pork Chops', 'Shrimp', 'Tuna', 'Sausage',
    'Ham', 'Turkey', 'Cod', 'Tilapia', 'Ground Pork', 'Ribs', 'Chicken Wings'
  ],
  'Bakery': [
    'Bread', 'Bagels', 'Tortillas', 'English Muffins', 'Croissants',
    'Muffins', 'Donuts', 'Baguette', 'Sourdough', 'Whole Wheat Bread',
    'Pita Bread', 'Naan', 'Dinner Rolls'
  ],
  'Pantry Staples': [
    'Rice', 'Pasta', 'Spaghetti', 'Noodles', 'Flour', 'Sugar', 'Brown Sugar',
    'Salt', 'Black Pepper', 'Olive Oil', 'Vegetable Oil', 'Canola Oil',
    'Vinegar', 'Balsamic Vinegar', 'Soy Sauce', 'Canned Tomatoes',
    'Canned Beans', 'Black Beans', 'Kidney Beans', 'Chickpeas', 'Lentils',
    'Chicken Broth', 'Beef Broth', 'Vegetable Broth', 'Tomato Paste',
    'Tomato Sauce', 'Coconut Milk', 'Baking Soda', 'Baking Powder',
    'Vanilla Extract', 'Cinnamon', 'Oregano', 'Basil', 'Thyme'
  ],
  'Snacks': [
    'Crackers', 'Chips', 'Potato Chips', 'Tortilla Chips', 'Nuts', 'Almonds',
    'Peanuts', 'Walnuts', 'Peanut Butter', 'Almond Butter', 'Jam', 'Jelly',
    'Honey', 'Granola Bars', 'Popcorn', 'Chocolate', 'Cookies', 'Pretzels',
    'Trail Mix', 'Dried Fruit', 'Raisins'
  ],
  'Beverages': [
    'Coffee', 'Tea', 'Green Tea', 'Black Tea', 'Orange Juice', 'Apple Juice',
    'Cranberry Juice', 'Soda', 'Water', 'Sparkling Water', 'Beer', 'Wine',
    'Champagne', 'Energy Drinks', 'Sports Drinks', 'Lemonade', 'Iced Tea'
  ],
  'Frozen': [
    'Frozen Vegetables', 'Frozen Fruit', 'Frozen Berries', 'Ice Cream',
    'Frozen Pizza', 'Frozen Chicken', 'Frozen Fish', 'Frozen French Fries',
    'Frozen Waffles', 'Frozen Burritos', 'Frozen Meals', 'Ice Pops'
  ],
  'Condiments & Sauces': [
    'Ketchup', 'Mustard', 'Mayonnaise', 'Hot Sauce', 'BBQ Sauce',
    'Salad Dressing', 'Ranch Dressing', 'Italian Dressing', 'Worcestershire Sauce',
    'Sriracha', 'Teriyaki Sauce', 'Pesto', 'Hummus', 'Salsa', 'Guacamole',
    'Tartar Sauce', 'Horseradish', 'Relish', 'Pickles'
  ],
  'Breakfast': [
    'Cereal', 'Oatmeal', 'Pancake Mix', 'Waffle Mix', 'Maple Syrup',
    'Breakfast Sausage', 'Hash Browns', 'Breakfast Burritos'
  ],
  'Desserts & Baking': [
    'Chocolate Chips', 'Cocoa Powder', 'Powdered Sugar', 'Shortening',
    'Pie Crust', 'Cake Mix', 'Brownie Mix', 'Frosting', 'Sprinkles'
  ]
};

export function PantryWidget({ householdId, viewMode }: PantryWidgetProps) {
  // Use centralized space context hook
  const {
    currentSpaceId,
    availableSpaces,
    setCurrentSpace,
    isLoading: spacesLoading,
    getAbortSignal,
    isSwitching,
  } = useSpaceContext(householdId);

  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [foodItemNames, setFoodItemNames] = useState<Record<string, string>>({});
  const [recipeSuggestions, setRecipeSuggestions] = useState<number>(0);
  const [showRecipeSuggestions, setShowRecipeSuggestions] = useState(false);
  
  // Location selection state
  const [pendingFoodItem, setPendingFoodItem] = useState<FoodItem | null>(null);
  const [lastUsedLocationId, setLastUsedLocationId] = useState<string | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [pantryLocations, setPantryLocations] = useState<PantryLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showManageLocations, setShowManageLocations] = useState(false);
  
  // Track if we're switching contexts to prevent stale updates
  const contextSpaceIdRef = useRef(currentSpaceId);
  
  // Edit state
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [editForm, setEditForm] = useState({
    location: '',
    quantityValue: '',
    quantityUnit: '',
    expiresOn: '',
    notes: '',
    status: 'have' as 'have' | 'low' | 'out',
  });
  
  // Quantity editing state (inline)
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [quantityValueInput, setQuantityValueInput] = useState('');
  const [quantityUnitInput, setQuantityUnitInput] = useState('');
  const quantityValueInputRef = useRef<HTMLInputElement>(null);
  
  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string | null>(null);
  
  // Common items selection state
  const [showCommonItems, setShowCommonItems] = useState(false);
  const [selectedCommonItems, setSelectedCommonItems] = useState<Set<string>>(new Set());
  
  // Makeable recipes modal state
  const [showMakeableRecipes, setShowMakeableRecipes] = useState(false);
  
  // Pending item form state (for adding new items)
  const [pendingQuantityValue, setPendingQuantityValue] = useState('');
  const [pendingQuantityUnit, setPendingQuantityUnit] = useState('');
  const [pendingExpiresOn, setPendingExpiresOn] = useState('');

  // Update ref when space changes
  useEffect(() => {
    contextSpaceIdRef.current = currentSpaceId;
  }, [currentSpaceId]);

  // Load pantry locations and ensure defaults exist
  useEffect(() => {
    if (currentSpaceId && !isSwitching()) {
      loadPantryLocations();
    }
  }, [currentSpaceId]);

  // Load pantry items when space context changes
  useEffect(() => {
    // Cancel any in-flight requests if switching
    const abortSignal = getAbortSignal();
    
    // Only load if not currently switching
    if (!isSwitching()) {
      loadPantryItems(abortSignal);
    }
    
    // Cleanup: reset any edit states when context changes
    setEditingItem(null);
    setEditingQuantityId(null);
    setPendingFoodItem(null);
    setPendingQuantityValue('');
    setPendingQuantityUnit('');
    setPendingExpiresOn('');
    
    return () => {
      // Cleanup on unmount or space change
      setPantryItems([]);
    };
  }, [currentSpaceId]);

  useEffect(() => {
    if (pantryItems.length > 0 && !isSwitching()) {
      loadRecipeSuggestions();
    } else {
      setRecipeSuggestions(0);
    }
  }, [pantryItems.length, currentSpaceId]);

  useEffect(() => {
    if (pantryItems.length > 0) {
      const foodItemIds = pantryItems.map(item => item.food_item_id).filter(Boolean);
      getFoodItemNames(foodItemIds).then(names => {
        setFoodItemNames(names);
      });
    }
  }, [pantryItems]);

  const loadPantryLocations = async () => {
    const expectedSpaceId = contextSpaceIdRef.current;
    
    try {
      setLoadingLocations(true);
      // Ensure default locations exist (silent setup)
      const locations = await ensureDefaultLocations(currentSpaceId);
      
      // Verify we're still in the same context
      if (contextSpaceIdRef.current !== expectedSpaceId) {
        return;
      }
      
      setPantryLocations(locations);
      
      // Restore last used location from sessionStorage
      const lastUsedKey = `last_used_location_${currentSpaceId}`;
      const lastUsed = sessionStorage.getItem(lastUsedKey);
      if (lastUsed && locations.some(l => l.id === lastUsed)) {
        setLastUsedLocationId(lastUsed);
      }
    } catch (error) {
      console.error('Failed to load pantry locations:', error);
    } finally {
      if (contextSpaceIdRef.current === expectedSpaceId) {
        setLoadingLocations(false);
      }
    }
  };

  const handleLocationsUpdated = async () => {
    await loadPantryLocations();
    await loadPantryItems(getAbortSignal());
  };

  const loadPantryItems = async (abortSignal?: AbortSignal | null) => {
    // Check if context has changed during load
    const expectedSpaceId = contextSpaceIdRef.current;
    
    try {
      setLoading(true);
      const items = await getPantryItems(currentSpaceId);
      
      // Verify we're still loading for the same context
      if (contextSpaceIdRef.current !== expectedSpaceId || abortSignal?.aborted) {
        return; // Context changed, discard results
      }
      
      setPantryItems(items);
    } catch (error: any) {
      // Ignore aborted requests
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        return;
      }
      
      console.error('Failed to load pantry items:', error);
      showToast('error', 'Failed to load pantry');
    } finally {
      // Only update loading state if context hasn't changed
      if (contextSpaceIdRef.current === expectedSpaceId) {
        setLoading(false);
      }
    }
  };

  const handleFoodItemSelect = (foodItem: FoodItem) => {
    // Show location selector instead of immediately adding
    setPendingFoodItem(foodItem);
    setShowFoodPicker(false);
    setShowLocationSelector(true);
  };

  const handleLocationSelect = async (locationId: string | null) => {
    if (!pendingFoodItem) return;

    try {
      await addPantryItem({
        householdId: currentSpaceId,
        foodItemId: pendingFoodItem.id,
        locationId: locationId || undefined,
        quantityValue: pendingQuantityValue.trim() || undefined,
        quantityUnit: pendingQuantityUnit.trim() || undefined,
        expiresOn: pendingExpiresOn || undefined,
        status: 'have',
      });
      
      // Remember last used location per space
      if (locationId) {
        setLastUsedLocationId(locationId);
        const lastUsedKey = `last_used_location_${currentSpaceId}`;
        sessionStorage.setItem(lastUsedKey, locationId);
      }
      
      // Clear pending form
      setPendingQuantityValue('');
      setPendingQuantityUnit('');
      setPendingExpiresOn('');
      
      await loadPantryItems(getAbortSignal());
      setPendingFoodItem(null);
      setShowLocationSelector(false);
      showToast('success', 'Added to pantry');
    } catch (error) {
      console.error('Failed to add pantry item:', error);
      showToast('error', 'Failed to add item');
    }
  };

  const handleEditItem = (item: PantryItem) => {
    setEditingItem(item);
    setEditForm({
      location: item.location_id || '', // Use location_id
      quantityValue: item.quantity_value || '',
      quantityUnit: item.quantity_unit || '',
      expiresOn: item.expires_on ? item.expires_on.split('T')[0] : '', // Format date for input
      notes: item.notes || '',
      status: item.status || 'have',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      // Convert editForm.location to location_id
      const locationId = editForm.location && editForm.location !== '' 
        ? (pantryLocations.find(l => l.id === editForm.location)?.id || null)
        : null;

      await updatePantryItem(editingItem.id, {
        location_id: locationId,
        quantity_value: editForm.quantityValue.trim() || null,
        quantity_unit: editForm.quantityUnit.trim() || null,
        expires_on: editForm.expiresOn || null,
        notes: editForm.notes || null,
        status: editForm.status || null,
      });
      await loadPantryItems(getAbortSignal());
      setEditingItem(null);
      showToast('success', 'Updated');
    } catch (error) {
      console.error('Failed to update item:', error);
      showToast('error', 'Failed to update item');
    }
  };

  const handleQuickLocationChange = async (itemId: string, locationId: string | null) => {
    try {
      await updatePantryItem(itemId, { location_id: locationId });
      await loadPantryItems(getAbortSignal());
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const handleQuantityEdit = (item: PantryItem) => {
    setEditingQuantityId(item.id);
    setQuantityValueInput(item.quantity_value || item.quantity || '');
    setQuantityUnitInput(item.quantity_unit || item.unit || '');
    setTimeout(() => {
      quantityValueInputRef.current?.focus();
    }, 0);
  };

  const handleQuantitySave = async (itemId: string) => {
    const value = quantityValueInput.trim();
    const unit = quantityUnitInput.trim();

    try {
      await updatePantryItem(itemId, {
        quantity_value: value || null,
        quantity_unit: unit || null,
      });
      await loadPantryItems(getAbortSignal());
      setEditingQuantityId(null);
      setQuantityValueInput('');
      setQuantityUnitInput('');
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const handleQuantityCancel = () => {
    setEditingQuantityId(null);
    setQuantityValueInput('');
    setQuantityUnitInput('');
  };


  const handleAddFromGroceryList = async () => {
    try {
      const groceryItems = await getGroceryItems(currentSpaceId);
      const checkedItems = groceryItems.filter(item => item.checked);
      
      if (checkedItems.length === 0) {
        showToast('info', 'No checked items in grocery list');
        return;
      }

      for (const item of checkedItems) {
        await moveToPantry(item, currentSpaceId);
      }
      
      await loadPantryItems(getAbortSignal());
      showToast('success', `Added ${checkedItems.length} item${checkedItems.length !== 1 ? 's' : ''} from grocery list`);
    } catch (error) {
      console.error('Failed to add from grocery list:', error);
      showToast('error', 'Failed to add items');
    }
  };

  const handleAddCommonItems = async (itemNames: string[]) => {
    if (itemNames.length === 0) {
      showToast('info', 'Select items to add');
      return;
    }

    try {
      for (const name of itemNames) {
        const foodItem = await getOrCreateFoodItem(name);
        await addPantryItem({
          householdId: currentSpaceId,
          foodItemId: foodItem.id,
          locationId: lastUsedLocationId || undefined,
          status: 'have',
        });
      }
      await loadPantryItems(getAbortSignal());
      setSelectedCommonItems(new Set());
      setShowCommonItems(false);
      showToast('success', `Added ${itemNames.length} item${itemNames.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Failed to add common items:', error);
      showToast('error', 'Failed to add items');
    }
  };

  const handleToggleCommonItem = (itemName: string) => {
    setSelectedCommonItems(prev => {
      const next = new Set(prev);
      if (next.has(itemName)) {
        next.delete(itemName);
      } else {
        next.add(itemName);
      }
      return next;
    });
  };

  const handleSelectAllCategory = (category: string) => {
    const items = COMMON_PANTRY_ITEMS[category] || [];
    setSelectedCommonItems(prev => {
      const next = new Set(prev);
      const allSelected = items.every(item => next.has(item));
      if (allSelected) {
        // Deselect all in category
        items.forEach(item => next.delete(item));
      } else {
        // Select all in category
        items.forEach(item => next.add(item));
      }
      return next;
    });
  };

  const handleDeleteItem = async (id: string, itemName?: string) => {
    // Find the item to get its name for the confirmation
    const item = pantryItems.find(i => i.id === id);
    const displayName = itemName || item?.food_item?.name || item?.item_name || 'this item';
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${displayName}" from your pantry?`
    );
    
    if (!confirmed) {
      return;
    }
    
    try {
      await deletePantryItem(id);
      await loadPantryItems(getAbortSignal());
      showToast('success', 'Item removed from pantry');
    } catch (error) {
      console.error('Failed to delete item:', error);
      showToast('error', 'Failed to delete item');
    }
  };


  const loadRecipeSuggestions = async () => {
    const expectedSpaceId = contextSpaceIdRef.current;
    const abortSignal = getAbortSignal();
    
    try {
      const allMeals = await getMealLibrary();
      const suggestions = await getPantryBasedRecipeSuggestions(allMeals, currentSpaceId, 50);
      
      // Verify we're still in the same context
      if (contextSpaceIdRef.current !== expectedSpaceId || abortSignal?.aborted) {
        return;
      }
      
      setRecipeSuggestions(suggestions.length);
    } catch (error: any) {
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        return;
      }
      console.error('Failed to load recipe suggestions:', error);
      // Silent fail - this is optional awareness
    }
  };

  // Filter items by search query and location
  const filteredItems = pantryItems.filter(item => {
    const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
    const matchesSearch = !searchQuery || itemName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by location_id if selected
    if (selectedLocationFilter) {
      if (selectedLocationFilter === 'unassigned') {
        // Show only unassigned items
        if (item.location_id) return false;
      } else {
        // Show only items in selected location
        if (item.location_id !== selectedLocationFilter) return false;
      }
    }
    
    return matchesSearch;
  });

  // Group filtered items by location_id
  const itemsByLocationId = filteredItems.reduce((acc, item) => {
    const locationId = item.location_id || 'unassigned';
    if (!acc[locationId]) acc[locationId] = [];
    acc[locationId].push(item);
    return acc;
  }, {} as Record<string, PantryItem[]>);

  // Sort locations by order_index, with unassigned at the end
  const sortedLocationIds = [
    ...pantryLocations
      .sort((a, b) => a.order_index - b.order_index)
      .map(loc => loc.id)
      .filter(id => itemsByLocationId[id] && itemsByLocationId[id].length > 0),
    ...(itemsByLocationId['unassigned'] && itemsByLocationId['unassigned'].length > 0 ? ['unassigned'] : [])
  ];


  if (viewMode === 'icon') {
    const totalItems = pantryItems.length;
    return (
      <div className="w-full h-full bg-gradient-to-br from-stone-400 to-stone-600 border-stone-600 border-2 rounded-2xl flex flex-col items-center justify-center hover:scale-105 transition-all shadow-lg hover:shadow-xl group relative">
        <Package size={36} className="text-white mb-1 group-hover:scale-110 transition-transform" />
        {totalItems > 0 && (
          <div className="absolute top-1 right-1 bg-white text-stone-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
            {totalItems}
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'mini') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-stone-50 to-stone-100 border-stone-300 border-2 rounded-2xl p-4 flex flex-col shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-stone-500 p-1.5 rounded-lg">
              <Package size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-stone-900 text-sm">Pantry</h3>
          </div>
          <span className="text-xs font-semibold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-full">
            {pantryItems.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-xs text-stone-600 italic animate-pulse">Loading...</div>
          </div>
        ) : pantryItems.length === 0 ? (
          <div className="text-center py-8">
            <Package size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700 mb-2">Your pantry starts here</p>
            <p className="text-xs text-stone-600 mb-4">Add items to see what you can make</p>
            <button
              onClick={() => setShowMakeableRecipes(true)}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <ChefHat size={16} />
              What can I make?
            </button>
          </div>
        ) : (
          <div className="space-y-1 overflow-y-auto max-h-[80px]">
            {pantryItems.slice(0, 4).map((item) => {
              const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
              return (
                <div key={item.id} className="flex items-center gap-1.5 text-xs">
                  {item.food_item?.emoji && (
                    <span className="flex-shrink-0">{item.food_item.emoji}</span>
                  )}
                  <span className="truncate text-gray-800">{itemName}</span>
                </div>
              );
            })}
            {pantryItems.length > 4 && (
              <p className="text-xs text-gray-500 text-center mt-1">+{pantryItems.length - 4} more</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-stone-50 via-stone-100 to-stone-200 border-stone-300 border-2 rounded-2xl p-6 flex flex-col shadow-lg">
      <WidgetHeader
        icon={
          <div className="w-12 h-12 bg-gradient-to-br from-stone-500 to-stone-600 rounded-xl flex items-center justify-center shadow-md">
            <Package size={24} className="text-white" />
          </div>
        }
        title="Pantry"
        subtitle={
          (loading || spacesLoading) ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            filteredItems.length + ' ' + (filteredItems.length === 1 ? 'item' : 'items') +
            (searchQuery || selectedLocationFilter ? ` (of ${pantryItems.length})` : '')
          )
        }
        currentSpaceId={currentSpaceId}
        onSpaceChange={setCurrentSpace}
        availableSpaces={availableSpaces}
        showSpaceSwitcher={availableSpaces.length > 1 && !spacesLoading}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMakeableRecipes(true)}
              className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center gap-1.5"
              title="What can I make?"
            >
              <ChefHat size={18} />
              <span className="hidden sm:inline text-sm font-medium">What can I make?</span>
            </button>
            <button
              onClick={() => setShowManageLocations(true)}
              className="p-2 bg-stone-400 hover:bg-stone-500 text-white rounded-lg transition-colors"
              title="Manage locations"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => setShowFoodPicker(true)}
              className="p-2 bg-stone-500 hover:bg-stone-600 text-white rounded-lg transition-colors"
              title="Add to pantry"
            >
              <Plus size={20} />
            </button>
          </div>
        }
      />

      {/* Locations Overview (Visible in Dashboard) */}
      {pantryLocations.length > 0 && (
        <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">Locations</h4>
            <button
              onClick={() => setShowManageLocations(true)}
              className="text-xs text-stone-600 hover:text-stone-800 underline"
            >
              Manage
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {pantryLocations.map((location) => {
              const itemCount = pantryItems.filter(item => item.location_id === location.id).length;
              return (
                <div
                  key={location.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-stone-200 text-xs"
                >
                  {location.icon && <span>{location.icon}</span>}
                  <span className="font-medium text-gray-900">{location.name}</span>
                  <span className="text-gray-500">({itemCount})</span>
                </div>
              );
            })}
            {pantryItems.filter(item => !item.location_id).length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-stone-200 text-xs">
                <span className="font-medium text-gray-900">Unassigned</span>
                <span className="text-gray-500">({pantryItems.filter(item => !item.location_id).length})</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      {pantryItems.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pantry..."
              className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            />
          </div>
          
          {/* Location Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedLocationFilter(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedLocationFilter === null
                  ? 'bg-stone-500 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              All
            </button>
            {pantryLocations.map((location) => {
              const itemCount = pantryItems.filter(item => item.location_id === location.id).length;
              if (itemCount === 0) return null;
              
              return (
                <button
                  key={location.id}
                  onClick={() => setSelectedLocationFilter(location.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    selectedLocationFilter === location.id
                      ? 'bg-stone-500 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {location.icon && <span>{location.icon}</span>}
                  {location.name} ({itemCount})
                </button>
              );
            })}
            {pantryItems.filter(item => !item.location_id).length > 0 && (
              <button
                onClick={() => setSelectedLocationFilter('unassigned')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedLocationFilter === 'unassigned'
                    ? 'bg-stone-500 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Unassigned ({pantryItems.filter(item => !item.location_id).length})
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent">
        {loading ? (
          <div className="text-center py-10">
            <div className="text-stone-600 italic animate-pulse">Loading pantry...</div>
          </div>
        ) : pantryItems.length === 0 ? (
          <div className="text-center py-10">
            <div className="bg-stone-200 w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Package className="w-8 h-8 text-stone-600" />
            </div>
            <p className="text-base text-gray-700 font-semibold mb-1">Your pantry starts here</p>
            <p className="text-sm text-stone-600 mb-4">Add items to track what you have at home</p>
            
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <button
                onClick={handleAddFromGroceryList}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart size={16} />
                Add from grocery list
              </button>
              <button
                onClick={() => setShowCommonItems(true)}
                className="px-4 py-2 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg text-sm transition-colors"
              >
                Add common items
              </button>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-gray-500">No items match your search</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedLocationFilter(null);
              }}
              className="mt-2 text-xs text-stone-600 hover:text-stone-800 underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedLocationIds.map((locationId) => {
              const items = itemsByLocationId[locationId] || [];
              if (items.length === 0) return null;

              const location = locationId === 'unassigned' 
                ? null 
                : pantryLocations.find(l => l.id === locationId);
              
              const locationName = location?.name || 'Unassigned';
              const locationIcon = location?.icon || null;

              return (
                <div key={locationId} className="bg-stone-50 rounded-lg p-3 border-2 border-stone-200">
                  <div className="flex items-center gap-2 mb-2">
                    {locationIcon && <span className="text-base">{locationIcon}</span>}
                    <h4 className="font-semibold text-sm text-stone-900">{locationName}</h4>
                    <span className="text-xs text-stone-600">({items.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((item) => {
                      const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
                      const isEditingQuantity = editingQuantityId === item.id;
                      
                      return (
                        <div key={item.id} className="bg-white/60 rounded-lg p-2 flex items-center justify-between group">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {item.food_item?.emoji && (
                              <span className="text-base flex-shrink-0">{item.food_item.emoji}</span>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">{itemName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {isEditingQuantity ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      ref={quantityValueInputRef}
                                      type="text"
                                      value={quantityValueInput}
                                      onChange={(e) => setQuantityValueInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleQuantitySave(item.id);
                                      } else if (e.key === 'Escape') {
                                        handleQuantityCancel();
                                      } else if (e.key === 'Tab' && !e.shiftKey) {
                                          // Allow tab to move to unit input
                                        }
                                      }}
                                      className="text-xs text-gray-500 border border-stone-300 rounded px-1.5 py-0.5 w-16 focus:outline-none focus:ring-1 focus:ring-stone-500"
                                      placeholder="3"
                                      autoFocus
                                    />
                                    <input
                                      type="text"
                                      value={quantityUnitInput}
                                      onChange={(e) => setQuantityUnitInput(e.target.value)}
                                      onBlur={() => handleQuantitySave(item.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleQuantitySave(item.id);
                                        } else if (e.key === 'Escape') {
                                          handleQuantityCancel();
                                        }
                                      }}
                                      className="text-xs text-gray-500 border border-stone-300 rounded px-1.5 py-0.5 w-20 focus:outline-none focus:ring-1 focus:ring-stone-500"
                                      placeholder="tins"
                                    />
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleQuantityEdit(item)}
                                    className="text-xs text-gray-500 hover:text-gray-700 text-left"
                                  >
                                    {item.quantity_value || item.quantity ? (
                                      `${item.quantity_value || item.quantity}${item.quantity_unit || item.unit ? ` ${item.quantity_unit || item.unit}` : ''}`
                                    ) : (
                                      'Add quantity'
                                    )}
                                  </button>
                                )}
                                
                                {/* Expiry Date Display (Soft Awareness) */}
                                {item.expires_on && (
                                  <button
                                    onClick={() => handleEditItem(item)}
                                    className="text-xs text-gray-500 hover:text-gray-600"
                                    title="Tap to edit"
                                  >
                                    {(() => {
                                      const expiryDate = new Date(item.expires_on);
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                      
                                      // Soft awareness: slightly warmer tone if within 3 days, but no red
                                      const isSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 3;
                                      const isExpired = daysUntilExpiry < 0;
                                      
                                      const dateStr = expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                                      
                                      return (
                                        <span className={isSoon ? 'text-amber-600' : isExpired ? 'text-stone-500' : 'text-gray-500'}>
                                          Best before: {dateStr}
                                        </span>
                                      );
                                    })()}
                                  </button>
                                )}
                                
                                {/* Quick Location Change */}
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Cycle through available locations
                                      const availableLocations = pantryLocations.map(l => l.id);
                                      const currentIndex = availableLocations.indexOf(item.location_id || '');
                                      const nextIndex = (currentIndex + 1) % (availableLocations.length + 1); // +1 for null/unassigned
                                      const nextLocationId = nextIndex === availableLocations.length 
                                        ? null 
                                        : availableLocations[nextIndex];
                                      handleQuickLocationChange(item.id, nextLocationId);
                                    }}
                                    className="text-xs px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded flex items-center gap-1 transition-colors"
                                    title="Change location"
                                  >
                                    {item.pantry_location?.icon ? (
                                      <span>{item.pantry_location.icon}</span>
                                    ) : (
                                      <Box size={10} />
                                    )}
                                    <ChevronDown size={10} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-stone-600 transition-opacity"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, itemName)}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                              title="Delete"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          </div>
        )}
      </div>

      {/* Optional Recipe Suggestions Footer */}
      {recipeSuggestions > 0 && (
        <div className="mt-4 pt-4 border-t border-stone-200">
          <button
            onClick={() => setShowRecipeSuggestions(!showRecipeSuggestions)}
            className="w-full text-left p-2 rounded-lg hover:bg-stone-100 transition-colors flex items-center gap-2 text-sm text-stone-600"
          >
            <Sparkles size={14} className="text-stone-500" />
            <span>You could make {recipeSuggestions} meal{recipeSuggestions !== 1 ? 's' : ''} with what you have</span>
          </button>
          {showRecipeSuggestions && (
            <div className="mt-2 p-2 bg-stone-50 rounded-lg text-xs text-stone-600">
              <p>Open Meal Planner to see recipe suggestions based on your pantry.</p>
            </div>
          )}
        </div>
      )}


      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 safe-top safe-bottom">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Edit Item</h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {editingItem.food_item?.emoji && <span className="text-lg mr-1">{editingItem.food_item.emoji}</span>}
                {editingItem.food_item?.name || editingItem.item_name || 'Unknown Item'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <div className="space-y-2">
                  {/* No location option */}
                  <button
                    onClick={() => setEditForm(prev => ({ ...prev, location: '' }))}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      !editForm.location
                        ? 'border-stone-500 bg-stone-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">No location</p>
                  </button>
                  {/* Existing locations */}
                  {pantryLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => {
                        setEditForm(prev => ({ ...prev, location: location.id }));
                      }}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        editingItem?.location_id === location.id
                          ? 'border-stone-500 bg-stone-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      {location.icon && <span>{location.icon}</span>}
                      <p className="text-sm font-medium text-gray-900">{location.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="text"
                    value={editForm.quantityValue}
                    onChange={(e) => setEditForm(prev => ({ ...prev, quantityValue: e.target.value }))}
                    placeholder="e.g., 3, half, a few"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <input
                    type="text"
                    value={editForm.quantityUnit}
                    onChange={(e) => setEditForm(prev => ({ ...prev, quantityUnit: e.target.value }))}
                    placeholder="e.g., tins, packs, kg"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none"
                />
              </div>

              {/* Status (Hidden by default, optional) */}
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
                  Status (optional)
                </summary>
                <div className="mt-2 space-y-2">
                  {(['have', 'low', 'out'] as const).map((status) => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value={status}
                        checked={editForm.status === status}
                        onChange={() => setEditForm(prev => ({ ...prev, status }))}
                        className="text-stone-500 focus:ring-stone-500"
                      />
                      <span className="text-gray-700 capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </details>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-stone-500 hover:bg-stone-600 text-white rounded-lg font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Common Items Selection Modal */}
      {showCommonItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 safe-top safe-bottom">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Add Common Items</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Select items to add to your pantry
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCommonItems(false);
                  setSelectedCommonItems(new Set());
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {Object.entries(COMMON_PANTRY_ITEMS).map(([category, items]) => (
                <div key={category} className="border border-stone-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-gray-900">{category}</h4>
                    <button
                      onClick={() => handleSelectAllCategory(category)}
                      className="text-xs text-stone-600 hover:text-stone-800 underline"
                    >
                      {items.every(item => selectedCommonItems.has(item)) ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => {
                      const isSelected = selectedCommonItems.has(item);
                      return (
                        <button
                          key={item}
                          onClick={() => handleToggleCommonItem(item)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-stone-500 text-white'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedCommonItems.size} item{selectedCommonItems.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCommonItems(false);
                    setSelectedCommonItems(new Set());
                  }}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAddCommonItems(Array.from(selectedCommonItems))}
                  disabled={selectedCommonItems.size === 0}
                  className="px-4 py-2 bg-stone-500 hover:bg-stone-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add {selectedCommonItems.size > 0 ? `${selectedCommonItems.size} ` : ''}Item{selectedCommonItems.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FoodPicker Modal */}
      <FoodPicker
        isOpen={showFoodPicker}
        onClose={() => setShowFoodPicker(false)}
        onSelect={handleFoodItemSelect}
        householdId={currentSpaceId}
        excludeIds={pantryItems.map(item => item.food_item_id).filter(Boolean)}
        placeholder="Search for a food item..."
        title="Add to Pantry"
        showAwareness={true}
      />

      {/* Makeable Recipes Modal */}
      <MakeableRecipesModal
        isOpen={showMakeableRecipes}
        onClose={() => setShowMakeableRecipes(false)}
        spaceId={currentSpaceId}
      />

      {/* Location Selector Modal */}
      <PantryLocationSelector
        isOpen={showLocationSelector}
        onClose={() => {
          setShowLocationSelector(false);
          setPendingFoodItem(null);
          setPendingQuantityValue('');
          setPendingQuantityUnit('');
          setPendingExpiresOn('');
        }}
        onSelect={handleLocationSelect}
        locations={pantryLocations}
        lastUsedLocationId={lastUsedLocationId}
        spaceId={currentSpaceId}
        onLocationCreated={(location) => {
          setPantryLocations([...pantryLocations, location]);
        }}
        quantityValue={pendingQuantityValue}
        quantityUnit={pendingQuantityUnit}
        expiresOn={pendingExpiresOn}
        onQuantityValueChange={setPendingQuantityValue}
        onQuantityUnitChange={setPendingQuantityUnit}
        onExpiresOnChange={setPendingExpiresOn}
      />

      {/* Location Manager Modal */}
      <PantryLocationManager
        isOpen={showManageLocations}
        onClose={() => setShowManageLocations(false)}
        locations={pantryLocations}
        pantryItems={pantryItems}
        spaceId={currentSpaceId}
        onLocationsUpdated={handleLocationsUpdated}
      />
    </div>
  );
}

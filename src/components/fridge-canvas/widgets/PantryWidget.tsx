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
    'Milk', 'Eggs', 'Butter', 'Cheese', 'Yogurt', 'Sour Cream', 
    'Cream Cheese', 'Cottage Cheese', 'Greek Yogurt', 'Heavy Cream'
  ],
  'Produce': [
    'Bananas', 'Apples', 'Oranges', 'Lettuce', 'Tomatoes', 'Carrots', 
    'Onions', 'Potatoes', 'Broccoli', 'Spinach', 'Bell Peppers', 
    'Cucumber', 'Celery', 'Avocado', 'Lemons', 'Garlic'
  ],
  'Meat & Seafood': [
    'Chicken Breast', 'Ground Beef', 'Salmon', 'Bacon', 'Ground Turkey',
    'Pork Chops', 'Shrimp', 'Tuna', 'Sausage'
  ],
  'Bakery': [
    'Bread', 'Bagels', 'Tortillas', 'English Muffins', 'Croissants'
  ],
  'Pantry Staples': [
    'Rice', 'Pasta', 'Flour', 'Sugar', 'Salt', 'Pepper', 'Olive Oil',
    'Vegetable Oil', 'Vinegar', 'Soy Sauce', 'Canned Tomatoes',
    'Canned Beans', 'Chicken Broth', 'Beef Broth'
  ],
  'Snacks': [
    'Crackers', 'Chips', 'Nuts', 'Peanut Butter', 'Jam', 'Honey',
    'Granola Bars', 'Popcorn'
  ],
  'Beverages': [
    'Coffee', 'Tea', 'Juice', 'Soda', 'Water', 'Beer', 'Wine'
  ],
  'Frozen': [
    'Frozen Vegetables', 'Frozen Fruit', 'Ice Cream', 'Frozen Pizza',
    'Frozen Chicken', 'Frozen Berries'
  ],
  'Condiments & Sauces': [
    'Ketchup', 'Mustard', 'Mayonnaise', 'Hot Sauce', 'BBQ Sauce',
    'Salad Dressing', 'Worcestershire Sauce'
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
  const [lastUsedLocation, setLastUsedLocation] = useState<string>('cupboard');
  
  // Track if we're switching contexts to prevent stale updates
  const contextSpaceIdRef = useRef(currentSpaceId);
  
  // Edit state
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [editForm, setEditForm] = useState({
    location: '',
    quantity: '',
    unit: '',
    notes: '',
    status: 'have' as 'have' | 'low' | 'out',
  });
  
  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string | null>(null);
  
  // Common items selection state
  const [showCommonItems, setShowCommonItems] = useState(false);
  const [selectedCommonItems, setSelectedCommonItems] = useState<Set<string>>(new Set());
  
  // Quantity editing state
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [quantityInput, setQuantityInput] = useState('');
  const quantityInputRef = useRef<HTMLInputElement>(null);
  
  // Makeable recipes modal state
  const [showMakeableRecipes, setShowMakeableRecipes] = useState(false);

  // Update ref when space changes
  useEffect(() => {
    contextSpaceIdRef.current = currentSpaceId;
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
  };

  const handleLocationSelect = async (location: string) => {
    if (!pendingFoodItem) return;

    try {
      await addPantryItem({
        householdId: currentSpaceId,
        foodItemId: pendingFoodItem.id,
        location: location,
        status: 'have',
      });
      setLastUsedLocation(location); // Remember for next time
      await loadPantryItems(getAbortSignal());
      setPendingFoodItem(null);
      showToast('success', 'Added to pantry');
    } catch (error) {
      console.error('Failed to add pantry item:', error);
      showToast('error', 'Failed to add item');
    }
  };

  const handleEditItem = (item: PantryItem) => {
    setEditingItem(item);
    setEditForm({
      location: item.location || 'cupboard',
      quantity: item.quantity || '',
      unit: item.unit || '',
      notes: item.notes || '',
      status: item.status || 'have',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      await updatePantryItem(editingItem.id, {
        location: editForm.location || null,
        quantity: editForm.quantity || null,
        unit: editForm.unit || null,
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

  const handleQuickLocationChange = async (itemId: string, newLocation: string) => {
    try {
      await updatePantryItem(itemId, { location: newLocation });
      await loadPantryItems(getAbortSignal());
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const handleQuantityEdit = (item: PantryItem) => {
    setEditingQuantityId(item.id);
    setQuantityInput(`${item.quantity || ''} ${item.unit || ''}`.trim());
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };

  const handleQuantitySave = async (itemId: string) => {
    const parts = quantityInput.trim().split(/\s+/);
    const quantity = parts[0] || '';
    const unit = parts.slice(1).join(' ') || '';

    try {
      await updatePantryItem(itemId, {
        quantity: quantity || null,
        unit: unit || null,
      });
      await loadPantryItems(getAbortSignal());
      setEditingQuantityId(null);
      setQuantityInput('');
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
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
          location: lastUsedLocation,
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

  const handleDeleteItem = async (id: string) => {
    try {
      await deletePantryItem(id);
      await loadPantryItems(getAbortSignal());
    } catch (error) {
      console.error('Failed to delete item:', error);
      showToast('error', 'Failed to delete item');
    }
  };

  const handleLocationChange = async (id: string, location: string) => {
    try {
      await updatePantryItem(id, { location });
      await loadPantryItems();
    } catch (error) {
      console.error('Failed to update location:', error);
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

  // Filter items by search query
  const filteredItems = pantryItems.filter(item => {
    const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
    const matchesSearch = !searchQuery || itemName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !selectedLocationFilter || (item.location || 'cupboard') === selectedLocationFilter;
    return matchesSearch && matchesLocation;
  });

  // Group filtered items by location
  const itemsByLocation = filteredItems.reduce((acc, item) => {
    const loc = item.location || 'cupboard';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(item);
    return acc;
  }, {} as Record<string, PantryItem[]>);

  // Location options for selector
  const locationOptions = [
    { key: 'fridge', label: 'Fridge', icon: Square, emoji: '🧊' },
    { key: 'freezer', label: 'Freezer', icon: Snowflake, emoji: '❄️' },
    { key: 'cupboard', label: 'Cupboard', icon: Box, emoji: '🧺' },
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
              onClick={() => setShowFoodPicker(true)}
              className="p-2 bg-stone-500 hover:bg-stone-600 text-white rounded-lg transition-colors"
              title="Add to pantry"
            >
              <Plus size={20} />
            </button>
          </div>
        }
      />

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
            {Object.entries(LOCATION_GROUPS).map(([key, info]) => {
              const LocationIcon = info.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedLocationFilter(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    selectedLocationFilter === key
                      ? 'bg-stone-500 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <LocationIcon size={12} />
                  {info.label}
                </button>
              );
            })}
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
            {Object.entries(LOCATION_GROUPS).map(([locationKey, locationInfo]) => {
              const items = itemsByLocation[locationKey] || [];
              if (items.length === 0) return null;

              const LocationIcon = locationInfo.icon;

              return (
                <div key={locationKey} className={`${locationInfo.color} rounded-lg p-3 border-2`}>
                  <div className="flex items-center gap-2 mb-2">
                    <LocationIcon size={16} className="text-stone-700" />
                    <h4 className="font-semibold text-sm text-stone-900">{locationInfo.label}</h4>
                    <span className="text-xs text-stone-600">({items.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((item) => {
                      const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
                      const isEditingQuantity = editingQuantityId === item.id;
                      const currentLocation = item.location || 'cupboard';
                      
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
                                  <input
                                    ref={isEditingQuantity ? quantityInputRef : null}
                                    type="text"
                                    value={quantityInput}
                                    onChange={(e) => setQuantityInput(e.target.value)}
                                    onBlur={() => handleQuantitySave(item.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleQuantitySave(item.id);
                                      } else if (e.key === 'Escape') {
                                        setEditingQuantityId(null);
                                        setQuantityInput('');
                                      }
                                    }}
                                    className="text-xs text-gray-500 border border-stone-300 rounded px-1.5 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-stone-500"
                                    placeholder="e.g., 2 tins"
                                    autoFocus
                                  />
                                ) : (
                                  <button
                                    onClick={() => handleQuantityEdit(item)}
                                    className="text-xs text-gray-500 hover:text-gray-700 text-left"
                                  >
                                    {item.quantity ? `${item.quantity} ${item.unit || ''}` : 'Add quantity'}
                                  </button>
                                )}
                                
                                {/* Quick Location Change */}
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const locations = ['fridge', 'freezer', 'cupboard'];
                                      const currentIndex = locations.indexOf(currentLocation);
                                      const nextIndex = (currentIndex + 1) % locations.length;
                                      handleQuickLocationChange(item.id, locations[nextIndex]);
                                    }}
                                    className="text-xs px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded flex items-center gap-1 transition-colors"
                                    title="Change location"
                                  >
                                    {(() => {
                                      const LocationIcon = LOCATION_GROUPS[currentLocation]?.icon;
                                      return LocationIcon ? <LocationIcon size={10} /> : null;
                                    })()}
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
                              onClick={() => handleDeleteItem(item.id)}
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

            {/* Items without location */}
            {itemsByLocation[''] && itemsByLocation[''].length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 border-2 border-gray-200">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Other</h4>
                <div className="space-y-1.5">
                  {itemsByLocation[''].map((item) => {
                    const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
                    const isEditingQuantity = editingQuantityId === item.id;
                    const currentLocation = item.location || 'cupboard';
                    
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
                                <input
                                  ref={isEditingQuantity ? quantityInputRef : null}
                                  type="text"
                                  value={quantityInput}
                                  onChange={(e) => setQuantityInput(e.target.value)}
                                  onBlur={() => handleQuantitySave(item.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleQuantitySave(item.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingQuantityId(null);
                                      setQuantityInput('');
                                    }
                                  }}
                                  className="text-xs text-gray-500 border border-stone-300 rounded px-1.5 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-stone-500"
                                  placeholder="e.g., 2 tins"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => handleQuantityEdit(item)}
                                  className="text-xs text-gray-500 hover:text-gray-700 text-left"
                                >
                                  {item.quantity ? `${item.quantity} ${item.unit || ''}` : 'Add quantity'}
                                </button>
                              )}
                              
                              {/* Quick Location Change */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const locations = ['fridge', 'freezer', 'cupboard'];
                                    const currentIndex = locations.indexOf(currentLocation);
                                    const nextIndex = (currentIndex + 1) % locations.length;
                                    handleQuickLocationChange(item.id, locations[nextIndex]);
                                  }}
                                  className="text-xs px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded flex items-center gap-1 transition-colors"
                                  title="Change location"
                                >
                                  {(() => {
                                    const LocationIcon = LOCATION_GROUPS[currentLocation]?.icon;
                                    return LocationIcon ? <LocationIcon size={10} /> : null;
                                  })()}
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
                            onClick={() => handleDeleteItem(item.id)}
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
            )}
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

      {/* Location Selector Modal */}
      {pendingFoodItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 safe-top safe-bottom">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Where is it?</h3>
              <p className="text-sm text-gray-600">
                {pendingFoodItem.emoji && <span className="text-lg mr-1">{pendingFoodItem.emoji}</span>}
                {pendingFoodItem.name}
              </p>
            </div>
            
            <div className="space-y-2 mb-4">
              {locationOptions.map((option) => {
                const OptionIcon = option.icon;
                const isSelected = option.key === lastUsedLocation;
                return (
                  <button
                    key={option.key}
                    onClick={() => handleLocationSelect(option.key)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                      isSelected
                        ? 'border-stone-500 bg-stone-50'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{option.label}</p>
                      {isSelected && (
                        <p className="text-xs text-stone-600">Last used</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setPendingFoodItem(null)}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
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
                <div className="grid grid-cols-3 gap-2">
                  {locationOptions.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <button
                        key={option.key}
                        onClick={() => setEditForm(prev => ({ ...prev, location: option.key }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          editForm.location === option.key
                            ? 'border-stone-500 bg-stone-50'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <span className="text-2xl block mb-1">{option.emoji}</span>
                        <p className="text-xs font-medium text-gray-700">{option.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="text"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="e.g., 2, half, a bit"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g., tins, cups, lbs"
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
    </div>
  );
}

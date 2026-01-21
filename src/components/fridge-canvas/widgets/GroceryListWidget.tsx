import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, X, AlertTriangle, Check, Sparkles, Lightbulb } from 'lucide-react';
import { getDietProfiles, sanitizeIngredientsForHousehold } from '../../../lib/mealFiltering';
import type { DietProfile, SanitizedIngredients, IngredientStatus } from '../../../lib/mealFiltering';
import type { WidgetViewMode } from '../../../lib/fridgeCanvasTypes';
import { 
  getGroceryItems, 
  addGroceryItem, 
  toggleItemChecked, 
  deleteGroceryItem,
  getOrCreateDefaultList,
  moveToPantry,
  type GroceryItem 
} from '../../../lib/intelligentGrocery';
import { FoodPicker } from '../../shared/FoodPicker';
import { getFoodItemName, getFoodItemNames, type FoodItem } from '../../../lib/foodItems';
import { isInPantry } from '../../../lib/foodAwareness';
import { showToast } from '../../Toast';
import { useSpaceContext } from '../../../hooks/useSpaceContext';
import { WidgetHeader } from '../../shared/WidgetHeader';

interface GroceryListContent {
  items: Array<{
    id: string;
    name: string;
    checked: boolean;
    quantity?: string;
    category?: string;
  }>;
}

interface GroceryListWidgetProps {
  householdId: string;
  viewMode: WidgetViewMode;
  content: GroceryListContent;
  onContentChange?: (content: GroceryListContent) => void;
}

export function GroceryListWidget({ householdId, viewMode, content, onContentChange }: GroceryListWidgetProps) {
  // Use centralized space context hook
  const {
    currentSpaceId,
    availableSpaces,
    setCurrentSpace,
    isLoading: spacesLoading,
    getAbortSignal,
    isSwitching,
  } = useSpaceContext(householdId);

  const [dietProfiles, setDietProfiles] = useState<DietProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sanitized, setSanitized] = useState<SanitizedIngredients | null>(null);
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [showSubstitutions, setShowSubstitutions] = useState(false);
  
  // Unified food system: Load from intelligentGrocery service
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [defaultListId, setDefaultListId] = useState<string | null>(null);
  const [foodItemNames, setFoodItemNames] = useState<Record<string, string>>({});
  
  // Track if we're switching contexts to prevent stale updates
  const contextSpaceIdRef = useRef(currentSpaceId);

  // Update ref when space changes
  useEffect(() => {
    contextSpaceIdRef.current = currentSpaceId;
  }, [currentSpaceId]);

  // Load default shopping list when space changes
  useEffect(() => {
    if (currentSpaceId && !isSwitching()) {
      getOrCreateDefaultList(currentSpaceId).then(list => {
        setDefaultListId(list.id);
      });
    }
  }, [currentSpaceId]);

  // Load grocery items from unified food system
  useEffect(() => {
    const abortSignal = getAbortSignal();
    
    if (!isSwitching() && defaultListId) {
      loadGroceryItems(abortSignal);
    }
    
    // Cleanup: reset edit states when context changes
    setShowFoodPicker(false);
    setShowSubstitutions(false);
    
    return () => {
      setGroceryItems([]);
    };
  }, [currentSpaceId, defaultListId]);

  // Load food item names for display
  useEffect(() => {
    if (groceryItems.length > 0) {
      const foodItemIds = groceryItems.map(item => item.food_item_id).filter(Boolean);
      getFoodItemNames(foodItemIds).then(names => {
        setFoodItemNames(names);
      });
    }
  }, [groceryItems]);

  useEffect(() => {
    if (!isSwitching()) {
      loadDietProfiles();
    }
  }, [currentSpaceId]);

  useEffect(() => {
    if (dietProfiles.length > 0 && groceryItems.length > 0) {
      const ingredients = groceryItems.map(item => item.food_item?.name || item.item_name || '');
      const result = sanitizeIngredientsForHousehold(ingredients, dietProfiles);
      setSanitized(result);
    }
  }, [groceryItems, dietProfiles]);

  const loadGroceryItems = async () => {
    try {
      setLoading(true);
      const items = await getGroceryItems(currentSpaceId, defaultListId || undefined);
      setGroceryItems(items);
      
      // Update widget content for backward compatibility
      if (onContentChange) {
        const contentItems = items.map(item => ({
          id: item.id,
          name: item.food_item?.name || item.item_name || 'Unknown Item',
          checked: item.checked,
          quantity: item.quantity || undefined,
          category: item.category,
        }));
        onContentChange({ items: contentItems });
      }
    } catch (error: any) {
      // Ignore aborted requests
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        return;
      }
      
      console.error('Failed to load grocery items:', error);
      showToast('error', 'Failed to load grocery list');
    } finally {
      // Only update loading state if context hasn't changed
      if (contextSpaceIdRef.current === expectedSpaceId) {
        setLoading(false);
      }
    }
  };

  const loadDietProfiles = async () => {
    setLoading(true);
    try {
      const profiles = await getDietProfiles(currentSpaceId);
      setDietProfiles(profiles);
    } catch (err) {
      console.error('Failed to load diet profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle food item selection from FoodPicker
  const handleFoodItemSelect = async (foodItem: FoodItem) => {
    try {
      // Check awareness (subtle hint, no blocking)
      const inPantry = await isInPantry(foodItem.id, currentSpaceId);
      
      await addGroceryItem({
        householdId: currentSpaceId,
        listId: defaultListId || undefined,
        foodItemId: foodItem.id,
      });
      await loadGroceryItems(getAbortSignal());
      setShowFoodPicker(false);
      
      // Subtle hint if already in pantry (no warning, just info)
      if (inPantry) {
        showToast('info', 'Added to list (you already have this in pantry)');
      }
    } catch (error) {
      console.error('Failed to add grocery item:', error);
      showToast('error', 'Failed to add item');
    }
  };

  const handleToggleItem = async (id: string) => {
    const item = groceryItems.find(i => i.id === id);
    if (!item) return;

    try {
      await toggleItemChecked(id, !item.checked);
      
      // If checking off, optionally prompt to add to pantry
      if (!item.checked) {
        const addToPantry = window.confirm('Add to pantry?');
        if (addToPantry) {
          await moveToPantry(item, currentSpaceId);
          await loadGroceryItems(getAbortSignal());
          showToast('success', 'Added to pantry');
          return;
        }
      }
      
      await loadGroceryItems(getAbortSignal());
    } catch (error) {
      console.error('Failed to toggle item:', error);
      showToast('error', 'Failed to update item');
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      await deleteGroceryItem(id);
      await loadGroceryItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
      showToast('error', 'Failed to delete item');
    }
  };

  const handleApplySubstitution = async (original: string, replacement: string) => {
    // Find the grocery item by name and replace with new food item
    const itemToReplace = groceryItems.find(item => 
      (item.food_item?.name || item.item_name) === original
    );
    
    if (!itemToReplace) return;

    try {
      // Get or create the replacement food item
      const { getOrCreateFoodItem } = await import('../../../lib/foodItems');
      const replacementFoodItem = await getOrCreateFoodItem(replacement);
      
      // Update the grocery item's food_item_id
      const { updateGroceryItem } = await import('../../../lib/intelligentGrocery');
      await updateGroceryItem(itemToReplace.id, { 
        food_item_id: replacementFoodItem.id 
      });
      
      await loadGroceryItems(getAbortSignal());
      showToast('success', 'Substitution applied');
    } catch (error) {
      console.error('Failed to apply substitution:', error);
      showToast('error', 'Failed to apply substitution');
    }
  };

  const getItemStatus = (foodItemId: string, itemName: string): IngredientStatus | undefined => {
    return sanitized?.conflicts.find(c => c.ingredient === itemName);
  };

  const getStatusColor = (status: IngredientStatus['status']) => {
    switch (status) {
      case 'allergen':
        return 'bg-red-100 border-red-500 text-red-900';
      case 'restricted':
        return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'avoid':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      default:
        return 'bg-white border-gray-200 text-gray-900';
    }
  };

  const conflictCount = sanitized?.conflicts.length || 0;
  const safeCount = sanitized?.safe.length || 0;

  if (viewMode === 'icon') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-teal-400 to-teal-600 border-teal-600 border-2 rounded-2xl flex flex-col items-center justify-center hover:scale-105 transition-all shadow-lg hover:shadow-xl group relative">
        <ShoppingCart size={36} className="text-white mb-1 group-hover:scale-110 transition-transform" />
        {groceryItems.length > 0 && (
          <div className="absolute top-1 right-1 bg-white text-teal-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
            {groceryItems.length}
          </div>
        )}
        {conflictCount > 0 && (
          <div className="absolute bottom-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
            !
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'mini') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-teal-50 to-teal-100 border-teal-300 border-2 rounded-2xl p-4 flex flex-col shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-teal-500 p-1.5 rounded-lg">
              <ShoppingCart size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-teal-900 text-sm">Grocery List</h3>
          </div>
          <span className="text-xs font-semibold text-teal-600 bg-teal-200 px-2 py-0.5 rounded-full">
            {groceryItems.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-xs text-teal-600 italic animate-pulse">Loading...</div>
          </div>
        ) : (
          <div className="space-y-2 flex-1 overflow-hidden">
            {conflictCount > 0 && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-2 flex items-start gap-1.5">
                <AlertTriangle size={12} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 font-medium">{conflictCount} item{conflictCount !== 1 ? 's' : ''} with conflicts</p>
              </div>
            )}

            {groceryItems.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-600">Empty list</p>
                <p className="text-xs text-teal-600 mt-1">Add items to get started</p>
              </div>
            ) : (
              <div className="space-y-1 overflow-y-auto max-h-[80px]">
                {groceryItems.slice(0, 4).map((item) => {
                  const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
                  const status = getItemStatus(item.food_item_id, itemName);
                  return (
                    <div key={item.id} className="flex items-center gap-1.5 text-xs">
                      {status ? (
                        <AlertTriangle size={10} className="text-red-600 flex-shrink-0" />
                      ) : (
                        <Check size={10} className="text-green-600 flex-shrink-0" />
                      )}
                      <span className={`truncate ${item.checked ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                        {itemName}
                      </span>
                    </div>
                  );
                })}
                {groceryItems.length > 4 && (
                  <p className="text-xs text-gray-500 text-center mt-1">+{groceryItems.length - 4} more</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-teal-50 to-teal-100 border-teal-300 border-2 rounded-2xl p-6 flex flex-col shadow-lg">
      <WidgetHeader
        icon={
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
            <ShoppingCart size={24} className="text-white" />
          </div>
        }
        title="Grocery List"
        subtitle={
          (loading || spacesLoading) ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            `${groceryItems.length} items • ${safeCount} safe • ${conflictCount} conflicts`
          )
        }
        currentSpaceId={currentSpaceId}
        onSpaceChange={setCurrentSpace}
        availableSpaces={availableSpaces}
        showSpaceSwitcher={availableSpaces.length > 1 && !spacesLoading}
      />

      {!loading && conflictCount > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">Dietary Conflicts Detected</p>
              <p className="text-xs text-red-700 mt-0.5">{conflictCount} item{conflictCount !== 1 ? 's' : ''} may not be suitable for all household members</p>
            </div>
          </div>
          <button
            onClick={() => setShowSubstitutions(!showSubstitutions)}
            className="text-xs text-red-700 hover:text-red-800 font-medium underline flex items-center gap-1"
          >
            <Lightbulb size={12} />
            {showSubstitutions ? 'Hide' : 'View'} suggested substitutions
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowFoodPicker(true)}
          className="flex-1 px-3 py-2 border-2 border-teal-300 rounded-lg text-sm text-gray-600 hover:border-teal-500 hover:text-teal-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Add food item...</span>
        </button>
      </div>

      {/* FoodPicker Modal */}
      <FoodPicker
        isOpen={showFoodPicker}
        onClose={() => setShowFoodPicker(false)}
        onSelect={handleFoodItemSelect}
        householdId={currentSpaceId}
        excludeIds={groceryItems.map(item => item.food_item_id).filter(Boolean)}
        placeholder="Search for a food item..."
        title="Add to Grocery List"
        showAwareness={true}
      />

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent">
        {groceryItems.length === 0 ? (
          <div className="text-center py-10">
            <div className="bg-teal-200 w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-base text-gray-700 font-semibold mb-1">Your list is empty</p>
            <p className="text-sm text-teal-600">Add items to start shopping</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groceryItems.map((item) => {
              const itemName = item.food_item?.name || item.item_name || 'Unknown Item';
              const status = getItemStatus(item.food_item_id, itemName);
              const statusColors = status ? getStatusColor(status.status) : 'bg-white border-gray-200';

              return (
                <div key={item.id} className={`${statusColors} rounded-lg p-3 border-2 transition-all`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleToggleItem(item.id)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {item.food_item?.emoji && (
                            <span className="text-base flex-shrink-0">{item.food_item.emoji}</span>
                          )}
                          <p className={`font-semibold text-sm truncate ${item.checked ? 'line-through opacity-50' : ''}`}>
                            {itemName}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {item.quantity && (
                        <p className="text-xs text-gray-500 mt-1">{item.quantity} {item.unit || ''}</p>
                      )}

                      {status && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-medium">{status.reason}</p>
                          </div>

                          {status.suggestion && (
                            <div className="flex items-start gap-1.5 bg-white/60 p-2 rounded">
                              <Sparkles size={12} className="text-teal-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-teal-900">Suggested: {status.suggestion}</p>
                                <button
                                  onClick={async () => {
                                    // Apply substitution by creating new food item and replacing
                                    const { getOrCreateFoodItem } = await import('../../../lib/foodItems');
                                    const newFoodItem = await getOrCreateFoodItem(status.suggestion!);
                                    // Note: This would require updating the grocery item's food_item_id
                                    // For now, just show a message
                                    showToast('info', 'Substitution feature coming soon');
                                  }}
                                  className="text-xs text-teal-600 hover:text-teal-700 font-medium underline mt-1"
                                >
                                  Apply substitution
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSubstitutions && sanitized && sanitized.suggestions.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Suggested Substitutions</h3>
                <button
                  onClick={() => setShowSubstitutions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-sm text-gray-600">Safe alternatives for your household</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="space-y-3">
                {sanitized.suggestions.map((sub, idx) => (
                  <div key={idx} className="bg-teal-50 border border-teal-300 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 line-through">{sub.original}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Sparkles size={14} className="text-teal-600" />
                          <p className="text-sm font-bold text-teal-900">{sub.replacement}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{sub.reason}</p>
                    <button
                      onClick={() => {
                        handleApplySubstitution(sub.original, sub.replacement);
                        setShowSubstitutions(false);
                      }}
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                    >
                      Apply Substitution
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

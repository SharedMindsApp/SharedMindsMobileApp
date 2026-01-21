/**
 * Shared Food Picker Component
 * 
 * Single component for selecting/creating food items.
 * Used by Pantry, Grocery List, and Meal Planner.
 * 
 * ADHD-First Principles:
 * - Fast search with fuzzy matching
 * - Recently used items shown first
 * - No pressure to be precise
 * - Visual feedback with emojis
 */

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Clock, X } from 'lucide-react';
import { 
  searchFoodItems, 
  getRecentlyUsedFoodItems, 
  getOrCreateFoodItem,
  type FoodItem,
  type FoodItemWithUsage 
} from '../../lib/foodItems';
import { getFoodAwarenessBatch, type FoodAwarenessMap } from '../../lib/foodAwareness';

interface FoodPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (foodItem: FoodItem) => void;
  householdId: string;
  excludeIds?: string[]; // Food items to exclude from suggestions
  placeholder?: string;
  title?: string;
  showAwareness?: boolean; // Show awareness hints (optional)
}

// Category emojis for visual identification
const CATEGORY_EMOJIS: Record<string, string> = {
  produce: '🥬',
  dairy: '🥛',
  meat: '🥩',
  pantry: '🥫',
  frozen: '🧊',
  bakery: '🍞',
  beverages: '🥤',
  snacks: '🍿',
  household: '🧻',
  other: '📦',
};

export function FoodPicker({
  isOpen,
  onClose,
  onSelect,
  householdId,
  excludeIds = [],
  placeholder = 'Search for a food item...',
  title = 'Select Food Item',
  showAwareness = false,
}: FoodPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [recentItems, setRecentItems] = useState<FoodItemWithUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [awarenessMap, setAwarenessMap] = useState<FoodAwarenessMap>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadRecentItems();
      // Focus input after a brief delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
    } else {
      setSearchQuery('');
      setSearchResults([]);
      setShowCreateNew(false);
      setAwarenessMap({});
    }
  }, [isOpen, householdId, showAwareness]);

  useEffect(() => {
    if (!isOpen) return;

    const searchTimeout = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setSearchResults([]);
        setShowCreateNew(false);
      }
    }, 300); // Debounce search

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, isOpen]);

  const loadRecentItems = async () => {
    try {
      const recent = await getRecentlyUsedFoodItems(householdId, 8);
      const filtered = recent.filter(item => !excludeIds.includes(item.id));
      setRecentItems(filtered);
      
      // Load awareness for recent items if enabled
      if (showAwareness && householdId && filtered.length > 0) {
        const foodItemIds = filtered.map(item => item.id);
        try {
          const awareness = await getFoodAwarenessBatch(foodItemIds, householdId);
          setAwarenessMap(prev => ({ ...prev, ...awareness }));
        } catch (error) {
          console.error('Error loading recent awareness:', error);
          // Silent fail - awareness is optional
        }
      }
    } catch (error) {
      console.error('Error loading recent items:', error);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowCreateNew(false);
      return;
    }

    setLoading(true);
    try {
      const results = await searchFoodItems(searchQuery, 10);
      const filtered = results.filter(item => !excludeIds.includes(item.id));
      setSearchResults(filtered);
      
      // Load awareness if enabled
      if (showAwareness && householdId && filtered.length > 0) {
        const foodItemIds = filtered.map(item => item.id);
        const awareness = await getFoodAwarenessBatch(foodItemIds, householdId);
        setAwarenessMap(awareness);
      }
      
      // Show "create new" option if no exact match
      const exactMatch = filtered.some(
        item => item.normalized_name === searchQuery.toLowerCase().trim()
      );
      setShowCreateNew(!exactMatch && searchQuery.trim().length > 0);
    } catch (error) {
      console.error('Error searching food items:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (item: FoodItem) => {
    onSelect(item);
    onClose();
  };

  const handleCreateNew = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const newItem = await getOrCreateFoodItem(searchQuery.trim());
      handleSelect(newItem);
    } catch (error) {
      console.error('Error creating food item:', error);
      alert('Failed to create food item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryEmoji = (category: string | null): string => {
    if (!category) return CATEGORY_EMOJIS.other;
    const key = category.toLowerCase();
    return CATEGORY_EMOJIS[key] || CATEGORY_EMOJIS.other;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 safe-top safe-bottom">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && searchQuery && (
            <div className="text-center py-8 text-gray-500">Searching...</div>
          )}

          {/* Search Results */}
          {!loading && searchQuery && searchResults.length > 0 && (
            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Search Results</h3>
              {searchResults.map((item) => {
                const awareness = showAwareness ? awarenessMap[item.id] : undefined;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full text-left p-3 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-colors flex items-center gap-3"
                  >
                    <span className="text-2xl">{item.emoji || getCategoryEmoji(item.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.category && (
                          <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                        )}
                        {awareness?.inPantry && (
                          <span className="text-xs text-gray-400 italic">• You already have this</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Create New Option */}
          {!loading && showCreateNew && (
            <button
              onClick={handleCreateNew}
              className="w-full p-3 rounded-lg border-2 border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-50 transition-colors flex items-center gap-3 text-left mb-4"
            >
              <Plus size={20} className="text-orange-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Create "{searchQuery.trim()}"</p>
                <p className="text-xs text-gray-500">Add as new food item</p>
              </div>
            </button>
          )}

          {/* Recent Items */}
          {!searchQuery && recentItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-gray-400" />
                <h3 className="text-sm font-medium text-gray-700">Recently Used</h3>
              </div>
              {recentItems.map((item) => {
                const awareness = showAwareness ? awarenessMap[item.id] : undefined;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full text-left p-3 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-colors flex items-center gap-3"
                  >
                    <span className="text-2xl">{item.emoji || getCategoryEmoji(item.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.category && (
                          <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                        )}
                        {awareness?.inPantry && (
                          <span className="text-xs text-gray-400 italic">• You already have this</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty States */}
          {!loading && !searchQuery && recentItems.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">No recent items</p>
              <p className="text-sm">Start typing to search for food items</p>
            </div>
          )}

          {!loading && searchQuery && searchResults.length === 0 && !showCreateNew && (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">No results found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

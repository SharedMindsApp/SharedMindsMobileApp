import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, X, AlertTriangle, Check, Sparkles, Lightbulb } from 'lucide-react';
import { getDietProfiles, sanitizeIngredientsForHousehold } from '../../../lib/mealFiltering';
import type { DietProfile, SanitizedIngredients, IngredientStatus } from '../../../lib/mealFiltering';
import type { WidgetViewMode } from '../../../lib/fridgeCanvasTypes';

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
  const [dietProfiles, setDietProfiles] = useState<DietProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sanitized, setSanitized] = useState<SanitizedIngredients | null>(null);
  const [newItem, setNewItem] = useState('');
  const [showSubstitutions, setShowSubstitutions] = useState(false);

  useEffect(() => {
    loadDietProfiles();
  }, [householdId]);

  useEffect(() => {
    if (dietProfiles.length > 0) {
      const ingredients = content.items.map(item => item.name);
      const result = sanitizeIngredientsForHousehold(ingredients, dietProfiles);
      setSanitized(result);
    }
  }, [content.items, dietProfiles]);

  const loadDietProfiles = async () => {
    setLoading(true);
    try {
      const profiles = await getDietProfiles(householdId);
      setDietProfiles(profiles);
    } catch (err) {
      console.error('Failed to load diet profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;

    const newItemObj = {
      id: crypto.randomUUID(),
      name: newItem.trim(),
      checked: false
    };

    if (onContentChange) {
      onContentChange({
        ...content,
        items: [...content.items, newItemObj]
      });
    }

    setNewItem('');
  };

  const handleToggleItem = (id: string) => {
    if (onContentChange) {
      onContentChange({
        ...content,
        items: content.items.map(item =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      });
    }
  };

  const handleRemoveItem = (id: string) => {
    if (onContentChange) {
      onContentChange({
        ...content,
        items: content.items.filter(item => item.id !== id)
      });
    }
  };

  const handleApplySubstitution = (original: string, replacement: string) => {
    if (onContentChange) {
      onContentChange({
        ...content,
        items: content.items.map(item =>
          item.name === original ? { ...item, name: replacement } : item
        )
      });
    }
  };

  const getItemStatus = (itemName: string): IngredientStatus | undefined => {
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
        {content.items.length > 0 && (
          <div className="absolute top-1 right-1 bg-white text-teal-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
            {content.items.length}
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
            {content.items.length}
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

            {content.items.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-600">Empty list</p>
                <p className="text-xs text-teal-600 mt-1">Add items to get started</p>
              </div>
            ) : (
              <div className="space-y-1 overflow-y-auto max-h-[80px]">
                {content.items.slice(0, 4).map((item) => {
                  const status = getItemStatus(item.name);
                  return (
                    <div key={item.id} className="flex items-center gap-1.5 text-xs">
                      {status ? (
                        <AlertTriangle size={10} className="text-red-600 flex-shrink-0" />
                      ) : (
                        <Check size={10} className="text-green-600 flex-shrink-0" />
                      )}
                      <span className={`truncate ${item.checked ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                        {item.name}
                      </span>
                    </div>
                  );
                })}
                {content.items.length > 4 && (
                  <p className="text-xs text-gray-500 text-center mt-1">+{content.items.length - 4} more</p>
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
            <ShoppingCart size={24} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-teal-900 text-lg">Grocery List</h3>
            <p className="text-xs text-teal-700 font-medium">
              {loading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                `${content.items.length} items • ${safeCount} safe • ${conflictCount} conflicts`
              )}
            </p>
          </div>
        </div>
      </div>

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
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          placeholder="Add item..."
          className="flex-1 px-3 py-2 border-2 border-teal-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
        />
        <button
          onClick={handleAddItem}
          className="p-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
          title="Add item"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-transparent">
        {content.items.length === 0 ? (
          <div className="text-center py-10">
            <div className="bg-teal-200 w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-teal-600" />
            </div>
            <p className="text-base text-gray-700 font-semibold mb-1">Your list is empty</p>
            <p className="text-sm text-teal-600">Add items to start shopping</p>
          </div>
        ) : (
          <div className="space-y-2">
            {content.items.map((item) => {
              const status = getItemStatus(item.name);
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
                        <p className={`font-semibold text-sm ${item.checked ? 'line-through opacity-50' : ''}`}>
                          {item.name}
                        </p>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={16} />
                        </button>
                      </div>

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
                                  onClick={() => handleApplySubstitution(item.name, status.suggestion!)}
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

/**
 * MakeableRecipesModal Component
 * 
 * Shared modal for "What Can I Make?" functionality.
 * Used by both PantryWidget and MealPlannerWidget.
 * 
 * ADHD-First Principles:
 * - No pressure, no warnings
 * - Clear distinction between "can make" and "almost"
 * - Optional actions only
 * - No auto-planning or auto-adding
 */

import { useState, useEffect } from 'react';
import { X, UtensilsCrossed, ChefHat, Clock, Sparkles, ChevronDown, ChevronUp, Plus, Eye } from 'lucide-react';
import { getMakeableRecipes, type GetMakeableRecipesResult } from '../../lib/foodIntelligence';
import { getWeekStartDate, addMealToPlan, type MealLibraryItem } from '../../lib/mealPlanner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../Toast';

interface MakeableRecipesModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onRecipeSelect?: (recipe: MealLibraryItem) => void;
  onAddToMealPlan?: (recipe: MealLibraryItem) => void;
}

export function MakeableRecipesModal({
  isOpen,
  onClose,
  spaceId,
  onRecipeSelect,
  onAddToMealPlan,
}: MakeableRecipesModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<GetMakeableRecipesResult | null>(null);
  const [showAlmost, setShowAlmost] = useState(false);
  const [addingToPlan, setAddingToPlan] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && spaceId) {
      loadMakeableRecipes();
    } else {
      setResults(null);
      setShowAlmost(false);
    }
  }, [isOpen, spaceId]);

  const loadMakeableRecipes = async () => {
    setLoading(true);
    try {
      const data = await getMakeableRecipes(spaceId, {
        includePartial: true,
        partialThreshold: 0.8,
      });
      setResults(data);
    } catch (error) {
      console.error('Failed to load makeable recipes:', error);
      showToast('error', 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToMealPlan = async (recipe: MealLibraryItem) => {
    if (!user) {
      showToast('info', 'Please sign in to plan meals');
      return;
    }

    setAddingToPlan(recipe.id);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        showToast('error', 'Profile not found');
        return;
      }

      const weekStartDate = getWeekStartDate();
      
      // Add to today (day 0 = Sunday, adjust based on current day)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

      await addMealToPlan(
        spaceId,
        recipe.id,
        null,
        recipe.meal_type,
        dayOfWeek,
        weekStartDate,
        profile.id
      );

      showToast('success', `Added ${recipe.name} to meal plan`);
      
      // Call optional callback
      if (onAddToMealPlan) {
        onAddToMealPlan(recipe);
      }
    } catch (error) {
      console.error('Failed to add meal to plan:', error);
      showToast('error', 'Failed to add meal to plan');
    } finally {
      setAddingToPlan(null);
    }
  };

  const handleViewRecipe = (recipe: MealLibraryItem) => {
    if (onRecipeSelect) {
      onRecipeSelect(recipe);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">What you can make right now</h2>
                <p className="text-orange-100 text-sm mt-0.5">
                  Based on what's in your pantry
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-xl p-2 transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Finding recipes...</p>
              </div>
            </div>
          ) : !results ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No results available</p>
            </div>
          ) : (
            <>
              {/* Can Make Now Section */}
              {results.canMakeNow.length > 0 ? (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ChefHat size={20} className="text-green-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      You can make {results.canMakeNow.length} recipe{results.canMakeNow.length !== 1 ? 's' : ''}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.canMakeNow.map(({ recipe }) => (
                      <div
                        key={recipe.id}
                        className="bg-white border-2 border-green-200 rounded-xl p-4 hover:border-green-300 transition-all shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-gray-900 text-lg">{recipe.name}</h4>
                          {recipe.image_url && (
                            <img
                              src={recipe.image_url}
                              alt={recipe.name}
                              className="w-16 h-16 object-cover rounded-lg ml-2"
                            />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                          <span className="capitalize px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                            {recipe.meal_type}
                          </span>
                          {recipe.prep_time && recipe.cook_time && (
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              <span>{recipe.prep_time + recipe.cook_time} min</span>
                            </div>
                          )}
                          {recipe.difficulty && (
                            <span className="capitalize text-xs">
                              {recipe.difficulty}
                            </span>
                          )}
                        </div>

                        {recipe.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {recipe.categories.slice(0, 3).map(cat => (
                              <span
                                key={cat}
                                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded"
                              >
                                {cat.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewRecipe(recipe)}
                            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                          >
                            <Eye size={16} />
                            View recipe
                          </button>
                          <button
                            onClick={() => handleAddToMealPlan(recipe)}
                            disabled={addingToPlan === recipe.id}
                            className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addingToPlan === recipe.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Adding...
                              </>
                            ) : (
                              <>
                                <Plus size={16} />
                                Plan this meal
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 mb-6">
                  <UtensilsCrossed size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    No recipes match your pantry right now
                  </p>
                  <p className="text-sm text-gray-500">
                    Add more items to your pantry to see recipe suggestions
                  </p>
                </div>
              )}

              {/* Almost Can Make Section (Collapsible) */}
              {results.almostCanMake.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <button
                    onClick={() => setShowAlmost(!showAlmost)}
                    className="w-full flex items-center justify-between mb-4 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-orange-500" />
                      <h3 className="text-base font-semibold text-gray-900">
                        Almost possible ({results.almostCanMake.length})
                      </h3>
                      <span className="text-xs text-gray-500 ml-2">
                        These only need a couple of extra items
                      </span>
                    </div>
                    {showAlmost ? (
                      <ChevronUp size={20} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-500" />
                    )}
                  </button>

                  {showAlmost && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.almostCanMake.map(({ recipe, missingCount, totalRequired }) => (
                        <div
                          key={recipe.id}
                          className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-gray-900">{recipe.name}</h4>
                            {recipe.image_url && (
                              <img
                                src={recipe.image_url}
                                alt={recipe.name}
                                className="w-12 h-12 object-cover rounded-lg ml-2"
                              />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <span className="capitalize px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-medium text-xs">
                              {recipe.meal_type}
                            </span>
                            <span className="text-gray-500">
                              {totalRequired - missingCount}/{totalRequired} ingredients
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewRecipe(recipe)}
                              className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                            >
                              <Eye size={16} />
                              View recipe
                            </button>
                            <button
                              onClick={() => handleAddToMealPlan(recipe)}
                              disabled={addingToPlan === recipe.id}
                              className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {addingToPlan === recipe.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Plus size={16} />
                                  Plan this meal
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

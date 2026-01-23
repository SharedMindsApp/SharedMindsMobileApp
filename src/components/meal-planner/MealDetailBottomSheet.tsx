/**
 * MealDetailBottomSheet - View meal details and actions
 * 
 * ADHD-first: calm, optional actions, no pressure
 */

import { useState } from 'react';
import { X, Clock, Edit, Trash2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { BottomSheet } from '../shared/BottomSheet';
import type { MealPlan, MealLibraryItem } from '../../lib/mealPlanner';

interface MealDetailBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mealPlan: MealPlan;
  onReplace: () => void;
  onRemove: () => void;
  onViewRecipe?: () => void;
}

export function MealDetailBottomSheet({
  isOpen,
  onClose,
  mealPlan,
  onReplace,
  onRemove,
  onViewRecipe,
}: MealDetailBottomSheetProps) {
  const [showNutrition, setShowNutrition] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);

  const meal = mealPlan.meal;
  const mealName = meal?.name || mealPlan.custom_meal_name || 'Unnamed meal';

  const handleRemove = () => {
    if (window.confirm(`Remove "${mealName}" from your plan?`)) {
      onRemove();
      onClose();
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={mealName}
      maxHeight="85vh"
    >
      <div className="px-4 pb-4">
        {/* Meal Image */}
        {meal?.image_url && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img
              src={meal.image_url}
              alt={mealName}
              className="w-full h-48 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          {meal?.prep_time && (
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{meal.prep_time + (meal.cook_time || 0)} min</span>
            </div>
          )}
          {meal?.servings && (
            <span>{meal.servings} servings</span>
          )}
        </div>

        {/* Categories/Tags */}
        {meal?.categories && meal.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {meal.categories.map(cat => (
              <span
                key={cat}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {cat.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Ingredients (Collapsible) */}
        {meal?.ingredients && meal.ingredients.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowIngredients(!showIngredients)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
            >
              <span className="font-medium text-gray-900">Ingredients</span>
              {showIngredients ? (
                <ChevronUp size={18} className="text-gray-500" />
              ) : (
                <ChevronDown size={18} className="text-gray-500" />
              )}
            </button>
            {showIngredients && (
              <div className="mt-2 pl-4 space-y-2">
                {meal.ingredients.map((ing, idx) => (
                  <div key={idx} className="text-sm text-gray-700">
                    {ing.quantity && ing.unit ? (
                      <span className="font-medium">{ing.quantity} {ing.unit}</span>
                    ) : ing.quantity ? (
                      <span className="font-medium">{ing.quantity}</span>
                    ) : null}
                    {ing.food_item_id ? (
                      <span className="ml-2">{/* Food item name would go here */}</span>
                    ) : ing.name ? (
                      <span className="ml-2">{ing.name}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Instructions (if available) */}
        {meal?.instructions && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Instructions</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{meal.instructions}</p>
          </div>
        )}

        {/* Nutrition (Hidden by default, ADHD-first) */}
        {meal && (meal.calories || meal.protein || meal.carbs || meal.fat) && (
          <div className="mb-4">
            <button
              onClick={() => setShowNutrition(!showNutrition)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
            >
              <span className="font-medium text-gray-900">Nutrition</span>
              {showNutrition ? (
                <ChevronUp size={18} className="text-gray-500" />
              ) : (
                <ChevronDown size={18} className="text-gray-500" />
              )}
            </button>
            {showNutrition && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                {meal.calories && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Calories</div>
                    <div className="text-lg font-semibold text-gray-900">{meal.calories}</div>
                  </div>
                )}
                {meal.protein && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Protein</div>
                    <div className="text-lg font-semibold text-gray-900">{meal.protein}g</div>
                  </div>
                )}
                {meal.carbs && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Carbs</div>
                    <div className="text-lg font-semibold text-gray-900">{meal.carbs}g</div>
                  </div>
                )}
                {meal.fat && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Fat</div>
                    <div className="text-lg font-semibold text-gray-900">{meal.fat}g</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-4 border-t border-gray-200">
          {/* Show View Recipe button if recipe_id exists (recipe from recipes table) - First priority */}
          {onViewRecipe && mealPlan.recipe_id && (
            <button
              onClick={() => {
                onViewRecipe();
                onClose();
              }}
              className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors touch-manipulation flex items-center justify-center gap-2"
            >
              <ExternalLink size={18} />
              View Full Recipe
            </button>
          )}

          <button
            onClick={() => {
              onReplace();
              onClose();
            }}
            className="w-full px-4 py-3 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 font-medium rounded-lg transition-colors touch-manipulation flex items-center justify-center gap-2"
          >
            <Edit size={18} />
            Replace Meal
          </button>

          <button
            onClick={handleRemove}
            className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 font-medium rounded-lg transition-colors touch-manipulation flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            Remove from Plan
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

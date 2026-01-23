/**
 * RecipeDetail - Component for displaying recipe details
 * 
 * Shows full recipe information with ingredients, instructions, and metadata
 * ADHD-first design: clear, calm, no pressure
 */

import { useState, useEffect } from 'react';
import { Clock, Users, ChefHat, Edit, Trash2, X, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, HelpCircle, TrendingUp, Eye, Package, Calendar } from 'lucide-react';
import type { Recipe } from '../../lib/recipeGeneratorTypes';
import { getFoodItemsByIds, type FoodItem } from '../../lib/foodItems';
import { getValidationStatus, type RecipeValidationStatus } from '../../lib/recipeValidationService';
import { getRecipeUsageStats, trackRecipeView, type RecipeUsageStats } from '../../lib/recipeUsageStatsService';
import { RecipeFeedback } from './RecipeFeedback';
import { useUIPreferences } from '../../contexts/UIPreferencesContext';
import { convertIngredientForDisplay } from '../../lib/unitConversion';
import { MealPrepModal } from '../meal-planner/MealPrepModal';
import { AddRecipeToMealModal } from '../meal-planner/AddRecipeToMealModal';

interface RecipeDetailProps {
  recipe: Recipe;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  showActions?: boolean;
  isEditable?: boolean;
  spaceId?: string; // Optional spaceId for meal prep
}

export function RecipeDetail({
  recipe,
  onEdit,
  onDelete,
  onClose,
  showActions = true,
  isEditable = false,
  spaceId,
}: RecipeDetailProps) {
  const { measurementSystem } = useUIPreferences();
  const [foodItemMap, setFoodItemMap] = useState<Map<string, FoodItem>>(new Map());
  const [showNutrition, setShowNutrition] = useState(false);
  const [validationStatus, setValidationStatus] = useState<RecipeValidationStatus | null>(null);
  const [usageStats, setUsageStats] = useState<RecipeUsageStats | null>(null);
  const [showMealPrepModal, setShowMealPrepModal] = useState(false);
  const [showAddToMealModal, setShowAddToMealModal] = useState(false);

  useEffect(() => {
    const loadFoodItems = async () => {
      const foodItemIds = recipe.ingredients.map(ing => ing.food_item_id);
      if (foodItemIds.length === 0) return;

      const items = await getFoodItemsByIds(foodItemIds);
      const map = new Map(items.map(item => [item.id, item]));
      setFoodItemMap(map);
    };

    const loadValidationStatus = async () => {
      try {
        const status = await getValidationStatus(recipe.id);
        setValidationStatus(status);
      } catch (error) {
        console.error('Error loading validation status:', error);
      }
    };

    const loadUsageStats = async () => {
      try {
        const stats = await getRecipeUsageStats(recipe.id, recipe.household_id || undefined);
        setUsageStats(stats);
      } catch (error) {
        console.error('Error loading usage stats:', error);
      }
    };

    const trackView = async () => {
      try {
        await trackRecipeView(recipe.id, recipe.household_id || undefined);
        await loadUsageStats(); // Refresh stats
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };

    loadFoodItems();
    loadValidationStatus();
    loadUsageStats();
    trackView(); // Track that recipe was viewed
  }, [recipe.ingredients, recipe.id, recipe.household_id]);

  const getFoodItemName = (foodItemId: string): string => {
    return foodItemMap.get(foodItemId)?.name || 'Loading...';
  };

  const getFoodItemEmoji = (foodItemId: string): string | null => {
    return foodItemMap.get(foodItemId)?.emoji || null;
  };

  const formatTime = (minutes: number | null | undefined): string => {
    if (!minutes) return 'Not specified';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const CUISINE_LABELS: Record<string, string> = {
    italian: 'Italian',
    indian: 'Indian',
    chinese: 'Chinese',
    thai: 'Thai',
    british: 'British',
    american: 'American',
    mexican: 'Mexican',
    mediterranean: 'Mediterranean',
    japanese: 'Japanese',
    french: 'French',
    greek: 'Greek',
    korean: 'Korean',
  };

  const DIFFICULTY_LABELS: Record<string, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  };

  const CATEGORY_LABELS: Record<string, string> = {
    home_cooked: 'Home Cooked',
    healthy: 'Healthy',
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    gluten_free: 'Gluten Free',
    high_protein: 'High Protein',
    budget_friendly: 'Budget Friendly',
    takeaway: 'Takeaway',
  };

  const getStatusBadge = () => {
    const status = validationStatus?.status || recipe.validation_status;
    const qualityScore = validationStatus?.quality_score || recipe.quality_score;

    const statusConfig = {
      approved: { 
        label: 'Approved', 
        icon: CheckCircle2, 
        color: 'bg-green-100 text-green-700 border-green-200' 
      },
      pending: { 
        label: 'Pending Review', 
        icon: HelpCircle, 
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200' 
      },
      needs_review: { 
        label: 'Needs Review', 
        icon: AlertTriangle, 
        color: 'bg-orange-100 text-orange-700 border-orange-200' 
      },
      draft: { 
        label: 'Draft', 
        icon: HelpCircle, 
        color: 'bg-gray-100 text-gray-700 border-gray-200' 
      },
      deprecated: { 
        label: 'Deprecated', 
        icon: AlertTriangle, 
        color: 'bg-red-100 text-red-700 border-red-200' 
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border ${config.color}`}>
        <Icon size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />
        <span className="whitespace-nowrap">{config.label}</span>
        {qualityScore !== null && (
          <span className="ml-0.5 sm:ml-1 opacity-75 whitespace-nowrap">({(qualityScore * 100).toFixed(0)}%)</span>
        )}
      </div>
    );
  };

  // Parse instructions into individual steps
  const parseInstructions = (instructions: string): string[] => {
    if (!instructions) return [];

    // Try to split by numbered patterns (1., 2., etc.)
    const numberedPattern = /^\d+[\.\)]\s*/m;
    if (numberedPattern.test(instructions)) {
      return instructions
        .split(numberedPattern)
        .map(step => step.trim())
        .filter(step => step.length > 0);
    }

    // Try to split by bullet points
    const bulletPattern = /^[-•*]\s*/m;
    if (bulletPattern.test(instructions)) {
      return instructions
        .split(bulletPattern)
        .map(step => step.trim())
        .filter(step => step.length > 0);
    }

    // Try to split by double newlines (paragraph breaks)
    const paragraphs = instructions.split(/\n\s*\n/);
    if (paragraphs.length > 1) {
      return paragraphs.map(step => step.trim()).filter(step => step.length > 0);
    }

    // Try to split by single newlines
    const lines = instructions.split(/\n/);
    if (lines.length > 1) {
      return lines.map(step => step.trim()).filter(step => step.length > 0);
    }

    // If all else fails, return as single step
    return [instructions.trim()];
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header - Mobile optimized */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-4 sm:px-6 py-4 sm:py-6 text-white relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <h2 className="text-2xl sm:text-3xl font-bold break-words pr-2">{recipe.name}</h2>
              <div className="flex-shrink-0">{getStatusBadge()}</div>
            </div>
            {recipe.description && (
              <p className="text-orange-100 text-sm sm:text-base leading-relaxed break-words">{recipe.description}</p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-1.5 sm:p-2 transition-colors flex-shrink-0 touch-manipulation"
              aria-label="Close recipe"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons - Top - Mobile optimized */}
      {spaceId && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Servings Reminder */}
            <div className="flex items-center gap-2 text-gray-700">
              <Users size={16} className="sm:w-[18px] sm:h-[18px] text-orange-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">
                Makes <span className="text-orange-600 font-semibold">{recipe.servings}</span> {recipe.servings === 1 ? 'serving' : 'servings'}
              </span>
            </div>
            
            {/* Action Buttons - Stack on mobile */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowAddToMealModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm touch-manipulation"
              >
                <Calendar size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Add to Meal</span>
              </button>
              <button
                onClick={() => setShowMealPrepModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-white border-2 border-orange-500 text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 text-sm touch-manipulation"
              >
                <Package size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Meal Prep</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        {/* Metadata Row - Mobile optimized grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {/* Prep Time - Mobile optimized */}
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="p-1.5 sm:p-2 bg-white rounded-lg flex-shrink-0">
              <Clock size={16} className="sm:w-5 sm:h-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Prep Time</div>
              <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                {formatTime(recipe.prep_time)}
              </div>
            </div>
          </div>
          
          {/* Cook Time - Mobile optimized */}
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="p-1.5 sm:p-2 bg-white rounded-lg flex-shrink-0">
              <Clock size={16} className="sm:w-5 sm:h-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Cook Time</div>
              <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                {formatTime(recipe.cook_time)}
              </div>
            </div>
          </div>
          
          {/* Total Time - Mobile optimized */}
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="p-1.5 sm:p-2 bg-white rounded-lg flex-shrink-0">
              <Clock size={16} className="sm:w-5 sm:h-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Total Time</div>
              <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                {formatTime(recipe.total_time || (recipe.prep_time && recipe.cook_time ? recipe.prep_time + recipe.cook_time : null))}
              </div>
            </div>
          </div>
          
          {/* Servings - Mobile optimized */}
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-orange-50 rounded-lg border-2 border-orange-200">
            <div className="p-1.5 sm:p-2 bg-white rounded-lg flex-shrink-0">
              <Users size={16} className="sm:w-5 sm:h-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs text-orange-600 font-semibold truncate">Servings</div>
              <div className="text-sm sm:text-base md:text-lg font-bold text-orange-700 break-words">{recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}</div>
            </div>
          </div>
          
          {/* Difficulty - Mobile optimized */}
          {recipe.difficulty && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="p-1.5 sm:p-2 bg-white rounded-lg flex-shrink-0">
                <ChefHat size={16} className="sm:w-5 sm:h-5 text-orange-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Difficulty</div>
                <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">{DIFFICULTY_LABELS[recipe.difficulty] || recipe.difficulty}</div>
              </div>
            </div>
          )}
          
          {/* Cuisine - Mobile optimized */}
          {recipe.cuisine && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Cuisine</div>
                <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">{CUISINE_LABELS[recipe.cuisine] || recipe.cuisine}</div>
              </div>
            </div>
          )}
        </div>

        {/* Categories */}
        {recipe.categories && recipe.categories.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-2">
              {recipe.categories.map(category => (
                <span
                  key={category}
                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium"
                >
                  {CATEGORY_LABELS[category] || category}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dietary Tags */}
        {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              {recipe.dietary_tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200"
                >
                  {tag.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients - Mobile optimized */}
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Ingredients</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {recipe.ingredients.map((ingredient, index) => {
              return (
                <div
                  key={index}
                  className={`flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border transition-all ${
                    ingredient.optional
                      ? 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-sm'
                  }`}
                >
                  {getFoodItemEmoji(ingredient.food_item_id) && (
                    <span className="text-xl sm:text-2xl flex-shrink-0">{getFoodItemEmoji(ingredient.food_item_id)}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className={`font-semibold text-sm sm:text-base break-words ${ingredient.optional ? 'text-gray-500' : 'text-gray-900'}`}>
                        {getFoodItemName(ingredient.food_item_id)}
                      </span>
                      {ingredient.optional && (
                        <span className="text-[10px] sm:text-xs text-gray-500 bg-gray-200 px-1.5 sm:px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                          Optional
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                      {(() => {
                        const converted = convertIngredientForDisplay(
                          { quantity: ingredient.quantity, unit: ingredient.unit },
                          measurementSystem
                        );
                        return (
                          <>
                            <span className="font-medium">{converted.value}</span>
                            {converted.unit && ` ${converted.unit}`}
                            {ingredient.notes && (
                              <span className="text-gray-500 italic"> • {ingredient.notes}</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Instructions - Mobile optimized */}
        {recipe.instructions && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Instructions</h3>
            <div className="space-y-3 sm:space-y-4">
              {parseInstructions(recipe.instructions).map((step, index) => (
                <div
                  key={index}
                  className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-sm transition-all"
                >
                  {/* Step Number - Mobile optimized */}
                  <div className="flex-shrink-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold text-xs sm:text-sm">
                      {index + 1}
                    </div>
                  </div>
                  {/* Step Content - Mobile optimized */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                      {step}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nutrition (collapsible) */}
        {(recipe.calories || recipe.protein || recipe.carbs || recipe.fat) && (
          <div>
            <button
              type="button"
              onClick={() => setShowNutrition(!showNutrition)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {showNutrition ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              Nutrition Information
            </button>
            {showNutrition && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                {recipe.calories && (
                  <div>
                    <div className="text-xs text-gray-500">Calories</div>
                    <div className="text-lg font-semibold text-gray-900">{recipe.calories}</div>
                  </div>
                )}
                {recipe.protein !== null && (
                  <div>
                    <div className="text-xs text-gray-500">Protein</div>
                    <div className="text-lg font-semibold text-gray-900">{recipe.protein}g</div>
                  </div>
                )}
                {recipe.carbs !== null && (
                  <div>
                    <div className="text-xs text-gray-500">Carbs</div>
                    <div className="text-lg font-semibold text-gray-900">{recipe.carbs}g</div>
                  </div>
                )}
                {recipe.fat !== null && (
                  <div>
                    <div className="text-xs text-gray-500">Fat</div>
                    <div className="text-lg font-semibold text-gray-900">{recipe.fat}g</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Usage Stats */}
        {usageStats && (
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {usageStats.popularity_score > 0 && (
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-orange-500" />
                  <div>
                    <div className="text-xs text-gray-500">Popularity</div>
                    <div className="font-semibold text-gray-900">
                      {Math.round(usageStats.popularity_score)}
                    </div>
                  </div>
                </div>
              )}
              {usageStats.times_viewed > 0 && (
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Views</div>
                    <div className="font-semibold text-gray-900">
                      {usageStats.times_viewed}
                    </div>
                  </div>
                </div>
              )}
              {usageStats.times_added_to_plan > 0 && (
                <div>
                  <div className="text-xs text-gray-500">Added to Plan</div>
                  <div className="font-semibold text-gray-900">
                    {usageStats.times_added_to_plan}x
                  </div>
                </div>
              )}
              {usageStats.times_made > 0 && (
                <div>
                  <div className="text-xs text-gray-500">Times Made</div>
                  <div className="font-semibold text-gray-900">
                    {usageStats.times_made}x
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feedback Section */}
        {recipe.household_id && (
          <div className="pt-4 border-t border-gray-200">
            <RecipeFeedback
              recipe={recipe}
              householdId={recipe.household_id}
            />
          </div>
        )}

        {/* Source Info */}
        {recipe.source && (
          <div className="pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Source: {recipe.source.source_name || recipe.source_type}
              {recipe.source.source_url && (
                <a
                  href={recipe.source.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:text-orange-700 ml-1"
                >
                  (View original)
                </a>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons - Bottom - Mobile optimized */}
        {spaceId && (
          <div className="pt-4 border-t border-gray-200">
            {/* Servings Reminder - Mobile optimized */}
            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-orange-800">
                <Users size={14} className="sm:w-4 sm:h-4 text-orange-600 flex-shrink-0" />
                <span className="break-words">
                  This recipe makes <span className="font-semibold">{recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}</span>
                </span>
              </div>
            </div>
            
            {/* Action Buttons - Stack on mobile */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowAddToMealModal(true)}
                className="w-full sm:flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
              >
                <Calendar size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                <span>Add to Meal Plan</span>
              </button>
              <button
                onClick={() => setShowMealPrepModal(true)}
                className="w-full sm:flex-1 px-4 py-3 bg-white border-2 border-orange-500 text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
              >
                <Package size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                <span>Meal Prep</span>
              </button>
            </div>
          </div>
        )}

        {/* Edit/Delete Actions */}
        {showActions && (isEditable && (onEdit || onDelete)) && (
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 px-4 py-2 border-2 border-orange-500 text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
              >
                <Edit size={18} />
                Edit Recipe
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-4 py-2 border-2 border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Meal Prep Modal */}
      {spaceId && (
        <MealPrepModal
          isOpen={showMealPrepModal}
          onClose={() => setShowMealPrepModal(false)}
          spaceId={spaceId}
          recipe={recipe}
          meal={null}
        />
      )}

      {/* Add to Meal Modal */}
      {spaceId && (
        <AddRecipeToMealModal
          isOpen={showAddToMealModal}
          onClose={() => setShowAddToMealModal(false)}
          recipe={recipe}
          spaceId={spaceId}
          onSuccess={() => {
            // Optionally refresh data or show success message
          }}
        />
      )}
    </div>
  );
}

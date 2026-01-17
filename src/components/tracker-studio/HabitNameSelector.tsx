/**
 * Habit Name Selector Component
 * 
 * Provides a tag-based UI for selecting habits from a predefined list.
 * Habits are displayed as selectable tags with icons, randomized order.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  List,
  type LucideIcon,
} from 'lucide-react';
import {
  HABIT_PRESETS,
  getRandomizedHabits,
  type HabitPreset,
} from '../../lib/trackerStudio/habitPresets';
import {
  Activity,
  Bed,
  BookOpen,
  Brain,
  Calendar,
  ChefHat,
  Coffee,
  Clock,
  DollarSign,
  Droplet,
  Footprints,
  GraduationCap,
  Hand,
  Heart,
  Home,
  Languages,
  MessageCircle,
  Moon,
  Music,
  Palette,
  PenTool,
  Phone,
  Pill,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Target,
  Trees,
  UtensilsCrossed,
  Wifi,
  Wind,
  X,
  Zap,
} from 'lucide-react';

// Icon mapping for habit presets
const ICON_MAP: Record<string, LucideIcon> = {
  Droplet,
  Pill,
  Activity,
  Heart,
  Sparkles,
  BookOpen,
  PenTool,
  GraduationCap,
  Target,
  Calendar,
  Zap, // For "Deep Work Session" (using Zap as focus/work icon)
  Smartphone,
  Wifi,
  Wind,
  Trees,
  Brain,
  Footprints,
  Bed,
  Home,
  ChefHat,
  Phone,
  Palette,
  Music,
  Languages,
  Moon,
  Coffee,
  // Icons for habits to break
  X, // Stop Smoking
  UtensilsCrossed, // No Fast Food, No Skipping Meals
  Hand, // Stop Nail Biting
  Clock, // Reduce Procrastination, No Snooze Button
  DollarSign, // Stop Overspending
  ShoppingCart, // No Impulse Purchases
  MessageCircle, // Stop Complaining
};

interface HabitNameSelectorProps {
  value: string;
  onChange: (habitName: string) => void;
  disabled?: boolean;
  theme?: {
    accentBg: string;
    borderColor: string;
    accentText: string;
  };
  allowFreeType?: boolean; // If true, shows input field with list selector button
}

export function HabitNameSelector({
  value,
  onChange,
  disabled = false,
  theme,
  allowFreeType = false,
}: HabitNameSelectorProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [favoriteHabits, setFavoriteHabits] = useState<string[]>([]);

  // Load favorite habits from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('habit_tracker_favorites');
      if (saved) {
        setFavoriteHabits(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load favorite habits:', err);
    }
  }, []);

  // Save favorite habits to localStorage
  const toggleFavorite = (habitName: string) => {
    const newFavorites = favoriteHabits.includes(habitName)
      ? favoriteHabits.filter(h => h !== habitName)
      : [...favoriteHabits, habitName];
    
    setFavoriteHabits(newFavorites);
    try {
      localStorage.setItem('habit_tracker_favorites', JSON.stringify(newFavorites));
    } catch (err) {
      console.error('Failed to save favorite habits:', err);
    }
  };

  // Get randomized habits, with favorites first
  const displayHabits = useMemo(() => {
    const randomized = getRandomizedHabits();
    const favorites = randomized.filter(h => favoriteHabits.includes(h.name));
    const nonFavorites = randomized.filter(h => !favoriteHabits.includes(h.name));
    return [...favorites, ...nonFavorites];
  }, [favoriteHabits]);

  const selectedPreset = useMemo(() => {
    return displayHabits.find(h => h.name === value);
  }, [displayHabits, value]);

  const IconComponent = selectedPreset ? ICON_MAP[selectedPreset.icon] || Activity : Activity;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-900">
        Habit Name <span className="text-red-500">*</span>
      </label>

      {/* Free Type Mode: Input with List Selector Button */}
      {allowFreeType ? (
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type a habit name or select from list..."
              disabled={disabled}
              className={`w-full px-4 py-3 pr-10 rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                theme?.borderColor || 'border-gray-300'
              } focus:border-blue-500 focus:ring-blue-500 bg-white`}
            />
            {value && !disabled && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                title="Clear"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => !disabled && setShowSelector(!showSelector)}
            disabled={disabled}
            className={`px-4 py-3 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              theme?.borderColor || 'border-gray-300'
            } ${theme?.accentBg || 'bg-gray-50'} hover:border-gray-400`}
            title="Browse habit list"
          >
            <List size={18} className="text-gray-500" />
          </button>
        </div>
      ) : (
        /* Tag Selection Mode: Button-based selection */
        <>
          {value ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => !disabled && setShowSelector(!showSelector)}
                disabled={disabled}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  theme?.borderColor || 'border-gray-300'
                } ${theme?.accentBg || 'bg-gray-50'} hover:border-gray-400`}
              >
                <IconComponent size={20} className={`${theme?.accentText || 'text-gray-700'}`} />
                <span className={`flex-1 text-left font-medium ${theme?.accentText || 'text-gray-900'}`}>
                  {value}
                </span>
                <List size={18} className="text-gray-500" />
              </button>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Clear selection"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => !disabled && setShowSelector(true)}
              disabled={disabled}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                theme?.borderColor || 'border-gray-300'
              } ${theme?.accentBg || 'bg-gray-50'} hover:border-gray-400`}
            >
              <List size={18} className="text-gray-500" />
              <span className="text-gray-600 font-medium">Select a habit</span>
            </button>
          )}
        </>
      )}

      {/* Habit Selector Modal */}
      {showSelector && !disabled && (
        <div className={`relative z-50 ${theme?.accentBg || 'bg-gray-50'} border-2 ${theme?.borderColor || 'border-gray-200'} rounded-xl p-4 space-y-3 mt-2`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Choose a Habit</h3>
            <button
              type="button"
              onClick={() => setShowSelector(false)}
              className="p-1 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Favorite Habits Section (if any) */}
          {favoriteHabits.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Favorites</p>
              <div className="flex flex-wrap gap-2">
                {displayHabits
                  .filter(h => favoriteHabits.includes(h.name))
                  .map((habit) => {
                    const HabitIcon = ICON_MAP[habit.icon] || Activity;
                    const isSelected = value === habit.name;
                    
                    return (
                      <button
                        key={habit.name}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onChange(habit.name);
                          setShowSelector(false);
                        }}
                        className={`group flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        <HabitIcon size={16} />
                        <span className="text-sm font-medium">{habit.name}</span>
                        {isSelected ? (
                          <CheckCircle2 size={16} className="text-white" />
                        ) : (
                          <Circle size={16} className="text-gray-400 group-hover:text-blue-400" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* All Habits Section */}
          <div>
            {favoriteHabits.length > 0 && (
              <p className="text-xs font-medium text-gray-600 mb-2">All Habits</p>
            )}
            <div className="flex flex-wrap gap-2">
              {displayHabits.map((habit) => {
                const HabitIcon = ICON_MAP[habit.icon] || Activity;
                const isSelected = value === habit.name;
                const isFavorite = favoriteHabits.includes(habit.name);
                
                return (
                  <button
                    key={habit.name}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(habit.name);
                      setShowSelector(false);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(habit.name);
                    }}
                    title={isFavorite ? 'Right-click to unfavorite' : 'Right-click to favorite'}
                    className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <HabitIcon size={16} />
                    <span className="text-sm font-medium">{habit.name}</span>
                    {isSelected ? (
                      <CheckCircle2 size={16} className="text-white" />
                    ) : (
                      <Circle size={16} className="text-gray-400 group-hover:text-blue-400" />
                    )}
                    {isFavorite && !isSelected && (
                      <span className="absolute -top-1 -right-1 text-xs">⭐</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Right-click any habit to favorite it
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

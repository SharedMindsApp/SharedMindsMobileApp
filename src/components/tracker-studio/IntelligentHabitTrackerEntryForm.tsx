/**
 * Intelligent Habit Tracker Entry Form
 * 
 * Enhanced entry form for Habit Tracker with smart suggestions,
 * pattern-based defaults, and auto-complete for habit names.
 */

import { useState, useEffect, useMemo } from 'react';
import { createEntry, updateEntry, getEntryByDate, listEntriesByDateRange } from '../../lib/trackerStudio/trackerEntryService';
import type { Tracker, TrackerEntry, TrackerFieldSchema } from '../../lib/trackerStudio/types';
import { Loader2, AlertCircle, CheckCircle2, X, Sparkles, Clock, Zap, Flame, TrendingUp, Copy, Bell, AlertTriangle, Lightbulb } from 'lucide-react';
import { HabitNameSelector } from './HabitNameSelector';
import { TrackerRelationshipSuggestion } from './TrackerRelationshipSuggestion';
import type { TrackerTheme } from '../../lib/trackerStudio/trackerThemeUtils';
import { useHabitPatterns } from '../../hooks/trackerStudio/useHabitPatterns';
import { useHabitStreaks } from '../../hooks/trackerStudio/useHabitStreaks';
import { useHabitPredictions } from '../../hooks/trackerStudio/useHabitPredictions';
import { getYesterdayEntry } from '../../lib/trackerStudio/habitStreakAnalysis';

type IntelligentHabitTrackerEntryFormProps = {
  tracker: Tracker;
  entryDate: string;
  existingEntry?: TrackerEntry | null;
  onEntrySaved: () => void;
  readOnly?: boolean;
  theme: TrackerTheme;
};

export function IntelligentHabitTrackerEntryForm({
  tracker,
  entryDate,
  existingEntry,
  onEntrySaved,
  readOnly = false,
  theme,
}: IntelligentHabitTrackerEntryFormProps) {
  const [saved, setSaved] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | boolean | null>>({});
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [habitNameInput, setHabitNameInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Load habit patterns for smart suggestions
  const { patterns, suggestions, loading: patternsLoading } = useHabitPatterns(
    tracker.id,
    90,
    new Date(entryDate)
  );

  // Load habit streaks for insights and motivation
  const { streaks, insights, loading: streaksLoading } = useHabitStreaks(tracker.id, 365);

  // Load predictive suggestions, alerts, and prompts
  const { suggestions: predictiveSuggestions, alerts, prompts, hasHighPriority, loading: predictionsLoading } = useHabitPredictions(
    tracker.id,
    new Date(entryDate)
  );

  // Load recent entries for "Same as yesterday" functionality
  const [recentEntries, setRecentEntries] = useState<TrackerEntry[]>([]);
  const [loadingRecentEntries, setLoadingRecentEntries] = useState(false);

  useEffect(() => {
    async function loadRecentEntries() {
      if (!tracker.id || existingEntry) return;
      
      try {
        setLoadingRecentEntries(true);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 7); // Last 7 days
        
        const entries = await listEntriesByDateRange({
          tracker_id: tracker.id,
          start_date: yesterday.toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
        });
        
        setRecentEntries(entries);
      } catch (err) {
        console.error('Failed to load recent entries:', err);
      } finally {
        setLoadingRecentEntries(false);
      }
    }

    loadRecentEntries();
  }, [tracker.id, existingEntry]);

  // Initialize form with existing entry or smart defaults
  useEffect(() => {
    if (existingEntry) {
      setFieldValues(existingEntry.field_values);
      setNotes(existingEntry.notes || '');
      setShowNotes(!!existingEntry.notes);
      setHabitNameInput(existingEntry.field_values?.habit_name as string || '');
    } else if (suggestions.defaultHabitName && patterns.size > 0) {
      // Use smart defaults
      const defaults: Record<string, string | number | boolean | null> = {};
      
      // Pre-fill habit name from suggestion
      defaults.habit_name = suggestions.defaultHabitName;
      setHabitNameInput(suggestions.defaultHabitName);

      // Pre-fill status if available
      if (suggestions.defaultStatus) {
        defaults.status = suggestions.defaultStatus;
      }

      // Pre-fill numeric value if available
      if (suggestions.defaultValueNumeric !== null) {
        defaults.value_numeric = suggestions.defaultValueNumeric;
      }

      // Pre-fill boolean value if available
      if (suggestions.defaultValueBoolean !== null) {
        defaults.value_boolean = suggestions.defaultValueBoolean;
      }

      // Set other fields to defaults
      for (const field of tracker.field_schema_snapshot) {
        if (!defaults[field.id]) {
          if (field.default !== undefined) {
            defaults[field.id] = field.default;
          } else {
            defaults[field.id] = getDefaultValueForType(field.type);
          }
        }
      }

      setFieldValues(defaults);
      setNotes('');
      setShowNotes(false);
    } else {
      // Standard defaults
      const defaults: Record<string, string | number | boolean | null> = {};
      for (const field of tracker.field_schema_snapshot) {
        if (field.default !== undefined) {
          defaults[field.id] = field.default;
        } else {
          defaults[field.id] = getDefaultValueForType(field.type);
        }
      }
      setFieldValues(defaults);
      setHabitNameInput('');
      setNotes('');
      setShowNotes(false);
    }
  }, [existingEntry, tracker, suggestions, patterns]);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!habitNameInput.trim()) {
      return suggestions.suggestedHabitNames.slice(0, 5);
    }
    const inputLower = habitNameInput.toLowerCase();
    return suggestions.suggestedHabitNames
      .filter(name => name.toLowerCase().includes(inputLower))
      .slice(0, 5);
  }, [habitNameInput, suggestions.suggestedHabitNames]);

  const getDefaultValueForType = (type: string): string | number | boolean | null => {
    switch (type) {
      case 'text':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'rating':
        return 1;
      case 'date':
        return entryDate;
      default:
        return null;
    }
  };

  const handleHabitNameChange = (value: string) => {
    setHabitNameInput(value);
    setFieldValues(prev => ({ ...prev, habit_name: value }));
    setShowSuggestions(true);
    setSelectedSuggestionIndex(-1);
  };

  const handleSelectSuggestion = (habitName: string) => {
    setHabitNameInput(habitName);
    setFieldValues(prev => ({ ...prev, habit_name: habitName }));
    setShowSuggestions(false);

    // Load recent entry for this habit to pre-fill other fields
    if (patterns.has(habitName)) {
      const pattern = patterns.get(habitName)!;
      if (pattern.recentEntries.length > 0) {
        const recentEntry = pattern.recentEntries[0];
        setFieldValues(prev => ({
          ...prev,
          habit_name: habitName,
          status: recentEntry.field_values?.status || prev.status,
          value_numeric: recentEntry.field_values?.value_numeric || prev.value_numeric,
          value_boolean: recentEntry.field_values?.value_boolean ?? prev.value_boolean,
        }));
        if (recentEntry.notes) {
          setNotes(recentEntry.notes);
          setShowNotes(true);
        }
      }
    }
  };

  const handleFieldChange = (fieldId: string, value: string | number | boolean | null) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setValidationErrors({});

      // Validate required fields
      const errors: Record<string, string> = {};
      for (const field of tracker.field_schema_snapshot) {
        if (field.validation?.required) {
          const value = fieldValues[field.id];
          if (value === null || value === undefined || value === '') {
            errors[field.id] = 'Required';
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }

      if (existingEntry) {
        await updateEntry(existingEntry.id, {
          field_values: fieldValues,
          notes: notes.trim() || undefined,
        });
      } else {
        await createEntry({
          tracker_id: tracker.id,
          entry_date: entryDate,
          field_values: fieldValues,
          notes: notes.trim() || undefined,
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onEntrySaved();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save entry';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Find status field and other fields
  const habitNameField = tracker.field_schema_snapshot.find(f => f.id === 'habit_name');
  const statusField = tracker.field_schema_snapshot.find(f => f.id === 'status');
  const valueNumericField = tracker.field_schema_snapshot.find(f => f.id === 'value_numeric');
  const valueBooleanField = tracker.field_schema_snapshot.find(f => f.id === 'value_boolean');
  const notesField = tracker.field_schema_snapshot.find(f => f.id === 'notes');
  const otherFields = tracker.field_schema_snapshot.filter(
    f => !['habit_name', 'status', 'value_numeric', 'value_boolean', 'notes'].includes(f.id)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saved && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium flex-1">Entry saved successfully!</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm flex-1 font-medium">{error}</p>
        </div>
      )}

      {/* Proactive Predictive Suggestions */}
      {predictiveSuggestions.length > 0 && !existingEntry && (
        <div className={`${theme.accentBg} border-2 ${hasHighPriority ? 'border-orange-300' : theme.borderColor} rounded-xl p-4 space-y-3`}>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Suggestions for You</h3>
          </div>
          
          {predictiveSuggestions.slice(0, 2).map((suggestion, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                suggestion.priority === 'high'
                  ? 'bg-orange-50 border-orange-200'
                  : suggestion.priority === 'medium'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <p className="text-sm text-gray-800 mb-2">{suggestion.message}</p>
              {suggestion.actionLabel && (
                <button
                  type="button"
                  onClick={() => {
                    // Pre-fill form with this habit
                    const pattern = patterns.get(suggestion.habitName);
                    if (pattern) {
                      const defaults: Record<string, string | number | boolean | null> = {
                        habit_name: suggestion.habitName,
                      };
                      
                      defaults.status = pattern.mostCommonStatus || 'done';
                      if (pattern.averageValueNumeric !== null) {
                        defaults.value_numeric = pattern.averageValueNumeric;
                      }
                      if (pattern.averageValueBoolean !== null) {
                        defaults.value_boolean = pattern.averageValueBoolean;
                      }
                      
                      setFieldValues(defaults);
                      setHabitNameInput(suggestion.habitName);
                      setNotes('');
                      setShowNotes(false);
                    }
                  }}
                  disabled={readOnly || loading}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    suggestion.priority === 'high'
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {suggestion.actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pattern Alerts */}
      {alerts.length > 0 && !existingEntry && (
        <div className={`${theme.accentBg} border-2 border-amber-300 rounded-xl p-4 space-y-2`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Pattern Insights</h3>
          </div>
          
          {alerts.slice(0, 2).map((alert, idx) => (
            <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-gray-800 mb-1 font-medium">{alert.message}</p>
              <p className="text-xs text-gray-600 mb-2">Pattern: {alert.pattern}</p>
              {alert.suggestion && (
                <p className="text-xs text-amber-800 italic">💡 {alert.suggestion}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Contextual Prompts */}
      {prompts.length > 0 && !existingEntry && !habitNameInput.trim() && (
        <div className={`${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Reminders</h3>
          </div>
          
          <div className="space-y-2">
            {prompts.slice(0, 3).map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  // Pre-fill with this habit
                  const pattern = patterns.get(prompt.habitName);
                  if (pattern) {
                    const defaults: Record<string, string | number | boolean | null> = {
                      habit_name: prompt.habitName,
                    };
                    
                    defaults.status = pattern.mostCommonStatus || 'done';
                    if (pattern.averageValueNumeric !== null) {
                      defaults.value_numeric = pattern.averageValueNumeric;
                    }
                    if (pattern.averageValueBoolean !== null) {
                      defaults.value_boolean = pattern.averageValueBoolean;
                    }
                    
                    setFieldValues(defaults);
                    setHabitNameInput(prompt.habitName);
                    setNotes('');
                    setShowNotes(false);
                  }
                }}
                disabled={readOnly || loading}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-medium text-gray-900">{prompt.prompt}</p>
                {prompt.dayOfWeek && (
                  <p className="text-xs text-gray-600 mt-1">{prompt.dayOfWeek} • {prompt.timeOfDay}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Streak Insights */}
      {insights.length > 0 && !existingEntry && habitNameInput && streaks.has(habitNameInput) && (
        <div className={`${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-4`}>
          {insights
            .filter(insight => insight.habitName.toLowerCase() === habitNameInput.trim().toLowerCase())
            .map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3">
                {insight.streak.streakType === 'active' && insight.streak.currentStreak > 0 ? (
                  <Flame className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    insight.streak.currentStreak >= 7 ? 'text-orange-600' : 
                    insight.streak.currentStreak >= 3 ? 'text-yellow-600' : 'text-blue-600'
                  }`} />
                ) : (
                  <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">{insight.message}</p>
                  {insight.streak.longestStreak > 0 && insight.streak.streakType === 'active' && (
                    <p className="text-xs text-gray-600">
                      Longest streak: {insight.streak.longestStreak} days
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Quick Actions */}
      {!existingEntry && recentEntries.length > 0 && (
        <div className={`${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
          </div>
          
          <div className="space-y-2">
            {/* Same as Yesterday Button */}
            {(() => {
              const currentHabitName = habitNameInput.trim();
              if (!currentHabitName) return null;
              
              const yesterdayEntry = getYesterdayEntry(currentHabitName, recentEntries);
              if (!yesterdayEntry) return null;

              return (
                <button
                  type="button"
                  onClick={() => {
                    setFieldValues(yesterdayEntry.field_values);
                    setHabitNameInput(yesterdayEntry.field_values?.habit_name as string || '');
                    setNotes(yesterdayEntry.notes || '');
                    setShowNotes(!!yesterdayEntry.notes);
                  }}
                  disabled={readOnly || loading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="flex items-center gap-3">
                    <Copy size={18} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Same as yesterday</p>
                      <p className="text-xs text-gray-600">
                        {yesterdayEntry.field_values?.status || 'Done'}
                        {yesterdayEntry.field_values?.value_numeric && typeof yesterdayEntry.field_values.value_numeric === 'number' && (
                          ` • ${yesterdayEntry.field_values.value_numeric}`
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })()}

            {/* Quick Log Buttons for Common Habits */}
            {suggestions.suggestedHabitNames.slice(0, 3).map((habitName) => {
              const streak = streaks.get(habitName);
              const pattern = patterns.get(habitName);
              
              return (
                <button
                  key={habitName}
                  type="button"
                  onClick={() => {
                    // Pre-fill from pattern
                    const defaults: Record<string, string | number | boolean | null> = {
                      habit_name: habitName,
                    };
                    
                    if (pattern) {
                      defaults.status = pattern.mostCommonStatus || 'done';
                      if (pattern.averageValueNumeric !== null) {
                        defaults.value_numeric = pattern.averageValueNumeric;
                      }
                      if (pattern.averageValueBoolean !== null) {
                        defaults.value_boolean = pattern.averageValueBoolean;
                      }
                    } else {
                      defaults.status = 'done';
                    }
                    
                    setFieldValues(defaults);
                    setHabitNameInput(habitName);
                    setNotes('');
                    setShowNotes(false);
                  }}
                  disabled={readOnly || loading}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <span className="text-sm font-medium text-gray-900">{habitName}</span>
                  {streak && streak.streakType === 'active' && streak.currentStreak > 0 && (
                    <span className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                      <Flame size={14} />
                      {streak.currentStreak}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Smart Suggestions Context */}
      {suggestions.contextualNote && !existingEntry && (
        <div className={`${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-4 flex items-start gap-3`}>
          <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-gray-700 font-medium">{suggestions.contextualNote}</p>
          </div>
        </div>
      )}

      {/* Habit Name Field with Tag Selection + Free Type */}
      {habitNameField && (
        <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${validationErrors.habit_name ? 'border-red-300' : theme.borderColor} transition-all hover:shadow-md`}>
          <HabitNameSelector
            value={habitNameInput}
            onChange={(value) => {
              setHabitNameInput(value);
              setFieldValues(prev => ({ ...prev, habit_name: value }));
              setShowSuggestions(false);
            }}
            disabled={readOnly || loading}
            theme={theme}
            allowFreeType={true}
          />
          {validationErrors.habit_name && (
            <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
              <AlertCircle size={14} />
              {validationErrors.habit_name}
            </p>
          )}
        </div>
      )}

      {/* Tracker Relationship Suggestion - Show when habit has a corresponding detailed tracker */}
      {habitNameInput && !existingEntry && (
        <TrackerRelationshipSuggestion
          habitName={habitNameInput}
          onSyncToDetailed={(trackerId) => {
            // Store tracker ID for sync when entry is saved
            // This will be handled in handleSubmit
          }}
        />
      )}

      {/* Status Field */}
      {statusField && (
        <FieldInput
          field={statusField}
          value={fieldValues.status}
          onChange={(value) => handleFieldChange('status', value)}
          error={validationErrors.status}
          readOnly={readOnly}
          theme={theme}
          trackerName={tracker.name}
        />
      )}

      {/* Numeric Value Field */}
      {valueNumericField && (
        <FieldInput
          field={valueNumericField}
          value={fieldValues.value_numeric}
          onChange={(value) => handleFieldChange('value_numeric', value)}
          error={validationErrors.value_numeric}
          readOnly={readOnly}
          theme={theme}
          trackerName={tracker.name}
        />
      )}

      {/* Boolean Value Field */}
      {valueBooleanField && (
        <FieldInput
          field={valueBooleanField}
          value={fieldValues.value_boolean}
          onChange={(value) => handleFieldChange('value_boolean', value)}
          error={validationErrors.value_boolean}
          readOnly={readOnly}
          theme={theme}
          trackerName={tracker.name}
        />
      )}

      {/* Other Fields */}
      {otherFields.map(field => (
        <FieldInput
          key={field.id}
          field={field}
          value={fieldValues[field.id]}
          onChange={(value) => handleFieldChange(field.id, value)}
          error={validationErrors[field.id]}
          readOnly={readOnly}
          theme={theme}
          trackerName={tracker.name}
        />
      ))}

      {/* Notes Field - Collapsible */}
      <div>
        {!showNotes ? (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            disabled={readOnly}
            className={`w-full ${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-4 text-left transition-all hover:shadow-md ${
              readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Add a note <span className="text-gray-500">(optional)</span>
              </span>
              <X size={18} className="text-gray-400 rotate-45" />
            </div>
          </button>
        ) : (
          <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${theme.borderColor}`}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-900">
                Note <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNotes(false);
                    setNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Hide notes"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <textarea
              id="entry-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading || readOnly}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base bg-white disabled:bg-gray-50"
              placeholder="Anything you want to add?"
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      {readOnly ? (
        <div className={`${theme.accentBg} border-2 ${theme.borderColor} rounded-xl p-6 text-center`}>
          <p className={`text-sm ${theme.accentText} font-medium`}>You have read-only access to this tracker</p>
        </div>
      ) : (
        <button
          type="submit"
          disabled={loading}
          className={`w-full px-6 py-4 ${theme.buttonBg} ${theme.buttonHover} text-white rounded-xl hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-3 min-h-[52px] text-base shadow-md`}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={20} />
              <span>{existingEntry ? 'Update Entry' : 'Save Entry'}</span>
            </>
          )}
        </button>
      )}
    </form>
  );
}

// Reuse FieldInput from TrackerEntryForm
type FieldInputProps = {
  field: TrackerFieldSchema;
  value: string | number | boolean | null;
  onChange: (value: string | number | boolean | null) => void;
  error?: string;
  readOnly?: boolean;
  theme: TrackerTheme;
  trackerName?: string;
};

function FieldInput({ field, value, onChange, error, readOnly = false, theme, trackerName = '' }: FieldInputProps) {
  // Import FieldInput logic from TrackerEntryForm - for now, simplified version
  // This should match the FieldInput implementation in TrackerEntryForm
  const isRequired = field.validation?.required;

  // Handle text fields with options (like status dropdown)
  if (field.type === 'text' && field.options && field.options.length > 0) {
    return (
      <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all hover:shadow-md`}>
        <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900 mb-3">
          {field.label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        <select
          id={field.id}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-base font-medium min-h-[52px] transition-all ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
        >
          <option value="">Select {field.label.toLowerCase()}...</option>
          {field.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
      </div>
    );
  }

  // Handle number field
  if (field.type === 'number') {
    return (
      <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all hover:shadow-md`}>
        <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900 mb-3">
          {field.label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        <input
          id={field.id}
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
          disabled={readOnly}
          min={field.validation?.min}
          max={field.validation?.max}
          step="any"
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 text-lg font-semibold min-h-[52px] transition-all ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          } ${readOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
      </div>
    );
  }

  // Handle boolean field
  if (field.type === 'boolean') {
    return (
      <div className={`${theme.accentBg} rounded-xl p-5 border-2 ${error ? 'border-red-300' : theme.borderColor} transition-all hover:shadow-md`}>
        <label className={`flex items-center gap-4 cursor-pointer min-h-[60px] ${readOnly ? 'cursor-not-allowed' : ''}`}>
          <div className="relative">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
              disabled={readOnly}
              className={`w-6 h-6 ${theme.buttonBg.replace('bg-', 'text-')} border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed flex-shrink-0 transition-all cursor-pointer`}
            />
            {value === true && (
              <CheckCircle2 className="absolute inset-0 w-6 h-6 text-white pointer-events-none" size={24} />
            )}
          </div>
          <span className="text-base font-semibold text-gray-900 flex-1">
            {field.label} {isRequired && <span className="text-red-500">*</span>}
          </span>
        </label>
        {error && (
          <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
      </div>
    );
  }

  return null;
}

/**
 * Habit Check-in Sheet
 * 
 * Premium check-in UI supporting all habit metric types:
 * - boolean (done/missed/skipped)
 * - numeric (count/minutes) with stepper
 * - rating (slider 1-10)
 * - custom (uses metadata.schema)
 * 
 * Opens as bottom sheet (mobile) or modal (desktop)
 */

import { useState, useEffect } from 'react';
import { X, Calendar, MessageSquare, RotateCcw, CheckCircle2, XCircle, Minus } from 'lucide-react';
import { upsertHabitCheckin, getHabitCheckinsForRange, type HabitCheckin } from '../../../lib/habits/habitsService';
import type { Activity } from '../../../lib/activities/activityService';
import { emitActivityChanged } from '../../../lib/activities/activityEvents';

export interface HabitCheckinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Activity;
  userId: string;
  initialDate?: string; // YYYY-MM-DD, defaults to today
  onCheckinComplete?: () => void;
}

export function HabitCheckinSheet({
  isOpen,
  onClose,
  habit,
  userId,
  initialDate,
  onCheckinComplete,
}: HabitCheckinSheetProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return initialDate || new Date().toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<'done' | 'missed' | 'skipped'>('done');
  const [valueNumeric, setValueNumeric] = useState<number | null>(null);
  const [valueBoolean, setValueBoolean] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [existingCheckin, setExistingCheckin] = useState<HabitCheckin | null>(null);
  const [previousCheckin, setPreviousCheckin] = useState<HabitCheckin | null>(null);

  const metricType = habit.metadata?.metric_type || 'boolean';
  const targetValue = habit.metadata?.target_value;
  const metricUnit = habit.metadata?.metric_unit;
  const direction = habit.metadata?.direction || 'at_least';

  // Load existing check-in for selected date
  useEffect(() => {
    if (!isOpen || !selectedDate) return;

    const loadCheckin = async () => {
      try {
        const checkins = await getHabitCheckinsForRange(
          userId,
          habit.id,
          selectedDate,
          selectedDate
        );
        const checkin = checkins[0] || null;
        setExistingCheckin(checkin);

        if (checkin) {
          setStatus(checkin.status as 'done' | 'missed' | 'skipped');
          setValueNumeric(checkin.value_numeric || null);
          setValueBoolean(checkin.value_boolean || null);
          if (checkin.value_numeric && metricType === 'rating') {
            setRating(checkin.value_numeric);
          }
          setNotes(checkin.notes || '');
        } else {
          // Reset to defaults
          setStatus('done');
          setValueNumeric(null);
          setValueBoolean(null);
          setRating(5);
          setNotes('');
        }

        // Load previous check-in for undo
        if (selectedDate) {
          const prevDate = new Date(selectedDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateStr = prevDate.toISOString().split('T')[0];
          const prevCheckins = await getHabitCheckinsForRange(
            userId,
            habit.id,
            prevDateStr,
            prevDateStr
          );
          setPreviousCheckin(prevCheckins[0] || null);
        }
      } catch (err) {
        console.error('[HabitCheckinSheet] Error loading check-in:', err);
      }
    };

    loadCheckin();
  }, [isOpen, selectedDate, habit.id, userId, metricType]);

  // Date range for picker (last 30 days)
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - 30);
  const maxDate = today;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: {
        status: 'done' | 'missed' | 'skipped';
        value_numeric?: number;
        value_boolean?: boolean;
        notes?: string;
      } = {
        status,
        notes: notes.trim() || undefined,
      };

      if (metricType === 'boolean') {
        payload.value_boolean = status === 'done' ? true : false;
      } else if (metricType === 'rating') {
        payload.value_numeric = rating;
      } else if (metricType === 'count' || metricType === 'minutes' || metricType === 'custom') {
        if (valueNumeric !== null) {
          payload.value_numeric = valueNumeric;
        }
      }

      await upsertHabitCheckin(userId, habit.id, selectedDate, payload);
      
      emitActivityChanged(habit.id);
      onCheckinComplete?.();
      onClose();
    } catch (err) {
      console.error('[HabitCheckinSheet] Error saving check-in:', err);
      alert('Failed to save check-in');
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async () => {
    if (!previousCheckin) return;

    setSaving(true);
    try {
      // Restore previous check-in state
      await upsertHabitCheckin(userId, habit.id, selectedDate, {
        status: previousCheckin.status as 'done' | 'missed' | 'skipped',
        value_numeric: previousCheckin.value_numeric || undefined,
        value_boolean: previousCheckin.value_boolean || undefined,
        notes: previousCheckin.notes || undefined,
      });

      emitActivityChanged(habit.id);
      onCheckinComplete?.();
      onClose();
    } catch (err) {
      console.error('[HabitCheckinSheet] Error undoing check-in:', err);
      alert('Failed to undo check-in');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isMobile = window.innerWidth < 768;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Sheet/Modal */}
      <div
        className={`relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto ${
          isMobile ? 'animate-slide-up' : 'animate-fade-in'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{habit.title}</h2>
            <p className="text-sm text-gray-500 mt-1">Check in</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate.toISOString().split('T')[0]}
              max={maxDate.toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Selection (for boolean habits) */}
          {metricType === 'boolean' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Status
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setStatus('done')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    status === 'done'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CheckCircle2 size={24} className="mx-auto mb-2" />
                  <div className="text-sm font-medium">Done</div>
                </button>
                <button
                  onClick={() => setStatus('missed')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    status === 'missed'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <XCircle size={24} className="mx-auto mb-2" />
                  <div className="text-sm font-medium">Missed</div>
                </button>
                <button
                  onClick={() => setStatus('skipped')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    status === 'skipped'
                      ? 'border-gray-500 bg-gray-50 text-gray-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Minus size={24} className="mx-auto mb-2" />
                  <div className="text-sm font-medium">Skip</div>
                </button>
              </div>
            </div>
          )}

          {/* Numeric Input (count/minutes/custom) */}
          {(metricType === 'count' || metricType === 'minutes' || metricType === 'custom') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {metricUnit || 'Value'} {targetValue && `(target: ${targetValue})`}
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setValueNumeric(Math.max(0, (valueNumeric || 0) - 1))}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  aria-label="Decrease value"
                >
                  −
                </button>
                <input
                  type="number"
                  value={valueNumeric || 0}
                  onChange={(e) => setValueNumeric(parseFloat(e.target.value) || 0)}
                  min="0"
                  step={metricType === 'minutes' ? 1 : 1}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-semibold"
                />
                <button
                  onClick={() => setValueNumeric((valueNumeric || 0) + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                  aria-label="Increase value"
                >
                  +
                </button>
              </div>
              {targetValue && (
                <div className="mt-2 text-sm text-gray-500">
                  {direction === 'at_least' && valueNumeric !== null && (
                    <span className={valueNumeric >= targetValue ? 'text-green-600' : 'text-orange-600'}>
                      {valueNumeric >= targetValue ? '✓ Target met' : `Need ${targetValue - valueNumeric} more`}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Rating Slider */}
          {metricType === 'rating' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating: {rating}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>10</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare size={16} className="inline mr-2" />
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add a note about this check-in..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Undo Button (if previous check-in exists) */}
          {previousCheckin && (
            <button
              onClick={handleUndo}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              Undo last change
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (metricType !== 'boolean' && valueNumeric === null && metricType !== 'rating')}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? 'Saving...' : existingCheckin ? 'Update' : 'Check In'}
          </button>
        </div>
      </div>
    </div>
  );
}






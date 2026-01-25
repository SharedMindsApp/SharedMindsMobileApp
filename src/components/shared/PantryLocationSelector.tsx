/**
 * PantryLocationSelector Component
 * 
 * Modal for selecting a pantry location when adding items.
 * Shows existing locations as chips with "Add location" option.
 * 
 * ADHD-First Principles:
 * - No required selection
 * - Remembers last used location
 * - One tap selection
 * - No pressure
 */

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { PantryLocation } from '../../lib/pantryLocations';
import { createPantryLocation } from '../../lib/pantryLocations';
import { showToast } from '../Toast';

interface PantryLocationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (locationId: string | null) => void;
  locations: PantryLocation[];
  lastUsedLocationId?: string | null;
  spaceId: string;
  onLocationCreated?: (location: PantryLocation) => void;
  // Optional quantity and expiry fields
  quantityValue?: string;
  quantityUnit?: string;
  expiresOn?: string;
  onQuantityValueChange?: (value: string) => void;
  onQuantityUnitChange?: (value: string) => void;
  onExpiresOnChange?: (value: string) => void;
  // Portion tracking fields
  totalPortions?: string;
  portionUnit?: string;
  onTotalPortionsChange?: (value: string) => void;
  onPortionUnitChange?: (value: string) => void;
}

export function PantryLocationSelector({
  isOpen,
  onClose,
  onSelect,
  locations,
  lastUsedLocationId,
  spaceId,
  onLocationCreated,
  quantityValue = '',
  quantityUnit = '',
  expiresOn = '',
  onQuantityValueChange,
  onQuantityUnitChange,
  onExpiresOnChange,
  totalPortions = '',
  portionUnit = '',
  onTotalPortionsChange,
  onPortionUnitChange,
}: PantryLocationSelectorProps) {
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationIcon, setNewLocationIcon] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (locationId: string | null) => {
    onSelect(locationId);
  };

  const handleCreateLocation = async () => {
    if (!newLocationName.trim()) {
      showToast('info', 'Please enter a location name');
      return;
    }

    try {
      setIsCreating(true);
      const location = await createPantryLocation({
        spaceId,
        name: newLocationName.trim(),
        icon: newLocationIcon.trim() || null,
      });
      
      if (onLocationCreated) {
        onLocationCreated(location);
      }
      
      setNewLocationName('');
      setNewLocationIcon('');
      setShowAddLocation(false);
      showToast('success', 'Location created');
      
      // Auto-select the newly created location
      handleSelect(location.id);
    } catch (error: any) {
      console.error('Failed to create location:', error);
      if (error?.code === '23505' || error?.message?.includes('unique constraint') || error?.message?.includes('duplicate')) {
        showToast('error', 'A location with this name already exists');
      } else {
        showToast('error', 'Failed to create location');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-stone-500 to-stone-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Choose location</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showAddLocation ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Where should this go?
              </p>

              {/* Location Chips */}
              <div className="space-y-2 mb-4">
                {/* No location option */}
                <button
                  onClick={() => handleSelect(null)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    lastUsedLocationId === null
                      ? 'border-stone-500 bg-stone-50'
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">No location</div>
                  <div className="text-xs text-gray-500 mt-0.5">Leave unassigned</div>
                </button>

                {/* Existing locations */}
                {locations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleSelect(location.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      lastUsedLocationId === location.id
                        ? 'border-stone-500 bg-stone-50'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {location.icon && (
                        <span className="text-lg">{location.icon}</span>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{location.name}</div>
                        {lastUsedLocationId === location.id && (
                          <div className="text-xs text-gray-500 mt-0.5">Last used</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Add location button */}
              <button
                onClick={() => setShowAddLocation(true)}
                className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-stone-300 hover:border-stone-400 hover:bg-stone-50 transition-all flex items-center justify-center gap-2 text-gray-700"
              >
                <Plus size={18} />
                <span className="font-medium">Add location</span>
              </button>

              {/* Optional Quantity & Expiry Fields */}
              <div className="mt-4 pt-4 border-t border-stone-200 space-y-3">
                <p className="text-xs text-gray-500 font-medium">Optional details</p>
                
                {/* Quantity */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                    <input
                      type="text"
                      value={quantityValue}
                      onChange={(e) => onQuantityValueChange?.(e.target.value)}
                      placeholder="e.g., 3, half"
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Unit</label>
                    <input
                      type="text"
                      value={quantityUnit}
                      onChange={(e) => onQuantityUnitChange?.(e.target.value)}
                      placeholder="e.g., tins, packs"
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Best before (optional)</label>
                  <input
                    type="date"
                    value={expiresOn}
                    onChange={(e) => onExpiresOnChange?.(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Only for your reference — nothing will happen automatically.
                  </p>
                </div>

                {/* Portion Tracking (for pre-made items like ice cream, frozen pizza) */}
                <div className="pt-2 border-t border-stone-200">
                  <p className="text-xs text-gray-500 font-medium mb-2">Portion tracking (optional)</p>
                  <p className="text-xs text-gray-500 mb-2">
                    For items with fixed portions (e.g., 6 servings of ice cream, 8 slices of pizza)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Total portions</label>
                      <input
                        type="number"
                        min="1"
                        value={totalPortions}
                        onChange={(e) => onTotalPortionsChange?.(e.target.value)}
                        placeholder="e.g., 6"
                        className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Portion unit</label>
                      <input
                        type="text"
                        value={portionUnit}
                        onChange={(e) => onPortionUnitChange?.(e.target.value)}
                        placeholder="e.g., serving, slice"
                        className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty if not tracking portions. Portions will be automatically consumed as you plan meals.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location name
                </label>
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="e.g. Store Cupboard"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon (optional emoji)
                </label>
                <input
                  type="text"
                  value={newLocationIcon}
                  onChange={(e) => setNewLocationIcon(e.target.value)}
                  placeholder="e.g. 🍯"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddLocation(false);
                    setNewLocationName('');
                    setNewLocationIcon('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLocation}
                  disabled={isCreating || !newLocationName.trim()}
                  className="flex-1 px-4 py-2 bg-stone-500 hover:bg-stone-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

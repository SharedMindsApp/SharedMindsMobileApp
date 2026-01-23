/**
 * PantryLocationManager Component
 * 
 * Modal for managing pantry locations (add, edit, delete).
 * Shows warnings when deleting locations with items.
 * 
 * ADHD-First Principles:
 * - Clear warnings but no blocking
 * - Reversible actions
 * - Calm, non-judgmental language
 */

import { useState } from 'react';
import { X, Plus, Edit2, Trash2, Settings } from 'lucide-react';
import { PantryLocation } from '../../lib/pantryLocations';
import { createPantryLocation, updatePantryLocation, deletePantryLocation, reorderPantryLocations } from '../../lib/pantryLocations';
import { showToast } from '../Toast';
import { PantryItem } from '../../lib/intelligentGrocery';

interface PantryLocationManagerProps {
  isOpen: boolean;
  onClose: () => void;
  locations: PantryLocation[];
  pantryItems: PantryItem[];
  spaceId: string;
  onLocationsUpdated: () => void;
}

export function PantryLocationManager({
  isOpen,
  onClose,
  locations,
  pantryItems,
  spaceId,
  onLocationsUpdated,
}: PantryLocationManagerProps) {
  const [editingLocation, setEditingLocation] = useState<PantryLocation | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: '' });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleEdit = (location: PantryLocation) => {
    setEditingLocation(location);
    setFormData({ name: location.name, icon: location.icon || '' });
    setShowAddForm(false);
  };

  const handleCancel = () => {
    setEditingLocation(null);
    setShowAddForm(false);
    setFormData({ name: '', icon: '' });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('info', 'Please enter a location name');
      return;
    }

    try {
      setIsSaving(true);
      
      if (editingLocation) {
        // Update existing location
        await updatePantryLocation(editingLocation.id, {
          name: formData.name.trim(),
          icon: formData.icon.trim() || null,
        });
        showToast('success', 'Location updated');
      } else {
        // Create new location
        await createPantryLocation({
          spaceId,
          name: formData.name.trim(),
          icon: formData.icon.trim() || null,
        });
        showToast('success', 'Location created');
      }
      
      handleCancel();
      onLocationsUpdated();
    } catch (error: any) {
      console.error('Failed to save location:', error);
      // Check for unique constraint violation or conflict
      if (
        error?.code === '23505' || 
        error?.status === 409 ||
        error?.statusCode === 409 ||
        (error?.message && (
          error.message.includes('unique constraint') ||
          error.message.includes('duplicate') ||
          error.message.includes('already exists')
        ))
      ) {
        showToast('error', 'A location with this name already exists');
      } else {
        showToast('error', 'Failed to save location');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (location: PantryLocation) => {
    const itemsInLocation = pantryItems.filter(item => item.location_id === location.id);
    const itemCount = itemsInLocation.length;

    if (itemCount > 0) {
      // Show warning but allow deletion
      const confirmed = window.confirm(
        `This location has ${itemCount} item${itemCount === 1 ? '' : 's'} in it. ` +
        `Deleting it will move those items to "Unassigned". Are you sure you want to delete "${location.name}"?`
      );
      
      if (!confirmed) {
        return;
      }
    }

    try {
      setDeletingLocationId(location.id);
      await deletePantryLocation(location.id);
      showToast('success', 'Location deleted');
      onLocationsUpdated();
    } catch (error) {
      console.error('Failed to delete location:', error);
      showToast('error', 'Failed to delete location');
    } finally {
      setDeletingLocationId(null);
    }
  };

  const getItemCount = (locationId: string) => {
    return pantryItems.filter(item => item.location_id === locationId).length;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4 safe-top safe-bottom">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-stone-600" />
            <h3 className="text-lg font-semibold text-gray-900">Manage Locations</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Add/Edit Form */}
          {(showAddForm || editingLocation) && (
            <div className="bg-stone-50 rounded-lg p-4 border-2 border-stone-200">
              <h4 className="font-medium text-gray-900 mb-3">
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Pantry, Spice Rack"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="e.g., 🧺, 📦"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter an emoji or leave blank
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !formData.name.trim()}
                    className="flex-1 px-4 py-2 bg-stone-500 hover:bg-stone-600 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {isSaving ? 'Saving...' : editingLocation ? 'Save' : 'Add'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Button (when form is hidden) */}
          {!showAddForm && !editingLocation && (
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingLocation(null);
                setFormData({ name: '', icon: '' });
              }}
              className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-stone-300 hover:border-stone-400 hover:bg-stone-50 transition-all flex items-center justify-center gap-2 text-gray-700"
            >
              <Plus size={18} />
              <span className="font-medium">Add Location</span>
            </button>
          )}

          {/* Locations List */}
          <div className="space-y-2">
            {locations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No locations yet. Add one to get started.
              </p>
            ) : (
              locations.map((location) => {
                const itemCount = getItemCount(location.id);
                const isDeleting = deletingLocationId === location.id;
                const isEditing = editingLocation?.id === location.id;

                return (
                  <div
                    key={location.id}
                    className={`bg-white rounded-lg p-3 border-2 ${
                      isEditing ? 'border-stone-500' : 'border-stone-200'
                    } flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {location.icon && (
                        <span className="text-xl flex-shrink-0">{location.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{location.name}</p>
                        <p className="text-xs text-gray-500">
                          {itemCount === 0
                            ? 'No items'
                            : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(location)}
                        disabled={isEditing || isDeleting}
                        className="p-2 text-gray-400 hover:text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(location)}
                        disabled={isDeleting}
                        className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-stone-500 hover:bg-stone-600 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

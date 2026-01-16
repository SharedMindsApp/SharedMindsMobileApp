import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { listTrackers } from '../../../lib/trackerStudio/trackerService';
import type { Tracker } from '../../../lib/trackerStudio/types';

type SelectTrackerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (trackerId: string) => void;
};

export function SelectTrackerModal({ isOpen, onClose, onSelect }: SelectTrackerModalProps) {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTrackers();
    }
  }, [isOpen]);

  const loadTrackers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listTrackers(false); // Exclude archived
      setTrackers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trackers');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (trackerId: string) => {
    onSelect(trackerId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Select Tracker</h2>
            <p className="text-sm text-gray-600 mt-1">Choose a tracker to embed in this space</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading trackers...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && trackers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No trackers found</p>
            <p className="text-sm text-gray-500">
              Create a tracker in Tracker Studio first
            </p>
          </div>
        )}

        {!loading && !error && trackers.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {trackers.map(tracker => (
              <button
                key={tracker.id}
                onClick={() => handleSelect(tracker.id)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium text-gray-900 mb-1">{tracker.name}</div>
                {tracker.description && (
                  <div className="text-sm text-gray-600">{tracker.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {tracker.field_schema_snapshot.length} {tracker.field_schema_snapshot.length === 1 ? 'field' : 'fields'}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

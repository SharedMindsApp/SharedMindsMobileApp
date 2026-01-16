import { useNavigate } from 'react-router-dom';
import { Calendar, ExternalLink, Plus } from 'lucide-react';
import { useTracker } from '../../../hooks/trackerStudio/useTracker';
import { useTrackerEntries } from '../../../hooks/trackerStudio/useTrackerEntries';

type PlannerTrackerBlockProps = {
  trackerId: string;
};

export function PlannerTrackerBlock({ trackerId }: PlannerTrackerBlockProps) {
  const navigate = useNavigate();
  const { tracker, loading, error } = useTracker(trackerId);
  
  // Get last 5 entries
  const { entries } = useTrackerEntries({
    tracker_id: trackerId,
  });

  const recentEntries = entries.slice(0, 5);

  const handleOpenTracker = () => {
    navigate(`/tracker-studio/tracker/${trackerId}`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-center py-4">
          <p className="text-sm text-gray-600">Loading tracker...</p>
        </div>
      </div>
    );
  }

  if (error || !tracker) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-center py-4">
          <p className="text-sm text-red-600">Failed to load tracker</p>
        </div>
      </div>
    );
  }

  // Check if tracker is archived
  if (tracker.archived_at) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-center py-4">
          <p className="text-sm text-gray-600">Tracker archived</p>
        </div>
      </div>
    );
  }

  const formatFieldValue = (fieldId: string, value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      const field = tracker.field_schema_snapshot.find(f => f.id === fieldId);
      if (field?.type === 'rating') {
        return `${value}/5`;
      }
      return value.toString();
    }
    return String(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">{tracker.name}</h3>
          {tracker.description && (
            <p className="text-sm text-gray-600">{tracker.description}</p>
          )}
        </div>
        <button
          onClick={handleOpenTracker}
          className="ml-3 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <ExternalLink size={14} />
          Open
        </button>
      </div>

      {/* Recent Entries */}
      {recentEntries.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
            Recent Entries
          </h4>
          {recentEntries.map(entry => (
            <div key={entry.id} className="border-l-2 border-gray-200 pl-3 py-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Calendar size={12} />
                <span>{formatDate(entry.entry_date)}</span>
              </div>
              <div className="space-y-1">
                {tracker.field_schema_snapshot.map(field => {
                  const value = entry.field_values[field.id];
                  if (value === null || value === undefined || value === '') {
                    return null;
                  }
                  return (
                    <div key={field.id} className="text-sm">
                      <span className="font-medium text-gray-700">{field.label}:</span>{' '}
                      <span className="text-gray-900">
                        {formatFieldValue(field.id, value)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {entry.notes && (
                <p className="text-xs text-gray-600 mt-2 italic">{entry.notes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-3">No entries yet</p>
          <button
            onClick={handleOpenTracker}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus size={14} />
            Add Entry
          </button>
        </div>
      )}
    </div>
  );
}

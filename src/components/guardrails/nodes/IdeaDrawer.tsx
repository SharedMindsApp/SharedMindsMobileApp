import { useState, useEffect } from 'react';
import { X, Trash2, Save, ArrowUpRight } from 'lucide-react';
import type { OffshootIdea } from '../../../lib/guardrailsTypes';
import type { Track } from '../../../lib/guardrails/tracksTypes';
import { updateOffshootIdea, deleteOffshootIdea } from '../../../lib/guardrails';
import { TrackDropdown } from '../tracks/TrackDropdown';

interface IdeaDrawerProps {
  idea: OffshootIdea;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onPromote: (ideaId: string) => void;
  tracks?: Track[];
}

export function IdeaDrawer({
  idea,
  isOpen,
  onClose,
  onUpdate,
  onPromote,
  tracks = [],
}: IdeaDrawerProps) {
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description || '');
  const [trackId, setTrackId] = useState<string | null>((idea as any).track_id || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(idea.title);
      setDescription(idea.description || '');
      setTrackId((idea as any).track_id || null);
    }
  }, [idea, isOpen]);

  const handleSave = async () => {
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      await updateOffshootIdea(idea.id, {
        title: title.trim(),
        description: description.trim() || null,
        track_id: trackId,
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to update idea:', error);
      alert('Failed to update idea. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (loading) return;

    if (!confirm(`Are you sure you want to delete "${idea.title}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteOffshootIdea(idea.id);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to delete idea:', error);
      alert('Failed to delete idea. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = () => {
    onPromote(idea.id);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Side Idea</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {tracks.length > 0 && (
            <TrackDropdown
              tracks={tracks}
              selectedTrackId={trackId}
              onChange={setTrackId}
              allowUnassigned={true}
            />
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900 font-medium mb-2">
              Promote to Roadmap
            </p>
            <p className="text-xs text-yellow-700 mb-3">
              Convert this side idea into a roadmap item with dates and milestones.
            </p>
            <button
              onClick={handlePromote}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              disabled={loading}
            >
              <ArrowUpRight size={18} />
              Promote to Roadmap
            </button>
          </div>

          <div className="pt-2 text-xs text-gray-500">
            <p>Created: {new Date(idea.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={loading || !title.trim()}
          >
            <Save size={18} />
            Save Changes
          </button>

          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            <Trash2 size={18} />
            Delete Idea
          </button>
        </div>
      </div>
    </>
  );
}

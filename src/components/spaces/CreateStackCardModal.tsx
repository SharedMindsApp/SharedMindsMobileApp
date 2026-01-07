import { useState } from 'react';
import { X, Layers } from 'lucide-react';
import { createStackCardWithInitialCards, COLOR_SCHEMES, type ColorScheme } from '../../lib/stackCards';

interface CreateStackCardModalProps {
  spaceId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateStackCardModal({ spaceId, onClose, onSuccess }: CreateStackCardModalProps) {
  const [title, setTitle] = useState('');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('cyan');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;

    try {
      setCreating(true);
      await createStackCardWithInitialCards({
        title: title.trim(),
        color_scheme: colorScheme,
        space_id: spaceId,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create stack:', error);
      alert('Failed to create stack. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">New Stack Cards</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stack Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Study Notes, Daily Affirmations"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
              autoFocus
            />
          </div>

          {/* Info */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-16 h-20 bg-cyan-200 rounded-lg shadow-md border-2 border-white/50"
                   style={{
                     backgroundImage: `repeating-linear-gradient(transparent, transparent 8px, rgba(0,0,0,0.08) 8px, rgba(0,0,0,0.08) 9px)`
                   }}
              />
              <div className="flex-1">
                <p className="text-sm text-gray-800 font-semibold mb-1">
                  Digital Revision Cards
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Your stack will start with 6 prepopulated cards in beautiful pastel colors.
                  Perfect for study notes, flashcards, and quick reference.
                </p>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 pl-4">
              <li>• Each card has a title and content area</li>
              <li>• Scroll through cards with arrow keys or mouse wheel</li>
              <li>• Drag thumbnails to reorder cards</li>
              <li>• Change colors individually per card</li>
              <li>• 300 character limit per card</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || creating}
            className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {creating ? 'Creating...' : 'Create Stack'}
          </button>
        </div>
      </div>
    </div>
  );
}

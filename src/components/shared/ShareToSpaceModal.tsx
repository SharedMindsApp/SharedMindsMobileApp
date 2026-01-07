import { useState, useEffect } from 'react';
import { X, Users, Share2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SyncableItemType, LinkType } from '../../lib/spacesSync';
import { publishToSharedSpace, getSharedSpaceLinks, unpublishFromSharedSpace } from '../../lib/spacesSync';

interface ShareToSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: SyncableItemType;
  itemId: string;
  itemTitle: string;
}

interface SharedSpace {
  id: string;
  name: string;
}

export function ShareToSpaceModal({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemTitle,
}: ShareToSpaceModalProps) {
  const [sharedSpaces, setSharedSpaces] = useState<SharedSpace[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [linkType, setLinkType] = useState<LinkType>('send');
  const [allowEdit, setAllowEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingLinks, setExistingLinks] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadSharedSpaces();
      loadExistingLinks();
    }
  }, [isOpen]);

  async function loadSharedSpaces() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) return;

    const { data: memberships } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', profile.id)
      .eq('status', 'active');

    if (!memberships) return;

    const spaceIds = memberships.map(m => m.space_id);

    const { data: spaces } = await supabase
      .from('spaces')
      .select('id, name')
      .in('id', spaceIds)
      .eq('space_type', 'shared');

    setSharedSpaces(spaces || []);
  }

  async function loadExistingLinks() {
    try {
      const links = await getSharedSpaceLinks(itemType, itemId);
      setExistingLinks(links);
    } catch (error) {
      console.error('Failed to load existing links:', error);
    }
  }

  const [unshareConfirmId, setUnshareConfirmId] = useState<string | null>(null);

  async function handleShare() {
    if (!selectedSpaceId) {
      showToast('warning', 'Please select a shared space');
      return;
    }

    setLoading(true);
    try {
      await publishToSharedSpace(
        selectedSpaceId,
        itemType,
        itemId,
        linkType,
        allowEdit
      );
      await loadExistingLinks();
      setSelectedSpaceId('');
      setLinkType('send');
      setAllowEdit(false);
      showToast('success', 'Successfully shared to space!');
    } catch (error) {
      console.error('Failed to share:', error);
      showToast('error', 'Failed to share. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnshare(linkId: string) {
    setUnshareConfirmId(linkId);
  }

  async function confirmUnshare() {
    if (!unshareConfirmId) return;

    try {
      await unpublishFromSharedSpace(unshareConfirmId);
      await loadExistingLinks();
      setUnshareConfirmId(null);
    } catch (error) {
      console.error('Failed to unshare:', error);
      showToast('error', 'Failed to remove. Please try again.');
      setUnshareConfirmId(null);
    }
  }

  if (!isOpen) return null;

  // Phase 5A: Show confirmation dialog if needed
  if (unshareConfirmId) {
    return (
      <ConfirmDialogInline
        isOpen={true}
        message="Remove this item from the shared space?"
        confirmText="Remove"
        cancelText="Cancel"
        variant="warning"
        onConfirm={confirmUnshare}
        onCancel={() => setUnshareConfirmId(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 safe-top safe-bottom">
      <div className="bg-white rounded-xl shadow-2xl max-w-full sm:max-w-md w-full max-h-screen-safe overflow-hidden flex flex-col overscroll-contain">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Share2 size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Share to Shared Space</h2>
              <p className="text-xs text-gray-500">{itemTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {existingLinks.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Check size={16} />
                Currently Shared
              </h3>
              <div className="space-y-2">
                {existingLinks.map((link) => {
                  const space = sharedSpaces.find(s => s.id === link.shared_space_id);
                  return (
                    <div
                      key={link.id}
                      className="bg-white rounded px-3 py-2 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {space?.name || 'Unknown Space'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {link.link_type === 'send' && 'Sent once (no sync)'}
                          {link.link_type === 'duplicate' && 'Duplicated (no sync)'}
                          {link.link_type === 'linked' && `Linked (${link.allow_edit ? 'editable' : 'view only'})`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnshare(link.id)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Shared Space
            </label>
            <select
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a space...</option>
              {sharedSpaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How to share
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="linkType"
                  value="send"
                  checked={linkType === 'send'}
                  onChange={(e) => setLinkType(e.target.value as LinkType)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Send once</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Creates a one-way copy. No syncing after creation.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="linkType"
                  value="duplicate"
                  checked={linkType === 'duplicate'}
                  onChange={(e) => setLinkType(e.target.value as LinkType)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Duplicate</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Creates a copy marked as duplicate. No further syncing.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="linkType"
                  value="linked"
                  checked={linkType === 'linked'}
                  onChange={(e) => setLinkType(e.target.value as LinkType)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Link this item</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Shared Space displays a live version of the original
                  </p>
                </div>
              </label>
            </div>
          </div>

          {linkType === 'linked' && (
            <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                checked={allowEdit}
                onChange={(e) => setAllowEdit(e.target.checked)}
                className="rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Allow Shared Space editing</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Members can edit this item from the Shared Space
                </p>
              </div>
            </label>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={loading || !selectedSpaceId}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Users size={16} />
              {loading ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

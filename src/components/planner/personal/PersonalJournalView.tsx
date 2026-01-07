import { useState, useEffect } from 'react';
import { BookOpen, Plus, Lock, Users, Trash2, Tag, Calendar as CalendarIcon, Edit2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  entry_date: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export function PersonalJournalView() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(['growth', 'identity', 'values', 'learning']);
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    entry_date: new Date().toISOString().split('T')[0],
    is_private: true
  });

  const growthTags = ['growth', 'identity', 'values', 'learning', 'reflection', 'awareness', 'mindfulness', 'gratitude'];

  useEffect(() => {
    if (user) {
      loadEntries();
    }
  }, [user, selectedTags]);

  const loadEntries = async () => {
    if (!user) return;
    try {
      let query = supabase
        .from('personal_dev_ideas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (selectedTags.length > 0) {
        query = query.overlaps('tags', selectedTags);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries((data || []) as any);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!user || !newEntry.title.trim() || !newEntry.content.trim()) return;

    try {
      const { error } = await supabase
        .from('personal_dev_ideas')
        .insert({
          user_id: user.id,
          title: newEntry.title,
          content: newEntry.content,
          tags: newEntry.tags,
          status: 'captured',
          is_private: newEntry.is_private
        });

      if (error) throw error;

      setNewEntry({
        title: '',
        content: '',
        tags: [],
        entry_date: new Date().toISOString().split('T')[0],
        is_private: true
      });
      setShowAddModal(false);
      loadEntries();
    } catch (error) {
      console.error('Error adding journal entry:', error);
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry || !newEntry.title.trim() || !newEntry.content.trim()) return;

    try {
      const { error } = await supabase
        .from('personal_dev_ideas')
        .update({
          title: newEntry.title,
          content: newEntry.content,
          tags: newEntry.tags,
          is_private: newEntry.is_private
        })
        .eq('id', editingEntry.id);

      if (error) throw error;

      setEditingEntry(null);
      setNewEntry({
        title: '',
        content: '',
        tags: [],
        entry_date: new Date().toISOString().split('T')[0],
        is_private: true
      });
      setShowAddModal(false);
      loadEntries();
    } catch (error) {
      console.error('Error updating journal entry:', error);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this journal entry?')) return;

    try {
      const { error } = await supabase
        .from('personal_dev_ideas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadEntries();
    } catch (error) {
      console.error('Error deleting journal entry:', error);
    }
  };

  const openEditModal = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setNewEntry({
      title: entry.title,
      content: entry.content,
      tags: entry.tags || [],
      entry_date: new Date(entry.created_at).toISOString().split('T')[0],
      is_private: entry.is_private
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingEntry(null);
    setNewEntry({
      title: '',
      content: '',
      tags: [],
      entry_date: new Date().toISOString().split('T')[0],
      is_private: true
    });
  };

  const toggleTag = (tag: string) => {
    setNewEntry(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const toggleFilterTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-slate-600">Loading journal entries...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Personal Journal</h2>
          <p className="text-slate-600 mt-1">Reflection tied to growth</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Entry
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-5 h-5 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Filter by tags:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {growthTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleFilterTag(tag)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No journal entries yet</h3>
          <p className="text-slate-500 mb-4">Start journaling about your personal growth and reflections</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            Write Your First Entry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-slate-800">{entry.title}</h3>
                    {entry.is_private ? (
                      <Lock className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Users className="w-4 h-4 text-teal-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{new Date(entry.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(entry)}
                    className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">
                {entry.content}
              </p>

              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">
              {editingEntry ? 'Edit Journal Entry' : 'New Journal Entry'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Give your entry a title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={newEntry.content}
                  onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent h-48"
                  placeholder="Write your thoughts, reflections, and insights..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {growthTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        newEntry.tags.includes(tag)
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  id="private"
                  checked={newEntry.is_private}
                  onChange={(e) => setNewEntry({ ...newEntry, is_private: e.target.checked })}
                  className="w-4 h-4 text-teal-500 rounded"
                />
                <label htmlFor="private" className="text-sm text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Keep this entry private
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingEntry ? handleUpdateEntry : handleAddEntry}
                disabled={!newEntry.title.trim() || !newEntry.content.trim()}
                className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingEntry ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

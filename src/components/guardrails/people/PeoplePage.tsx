import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Archive, ArchiveRestore, Mail, Briefcase, Eye } from 'lucide-react';
import { useActiveDataContext } from '../../../state/useActiveDataContext';
import { getPeopleByProject, archivePerson, unarchivePerson } from '../../../lib/guardrails/peopleService';
import { getAssignmentCountsByProject } from '../../../lib/guardrails/assignmentService';
import type { Person } from '../../../lib/guardrails';
import { AddEditPersonModal } from './AddEditPersonModal';
import { PersonAssignmentsDrawer } from './PersonAssignmentsDrawer';

export function PeoplePage() {
  const { activeProjectId } = useActiveDataContext();
  const [people, setPeople] = useState<Person[]>([]);
  const [assignmentCounts, setAssignmentCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [viewingPerson, setViewingPerson] = useState<Person | null>(null);

  useEffect(() => {
    if (activeProjectId) {
      loadPeople();
      loadAssignmentCounts();
    } else {
      setPeople([]);
      setAssignmentCounts(new Map());
      setLoading(false);
    }
  }, [activeProjectId, showArchived]);

  async function loadPeople() {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const data = await getPeopleByProject(activeProjectId, showArchived);
      setPeople(data);
    } catch (error) {
      console.error('Failed to load people:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignmentCounts() {
    if (!activeProjectId) return;
    try {
      const counts = await getAssignmentCountsByProject(activeProjectId);
      const countMap = new Map(counts.map(c => [c.personId, c.assignmentCount]));
      setAssignmentCounts(countMap);
    } catch (error) {
      console.error('Failed to load assignment counts:', error);
    }
  }

  async function handleArchive(person: Person) {
    try {
      await archivePerson(person.id);
      loadPeople();
    } catch (error) {
      console.error('Failed to archive person:', error);
      alert('Failed to archive person');
    }
  }

  async function handleUnarchive(person: Person) {
    try {
      await unarchivePerson(person.id);
      loadPeople();
    } catch (error) {
      console.error('Failed to unarchive person:', error);
      alert('Failed to unarchive person');
    }
  }

  function handleSave() {
    loadPeople();
    loadAssignmentCounts();
  }

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Project</h2>
          <p className="text-gray-600">Select a project from the Dashboard to manage people.</p>
        </div>
      </div>
    );
  }

  const activePeople = people.filter(p => !p.archived);
  const archivedPeople = people.filter(p => p.archived);

  return (
    <div className="h-full bg-slate-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users size={32} />
              People
            </h1>
            <p className="text-gray-600 mt-1">Manage people involved in this project</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Person
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Active People ({activePeople.length})
            </h2>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <Archive size={16} />
              {showArchived ? 'Hide' : 'Show'} Archived ({archivedPeople.length})
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-600">Loading...</div>
          ) : activePeople.length === 0 && !showArchived ? (
            <div className="p-8 text-center text-gray-600">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p>No people added yet.</p>
              <p className="text-sm mt-2">Click "Add Person" to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activePeople.map(person => (
                <div
                  key={person.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{person.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        {person.role && (
                          <div className="flex items-center gap-1">
                            <Briefcase size={14} />
                            <span>{person.role}</span>
                          </div>
                        )}
                        {person.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={14} />
                            <span>{person.email}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Assigned to </span>
                        <span className="font-medium text-gray-900">
                          {assignmentCounts.get(person.id) || 0}
                        </span>
                        <span className="text-gray-600"> item(s)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingPerson(person)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View assignments"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => setEditingPerson(person)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit person"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Archive ${person.name}?`)) {
                            handleArchive(person);
                          }
                        }}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Archive person"
                      >
                        <Archive size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {showArchived && archivedPeople.length > 0 && (
                <>
                  <div className="p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                      Archived People
                    </h3>
                  </div>
                  {archivedPeople.map(person => (
                    <div
                      key={person.id}
                      className="p-4 bg-gray-50 opacity-75"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-700">{person.name}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            {person.role && (
                              <div className="flex items-center gap-1">
                                <Briefcase size={14} />
                                <span>{person.role}</span>
                              </div>
                            )}
                            {person.email && (
                              <div className="flex items-center gap-1">
                                <Mail size={14} />
                                <span>{person.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnarchive(person)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Unarchive person"
                        >
                          <ArchiveRestore size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <AddEditPersonModal
          masterProjectId={activeProjectId}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleSave}
        />
      )}

      {editingPerson && (
        <AddEditPersonModal
          masterProjectId={activeProjectId}
          person={editingPerson}
          onClose={() => setEditingPerson(null)}
          onSave={handleSave}
        />
      )}

      {viewingPerson && (
        <PersonAssignmentsDrawer
          person={viewingPerson}
          onClose={() => setViewingPerson(null)}
        />
      )}
    </div>
  );
}

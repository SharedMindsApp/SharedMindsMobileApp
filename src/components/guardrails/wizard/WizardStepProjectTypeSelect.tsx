import { useState, useEffect } from 'react';
import { Info, Plus, X } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { getProjectTypesForDomain, createCustomProjectType } from '../../../lib/guardrails/projectTypes';
import { getDomains } from '../../../lib/guardrails';
import { supabase } from '../../../lib/supabase';
import type { ProjectType } from '../../../lib/guardrails/projectTypes';
import type { DomainType } from '../../../lib/guardrails/templateTypes';

export function WizardStepProjectTypeSelect() {
  const { state, setProjectType, existingProjectId } = useProjectWizard();
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showingFallback, setShowingFallback] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [domainName, setDomainName] = useState<string>('');

  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  useEffect(() => {
    async function loadDomain() {
      if (state.domainId) {
        try {
          const domains = await getDomains();
          const selectedDomain = domains.find(d => d.id === state.domainId);
          if (selectedDomain) {
            setDomainName(selectedDomain.name);
          }
        } catch (error) {
          console.error('Failed to load domain:', error);
        }
      }
    }

    loadDomain();
  }, [state.domainId]);

  useEffect(() => {
    async function loadProjectTypes() {
      if (!domainName) {
        setLoading(false);
        return;
      }

      try {
        const types = await getProjectTypesForDomain(domainName as DomainType);
        setProjectTypes(types);

        const hasMatchingDomain = types.some(
          t => t.domains && t.domains.includes(domainName as DomainType)
        );
        setShowingFallback(!hasMatchingDomain && types.length > 0);
      } catch (error) {
        console.error('Failed to load project types:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProjectTypes();
  }, [domainName]);

  const handleSelectProjectType = async (projectTypeId: string) => {
    setProjectType(projectTypeId);
    
    // If editing an existing project, save the project type immediately to the database
    if (existingProjectId) {
      try {
        const { error } = await supabase
          .from('master_projects')
          .update({ project_type_id: projectTypeId })
          .eq('id', existingProjectId);
        
        if (error) {
          console.error('Failed to save project type:', error);
          // Don't throw - the selection is still saved in context/localStorage
        }
      } catch (err) {
        console.error('Failed to save project type:', err);
        // Don't throw - the selection is still saved in context/localStorage
      }
    }
  };

  const handleCreateCustomType = async () => {
    if (!customName.trim() || !domainName) return;

    setCreating(true);
    try {
      const newType = await createCustomProjectType(
        customName.trim(),
        customDescription.trim() || null,
        [domainName as DomainType]
      );

      setProjectTypes(prev => [...prev, newType]);
      setProjectType(newType.id);
      setShowCreateModal(false);
      setCustomName('');
      setCustomDescription('');
    } catch (error) {
      console.error('Failed to create custom project type:', error);
      alert('Failed to create custom project type. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Choose Your Project Type
          </h2>
          <p className="text-gray-600 text-lg">
            Select the type of project you're working on to get relevant templates
          </p>
        </div>

        {showingFallback && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <span className="font-medium">Showing all project types</span> — none are explicitly tagged for the{' '}
              <span className="font-semibold capitalize">{domainName}</span> domain. You can still select any type that fits your project.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projectTypes.map((projectType) => {
            const isSelected = state.projectTypeId === projectType.id;

            return (
              <button
                key={projectType.id}
                type="button"
                onClick={() => handleSelectProjectType(projectType.id)}
                className={`
                  relative p-6 rounded-xl border-2 text-left transition-all
                  ${isSelected ? 'border-blue-600 bg-blue-50' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'}
                `}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {projectType.name}
                  </h3>
                  {projectType.description && (
                    <p className="text-sm text-gray-600">
                      {projectType.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="relative p-6 rounded-xl border-2 border-dashed border-gray-300 text-left transition-all hover:border-blue-400 hover:bg-blue-50 group"
          >
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[120px]">
              <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition-colors">
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 group-hover:text-blue-700 transition-colors">
                Create Custom Type
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Define your own project type
              </p>
            </div>
          </button>
        </div>

        {projectTypes.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 mb-4">
            <div className="max-w-md mx-auto">
              <p className="text-gray-600 mb-4">
                No project types are available for this domain yet.
              </p>
              <p className="text-sm text-gray-500">
                Create a custom type to get started.
              </p>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Create Custom Project Type</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCustomName('');
                  setCustomDescription('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4">
                <label htmlFor="custom-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Type Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="custom-name"
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., Mobile App, Research Project"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="custom-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="custom-description"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Describe what this project type is for..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Domain:</span>{' '}
                  <span className="capitalize">{domainName}</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  This custom type will be available in the {domainName} domain
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCustomName('');
                  setCustomDescription('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCustomType}
                disabled={!customName.trim() || creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Type'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

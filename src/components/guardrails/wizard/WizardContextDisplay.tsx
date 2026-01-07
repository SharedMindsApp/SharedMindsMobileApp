import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { getProjectTypeById } from '../../../lib/guardrails/projectTypes';
import { getDomains } from '../../../lib/guardrails';
import { getDomainConfig } from '../../../lib/guardrails/domainConfig';
import type { ProjectTypeWithDomains } from '../../../lib/guardrails/projectTypes';
import type { Domain } from '../../../lib/guardrailsTypes';

export function WizardContextDisplay() {
  const { state } = useProjectWizard();
  const [projectType, setProjectType] = useState<ProjectTypeWithDomains | null>(null);
  const [domain, setDomain] = useState<Domain | null>(null);

  useEffect(() => {
    async function loadDomain() {
      if (state.domainId) {
        try {
          const domains = await getDomains();
          const selectedDomain = domains.find(d => d.id === state.domainId);
          setDomain(selectedDomain || null);
        } catch (error) {
          console.error('Failed to load domain:', error);
        }
      } else {
        setDomain(null);
      }
    }

    loadDomain();
  }, [state.domainId]);

  useEffect(() => {
    async function loadProjectType() {
      if (state.projectTypeId) {
        try {
          const type = await getProjectTypeById(state.projectTypeId);
          setProjectType(type);
        } catch (error) {
          console.error('Failed to load project type:', error);
        }
      } else {
        setProjectType(null);
      }
    }

    loadProjectType();
  }, [state.projectTypeId]);

  if (!domain && !projectType) {
    return null;
  }

  const domainConfig = domain ? getDomainConfig(domain.name) : null;

  return (
    <div className="flex items-center gap-4">
      {domain && domainConfig && (
        <div className={`flex items-center gap-2 px-3 py-1.5 ${domainConfig.colors.light} rounded-lg border ${domainConfig.colors.border}`}>
          <domainConfig.icon className={`w-4 h-4 ${domainConfig.colors.text}`} />
          <div className="text-sm">
            <span className={`${domainConfig.colors.text} font-medium`}>Domain:</span>
            <span className="text-gray-900 font-semibold ml-1.5">
              {domainConfig.name}
            </span>
          </div>
        </div>
      )}

      {projectType && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
          <Target className="w-4 h-4 text-green-600" />
          <div className="text-sm">
            <span className="text-green-600 font-medium">Type:</span>
            <span className="text-green-900 font-semibold ml-1.5">
              {projectType.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

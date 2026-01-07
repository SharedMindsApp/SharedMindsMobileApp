import { supabase } from '../supabase';
import { createMasterProject } from '../guardrails';
import type {
  CreateProjectWizardInput,
  ProjectWizardResult,
  TemplateResolutionInput,
  RoadmapItemPreview,
} from './wizardTypes';
import type { Track } from './tracksTypes';
import type { SubTrack } from './subtracksTypes';
import type { AnyTrackTemplate } from './templateTypes';
import {
  getDefaultTemplatesForDomain,
  getTrackTemplateById,
  validateTemplateForDomain,
  createTrackFromTemplate,
  getTemplatesForDomain,
} from './templates';
import {
  getUserTrackTemplateById,
  isUserTrackTemplate,
  createTrackFromUserTemplate as createTrackFromUserTemplateUtil,
} from './userTemplates';
import { getTracksByProject } from './trackService';

async function resolveTemplatesForWizard(
  input: TemplateResolutionInput
): Promise<AnyTrackTemplate[]> {
  const {
    domain_type,
    use_default_templates = false,
    selected_default_template_ids = [],
    selected_system_template_ids = [],
    selected_user_template_ids = [],
  } = input;

  const validDefaultIds = selected_default_template_ids.filter(
    (id): id is string => !!id && typeof id === 'string' && id !== 'undefined'
  );
  const validSystemIds = selected_system_template_ids.filter(
    (id): id is string => !!id && typeof id === 'string' && id !== 'undefined'
  );
  const validUserIds = selected_user_template_ids.filter(
    (id): id is string => !!id && typeof id === 'string' && id !== 'undefined'
  );

  if (validDefaultIds.length !== selected_default_template_ids.length) {
    console.warn(
      'Some default template IDs were invalid and have been filtered out:',
      selected_default_template_ids.filter(id => !id || typeof id !== 'string' || id === 'undefined')
    );
  }
  if (validSystemIds.length !== selected_system_template_ids.length) {
    console.warn(
      'Some system template IDs were invalid and have been filtered out:',
      selected_system_template_ids.filter(id => !id || typeof id !== 'string' || id === 'undefined')
    );
  }
  if (validUserIds.length !== selected_user_template_ids.length) {
    console.warn(
      'Some user template IDs were invalid and have been filtered out:',
      selected_user_template_ids.filter(id => !id || typeof id !== 'string' || id === 'undefined')
    );
  }

  const resolvedTemplates: AnyTrackTemplate[] = [];
  const templateIds = new Set<string>();

  if (use_default_templates && validDefaultIds.length === 0) {
    const defaultTemplates = await getDefaultTemplatesForDomain(domain_type);
    for (const template of defaultTemplates) {
      if (template.id && !templateIds.has(template.id)) {
        resolvedTemplates.push(template);
        templateIds.add(template.id);
      }
    }
  }

  for (const templateId of validDefaultIds) {
    if (templateIds.has(templateId)) continue;

    await validateTemplateForDomain(domain_type, templateId);
    const template = await getTrackTemplateById(templateId);
    if (template && template.id) {
      resolvedTemplates.push(template);
      templateIds.add(templateId);
    }
  }

  for (const templateId of validSystemIds) {
    if (templateIds.has(templateId)) continue;

    await validateTemplateForDomain(domain_type, templateId);
    const template = await getTrackTemplateById(templateId);
    if (template && template.id) {
      resolvedTemplates.push(template);
      templateIds.add(templateId);
    }
  }

  for (const templateId of validUserIds) {
    if (templateIds.has(templateId)) continue;

    await validateTemplateForDomain(domain_type, templateId);
    const template = await getUserTrackTemplateById(templateId);
    if (template && template.id) {
      resolvedTemplates.push(template);
      templateIds.add(templateId);
    }
  }

  resolvedTemplates.sort((a, b) => {
    const aIsDefault = 'is_default' in a ? a.is_default : false;
    const bIsDefault = 'is_default' in b ? b.is_default : false;

    if (aIsDefault !== bIsDefault) {
      return aIsDefault ? -1 : 1;
    }
    return a.ordering_index - b.ordering_index;
  });

  return resolvedTemplates;
}

export async function createProjectWithWizard(
  input: CreateProjectWizardInput
): Promise<ProjectWizardResult> {
  const {
    domain_id,
    domain_type,
    name,
    description,
    use_default_templates,
    selected_default_template_ids,
    selected_system_template_ids,
    selected_user_template_ids,
    generate_initial_roadmap = false,
  } = input;

  if (!domain_type) {
    throw new Error('Domain type is required for project creation');
  }

  const validDomainTypes = ['work', 'personal', 'passion', 'startup'];
  if (!validDomainTypes.includes(domain_type)) {
    throw new Error(`Invalid domain type: ${domain_type}`);
  }

  const project = await createMasterProject(domain_id, name, description);

  await supabase
    .from('guardrails_master_projects')
    .update({ wizard_completed: true })
    .eq('id', project.id);

  const resolvedTemplates = await resolveTemplatesForWizard({
    domain_type,
    use_default_templates,
    selected_default_template_ids,
    selected_system_template_ids,
    selected_user_template_ids,
  });

  const tracks: Track[] = [];
  const subtracks: SubTrack[] = [];
  const roadmapPreview: RoadmapItemPreview[] = [];

  for (const template of resolvedTemplates) {
    if (!template.id || typeof template.id !== 'string' || template.id === 'undefined') {
      console.warn('Skipping template with invalid ID:', template);
      continue;
    }

    const isUser = await isUserTrackTemplate(template.id);

    if (isUser) {
      const track = await createTrackFromUserTemplateUtil({
        master_project_id: project.id,
        user_track_template_id: template.id,
        include_subtracks: true,
      });

      const createdTrack: Track = {
        id: track.id,
        masterProjectId: track.master_project_id,
        name: track.name,
        description: track.description,
        color: track.color,
        orderingIndex: track.ordering_index || 0,
        isDefault: track.is_default || false,
        createdAt: track.created_at,
        updatedAt: track.updated_at,
      };

      tracks.push(createdTrack);

      const { data: createdSubtracks, error } = await supabase
        .from('guardrails_subtracks')
        .select('*')
        .eq('track_id', track.id)
        .order('ordering_index', { ascending: true });

      if (!error && createdSubtracks) {
        subtracks.push(...createdSubtracks);

        if (generate_initial_roadmap) {
          for (const subtrack of createdSubtracks) {
            roadmapPreview.push({
              track_id: track.id,
              subtrack_id: subtrack.id,
              title: subtrack.name,
              status: 'not_started',
            });
          }
        }
      }
    } else {
      const result = await createTrackFromTemplate({
        master_project_id: project.id,
        track_template_id: template.id,
        domain_type,
        include_subtracks: true,
      });

      const createdTrack: Track = {
        id: result.track.id,
        masterProjectId: result.track.master_project_id,
        name: result.track.name,
        description: result.track.description,
        color: result.track.color,
        orderingIndex: result.track.ordering_index || 0,
        isDefault: result.track.is_default || false,
        createdAt: result.track.created_at,
        updatedAt: result.track.updated_at,
      };

      tracks.push(createdTrack);
      subtracks.push(...result.subtracks);

      if (generate_initial_roadmap && result.subtracks.length > 0) {
        for (const subtrack of result.subtracks) {
          roadmapPreview.push({
            track_id: result.track.id,
            subtrack_id: subtrack.id,
            title: subtrack.name,
            status: 'not_started',
          });
        }
      }
    }
  }

  return {
    project,
    tracks,
    subtracks,
    roadmap_preview: roadmapPreview,
    applied_templates: resolvedTemplates,
  };
}

export async function addTracksToProject(input: {
  project_id: string;
  domain_type: DomainType;
  use_default_templates?: boolean;
  selected_default_template_ids?: string[];
  selected_system_template_ids?: string[];
  selected_user_template_ids?: string[];
}): Promise<{
  tracks: Track[];
  subtracks: SubTrack[];
  applied_templates: AnyTrackTemplate[];
}> {
  const {
    project_id,
    domain_type,
    use_default_templates,
    selected_default_template_ids,
    selected_system_template_ids,
    selected_user_template_ids,
  } = input;

  const resolvedTemplates = await resolveTemplatesForWizard({
    domain_type,
    use_default_templates,
    selected_default_template_ids,
    selected_system_template_ids,
    selected_user_template_ids,
  });

  const tracks: Track[] = [];
  const subtracks: SubTrack[] = [];

  for (const template of resolvedTemplates) {
    if (!template.id || typeof template.id !== 'string' || template.id === 'undefined') {
      console.warn('Skipping template with invalid ID:', template);
      continue;
    }

    const isUser = await isUserTrackTemplate(template.id);

    if (isUser) {
      const track = await createTrackFromUserTemplateUtil({
        master_project_id: project_id,
        user_track_template_id: template.id,
        include_subtracks: true,
      });

      const createdTrack: Track = {
        id: track.id,
        masterProjectId: track.master_project_id,
        name: track.name,
        description: track.description,
        color: track.color,
        orderingIndex: track.ordering_index || 0,
        isDefault: track.is_default || false,
        createdAt: track.created_at,
        updatedAt: track.updated_at,
      };

      tracks.push(createdTrack);

      const { data: createdSubtracks, error } = await supabase
        .from('guardrails_subtracks')
        .select('*')
        .eq('track_id', track.id)
        .order('ordering_index', { ascending: true });

      if (!error && createdSubtracks) {
        subtracks.push(...createdSubtracks);
      }
    } else {
      const result = await createTrackFromTemplate({
        master_project_id: project_id,
        track_template_id: template.id,
      });

      const createdTrack: Track = {
        id: result.track.id,
        masterProjectId: result.track.master_project_id,
        name: result.track.name,
        description: result.track.description || null,
        color: result.track.color,
        orderingIndex: result.track.ordering_index || 0,
        isDefault: result.track.is_default || false,
        createdAt: result.track.created_at,
        updatedAt: result.track.updated_at,
      };

      tracks.push(createdTrack);
      subtracks.push(...result.subtracks);
    }
  }

  await supabase
    .from('guardrails_master_projects')
    .update({ wizard_completed: true })
    .eq('id', project_id);

  return {
    tracks,
    subtracks,
    applied_templates: resolvedTemplates,
  };
}

export interface AppliedTemplateIds {
  defaultTemplateIds: string[];
  systemTemplateIds: string[];
  userTemplateIds: string[];
}

export async function getAppliedTemplateIdsForProject(
  projectId: string,
  domainType?: DomainType
): Promise<AppliedTemplateIds> {
  const tracks = await getTracksByProject(projectId);
  
  const defaultTemplateIds: string[] = [];
  const systemTemplateIds: string[] = [];
  const userTemplateIds: string[] = [];
  
  // Get all available templates for name matching fallback (for existing tracks without template_id)
  let allTemplates: AnyTrackTemplate[] = [];
  if (domainType) {
    try {
      allTemplates = await getTemplatesForDomain(domainType);
    } catch (error) {
      console.error('Failed to load templates for name matching:', error);
    }
  }
  
  for (const track of tracks) {
    let matchedTemplateId: string | null = null;
    
    // First try to match by template_id if it exists
    if (track.templateId) {
      matchedTemplateId = track.templateId;
    } else if (domainType && allTemplates.length > 0) {
      // Fallback: match by track name to template name (exact match)
      const matchingTemplate = allTemplates.find(t => t.name === track.name);
      if (matchingTemplate && matchingTemplate.id) {
        matchedTemplateId = matchingTemplate.id;
      }
    }
    
    if (!matchedTemplateId) continue;
    
    const isUser = await isUserTrackTemplate(matchedTemplateId);
    
    if (isUser) {
      userTemplateIds.push(matchedTemplateId);
    } else {
      // Check if it's a default template
      const template = await getTrackTemplateById(matchedTemplateId);
      if (template && template.is_default) {
        defaultTemplateIds.push(matchedTemplateId);
      } else {
        systemTemplateIds.push(matchedTemplateId);
      }
    }
  }
  
  return {
    defaultTemplateIds: Array.from(new Set(defaultTemplateIds)),
    systemTemplateIds: Array.from(new Set(systemTemplateIds)),
    userTemplateIds: Array.from(new Set(userTemplateIds)),
  };
}

export async function getWizardTemplatePreview(domain_type: string) {
  const input: TemplateResolutionInput = {
    domain_type: domain_type as any,
    use_default_templates: true,
  };

  const templates = await resolveTemplatesForWizard(input);

  return {
    domain_type,
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      is_default: 'is_default' in t ? t.is_default : false,
      is_user_template: !('is_default' in t),
      subtrack_count: 'subtracks' in t ? t.subtracks.length : 0,
    })),
  };
}

# Guardrails Unified Architecture (Authoritative)

## Overview

This document describes the Guardrails project management architecture, which provides structured project organization through tracks, roadmap items, and a Mind Mesh knowledge graph. The system supports both single-project tracks and shared tracks that can be linked across multiple projects.

**Last Updated:** December 2025

## Core Principles

1. **Tracks are Organizational Units** - Tracks organize work within projects and can be shared across projects
2. **Shared Track Model** - Single track definition with multiple project instances for flexible cross-project workflows
3. **Authority-Based Editing** - Configurable edit permissions (shared_editing or primary_project_only)
4. **Per-Project Configuration** - Each project controls visibility, roadmap inclusion, and ordering independently
5. **Mind Mesh Integration** - All entities (tracks, items, widgets) connect through a knowledge graph
6. **ADC Stays Focused** - Active Data Context manages only Active Master Project and Active Track, nothing more

## Architecture Layers

### Layer 1: Track Definition (Authoritative Content)

The track definition owns the core content and structure:
- Name, description, color
- Start and end dates
- Sharing configuration (is_shared, authority_mode, primary_owner)

**Database Table:** `guardrails_tracks`

### Layer 2: Project Instances (Contextual Configuration)

For shared tracks, project instances define project-specific configuration:
- `include_in_roadmap` - Whether track appears in project's timeline
- `visibility_state` - visible, hidden, collapsed, or archived
- `order_index` - Position in project's track list
- `is_primary` - Whether this is the primary owner project
- `instance_metadata` - Project-specific overrides

**Database Table:** `track_project_instances`

### Layer 3: Roadmap Items (Time-Bound Work)

Roadmap items represent actual work with dates and status:
- Multiple types: task, event, milestone, goal, note, document, etc.
- Composable hierarchy (items can contain sub-items)
- Deadline tracking with extension support
- Assignment to people

**Database Table:** `roadmap_items`

### Layer 4: Mind Mesh (Knowledge Graph)

Connects all entities in a flexible graph structure:
- Widgets (content nodes: text, doc, image, link)
- Connections (typed edges: expands, inspires, depends_on, references, etc.)
- Auto-generated connections for track hierarchy and roadmap linkage

**Database Tables:** `mindmesh_widgets`, `mindmesh_connections`

## Domain Model

### Track (Definition)

```typescript
interface Track {
  id: string;
  masterProjectId: string;          // Legacy single-project support
  name: string;
  description: string | null;
  color: string | null;
  orderingIndex: number;
  isDefault: boolean;

  // Shared tracks support
  isShared: boolean;
  primaryOwnerProjectId: string | null;
  authorityMode: 'shared_editing' | 'primary_project_only';

  start_date: string | null;
  end_date: string | null;

  createdAt: string;
  updatedAt: string;
}
```

**Key Fields:**
- `isShared`: If false, track uses legacy single-project mode; if true, uses track_project_instances
- `primaryOwnerProjectId`: For shared tracks, the project with primary authority
- `authorityMode`: Controls who can edit track content (see Authority & Edit Model)

### Track Project Instance

```typescript
interface TrackProjectInstance {
  id: string;
  trackId: string;
  masterProjectId: string;
  includeInRoadmap: boolean;
  visibilityState: 'visible' | 'hidden' | 'collapsed' | 'archived';
  orderIndex: number;
  isPrimary: boolean;
  instanceMetadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

**Purpose:** Links shared tracks to projects with per-project configuration

**Key Constraint:** One instance per (trackId, masterProjectId) pair

### Roadmap Item

```typescript
interface RoadmapItem {
  id: string;
  masterProjectId: string;
  trackId: string;
  type: RoadmapItemType;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string | null;
  status: RoadmapItemStatus;
  parentItemId?: string | null;
  itemDepth: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

**Roadmap Item Types:**
- `task` - Completable work items
- `event` - Date-specific events
- `milestone` - Key project milestones
- `goal` - Long-term objectives
- `note` - Reference notes
- `document` - Document references
- `photo` - Image attachments
- `grocery_list` - Household lists
- `habit` - Recurring activities
- `review` - Retrospective items

**Item Composition:**
- Items can contain sub-items via `parentItemId`
- Unlimited nesting depth (tracked via `itemDepth`)
- Auto-calculated hierarchy with validation

### People & Assignments

#### Global Person (Identity Layer)

```typescript
interface GlobalPerson {
  id: string;
  name: string;
  email?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Purpose:** Canonical identity across all projects (NOT system users)

#### Project Person (Membership Layer)

```typescript
interface Person {
  id: string;
  masterProjectId: string;
  globalPersonId: string;
  name: string;         // denormalized
  email?: string;       // denormalized
  role?: string;        // project-specific (semantic only)
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Purpose:** Project membership with roles (roles are informational, not permission-based)

#### Assignment

```typescript
interface RoadmapItemAssignment {
  id: string;
  roadmapItemId: string;
  personId: string;  // references project_people
  assignedAt: string;
}
```

**Purpose:** Link people to roadmap items (many-to-many)

### Mind Mesh Components

#### Widget (Content Node)

```typescript
interface MindMeshWidget {
  id: string;
  masterProjectId: string;
  type: 'text' | 'doc' | 'image' | 'link';
  title: string;
  content: string;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}
```

#### Connection (Graph Edge)

```typescript
interface MindMeshConnection {
  id: string;
  masterProjectId: string;
  sourceType: 'track' | 'roadmap_item' | 'widget';
  sourceId: string;
  targetType: 'track' | 'roadmap_item' | 'widget';
  targetId: string;
  relationship: 'expands' | 'inspires' | 'depends_on' | 'references' | 'hierarchy' | 'offshoot' | 'composition';
  autoGenerated: boolean;
  createdAt: string;
}
```

**Auto-Generated Connections:**
- Track → Roadmap Item (references)
- Parent Item → Child Item (composition)
- Track → Widget (user-created)

## Authority & Edit Model

### Authority Modes

#### `shared_editing` Mode

**Who Can Edit:** Any linked project can edit track content
**Use Case:** Collaborative teams working on shared work streams
**Example:** Production team track shared between director and producer projects

#### `primary_project_only` Mode

**Who Can Edit:** Only the primary owner project can edit track content
**Use Case:** Read-only reference tracks or controlled content distribution
**Example:** Executive strategy track viewable by multiple departments but editable only by executives

**Default:** `primary_project_only`

### Edit Permission Logic

**Content Changes (require authority):**
- Track name, description, color, dates
- Creating/editing/deleting roadmap items
- Creating/editing/deleting sub-items

**Instance Changes (require project membership only):**
- Setting `include_in_roadmap`
- Changing `visibility_state`
- Adjusting `order_index`
- Updating `instance_metadata`

### Permission Check

```typescript
function canEditTrackContent(track: Track, projectId: string, isLinkedProject: boolean): boolean {
  // Legacy single-project track
  if (!track.isShared) {
    return track.masterProjectId === projectId;
  }

  // Must be linked to track
  if (!isLinkedProject) {
    return false;
  }

  // Shared editing mode
  if (track.authorityMode === 'shared_editing') {
    return true;
  }

  // Primary project only mode
  return track.primaryOwnerProjectId === projectId;
}
```

## Core Services

### Track Service (`trackService.ts`)

Manages track creation, updates, and queries.

**Key Functions:**
- `createTrack(input)` - Create new track
- `updateTrack(id, input)` - Update track with validation
- `getTracksByProject(projectId)` - Get all tracks for a project
- `deleteTrack(id)` - Delete track

### Shared Track Service (`sharedTrackService.ts`)

Manages shared tracks and cross-project linking.

**Key Functions:**
- `convertTrackToShared(input)` - Convert single-project track to shared
- `linkTrackToProject(input)` - Link shared track to another project
- `unlinkTrackFromProject(input)` - Remove track from project
- `updateTrackInstance(trackId, projectId, input)` - Update project-specific configuration
- `transferPrimaryOwnership(trackId, newProjectId)` - Transfer primary ownership
- `changeTrackAuthorityMode(trackId, mode)` - Change edit authority mode
- `checkTrackEditPermission(trackId, projectId)` - Check edit permissions
- `getTracksForProject(projectId, includeInstances)` - Get tracks with instance data
- `getTrackProjects(trackId)` - Get all projects linked to a track

### Roadmap Service (`roadmapService.ts`)

Manages roadmap items and their composition hierarchy.

**Key Functions:**
- `createRoadmapItem(input)` - Create item
- `updateRoadmapItem(id, input)` - Update item
- `getRoadmapItemsByProject(projectId)` - Get all items for project
- `getRoadmapItemsByTrack(trackId)` - Get items for specific track
- `attachChildItem(childId, parentId)` - Create parent-child relationship
- `detachChildItem(childId)` - Remove from parent
- `getRoadmapItemTree(projectId)` - Get hierarchical tree structure

### Mind Mesh Service (`mindMeshService.ts`)

Manages widgets and connections for the knowledge graph.

**Key Functions:**
- `createWidget(input)` - Create content node
- `updateWidget(id, input)` - Update widget
- `getWidgetsByProject(projectId)` - Get all widgets
- `createConnection(input)` - Create graph edge
- `getConnectionsForNode(type, id)` - Get all connections for a node
- `getMindMeshGraph(projectId)` - Get complete graph structure

### People Services

#### Global People Service (`globalPeopleService.ts`)

Manages canonical person identities.

**Key Functions:**
- `createGlobalPerson(input)` - Create identity
- `updateGlobalPerson(id, input)` - Update identity
- `findGlobalPersonByEmail(email)` - Find by email
- `findOrCreateGlobalPerson(name, email)` - Deduplication helper
- `getGlobalPersonWithProjects(id)` - Get person with memberships

#### People Service (`peopleService.ts`)

Manages project membership with automatic global identity linking.

**Key Functions:**
- `createPerson(input)` - Create membership (auto-links to global_person)
- `updatePerson(id, input)` - Update membership and sync with global_person
- `getPeopleByProject(projectId)` - Get project members
- `getPersonWithGlobalIdentity(id)` - Get enriched person data

#### Assignment Service (`assignmentService.ts`)

Manages roadmap item assignments.

**Key Functions:**
- `assignPerson(roadmapItemId, personId)` - Create assignment
- `unassignPerson(roadmapItemId, personId)` - Remove assignment
- `getAssignedPeople(roadmapItemId)` - Get people assigned to item
- `getAssignedRoadmapItemsForPerson(personId)` - Get items assigned to person

## Integration Points

### Task Flow Sync

Roadmap items can be synced to Task Flow (Kanban board) based on project configuration. Task Flow operates within a single project scope; shared tracks don't create cross-project Task Flow coupling.

**Service:** `taskFlowSyncService.ts`

### Personal Spaces Bridge

Roadmap items can be linked to personal spaces (calendar, tasks, goals, etc.) based on item type eligibility. Personal space links are user-specific and don't leak across projects.

**Service:** `personalBridgeService.ts`

### Project Users & Permissions

Projects can have multiple users with roles (owner, editor, viewer). Permissions control who can view and edit project content.

**Service:** `projectUserService.ts`

## Usage Examples

### Creating a Single-Project Track

```typescript
import { createTrack } from '@/lib/guardrails';

const track = await createTrack({
  masterProjectId: projectId,
  name: 'MVP Development',
  description: 'Core product features',
  color: '#3B82F6',
});
```

### Converting Track to Shared

```typescript
import { convertTrackToShared } from '@/lib/guardrails';

const result = await convertTrackToShared({
  trackId: track.id,
  authorityMode: 'primary_project_only',
});
```

### Linking Shared Track to Another Project

```typescript
import { linkTrackToProject } from '@/lib/guardrails';

const result = await linkTrackToProject({
  trackId: track.id,
  projectId: anotherProjectId,
  includeInRoadmap: true,
  visibilityState: 'visible',
});
```

### Configuring Track Instance

```typescript
import { updateTrackInstance } from '@/lib/guardrails';

// Hide track from roadmap in this project only
await updateTrackInstance(trackId, projectId, {
  includeInRoadmap: false,
  visibilityState: 'hidden',
});
```

### Creating Roadmap Item

```typescript
import { createRoadmapItem } from '@/lib/guardrails';

const item = await createRoadmapItem({
  masterProjectId: projectId,
  trackId: track.id,
  type: 'task',
  title: 'Implement login flow',
  startDate: '2024-01-01',
  endDate: '2024-01-15',
  status: 'not_started',
});
```

### Creating Item Hierarchy

```typescript
import { createRoadmapItem, attachChildItem } from '@/lib/guardrails';

// Create parent milestone
const milestone = await createRoadmapItem({
  masterProjectId: projectId,
  trackId: track.id,
  type: 'milestone',
  title: 'Launch MVP',
  endDate: '2024-03-01',
});

// Create sub-task
const subtask = await createRoadmapItem({
  masterProjectId: projectId,
  trackId: track.id,
  type: 'task',
  title: 'Deploy to production',
  parentItemId: milestone.id,
});
```

### Assigning People to Items

```typescript
import { assignPerson, createPerson } from '@/lib/guardrails';

// Create person (auto-links to global identity)
const person = await createPerson({
  masterProjectId: projectId,
  name: 'Alice Johnson',
  email: 'alice@example.com',
  role: 'Developer',
});

// Assign to item
await assignPerson(roadmapItemId, person.id);
```

### Checking Edit Permission

```typescript
import { checkTrackEditPermission } from '@/lib/guardrails';

const permission = await checkTrackEditPermission(trackId, projectId);

if (permission.canEdit) {
  // Allow edit UI
} else {
  console.log('Cannot edit:', permission.reason);
}
```

## ADC Responsibilities (Confirmed)

ADC (Active Data Context) is responsible ONLY for:
- Active Master Project
- Active Track (current track in focus)

ADC must NEVER:
- Filter tracks by visibility
- Infer hierarchy
- Handle sharing logic
- Manage track state transitions
- Apply instance configuration

All domain logic belongs in the services. ADC is purely for tracking user focus.

## Database Schema

### Core Tables

1. **guardrails_tracks** - Track definitions
2. **track_project_instances** - Project-specific track configuration (for shared tracks)
3. **roadmap_items** - Time-bound work items
4. **roadmap_item_assignments** - People assigned to items
5. **mindmesh_widgets** - Content nodes
6. **mindmesh_connections** - Graph edges
7. **global_people** - Canonical person identities
8. **project_people** - Project membership
9. **master_projects** - Project definitions
10. **domains** - Project domains (categories)

### Helper Functions (Postgres)

1. **`get_track_projects(track_id)`** - Get all projects linked to a track
2. **`get_project_tracks(project_id)`** - Get all tracks accessible in a project
3. **`can_edit_track(track_id, project_id)`** - Check edit permission

## Validation Rules

### Track Linking

- Track must be shared (`is_shared = true`)
- Project cannot already be linked
- Maximum 50 linked projects per track

### Track Unlinking

- Project must be linked
- Cannot unlink primary owner if other projects are linked
- Must transfer primary ownership first if needed

### Roadmap Items

- Must reference a valid track
- Type-specific validation (e.g., events require dates)
- Parent-child relationships validated for cycles
- Max depth enforced via composition rules

### Authority

- Edit permission checked before all content mutations
- Instance updates don't require authority check
- Primary owner transfer requires new owner to be linked

## Backward Compatibility

All existing tracks automatically have:
- `isShared = false` (legacy single-project mode)
- `primaryOwnerProjectId = null`
- `authorityMode = 'primary_project_only'`

Legacy queries remain functional:
```sql
SELECT * FROM guardrails_tracks WHERE master_project_id = $1;
```

For new code, use service functions:
```typescript
const tracks = await getTracksForProject(projectId);
```

## What is NOT Implemented

### No UI

This is architecture only. No UI components have been created for:
- Track linking interface
- Instance configuration controls
- Authority mode selector
- Primary owner transfer UI
- Permission indicators

### No Real-Time Sync

- No WebSocket updates
- No optimistic UI updates
- No conflict resolution UI

### No Forking or Branching

- Cannot fork shared track into independent copy
- Cannot create branches with merge-back
- No copy-on-write

### No Automated Workflows

- No auto-link suggestions
- No automated authority transfers
- No change notifications

## Benefits

1. **Single Source of Truth** - One track, many contexts
2. **Flexible Authority** - Configurable edit permissions
3. **Per-Project Control** - Each project configures visibility independently
4. **Backward Compatible** - Legacy tracks unchanged
5. **Mind Mesh Native** - All entities connect through graph
6. **Composable Items** - Unlimited item hierarchy depth
7. **People First** - Global identity with project membership
8. **Type Safe** - Full TypeScript type coverage

## Next Steps for UI Implementation

When building UI components:

1. **Import services from `@/lib/guardrails`** - Use centralized service functions
2. **Check `track.isShared`** - Show/hide sharing features based on flag
3. **Use `checkTrackEditPermission()`** - Disable edit UI when not authorized
4. **Display instance configuration** - Show per-project settings clearly
5. **Let services handle validation** - Display error messages from services
6. **Respect ADC boundaries** - Don't add domain logic to Active Data Context

The architecture is solid. UI implementation can proceed with confidence that the underlying data model prevents corruption, maintains referential integrity, and provides clear authority semantics.

---

**Document Status:** Up to date as of December 2025

**Related Documents:**
- SHARED_TRACKS_ARCHITECTURE.md - Detailed shared tracks specification
- AI_CHAT_MODEL.md - AI assistant integration
- DAILY_ALIGNMENT_ARCHITECTURE.md - Regulation system
- MIND_MESH_ARCHITECTURE.md - Knowledge graph details

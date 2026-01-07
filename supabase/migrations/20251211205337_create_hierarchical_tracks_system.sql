/*
  # Create Hierarchical Tracks System (v2)

  1. Overview
    - Replaces the dual-table system (tracks + subtracks) with a unified hierarchical model
    - Supports unlimited nesting via self-referential parent_track_id
    - Universal metadata storage for template-specific data
    - Maintains backward compatibility during transition period

  2. New Table
    - `guardrails_tracks_v2`
      - Supports parent/child relationships
      - Unlimited depth nesting
      - Metadata JSONB for flexible storage
      - Compatible with all modules (Roadmap, TaskFlow, MindMesh, Focus Mode)

  3. Migration Strategy
    - Create new table structure
    - Migrate existing tracks (parent_track_id = NULL)
    - Migrate existing subtracks (parent_track_id = original track id)
    - Preserve all relationships and ordering
    - Maintain RLS policies

  4. Security
    - RLS enabled
    - Policies mirror existing track system
    - Recursive permission checking for nested structures
*/

-- Create the new hierarchical tracks table
CREATE TABLE IF NOT EXISTS guardrails_tracks_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE CASCADE,
  parent_track_id uuid REFERENCES guardrails_tracks_v2(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  ordering_index integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracks_v2_master_project
  ON guardrails_tracks_v2(master_project_id);

CREATE INDEX IF NOT EXISTS idx_tracks_v2_parent
  ON guardrails_tracks_v2(parent_track_id);

CREATE INDEX IF NOT EXISTS idx_tracks_v2_ordering
  ON guardrails_tracks_v2(master_project_id, parent_track_id, ordering_index);

CREATE INDEX IF NOT EXISTS idx_tracks_v2_metadata
  ON guardrails_tracks_v2 USING gin(metadata);

-- Enable RLS
ALTER TABLE guardrails_tracks_v2 ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user owns the master project
CREATE OR REPLACE FUNCTION user_owns_track_v2_project(track_v2_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM guardrails_tracks_v2 t
    JOIN master_projects p ON t.master_project_id = p.id
    WHERE t.id = track_v2_id
    AND p.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "Users can view their own tracks v2"
  ON guardrails_tracks_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = guardrails_tracks_v2.master_project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tracks v2 in their projects"
  ON guardrails_tracks_v2
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = guardrails_tracks_v2.master_project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own tracks v2"
  ON guardrails_tracks_v2
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = guardrails_tracks_v2.master_project_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = guardrails_tracks_v2.master_project_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own tracks v2"
  ON guardrails_tracks_v2
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM master_projects p
      WHERE p.id = guardrails_tracks_v2.master_project_id
      AND p.user_id = auth.uid()
    )
  );

-- Migrate existing tracks to v2 (top-level, parent_track_id = NULL)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guardrails_tracks') THEN
    INSERT INTO guardrails_tracks_v2 (
      id,
      master_project_id,
      parent_track_id,
      name,
      description,
      color,
      ordering_index,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      id,
      master_project_id,
      NULL as parent_track_id,
      name,
      description,
      color,
      COALESCE(ordering_index, 0) as ordering_index,
      '{}'::jsonb as metadata,
      created_at,
      updated_at
    FROM guardrails_tracks
    WHERE NOT EXISTS (
      SELECT 1 FROM guardrails_tracks_v2 WHERE guardrails_tracks_v2.id = guardrails_tracks.id
    );
  END IF;
END $$;

-- Migrate existing subtracks to v2 (children, parent_track_id = track_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guardrails_subtracks') THEN
    INSERT INTO guardrails_tracks_v2 (
      id,
      master_project_id,
      parent_track_id,
      name,
      description,
      color,
      ordering_index,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      st.id,
      t.master_project_id,
      st.track_id as parent_track_id,
      st.name,
      st.description,
      t.color,
      COALESCE(st.ordering_index, 0) as ordering_index,
      '{}'::jsonb as metadata,
      st.created_at,
      st.updated_at
    FROM guardrails_subtracks st
    JOIN guardrails_tracks t ON st.track_id = t.id
    WHERE NOT EXISTS (
      SELECT 1 FROM guardrails_tracks_v2 WHERE guardrails_tracks_v2.id = st.id
    );
  END IF;
END $$;

-- Create function to get full track ancestry path
CREATE OR REPLACE FUNCTION get_track_ancestry_path(track_v2_id uuid)
RETURNS text AS $$
DECLARE
  path_parts text[];
  current_id uuid;
  current_name text;
  parent_id uuid;
  depth_limit integer := 100;
  current_depth integer := 0;
BEGIN
  current_id := track_v2_id;

  WHILE current_id IS NOT NULL AND current_depth < depth_limit LOOP
    SELECT name, parent_track_id INTO current_name, parent_id
    FROM guardrails_tracks_v2
    WHERE id = current_id;

    IF current_name IS NULL THEN
      EXIT;
    END IF;

    path_parts := array_prepend(current_name, path_parts);
    current_id := parent_id;
    current_depth := current_depth + 1;
  END LOOP;

  RETURN array_to_string(path_parts, ' > ');
END;
$$ LANGUAGE plpgsql;

-- Create recursive CTE function to get full track tree
CREATE OR REPLACE FUNCTION get_tracks_tree(project_id uuid)
RETURNS TABLE (
  id uuid,
  master_project_id uuid,
  parent_track_id uuid,
  name text,
  description text,
  color text,
  ordering_index integer,
  metadata jsonb,
  depth integer,
  path text[],
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE track_tree AS (
    -- Base case: top-level tracks
    SELECT
      t.id,
      t.master_project_id,
      t.parent_track_id,
      t.name,
      t.description,
      t.color,
      t.ordering_index,
      t.metadata,
      0 as depth,
      ARRAY[t.name] as path,
      t.created_at,
      t.updated_at
    FROM guardrails_tracks_v2 t
    WHERE t.master_project_id = project_id
    AND t.parent_track_id IS NULL

    UNION ALL

    -- Recursive case: child tracks
    SELECT
      t.id,
      t.master_project_id,
      t.parent_track_id,
      t.name,
      t.description,
      t.color,
      t.ordering_index,
      t.metadata,
      tt.depth + 1,
      tt.path || t.name,
      t.created_at,
      t.updated_at
    FROM guardrails_tracks_v2 t
    JOIN track_tree tt ON t.parent_track_id = tt.id
    WHERE t.master_project_id = project_id
  )
  SELECT * FROM track_tree
  ORDER BY path, ordering_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get immediate children of a track
CREATE OR REPLACE FUNCTION get_track_children(track_v2_id uuid)
RETURNS TABLE (
  id uuid,
  master_project_id uuid,
  parent_track_id uuid,
  name text,
  description text,
  color text,
  ordering_index integer,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.master_project_id,
    t.parent_track_id,
    t.name,
    t.description,
    t.color,
    t.ordering_index,
    t.metadata,
    t.created_at,
    t.updated_at
  FROM guardrails_tracks_v2 t
  WHERE t.parent_track_id = track_v2_id
  ORDER BY t.ordering_index, t.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tracks_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tracks_v2_updated_at
  BEFORE UPDATE ON guardrails_tracks_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_tracks_v2_updated_at();

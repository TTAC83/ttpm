-- Create master_task_dependencies table
CREATE TABLE IF NOT EXISTS public.master_task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Predecessor (the task that must be completed first)
  predecessor_type text NOT NULL CHECK (predecessor_type IN ('step', 'task', 'subtask')),
  predecessor_id integer NOT NULL,
  
  -- Successor (the task that depends on the predecessor)
  successor_type text NOT NULL CHECK (successor_type IN ('step', 'task', 'subtask')),
  successor_id integer NOT NULL,
  
  -- Dependency metadata
  dependency_type text NOT NULL DEFAULT 'FS' CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
  lag_days integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  -- Prevent duplicate dependencies
  UNIQUE(predecessor_type, predecessor_id, successor_type, successor_id)
);

-- Indexes for performance
CREATE INDEX idx_dependencies_predecessor ON public.master_task_dependencies(predecessor_type, predecessor_id);
CREATE INDEX idx_dependencies_successor ON public.master_task_dependencies(successor_type, successor_id);

-- RLS policies (internal admins only)
ALTER TABLE public.master_task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_task_dependencies_internal_all"
  ON public.master_task_dependencies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.is_internal = true
    )
  );

-- Function to get all predecessors for a given item
CREATE OR REPLACE FUNCTION get_item_predecessors(
  p_item_type text,
  p_item_id integer
)
RETURNS TABLE(
  dependency_id uuid,
  predecessor_type text,
  predecessor_id integer,
  dependency_type text,
  lag_days integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    master_task_dependencies.predecessor_type,
    master_task_dependencies.predecessor_id,
    master_task_dependencies.dependency_type,
    master_task_dependencies.lag_days
  FROM master_task_dependencies
  WHERE successor_type = p_item_type AND successor_id = p_item_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';

-- Function to get all successors for a given item
CREATE OR REPLACE FUNCTION get_item_successors(
  p_item_type text,
  p_item_id integer
)
RETURNS TABLE(
  dependency_id uuid,
  successor_type text,
  successor_id integer,
  dependency_type text,
  lag_days integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    master_task_dependencies.successor_type,
    master_task_dependencies.successor_id,
    master_task_dependencies.dependency_type,
    master_task_dependencies.lag_days
  FROM master_task_dependencies
  WHERE predecessor_type = p_item_type AND predecessor_id = p_item_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public';
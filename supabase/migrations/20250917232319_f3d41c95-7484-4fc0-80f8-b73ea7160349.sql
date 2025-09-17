-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Add foreign key to projects table
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'product_gaps_project_id_fkey'
    ) THEN
        ALTER TABLE public.product_gaps 
        ADD CONSTRAINT product_gaps_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES public.projects(id);
    END IF;
    
    -- Add foreign key to profiles table for assigned_to
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'product_gaps_assigned_to_fkey'
    ) THEN
        ALTER TABLE public.product_gaps 
        ADD CONSTRAINT product_gaps_assigned_to_fkey 
        FOREIGN KEY (assigned_to) REFERENCES public.profiles(user_id);
    END IF;
    
    -- Add foreign key to profiles table for created_by
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'product_gaps_created_by_fkey'
    ) THEN
        ALTER TABLE public.product_gaps 
        ADD CONSTRAINT product_gaps_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.product_gaps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
    -- Drop and recreate internal policy
    DROP POLICY IF EXISTS "product_gaps_internal_all" ON public.product_gaps;
    CREATE POLICY "product_gaps_internal_all" 
    ON public.product_gaps 
    FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() AND p.is_internal = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() AND p.is_internal = true
      )
    );

    -- Drop and recreate external policies
    DROP POLICY IF EXISTS "product_gaps_external_select" ON public.product_gaps;
    CREATE POLICY "product_gaps_external_select" 
    ON public.product_gaps 
    FOR SELECT 
    USING (
      project_id IN (
        SELECT pr.id FROM public.projects pr 
        WHERE pr.company_id = (
          SELECT p.company_id FROM public.profiles p 
          WHERE p.user_id = auth.uid()
        )
      )
    );

    DROP POLICY IF EXISTS "product_gaps_external_insert" ON public.product_gaps;
    CREATE POLICY "product_gaps_external_insert" 
    ON public.product_gaps 
    FOR INSERT 
    WITH CHECK (
      project_id IN (
        SELECT pr.id FROM public.projects pr 
        WHERE pr.company_id = (
          SELECT p.company_id FROM public.profiles p 
          WHERE p.user_id = auth.uid()
        )
      )
    );

    DROP POLICY IF EXISTS "product_gaps_external_update" ON public.product_gaps;
    CREATE POLICY "product_gaps_external_update" 
    ON public.product_gaps 
    FOR UPDATE 
    USING (
      project_id IN (
        SELECT pr.id FROM public.projects pr 
        WHERE pr.company_id = (
          SELECT p.company_id FROM public.profiles p 
          WHERE p.user_id = auth.uid()
        )
      )
    )
    WITH CHECK (
      project_id IN (
        SELECT pr.id FROM public.projects pr 
        WHERE pr.company_id = (
          SELECT p.company_id FROM public.profiles p 
          WHERE p.user_id = auth.uid()
        )
      )
    );
END $$;
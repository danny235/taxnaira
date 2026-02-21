-- Migration to fix tax_calculations table constraints and policies
-- This is required for the upsert logic in the API to work flawlessly.

-- 1. Ensure columns are not null
ALTER TABLE public.tax_calculations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.tax_calculations ALTER COLUMN tax_year SET NOT NULL;

-- 2. Add composite unique constraint for upsert functionality
ALTER TABLE public.tax_calculations DROP CONSTRAINT IF EXISTS tax_calculations_user_id_tax_year_key;
ALTER TABLE public.tax_calculations ADD CONSTRAINT tax_calculations_user_id_tax_year_key UNIQUE (user_id, tax_year);

-- 3. Fix RLS Policies (Add missing UPDATE/UPDATE policies)
-- Users can already SELECT and INSERT from the main migration, but UPSERT needs UPDATE.

DROP POLICY IF EXISTS "Users can update own calculations" ON public.tax_calculations;
CREATE POLICY "Users can update own calculations" 
ON public.tax_calculations FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own calculations" ON public.tax_calculations;
CREATE POLICY "Users can delete own calculations" 
ON public.tax_calculations FOR DELETE 
USING (auth.uid() = user_id);

-- Migration to add admin role and RLS policies

-- 1. Add role column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 2. Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RLS Policies for Tax Settings
-- Allow everyone to read settings (already exists, but good to verify)
DROP POLICY IF EXISTS "Public read access for tax settings" ON public.tax_settings;
CREATE POLICY "Public read access for tax settings" ON public.tax_settings
FOR SELECT USING (true);

-- Allow admins to update settings
DROP POLICY IF EXISTS "Admins can update tax settings" ON public.tax_settings;
CREATE POLICY "Admins can update tax settings" ON public.tax_settings
FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert tax settings" ON public.tax_settings;
CREATE POLICY "Admins can insert tax settings" ON public.tax_settings
FOR INSERT WITH CHECK (public.is_admin());

-- 4. RLS Policies for Tax Brackets
-- Allow everyone to read brackets
DROP POLICY IF EXISTS "Public read access for tax brackets" ON public.tax_brackets;
CREATE POLICY "Public read access for tax brackets" ON public.tax_brackets
FOR SELECT USING (true);

-- Allow admins to manage brackets
DROP POLICY IF EXISTS "Admins can insert tax brackets" ON public.tax_brackets;
CREATE POLICY "Admins can insert tax brackets" ON public.tax_brackets
FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update tax brackets" ON public.tax_brackets;
CREATE POLICY "Admins can update tax brackets" ON public.tax_brackets
FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete tax brackets" ON public.tax_brackets;
CREATE POLICY "Admins can delete tax brackets" ON public.tax_brackets
FOR DELETE USING (public.is_admin());

-- 5. RLS Policies for Audit Logs
-- Allow admins to read audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (public.is_admin());

-- 6. RLS Policies for Users (Admin User Management)
-- Allow admins to view all users
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
FOR SELECT USING (public.is_admin());

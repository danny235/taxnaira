-- =============================================
-- Migration V7: Admin Visibility & RLS Recursion Fix
-- =============================================

-- 1. Refactor is_admin to be non-recursive
-- We use SECURITY DEFINER and SET search_path = public to ensure 
-- that the SELECT inside this function bypasses RLS and runs as the owner (postgres).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  -- We query the table directly. Since this is SECURITY DEFINER and 
  -- owned by 'postgres', it will bypass RLS and avoid infinite recursion.
  SELECT (role = 'admin') INTO is_admin_user
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update Users Select Policy
-- We drop the existing policy and replace it with a cleaner check.
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users 
FOR SELECT USING (
  public.is_admin()
);

-- 3. Ensure your account is an Admin
-- Based on the provided screenshot, your user email is 'danielbarima235@gmail.com'
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'danielbarima235@gmail.com';

-- 4. Re-sync any missing users just in case
-- This ensures that Caleb and others are fully populated in the public.users table.
INSERT INTO public.users (id, email, full_name, credit_balance, role)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'full_name', 'Anonymous User'),
    10,
    'user'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

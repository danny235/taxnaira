-- Allow admins to update any user profile
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users" ON public.users
FOR UPDATE USING (public.is_admin());

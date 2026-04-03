-- Migration V6: Admin Chat Fixes and User Synchronization

-- 1. Repair chat_messages foreign keys
-- We need to drop existing FKs and recreate them pointing to public.users(id)
-- This allows PostgREST to automatically handle joins with our profile table.

-- First, find the constraint names if they exist (usually auto-generated)
DO $$ 
BEGIN
    -- Drop sender_id constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_sender_id_fkey') THEN
        ALTER TABLE public.chat_messages DROP CONSTRAINT chat_messages_sender_id_fkey;
    END IF;

    -- Drop user_id constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_user_id_fkey') THEN
        ALTER TABLE public.chat_messages DROP CONSTRAINT chat_messages_user_id_fkey;
    END IF;
END $$;

-- 2. Add corrected constraints pointing to public.users
ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Synchronize missing users
-- Some users might exist in auth.users but not in public.users if the trigger failed or didn't exist yet.
INSERT INTO public.users (id, email, full_name, role, credit_balance, is_verified, profile_complete)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
    'user',
    10,
    true, -- Assume existing users were verified or set appropriately
    false
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4. Ensure admin is set correctly (User requested this in previous turns)
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'osemwengie444@gmail.com';

-- 6. Ensure audit_logs table exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Audit Log Policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

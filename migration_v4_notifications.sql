-- Migration V4: Notification System

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN ('info', 'success', 'warning', 'error', 'message')) DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. System/Admins can insert notifications
DROP POLICY IF EXISTS "Admins/Service can insert notifications" ON public.notifications;
CREATE POLICY "Admins/Service can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true); -- Usually restricted to service role in Supabase, but for app logic we allow insertion if through our API

-- Enable Realtime
-- alter publication supabase_realtime add table notifications;

-- 2. Indexing
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);

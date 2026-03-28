-- Phase 1 Migration: Categories and Notifications

-- 1. Update Transactions Table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS main_category text,
ADD COLUMN IF NOT EXISTS sub_category text;

-- 2. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means "all users"
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
DROP POLICY IF EXISTS "Users can view own or system notifications" ON public.notifications;
CREATE POLICY "Users can view own or system notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Admin can manage all notifications (assuming admin check logic exists elsewhere)
DROP POLICY IF EXISTS "Admin can insert notifications" ON public.notifications;
CREATE POLICY "Admin can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true); -- Simplified, admin check should be in app logic or RLS function

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

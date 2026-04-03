-- Migration V3: Chat System and Admin Update

-- 1. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- The relative "customer" this chat belongs to
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- The actual sender
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can see messages where they are the 'user_id'
DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can view their own chat messages" 
ON public.chat_messages FOR SELECT 
USING (auth.uid() = user_id OR (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')));

-- 2. Users can insert messages for themselves
DROP POLICY IF EXISTS "Users can send their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can send their own chat messages" 
ON public.chat_messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Enable Realtime
-- This might need manual enabling in the Supabase Dashboard as well.
-- alter publication supabase_realtime add table chat_messages;

-- 2. Grant Admin access to the specific user
-- We assume the user already exists in auth.users and public.users
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'osemwengie444@gmail.com';

-- 3. Indexing
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

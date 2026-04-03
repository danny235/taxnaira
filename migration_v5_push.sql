-- Migration: Push Notifications Support
-- Created: 2026-04-03

-- Table for storing push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, endpoint)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON public.push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own subscriptions"
    ON public.push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
    ON public.push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
    ON public.push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
    ON public.push_subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_push_subscription_updated
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Add credit_balance to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS credit_balance integer DEFAULT 0;

-- Optional: Add a transaction history for credits
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount integer NOT NULL, -- positive for purchase, negative for usage
    type text NOT NULL, -- 'purchase', 'usage', 'bonus'
    description text,
    reference text, -- e.g. Paystack reference
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit transactions"
    ON public.credit_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Migration to initialize existing users with some free credits (optional)
-- UPDATE public.users SET credit_balance = 5 WHERE credit_balance IS NULL;

-- Add Profit & Loss related columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS business_flag TEXT DEFAULT 'personal', -- 'personal', 'business', 'mixed'
ADD COLUMN IF NOT EXISTS deductible_flag BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deductible_percentage NUMERIC DEFAULT 100;

-- Update RLS or indexes if needed (not strictly necessary now but good practice)
CREATE INDEX IF NOT EXISTS idx_transactions_business_flag ON public.transactions(business_flag);

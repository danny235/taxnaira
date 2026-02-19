-- Migration Script for TaxNaira
-- This script creates the necessary tables, indexes, and RLS policies for the TaxNaira application.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users Table (Public Profile)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key, -- 1:1 with auth.users
  email text, -- Copied from auth.users for easier querying
  full_name text,
  phone_number text,
  state_of_residence text,
  residential_address text,
  employment_type text, -- 'salary_earner', 'self_employed', 'business_owner', 'remote_worker'
  annual_income_estimate numeric default 0,
  receives_foreign_income boolean default false,
  trades_crypto boolean default false,
  profile_complete boolean default false,
  is_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Verification Codes Table
create table if not exists public.verification_codes (
  id uuid default uuid_generate_v4() primary key,
  email text not null,
  code text not null,
  type text not null, -- 'email_verification', 'password_reset'
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function to handle new user signup (Trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

-- Trigger to automatically create public user profile
-- Trigger to automatically create public user profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Transactions Table
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date timestamp with time zone not null,
  description text,
  amount numeric not null,
  currency text default 'NGN', 
  naira_value numeric, -- Converted value if original is foreign
  category text, -- e.g., 'salary', 'business', 'rent', 'food'
  is_income boolean default false,
  transaction_type text, -- 'credit' or 'debit'
  tax_year integer not null,
  manually_categorized boolean default false,
  source text, -- 'upload', 'manual', 'bank_sync'
  file_id uuid, -- Reference to uploaded_files (optional)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Uploaded Files Table
create table if not exists public.uploaded_files (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_url text not null,
  file_name text not null,
  file_type text, -- MIME type
  file_format text, -- 'pdf', 'csv', etc.
  processed boolean default false,
  transactions_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tax Settings Table (Admin configurable)
create table if not exists public.tax_settings (
  id uuid default uuid_generate_v4() primary key,
  tax_year integer not null,
  exemption_threshold numeric default 800000, -- Minimum income before tax applies
  pension_deduction_rate numeric default 8.0, -- Percentage
  nhf_deduction_rate numeric default 2.5, -- Percentage
  capital_gains_rate numeric default 10.0, -- Percentage
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tax Brackets Table (Admin configurable)
create table if not exists public.tax_brackets (
  id uuid default uuid_generate_v4() primary key,
  tax_year integer not null,
  min_amount numeric not null,
  max_amount numeric not null, -- Use -1 for infinity/max
  rate numeric not null, -- Percentage
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tax Calculations Table (Snapshots of user calculations)
create table if not exists public.tax_calculations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tax_year integer not null,
  total_income numeric not null,
  taxable_income numeric not null,
  tax_due numeric not null,
  is_paid boolean default false,
  calculation_details jsonb, -- Store full breakdown
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Subscriptions Table
create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan text not null default 'free', -- 'free', 'pro', 'premium'
  status text not null default 'active', -- 'active', 'cancelled', 'expired'
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_subscription unique (user_id)
);

-- 8. Audit Logs Table (Admin)
create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete set null, -- Nullable if system action or user deleted
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Storage Buckets (Insert into storage.buckets if needed via API, or SQL if enabled)
-- Note: It's safer to create buckets via Supabase Dashboard, but here is the logic:
insert into storage.buckets (id, name, public) 
values ('tax_documents', 'tax_documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('profile_images', 'profile_images', true)
on conflict (id) do nothing;


-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.verification_codes enable row level security;
alter table public.transactions enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.tax_settings enable row level security;
alter table public.tax_brackets enable row level security;
alter table public.tax_calculations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;

-- Policies for users
drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile" 
on public.users for select 
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" 
on public.users for update 
using (auth.uid() = id);

-- Policies for verification_codes
drop policy if exists "Anyone can insert verification codes" on public.verification_codes;
create policy "Anyone can insert verification codes" 
on public.verification_codes for insert 
with check (true);

drop policy if exists "Anyone can select matching verification codes" on public.verification_codes;
create policy "Anyone can select matching verification codes" 
on public.verification_codes for select 
using (true);

-- Policies for transactions
drop policy if exists "Users can view own transactions" on public.transactions;
create policy "Users can view own transactions" 
on public.transactions for select 
using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on public.transactions;
create policy "Users can insert own transactions" 
on public.transactions for insert 
with check (auth.uid() = user_id);

drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions" 
on public.transactions for update 
using (auth.uid() = user_id);

drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions" 
on public.transactions for delete 
using (auth.uid() = user_id);

-- Policies for uploaded_files
drop policy if exists "Users can view own uploaded files" on public.uploaded_files;
create policy "Users can view own uploaded files" 
on public.uploaded_files for select 
using (auth.uid() = user_id);

drop policy if exists "Users can insert own uploaded files" on public.uploaded_files;
create policy "Users can insert own uploaded files" 
on public.uploaded_files for insert 
with check (auth.uid() = user_id);

-- Policies for tax_settings
drop policy if exists "Public read access for tax settings" on public.tax_settings;
create policy "Public read access for tax settings" 
on public.tax_settings for select 
using (true);

-- Policies for tax_brackets
drop policy if exists "Public read access for tax brackets" on public.tax_brackets;
create policy "Public read access for tax brackets" 
on public.tax_brackets for select 
using (true);

-- Policies for tax_calculations
drop policy if exists "Users can view own calculations" on public.tax_calculations;
create policy "Users can view own calculations" 
on public.tax_calculations for select 
using (auth.uid() = user_id);

drop policy if exists "Users can insert own calculations" on public.tax_calculations;
create policy "Users can insert own calculations" 
on public.tax_calculations for insert 
with check (auth.uid() = user_id);

-- Policies for subscriptions
drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy "Users can view own subscription" 
on public.subscriptions for select 
using (auth.uid() = user_id);

-- Helper Indexes
-- Helper Indexes
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_verification_codes_email on public.verification_codes(email);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_date on public.transactions(date);
create index if not exists idx_transactions_tax_year on public.transactions(tax_year);
create index if not exists idx_uploaded_files_user_id on public.uploaded_files(user_id);

-- Initial Mock Data for Tax Settings (2024)
insert into public.tax_settings (tax_year, exemption_threshold, pension_deduction_rate, nhf_deduction_rate, capital_gains_rate)
values (2026, 800000, 8.0, 2.5, 10.0)
on conflict do nothing;

-- Initial Mock Data for Tax Brackets (2024 - Example Nigeria PAYE)
-- First 300,000 @ 7%
insert into public.tax_brackets (tax_year, min_amount, max_amount, rate, description)
values (2026, 0, 300000, 7.0, 'First ₦300k')
on conflict do nothing;

-- Next 300,000 @ 11%
insert into public.tax_brackets (tax_year, min_amount, max_amount, rate, description)
values (2026, 300001, 600000, 11.0, 'Next ₦300k')
on conflict do nothing;

-- Next 500,000 @ 15%
insert into public.tax_brackets (tax_year, min_amount, max_amount, rate, description)
values (2026, 600001, 1100000, 15.0, 'Next ₦500k')
on conflict do nothing;

-- Next 500,000 @ 19%
insert into public.tax_brackets (tax_year, min_amount, max_amount, rate, description)
values (2026, 1100001, 1600000, 19.0, 'Next ₦500k')
on conflict do nothing;

-- Next 1,600,000 @ 21%
insert into public.tax_brackets (tax_year, min_amount, max_amount, rate, description)
values (2026, 1600001, 3200000, 21.0, 'Next ₦1.6m')
on conflict do nothing;

-- Above 3,200,000 @ 24%
insert into public.tax_brackets (tax_year, min_amount, max_amount, rate, description)
values (2026, 3200001, -1, 24.0, 'Above ₦3.2m')
on conflict do nothing;

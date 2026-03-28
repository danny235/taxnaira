-- ==========================================
-- AZAWISE FULL DATABASE SETUP SCRIPT
-- ==========================================
-- This script creates all tables, functions, triggers, RLS policies, 
-- and initial data for a fresh Supabase project.

-- 0. Enable Extensions
create extension if not exists "uuid-ossp";

-- 1. Users Table (Public Profile)
-- Note: 'role' is used for admin access, 'credit_balance' for AI usage.
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
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
  role text default 'user', -- 'user', 'admin'
  credit_balance integer default 10,
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

-- 3. Transactions Table
-- Enhanced with main_category and sub_category for Business/Mixed/Personal split.
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date timestamp with time zone not null,
  description text,
  amount numeric not null,
  currency text default 'NGN', 
  naira_value numeric,
  category text, -- General category (backward compatibility)
  main_category text, -- 'Business', 'Mixed', 'Personal'
  sub_category text, -- 'fuel', 'data', 'staff salary', etc.
  is_income boolean default false,
  transaction_type text, -- 'credit' or 'debit'
  tax_year integer not null,
  manually_categorized boolean default false,
  source text, -- 'upload', 'manual', 'bank_sync'
  file_id uuid, -- Reference to uploaded_files
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Uploaded Files Table
create table if not exists public.uploaded_files (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_url text not null,
  file_name text not null,
  file_type text,
  file_format text,
  processed boolean default false,
  transactions_count integer default 0,
  parsed_content text, -- Cached text extraction for large files
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Notifications Table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade, -- NULL means global
  title text not null,
  message text not null,
  type text default 'info', -- 'info', 'warning', 'success', 'error'
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tax Settings & Brackets
create table if not exists public.tax_settings (
  id uuid default uuid_generate_v4() primary key,
  tax_year integer not null,
  exemption_threshold numeric default 800000,
  pension_deduction_rate numeric default 8.0,
  nhf_deduction_rate numeric default 2.5,
  capital_gains_rate numeric default 10.0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.tax_brackets (
  id uuid default uuid_generate_v4() primary key,
  tax_year integer not null,
  min_amount numeric not null,
  max_amount numeric not null,
  rate numeric not null,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Tax Calculations Table
create table if not exists public.tax_calculations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tax_year integer not null,
  total_income numeric not null,
  taxable_income numeric not null,
  tax_due numeric not null,
  is_paid boolean default false,
  calculation_details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Audit Logs Table (Admin)
create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Functions & Triggers
-- Helper to check if user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, credit_balance)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 10);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. Storage Setup
insert into storage.buckets (id, name, public) values ('tax_documents', 'tax_documents', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('profile_images', 'profile_images', true) on conflict (id) do nothing;

-- Users Policy
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Admins can view all users" on public.users for select using (public.is_admin());

-- Transactions Policy
create policy "Users can manage own transactions" on public.transactions 
for all using (auth.uid() = user_id);

-- Uploaded Files Policy
create policy "Users can manage own files" on public.uploaded_files 
for all using (auth.uid() = user_id);

-- Notifications Policy
create policy "Users can view own/global notifications" on public.notifications 
for select using (auth.uid() = user_id or user_id is null);

create policy "Admins can insert notifications" on public.notifications
for insert with check (public.is_admin());

-- Tax Data
create policy "Public read for tax settings" on public.tax_settings for select using (true);
create policy "Admins can manage tax settings" on public.tax_settings 
for all using (public.is_admin());

create policy "Public read for tax brackets" on public.tax_brackets for select using (true);
create policy "Admins can manage tax brackets" on public.tax_brackets 
for all using (public.is_admin());

-- Audit Logs Policy
create policy "Admins can view audit logs" on public.audit_logs 
for select using (public.is_admin());

-- Calculations Policy
create policy "Users can manage own calculations" on public.tax_calculations 
for all using (auth.uid() = user_id);

-- 11. Indexes
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_transactions_user_main on public.transactions(user_id, main_category);
create index if not exists idx_notifications_recipient on public.notifications(user_id);
create index if not exists idx_files_user on public.uploaded_files(user_id);

-- 12. Initial Data
insert into public.tax_settings (tax_year, exemption_threshold, pension_deduction_rate, nhf_deduction_rate, capital_gains_rate)
values (2026, 800000, 8.0, 2.5, 10.0) on conflict do nothing;

insert into public.tax_brackets (tax_year, min_amount, max_amount, rate, description) values
(2026, 0, 300000, 7.0, 'First ₦300k'),
(2026, 300001, 600000, 11.0, 'Next ₦300k'),
(2026, 600001, 1100000, 15.0, 'Next ₦500k'),
(2026, 1100001, 1600000, 19.0, 'Next ₦500k'),
(2026, 1600001, 3200000, 21.0, 'Next ₦1.6m'),
(2026, 3200001, -1, 24.0, 'Above ₦3.2m')
on conflict do nothing;

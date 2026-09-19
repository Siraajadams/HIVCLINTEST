create extension if not exists pgcrypto;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  surname text not null,
  gender text not null,
  country text not null,
  identity_type text not null,
  identity_number text not null,
  date_of_birth date not null,
  mobile_number text,
  source text default 'manual',
  consent boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.hiv_self_tests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id),
  test_type text not null,
  sample_type text,
  test_result text,
  interpretation_method text,
  ai_suggested_result text,
  ai_confidence text,
  ai_reason text,
  image_uploaded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.exposure_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id),
  self_test_id uuid references public.hiv_self_tests(id),
  possible_exposure text not null,
  exposure_date date,
  exposure_timing text,
  exposure_type text,
  created_at timestamptz default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id),
  self_test_id uuid references public.hiv_self_tests(id),
  referral_type text not null,
  country text,
  status text default 'pending',
  referral_code text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id),
  consent_type text not null,
  consent_version text default '1.0',
  accepted boolean not null,
  accepted_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.patients enable row level security;
alter table public.hiv_self_tests enable row level security;
alter table public.exposure_assessments enable row level security;
alter table public.referrals enable row level security;
alter table public.consent_records enable row level security;

create policy "Allow registration inserts" on public.patients
  for insert to anon, authenticated
  with check (consent = true);

create policy "Allow self test inserts" on public.hiv_self_tests
  for insert to anon, authenticated
  with check (true);

create policy "Allow exposure inserts" on public.exposure_assessments
  for insert to anon, authenticated
  with check (possible_exposure in ('yes', 'no', 'unsure'));

create policy "Allow consent inserts" on public.consent_records
  for insert to anon, authenticated
  with check (accepted = true);

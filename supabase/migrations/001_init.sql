-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — initial schema
-- Run via: supabase db push  OR  paste into Supabase SQL editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Profiles ─────────────────────────────────────────────────────────────────
-- One row per authenticated user. Created automatically on first sign-in via
-- the trigger below.
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  full_name   text,
  firm        text,
  practice_areas text[],
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Matters ──────────────────────────────────────────────────────────────────
create table if not exists public.matters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null,
  client      text,
  matter_type text,
  jurisdiction text,
  status      text not null default 'active',
  facts       text,
  judge_name  text,
  court       text,
  shared      boolean not null default false,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists matters_user_id_idx on public.matters (user_id);
create index if not exists matters_status_idx  on public.matters (status);

-- ── Documents ────────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  matter_id   uuid not null references public.matters on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  kind        text not null,          -- 'vault_doc' | 'draft' | 'note'
  content     text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists documents_matter_id_idx on public.documents (matter_id);
create index if not exists documents_user_id_idx   on public.documents (user_id);

-- ── Activity Logs ─────────────────────────────────────────────────────────────
create table if not exists public.logs (
  id          bigserial primary key,
  user_id     uuid not null references auth.users on delete cascade,
  matter_id   uuid references public.matters on delete set null,
  event       text not null,          -- 'research' | 'draft' | 'verify' | 'judge_lookup' etc.
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists logs_user_id_idx   on public.logs (user_id);
create index if not exists logs_created_at_idx on public.logs (created_at desc);

-- ── Usage Events ─────────────────────────────────────────────────────────────
-- Track per-request token usage for cost management
create table if not exists public.usage_events (
  id          bigserial primary key,
  user_id     uuid not null references auth.users on delete cascade,
  route       text not null,          -- '/api/anthropic/messages' etc.
  tokens_in   integer not null default 0,
  tokens_out  integer not null default 0,
  cost_cents  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists usage_user_id_idx    on public.usage_events (user_id);
create index if not exists usage_created_at_idx on public.usage_events (created_at desc);

-- ── Auto-create profile on sign-up ────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Updated-at trigger ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_matters_updated_at  before update on public.matters  for each row execute procedure public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();

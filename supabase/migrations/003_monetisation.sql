-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — Monetisation schema
-- Run via: supabase db push  OR  paste into Supabase SQL editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Plans ────────────────────────────────────────────────────────────────────
create table if not exists public.plans (
  id              text primary key,          -- 'starter' | 'professional' | 'firm' | 'premium'
  name            text not null,
  usd_budget      numeric(10,4) not null,    -- monthly Anthropic API budget in USD
  matter_limit    integer,                   -- null = unlimited
  seat_limit      integer,                   -- null = unlimited
  price_zar       numeric(10,2),
  price_gbp       numeric(10,2),
  price_usd       numeric(10,2),
  features        text[] not null default '{}',
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

insert into public.plans (id, name, usd_budget, matter_limit, seat_limit, price_zar, price_gbp, price_usd, features) values
  ('starter',      'Starter',      8,   10,  1,  800,    35,   45,  array['Research','Draft','Citations']),
  ('professional', 'Professional', 20,  25,  3,  1600,   75,   95,  array['Research','Draft','Citations','Strategy','Judge Intel']),
  ('firm',         'Firm',         35,  60,  10, 3500,   160,  200, array['Research','Draft','Citations','Strategy','Judge Intel','Conflict','Timeline']),
  ('premium',      'Premium',      150, null, null, null, 2000, 2000, array['All features','Custom development','Dedicated support','Personal onboarding'])
on conflict (id) do update set
  usd_budget   = excluded.usd_budget,
  matter_limit = excluded.matter_limit,
  seat_limit   = excluded.seat_limit,
  price_zar    = excluded.price_zar,
  price_gbp    = excluded.price_gbp,
  price_usd    = excluded.price_usd,
  features     = excluded.features;

-- ── User Roles ───────────────────────────────────────────────────────────────
create table if not exists public.user_roles (
  user_id     uuid primary key references auth.users on delete cascade,
  role        text not null default 'user' check (role in ('user', 'admin')),
  plan_id     text not null default 'starter' references public.plans (id),
  byok_key    text,                          -- AES-256 encrypted Anthropic key (null = not set)
  byok_active boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger set_user_roles_updated_at
  before update on public.user_roles
  for each row execute procedure public.set_updated_at();

-- Auto-create user_roles row on sign-up
create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role, plan_id)
  values (new.id, 'user', 'starter')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_role_created on auth.users;
create trigger on_auth_user_role_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_role();

-- ── Subscriptions ────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                    bigserial primary key,
  user_id               uuid not null references auth.users on delete cascade,
  plan_id               text not null references public.plans (id),
  ls_subscription_id    text unique,         -- Lemon Squeezy subscription ID
  ls_customer_id        text,
  ls_order_id           text,
  ls_variant_id         text,
  status                text not null default 'active'
                          check (status in ('active','past_due','cancelled','paused','trial')),
  seats                 integer not null default 1,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancelled_at          timestamptz,
  trial_ends_at         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_ls_id_idx   on public.subscriptions (ls_subscription_id);

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

-- ── Usage Events (replaces the original thin table) ──────────────────────────
-- Drop old version and recreate with richer columns
drop table if exists public.usage_events cascade;

create table public.usage_events (
  id              bigserial primary key,
  user_id         uuid not null references auth.users on delete cascade,
  matter_id       uuid references public.matters on delete set null,
  tool_name       text not null,             -- 'research' | 'draft' | 'citations' | 'judge' | etc.
  model           text not null,             -- 'claude-sonnet-4-6' etc.
  input_tokens    integer not null default 0,
  output_tokens   integer not null default 0,
  usd_cost        numeric(10,6) not null default 0,
  byok            boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists usage_events_user_id_idx    on public.usage_events (user_id);
create index if not exists usage_events_created_at_idx on public.usage_events (created_at desc);

-- ── Usage Monthly Rollup ─────────────────────────────────────────────────────
create table if not exists public.usage_monthly (
  user_id         uuid not null references auth.users on delete cascade,
  year            integer not null,
  month           integer not null,          -- 1–12
  total_usd_cost  numeric(10,4) not null default 0,
  total_requests  integer not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (user_id, year, month)
);

-- Trigger: upsert monthly rollup after each usage event insert
create or replace function public.update_usage_monthly()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.byok then
    return new; -- BYOK calls don't count against plan budget
  end if;
  insert into public.usage_monthly (user_id, year, month, total_usd_cost, total_requests, updated_at)
  values (
    new.user_id,
    extract(year  from new.created_at)::integer,
    extract(month from new.created_at)::integer,
    new.usd_cost,
    1,
    now()
  )
  on conflict (user_id, year, month) do update set
    total_usd_cost  = public.usage_monthly.total_usd_cost + excluded.total_usd_cost,
    total_requests  = public.usage_monthly.total_requests + 1,
    updated_at      = now();
  return new;
end;
$$;

drop trigger if exists on_usage_event_insert on public.usage_events;
create trigger on_usage_event_insert
  after insert on public.usage_events
  for each row execute procedure public.update_usage_monthly();

-- ── Matter Limit Enforcement ──────────────────────────────────────────────────
create or replace function public.check_matter_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plan_id     text;
  v_limit       integer;
  v_count       integer;
begin
  select plan_id into v_plan_id from public.user_roles where user_id = new.user_id;
  select matter_limit into v_limit from public.plans where id = v_plan_id;

  if v_limit is null then
    return new; -- unlimited
  end if;

  select count(*) into v_count
  from public.matters
  where user_id = new.user_id and status != 'archived';

  if v_count >= v_limit then
    raise exception 'matter_limit_exceeded: your % plan allows % active matters. Archive existing matters or upgrade your plan.',
      v_plan_id, v_limit;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_matter_limit on public.matters;
create trigger enforce_matter_limit
  before insert on public.matters
  for each row execute procedure public.check_matter_limit();

-- ── Premium Leads ─────────────────────────────────────────────────────────────
create table if not exists public.premium_leads (
  id          bigserial primary key,
  email       text not null,
  full_name   text,
  firm        text,
  message     text,
  status      text not null default 'new' check (status in ('new','contacted','qualified','closed')),
  created_at  timestamptz not null default now()
);

-- ── RLS Policies ─────────────────────────────────────────────────────────────
alter table public.plans          enable row level security;
alter table public.user_roles     enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.usage_events   enable row level security;
alter table public.usage_monthly  enable row level security;
alter table public.premium_leads  enable row level security;

-- plans: public read
create policy "plans_public_read"
  on public.plans for select using (true);

-- user_roles: own row only
create policy "user_roles_own_read"
  on public.user_roles for select using (auth.uid() = user_id);

create policy "user_roles_own_update"
  on public.user_roles for update using (auth.uid() = user_id);

-- subscriptions: own rows only
create policy "subscriptions_own_read"
  on public.subscriptions for select using (auth.uid() = user_id);

-- usage_events: own rows only
create policy "usage_events_own_read"
  on public.usage_events for select using (auth.uid() = user_id);

create policy "usage_events_own_insert"
  on public.usage_events for insert with check (auth.uid() = user_id);

-- usage_monthly: own rows only
create policy "usage_monthly_own_read"
  on public.usage_monthly for select using (auth.uid() = user_id);

-- premium_leads: insert-only for anon (lead capture form)
create policy "premium_leads_insert"
  on public.premium_leads for insert with check (true);

-- ── Admin: service role bypasses RLS (no extra policies needed) ──────────────
-- Admin operations (seed-admin.ts, webhook handler) use SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS automatically.

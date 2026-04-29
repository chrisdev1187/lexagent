-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — Free tier plan + per-tool-per-matter usage enforcement
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Add "free" plan ──────────────────────────────────────────────────────────
insert into public.plans
  (id, name, usd_budget, matter_limit, seat_limit, price_zar, price_gbp, price_usd, features)
values
  ('free', 'Free', 0, 1, 1, 0, 0, 0, array['1 matter','1 AI use per tool'])
on conflict (id) do update set
  name         = excluded.name,
  usd_budget   = excluded.usd_budget,
  matter_limit = excluded.matter_limit,
  seat_limit   = excluded.seat_limit,
  features     = excluded.features;

-- ── Free tier usage tracking ─────────────────────────────────────────────────
create table if not exists public.free_tier_usage (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid not null references auth.users on delete cascade,
  matter_id  uuid not null references public.matters on delete cascade,
  tool       text not null,
  used_at    timestamptz not null default now(),
  constraint free_tier_usage_unique unique (user_id, matter_id, tool)
);

create index if not exists free_tier_usage_user_id_idx on public.free_tier_usage (user_id);

alter table public.free_tier_usage enable row level security;

drop policy if exists "free_tier_usage_own" on public.free_tier_usage;
create policy "free_tier_usage_own"
  on public.free_tier_usage for all
  using (auth.uid() = user_id);

-- Service role bypasses RLS automatically.

-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — Row Level Security policies
-- Must run AFTER 001_init.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enable RLS on all tables ──────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.matters        enable row level security;
alter table public.documents      enable row level security;
alter table public.logs           enable row level security;
alter table public.usage_events   enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────────
create policy "profiles: own row only"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── matters ──────────────────────────────────────────────────────────────────
-- Users can see their own matters, plus matters explicitly shared (future team feature)
create policy "matters: own matters"
  on public.matters for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── documents ────────────────────────────────────────────────────────────────
create policy "documents: own documents"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── logs ─────────────────────────────────────────────────────────────────────
create policy "logs: own logs"
  on public.logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── usage_events ─────────────────────────────────────────────────────────────
create policy "usage: own events"
  on public.usage_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

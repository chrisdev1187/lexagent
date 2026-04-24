-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — Phase 8: AI Usage Logging + Token Observability
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.ai_usage (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references auth.users on delete cascade not null,
  matter_id     uuid        references public.matters(id) on delete cascade,
  tab           text        not null,
  input_tok     int         not null default 0,
  output_tok    int         not null default 0,
  mem_injected  int         not null default 0,
  model         text,
  created_at    timestamptz not null default now()
);

create index if not exists ai_usage_user_created on public.ai_usage(user_id, created_at desc);
create index if not exists ai_usage_matter_created on public.ai_usage(matter_id, created_at desc);

alter table public.ai_usage enable row level security;

-- Users see and insert only their own rows
create policy "ai_usage_own"
  on public.ai_usage for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admins can read all rows
create policy "ai_usage_admin_read"
  on public.ai_usage for select
  using (public.is_admin());

-- ── RPC: per-user monthly aggregate (user-facing, UsagePanel) ─────────────
create or replace function public.get_my_token_usage()
returns table(
  tab           text,
  input_tok     bigint,
  output_tok    bigint,
  mem_injected  bigint,
  calls         bigint
)
language sql security definer
set search_path = public
as $$
  select
    a.tab,
    sum(a.input_tok)    as input_tok,
    sum(a.output_tok)   as output_tok,
    sum(a.mem_injected) as mem_injected,
    count(*)            as calls
  from public.ai_usage a
  where a.user_id = auth.uid()
    and a.created_at >= date_trunc('month', now())
  group by a.tab
  order by (sum(a.input_tok) + sum(a.output_tok)) desc;
$$;

-- ── RPC: admin — top users this month ────────────────────────────────────
create or replace function public.get_admin_token_summary()
returns table(
  user_id      uuid,
  email        text,
  input_tok    bigint,
  output_tok   bigint,
  mem_injected bigint,
  calls        bigint,
  efficiency   numeric
)
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied';
  end if;

  return query
    select
      a.user_id,
      au.email::text,
      sum(a.input_tok)    as input_tok,
      sum(a.output_tok)   as output_tok,
      sum(a.mem_injected) as mem_injected,
      count(*)            as calls,
      round(
        case when sum(a.input_tok) > 0
             then sum(a.mem_injected)::numeric / sum(a.input_tok) * 100
             else 0
        end, 1
      ) as efficiency
    from public.ai_usage a
    join auth.users au on au.id = a.user_id
    where a.created_at >= date_trunc('month', now())
    group by a.user_id, au.email
    order by (sum(a.input_tok) + sum(a.output_tok)) desc
    limit 20;
end;
$$;

-- ── RPC: admin — daily token trend, last 7 days ───────────────────────────
create or replace function public.get_token_daily_trend()
returns table(
  day       date,
  input_tok bigint,
  output_tok bigint
)
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied';
  end if;

  return query
    select
      a.created_at::date as day,
      sum(a.input_tok)   as input_tok,
      sum(a.output_tok)  as output_tok
    from public.ai_usage a
    where a.created_at >= now() - interval '7 days'
    group by a.created_at::date
    order by day asc;
end;
$$;

-- Grant execute to authenticated users (get_my_token_usage is safe for all)
grant execute on function public.get_my_token_usage() to authenticated;
grant execute on function public.get_admin_token_summary() to authenticated;
grant execute on function public.get_token_daily_trend() to authenticated;

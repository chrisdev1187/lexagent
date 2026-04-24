-- AI usage logging for token observability and quota analytics

create table if not exists ai_usage (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references auth.users not null,
  matter_id     uuid        references matters(id) on delete cascade,
  tab           text        not null,
  input_tok     int         not null default 0,
  output_tok    int         not null default 0,
  mem_injected  int         not null default 0,
  model         text,
  created_at    timestamptz default now()
);

create index on ai_usage(user_id, created_at desc);
create index on ai_usage(matter_id, created_at desc);

alter table ai_usage enable row level security;

-- Users see only their own rows
create policy "own_rows" on ai_usage
  for all using (user_id = auth.uid());

-- Admins see everything
create policy "admin_all" on ai_usage
  for select using (is_admin());

-- RPC: per-user aggregate for the current month (for UsagePanel)
create or replace function get_my_token_usage()
returns table(
  tab           text,
  input_tok     bigint,
  output_tok    bigint,
  mem_injected  bigint,
  calls         bigint
)
language sql security definer as $$
  select
    tab,
    sum(input_tok)    as input_tok,
    sum(output_tok)   as output_tok,
    sum(mem_injected) as mem_injected,
    count(*)          as calls
  from ai_usage
  where user_id = auth.uid()
    and created_at >= date_trunc('month', now())
  group by tab
  order by (sum(input_tok) + sum(output_tok)) desc;
$$;

-- RPC: admin aggregate — top users this month
create or replace function get_admin_token_summary()
returns table(
  user_id       uuid,
  email         text,
  input_tok     bigint,
  output_tok    bigint,
  mem_injected  bigint,
  calls         bigint,
  efficiency    numeric
)
language sql security definer as $$
  select
    u.user_id,
    au.email,
    sum(u.input_tok)                                    as input_tok,
    sum(u.output_tok)                                   as output_tok,
    sum(u.mem_injected)                                 as mem_injected,
    count(*)                                            as calls,
    round(
      case when sum(u.input_tok) > 0
           then sum(u.mem_injected)::numeric / sum(u.input_tok) * 100
           else 0
      end, 1
    )                                                   as efficiency
  from ai_usage u
  join auth.users au on au.id = u.user_id
  where is_admin()
    and u.created_at >= date_trunc('month', now())
  group by u.user_id, au.email
  order by (sum(u.input_tok) + sum(u.output_tok)) desc
  limit 20;
$$;

-- RPC: daily trend last 7 days (admin)
create or replace function get_token_daily_trend()
returns table(
  day           date,
  input_tok     bigint,
  output_tok    bigint
)
language sql security definer as $$
  select
    created_at::date as day,
    sum(input_tok)   as input_tok,
    sum(output_tok)  as output_tok
  from ai_usage
  where is_admin()
    and created_at >= now() - interval '7 days'
  group by created_at::date
  order by day asc;
$$;

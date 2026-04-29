-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — Waterfall provider stats RPC
-- Parses the `model` column in ai_usage to derive which LLM provider handled
-- each call. Waterfall calls are stored as "provider/requestedModel"
-- (e.g. "groq/auto"), Anthropic direct calls as the model name ("claude-*").
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function get_waterfall_stats(days_back int default 30)
returns table(
  provider        text,
  call_count      bigint,
  total_input_tok bigint,
  total_output_tok bigint,
  avg_tok         numeric,
  pct_of_total    numeric,
  last_seen       timestamptz
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select
      case
        when model like '%/%' then split_part(model, '/', 1)
        when model like 'claude-%' then 'anthropic'
        when model is null or model = '' or model = 'unknown' then 'unknown'
        else model
      end as provider,
      input_tok,
      output_tok,
      created_at
    from ai_usage
    where created_at > now() - (days_back || ' days')::interval
  ),
  totals as (
    select sum(input_tok + output_tok)::numeric as grand_total from base
  )
  select
    b.provider,
    count(*)                                                         as call_count,
    sum(b.input_tok)                                                 as total_input_tok,
    sum(b.output_tok)                                                as total_output_tok,
    round(avg(b.input_tok + b.output_tok), 0)                       as avg_tok,
    case when t.grand_total > 0
      then round(sum(b.input_tok + b.output_tok)::numeric / t.grand_total * 100, 1)
      else 0
    end                                                              as pct_of_total,
    max(b.created_at)                                                as last_seen
  from base b, totals t
  group by b.provider, t.grand_total
  order by call_count desc
$$;

-- Admins only
revoke all on function get_waterfall_stats(int) from public;
grant execute on function get_waterfall_stats(int) to service_role;

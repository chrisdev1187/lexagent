-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — v1.6 / ARES v5 telemetry
-- Additive nullable columns on ai_usage so v3 vs v5 vs v6 can be A/B'd from logs.
-- Plan: ~/.claude/plans/jaunty-dazzling-horizon.md
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.ai_usage
  add column if not exists prompt_version text,    -- "3.0" | "5.0" | "6.0"
  add column if not exists mode           text,    -- "LITE" | "STANDARD" | "DEEP"
  add column if not exists tool_calls     jsonb,   -- list of <<TOOL_REQUEST: ...>> emitted (v5) or executed (v6)
  add column if not exists critic_score   numeric; -- v6 evaluator-optimizer score, 0..1

create index if not exists ai_usage_prompt_version on public.ai_usage(prompt_version)
  where prompt_version is not null;

-- ── RPC: admin — prompt version split (last 30 days) ─────────────────────
create or replace function public.get_admin_ares_version_split()
returns table(
  prompt_version text,
  mode           text,
  calls          bigint,
  input_tok      bigint,
  output_tok     bigint,
  avg_critic     numeric,
  tool_call_rate numeric
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
      coalesce(a.prompt_version, 'unknown') as prompt_version,
      coalesce(a.mode, 'unknown')           as mode,
      count(*)                              as calls,
      sum(a.input_tok)                      as input_tok,
      sum(a.output_tok)                     as output_tok,
      round(avg(a.critic_score)::numeric, 3) as avg_critic,
      round(
        100.0 * count(a.tool_calls) filter (where jsonb_array_length(coalesce(a.tool_calls, '[]'::jsonb)) > 0)::numeric
              / nullif(count(*), 0), 1
      ) as tool_call_rate
    from public.ai_usage a
    where a.created_at >= now() - interval '30 days'
    group by 1, 2
    order by 1, 2;
end;
$$;

grant execute on function public.get_admin_ares_version_split() to authenticated;

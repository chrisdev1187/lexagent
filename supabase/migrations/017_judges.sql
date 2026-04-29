-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — FJC Biographical Directory judges table
-- Seeded from Federal Judicial Center Article III judges CSV (~4,600 rows)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists judges (
  nid                  text primary key,           -- FJC NID (unique judge ID)
  last_name            text not null,
  first_name           text,
  middle_name          text,
  suffix               text,
  birth_year           int,
  death_year           int,
  gender               text,
  race_ethnicity       text,
  undergrad            text,                        -- undergraduate institution
  law_school           text,
  appointing_president text,
  party_of_president   text,
  commission_date      date,
  court_name           text,
  court_type           text,
  termination_date     date,
  created_at           timestamptz default now()
);

create index if not exists judges_last_name_idx on judges(lower(last_name));
create index if not exists judges_name_idx      on judges(lower(last_name), lower(first_name));

-- ─── RPC: fuzzy name lookup ───────────────────────────────────────────────
create or replace function lookup_judge(
  p_last_name  text,
  p_first_name text default null
)
returns setof judges
language sql
security definer
set search_path = public
as $$
  select * from judges
  where lower(last_name) = lower(p_last_name)
    and (p_first_name is null or lower(first_name) ilike lower(left(p_first_name, 3)) || '%')
  order by commission_date desc nulls last
  limit 5;
$$;

revoke all on function lookup_judge(text, text) from public;
grant execute on function lookup_judge(text, text) to authenticated, service_role;

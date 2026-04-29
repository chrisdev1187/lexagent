-- Migration 029: Alert preferences + helper RPCs (v2.0)

alter table user_roles
  add column if not exists alert_email_enabled bool not null default false;

-- Count unseen docket alerts for a user across all their matters
create or replace function get_user_alert_count(p_user_id uuid)
returns int
language sql security definer
as $$
  select count(*)::int
  from docket_alerts da
  join watched_dockets wd on wd.id = da.watched_docket_id
  join matters m on m.id = wd.matter_id
  join user_roles ur on ur.org_id = m.org_id
  where ur.user_id = p_user_id
    and ur.suspended_at is null
    and da.seen_at is null
$$;

-- Recent unseen alerts (for bell dropdown)
create or replace function get_user_recent_alerts(p_user_id uuid, p_limit int default 10)
returns table (
  alert_id    uuid,
  entry_date  timestamptz,
  description text,
  case_name   text,
  matter_id   uuid,
  matter_name text,
  created_at  timestamptz
)
language sql security definer
as $$
  select
    da.id            as alert_id,
    da.entry_date,
    da.description,
    wd.case_name,
    m.id             as matter_id,
    m.title          as matter_name,
    da.created_at
  from docket_alerts da
  join watched_dockets wd on wd.id = da.watched_docket_id
  join matters m on m.id = wd.matter_id
  join user_roles ur on ur.org_id = m.org_id
  where ur.user_id = p_user_id
    and ur.suspended_at is null
    and da.seen_at is null
  order by da.created_at desc
  limit p_limit
$$;

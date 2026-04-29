-- Migration 027: Docket watch (v2.0)
-- watched_dockets: CL dockets a matter is subscribed to
-- docket_alerts:   new entries detected since last poll

create table if not exists watched_dockets (
  id            uuid primary key default gen_random_uuid(),
  matter_id     uuid not null references matters(id) on delete cascade,
  docket_id     bigint not null,          -- CourtListener docket pk
  case_name     text,
  court         text,
  docket_number text,
  cl_url        text,
  last_checked  timestamptz,
  last_entry_date timestamptz,
  entry_count   int not null default 0,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  unique(matter_id, docket_id)
);

create table if not exists docket_alerts (
  id                uuid primary key default gen_random_uuid(),
  watched_docket_id uuid not null references watched_dockets(id) on delete cascade,
  entry_number      int,
  entry_date        timestamptz,
  description       text,
  docket_text       text,
  seen_at           timestamptz,
  created_at        timestamptz not null default now()
);

-- RLS
alter table watched_dockets enable row level security;
alter table docket_alerts   enable row level security;

-- matters.user_id is the direct owner — no org layer
create policy "watched_dockets_select" on watched_dockets for select
  using (
    exists (
      select 1 from matters m
      where m.id = watched_dockets.matter_id
        and m.user_id = auth.uid()
    )
  );

create policy "watched_dockets_insert" on watched_dockets for insert
  with check (
    exists (
      select 1 from matters m
      where m.id = watched_dockets.matter_id
        and m.user_id = auth.uid()
    )
  );

create policy "watched_dockets_delete" on watched_dockets for delete
  using (created_by = auth.uid());

create policy "docket_alerts_select" on docket_alerts for select
  using (
    exists (
      select 1 from watched_dockets wd
      join matters m on m.id = wd.matter_id
      where wd.id = docket_alerts.watched_docket_id
        and m.user_id = auth.uid()
    )
  );

create policy "docket_alerts_update" on docket_alerts for update
  using (
    exists (
      select 1 from watched_dockets wd
      join matters m on m.id = wd.matter_id
      where wd.id = docket_alerts.watched_docket_id
        and m.user_id = auth.uid()
    )
  );

-- Index for fast alert feed
create index if not exists docket_alerts_wdid_date on docket_alerts(watched_docket_id, entry_date desc);
create index if not exists watched_dockets_matter on watched_dockets(matter_id);

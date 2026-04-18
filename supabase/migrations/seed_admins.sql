-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — Seed admin accounts (pure SQL, no PL/pgSQL)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── drwillybum@gmail.com ─────────────────────────────────────────────────────

insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_super_admin
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  'drwillybum@gmail.com',
  crypt('P@sswprd1212*#*#', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{}',
  now(), now(), false
where not exists (
  select 1 from auth.users where email = 'drwillybum@gmail.com'
);

update auth.users
   set encrypted_password = crypt('P@sswprd1212*#*#', gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now()),
       updated_at         = now()
 where email = 'drwillybum@gmail.com';

insert into public.user_roles (user_id, role, plan_id)
select id, 'admin', 'premium'
  from auth.users
 where email = 'drwillybum@gmail.com'
on conflict (user_id) do update set role = 'admin', plan_id = 'premium';

-- ── christiaanbothma47@gmail.com ─────────────────────────────────────────────

insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_super_admin
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  'christiaanbothma47@gmail.com',
  crypt('P@sswprd1212*#*#', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{}',
  now(), now(), false
where not exists (
  select 1 from auth.users where email = 'christiaanbothma47@gmail.com'
);

update auth.users
   set encrypted_password = crypt('P@sswprd1212*#*#', gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now()),
       updated_at         = now()
 where email = 'christiaanbothma47@gmail.com';

insert into public.user_roles (user_id, role, plan_id)
select id, 'admin', 'premium'
  from auth.users
 where email = 'christiaanbothma47@gmail.com'
on conflict (user_id) do update set role = 'admin', plan_id = 'premium';

-- ── Verify ────────────────────────────────────────────────────────────────────
select u.email, r.role, r.plan_id
  from auth.users u
  join public.user_roles r on r.user_id = u.id
 where u.email in ('drwillybum@gmail.com', 'christiaanbothma47@gmail.com');

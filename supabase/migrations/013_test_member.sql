-- 013_test_member.sql
-- Creates a non-admin test user for e2e / audit runs.
-- Safe to run in production — idempotent (ON CONFLICT DO NOTHING).
-- Password is hashed with Supabase's bcrypt scheme (cost 10).
--
-- User: armin@notadmin.com / ZAQxsw123
-- Role: member (starter plan) — auto-assigned by on_auth_user_created trigger
--
-- To apply: run in Supabase SQL Editor or via `supabase db push`

DO $$
DECLARE
  v_uid uuid := gen_random_uuid();
  v_email text := 'armin@notadmin.com';
  v_password text := 'ZAQxsw123';
  v_encrypted text;
BEGIN
  -- Skip if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE NOTICE 'Test user % already exists — skipping.', v_email;
    RETURN;
  END IF;

  -- Hash password using Supabase's bcrypt scheme (identical to GoTrue)
  v_encrypted := crypt(v_password, gen_salt('bf', 10));

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    recovery_sent_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud
  ) VALUES (
    v_uid,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    v_encrypted,
    now(),           -- mark email as already confirmed
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    'authenticated',
    'authenticated'
  );

  -- The on_auth_user_created trigger fires automatically and inserts:
  --   profiles (id, email)
  --   user_roles (user_id, role='member', plan_id='starter')
  -- Nothing extra needed here.

  RAISE NOTICE 'Test user % created (id: %).', v_email, v_uid;
END;
$$;

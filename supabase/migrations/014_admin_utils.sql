-- 014_admin_utils.sql
-- Server-side admin utilities for user management.
-- These RPCs are called by the Next.js admin API routes as fallbacks when the
-- GoTrue Admin API fails (e.g. malformed auth.users records inserted via raw SQL).
-- Both functions are SECURITY DEFINER and only callable by service_role.

-- Directly delete a user from auth.users (cascades to profiles, user_roles via FK).
-- Use when auth.admin.deleteUser() returns "Database error loading user".
CREATE OR REPLACE FUNCTION public.admin_force_delete_user(uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_force_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_force_delete_user(uuid) TO service_role;

-- Directly update a user's password in auth.users using pgcrypto bcrypt.
-- Use when auth.admin.updateUserById() returns "Database error loading user".
-- pgcrypto gen_salt('bf', 10) produces $2a$10$... which GoTrue accepts.
CREATE OR REPLACE FUNCTION public.admin_set_user_password(uid uuid, new_pw text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_pw, gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_password(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(uuid, text) TO service_role;

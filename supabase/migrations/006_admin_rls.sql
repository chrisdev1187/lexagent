-- Admin helper: returns true if calling user has role='admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') $$;

-- RLS: admins can read all user_roles rows
CREATE POLICY "admin_read_all_user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Admin function: returns all users with email + profile (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  user_id   uuid,
  email     text,
  role      text,
  plan_id   text,
  byok_active boolean,
  full_name text,
  created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT
      ur.user_id,
      au.email::text,
      ur.role,
      ur.plan_id,
      ur.byok_active,
      p.full_name,
      au.created_at
    FROM public.user_roles ur
    JOIN auth.users au ON au.id = ur.user_id
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    ORDER BY au.created_at DESC;
END;
$$;

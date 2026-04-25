-- Allow admins to update any user's role and plan
CREATE POLICY "admin_update_user_roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SECURITY DEFINER helper so admin panel can set role+plan atomically
-- (bypasses RLS, called from client with anon key, restricted to admin callers)
CREATE OR REPLACE FUNCTION public.admin_set_user_plan(
  target_uid uuid,
  new_role    text,
  new_plan_id text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE public.user_roles
    SET role = new_role, plan_id = new_plan_id, updated_at = now()
    WHERE user_id = target_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text, text) TO authenticated;

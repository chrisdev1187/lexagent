-- RPC: get_my_role — returns the calling user's highest role.
-- SECURITY DEFINER bypasses RLS completely — reliable even if policies misconfigure.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (
      SELECT role FROM public.user_roles
      WHERE user_id = auth.uid()
      ORDER BY
        CASE role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
      LIMIT 1
    ),
    'member'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- Gap 1 fix: accept explicit p_user_id so server-side callers (service role)
-- can pass the real user id instead of relying on auth.uid() which is null
-- under the service role key.

CREATE OR REPLACE FUNCTION public.record_session(
  p_session_id         text,
  p_device_fingerprint text    DEFAULT NULL,
  p_ip_address         text    DEFAULT NULL,
  p_user_agent         text    DEFAULT NULL,
  p_user_id            uuid    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  -- Enforce single session: revoke all prior active sessions for this user
  UPDATE public.user_sessions_ext
    SET is_revoked    = true,
        revoked_at    = now(),
        revoke_reason = 'new_login'
    WHERE user_id     = v_uid
      AND is_revoked  = false
      AND session_id != p_session_id;

  -- Upsert this session
  INSERT INTO public.user_sessions_ext
    (user_id, session_id, device_fingerprint, ip_address, user_agent)
    VALUES (v_uid, p_session_id, p_device_fingerprint, p_ip_address, p_user_agent)
    ON CONFLICT (session_id) DO UPDATE SET
      last_seen   = now(),
      is_revoked  = false;

  -- Abuse: >3 distinct users from same IP in last 30 days
  IF p_ip_address IS NOT NULL THEN
    IF (
      SELECT COUNT(DISTINCT user_id)
      FROM public.user_sessions_ext
      WHERE ip_address = p_ip_address
        AND created_at > now() - interval '30 days'
    ) > 3 THEN
      INSERT INTO public.abuse_flags (user_id, flag_type, detail)
        VALUES (v_uid, 'ip_cluster', jsonb_build_object('ip', p_ip_address))
        ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$;

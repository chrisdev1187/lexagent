-- Migration 022: Telemetry — Sessions, Device Fingerprinting, Single-Session Enforcement, Abuse Detection
-- Apply via Supabase Dashboard SQL editor.

-- ── 1. user_sessions_ext ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_sessions_ext (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        REFERENCES auth.users NOT NULL,
  session_id         text        NOT NULL,            -- client-generated UUID in localStorage
  device_fingerprint text,
  ip_address         text,
  user_agent         text,
  created_at         timestamptz DEFAULT now(),
  last_seen          timestamptz DEFAULT now(),
  is_revoked         boolean     NOT NULL DEFAULT false,
  revoked_at         timestamptz,
  revoke_reason      text        -- 'new_login' | 'admin_revoked' | 'user_signout' | 'suspension'
);

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_ext_session_id_idx
  ON public.user_sessions_ext (session_id);

CREATE INDEX IF NOT EXISTS user_sessions_ext_user_id_idx
  ON public.user_sessions_ext (user_id, is_revoked, last_seen DESC);

CREATE INDEX IF NOT EXISTS user_sessions_ext_fingerprint_idx
  ON public.user_sessions_ext (device_fingerprint) WHERE device_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_sessions_ext_ip_idx
  ON public.user_sessions_ext (ip_address) WHERE ip_address IS NOT NULL;

ALTER TABLE public.user_sessions_ext ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_own_read"   ON public.user_sessions_ext;
DROP POLICY IF EXISTS "sessions_own_insert" ON public.user_sessions_ext;
DROP POLICY IF EXISTS "sessions_admin_all"  ON public.user_sessions_ext;

CREATE POLICY "sessions_own_read" ON public.user_sessions_ext
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "sessions_own_insert" ON public.user_sessions_ext
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions_admin_all" ON public.user_sessions_ext
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','owner'))
  );

-- ── 2. abuse_flags ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.abuse_flags (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users NOT NULL,
  flag_type   text        NOT NULL,   -- 'ip_cluster' | 'fingerprint_cluster' | 'email_alias' | 'excessive_usage'
  details     jsonb       DEFAULT '{}'::jsonb,
  resolved    boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS abuse_flags_user_id_idx
  ON public.abuse_flags (user_id, resolved, created_at DESC);

ALTER TABLE public.abuse_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "abuse_flags_admin_all" ON public.abuse_flags;

CREATE POLICY "abuse_flags_admin_all" ON public.abuse_flags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','owner'))
  );

-- ── 3. Suspension columns on user_roles ─────────────────────────────────────
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS suspended_until   timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- ── 4. record_session() — client calls on every login ────────────────────────
-- Revokes all prior sessions (single-session enforcement) then upserts new one.
CREATE OR REPLACE FUNCTION public.record_session(
  p_session_id         text,
  p_device_fingerprint text    DEFAULT NULL,
  p_ip_address         text    DEFAULT NULL,
  p_user_agent         text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
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
      INSERT INTO public.abuse_flags (user_id, flag_type, details)
        VALUES (v_uid, 'ip_cluster', jsonb_build_object('ip', p_ip_address))
        ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Abuse: >3 distinct users from same fingerprint in last 30 days
  IF p_device_fingerprint IS NOT NULL THEN
    IF (
      SELECT COUNT(DISTINCT user_id)
        FROM public.user_sessions_ext
        WHERE device_fingerprint = p_device_fingerprint
          AND created_at > now() - interval '30 days'
    ) > 3 THEN
      INSERT INTO public.abuse_flags (user_id, flag_type, details)
        VALUES (v_uid, 'fingerprint_cluster', jsonb_build_object('fingerprint', p_device_fingerprint))
        ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$;

-- ── 5. update_session_seen() — heartbeat ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_session_seen(p_session_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_sessions_ext
    SET last_seen = now()
    WHERE session_id = p_session_id
      AND user_id    = auth.uid()
      AND is_revoked = false;
$$;

-- ── 6. get_user_detail() — admin drawer data ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_detail(p_target_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_result      jsonb;
BEGIN
  SELECT role INTO v_caller_role
    FROM public.user_roles WHERE user_id = auth.uid();

  IF v_caller_role NOT IN ('admin','owner') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT jsonb_build_object(
    'sessions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',                 id,
        'session_id',         session_id,
        'device_fingerprint', device_fingerprint,
        'ip_address',         ip_address,
        'user_agent',         user_agent,
        'created_at',         created_at,
        'last_seen',          last_seen,
        'is_revoked',         is_revoked,
        'revoked_at',         revoked_at,
        'revoke_reason',      revoke_reason
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM public.user_sessions_ext
      WHERE user_id = p_target_uid
      LIMIT 20
    ),
    'actions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id',          id,
        'action_type', action_type,
        'credit_cost', credit_cost,
        'model',       model,
        'created_at',  created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM public.action_log
      WHERE user_id = p_target_uid
      LIMIT 20
    ),
    'credits', (
      SELECT jsonb_build_object(
        'credits_used',  credits_used,
        'credits_limit', credits_limit,
        'period_start',  period_start,
        'period_end',    period_end
      )
      FROM public.credit_balance
      WHERE user_id = p_target_uid
      LIMIT 1
    ),
    'abuse_flags', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'flag_type',  flag_type,
        'details',    details,
        'resolved',   resolved,
        'created_at', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM public.abuse_flags
      WHERE user_id  = p_target_uid
        AND resolved = false
    ),
    'suspension', (
      SELECT jsonb_build_object(
        'suspended_until',   suspended_until,
        'suspension_reason', suspension_reason
      )
      FROM public.user_roles
      WHERE user_id = p_target_uid
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ── 7. revoke_user_sessions() — admin action ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_target_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','owner')
  ) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  UPDATE public.user_sessions_ext
    SET is_revoked    = true,
        revoked_at    = now(),
        revoke_reason = 'admin_revoked'
    WHERE user_id    = p_target_uid
      AND is_revoked = false;
END;
$$;

-- ── 8. suspend_user() — admin action ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.suspend_user(
  p_target_uid uuid,
  p_reason     text        DEFAULT 'Policy violation',
  p_until      timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','owner')
  ) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  UPDATE public.user_roles
    SET suspended_until   = COALESCE(p_until, 'infinity'::timestamptz),
        suspension_reason = p_reason
    WHERE user_id = p_target_uid;

  -- Revoke all active sessions immediately
  UPDATE public.user_sessions_ext
    SET is_revoked    = true,
        revoked_at    = now(),
        revoke_reason = 'suspension'
    WHERE user_id    = p_target_uid
      AND is_revoked = false;

  -- Audit trail
  INSERT INTO public.audit_log (user_id, event_type, resource_type, resource_id, metadata)
    VALUES (
      auth.uid(), 'user_suspended', 'user', p_target_uid::text,
      jsonb_build_object('target_uid', p_target_uid, 'reason', p_reason)
    );
END;
$$;

-- ── 9. unsuspend_user() — admin action ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.unsuspend_user(p_target_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','owner')
  ) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  UPDATE public.user_roles
    SET suspended_until   = NULL,
        suspension_reason = NULL
    WHERE user_id = p_target_uid;
END;
$$;

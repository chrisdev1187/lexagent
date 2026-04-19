-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — Phase 5: Usage Enforcement & Quota Dashboard
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Add storage_limit_mb to plans ─────────────────────────────────────────────
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS storage_limit_mb integer;

UPDATE public.plans SET storage_limit_mb =
  CASE id
    WHEN 'starter'      THEN 512
    WHEN 'professional' THEN 2048
    WHEN 'firm'         THEN 10240
    WHEN 'premium'      THEN NULL   -- unlimited
    ELSE 512
  END;

-- ── Per-user storage tracking ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.storage_usage (
  user_id    uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  bytes_used bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storage_usage_read"   ON public.storage_usage;
DROP POLICY IF EXISTS "storage_usage_update" ON public.storage_usage;

CREATE POLICY "storage_usage_read" ON public.storage_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- No direct client writes — updated via RPC only

-- ── team_usage_monthly ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_usage_monthly (
  id             bigserial PRIMARY KEY,
  team_id        uuid NOT NULL REFERENCES public.teams ON DELETE CASCADE,
  year           integer NOT NULL,
  month          integer NOT NULL,
  total_requests bigint NOT NULL DEFAULT 0,
  total_usd_cost numeric(12,6) NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, year, month)
);

ALTER TABLE public.team_usage_monthly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_usage_read" ON public.team_usage_monthly;

CREATE POLICY "team_usage_read" ON public.team_usage_monthly FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_usage_monthly.team_id
        AND team_members.user_id = auth.uid()
    )
  );

-- ── RPC: get_quota_status ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_quota_status()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'plan_id',          p.id,
    'matter_count',     (SELECT count(*) FROM public.matters m WHERE m.user_id = auth.uid()),
    'matter_limit',     p.matter_limit,
    'storage_bytes',    coalesce((SELECT su.bytes_used FROM public.storage_usage su WHERE su.user_id = auth.uid()), 0),
    'storage_limit_mb', p.storage_limit_mb,
    'ai_spent',         coalesce((
      SELECT um.total_usd_cost FROM public.usage_monthly um
      WHERE um.user_id = auth.uid()
        AND um.year  = extract(year  FROM current_date)::integer
        AND um.month = extract(month FROM current_date)::integer
    ), 0),
    'ai_budget',        p.usd_budget,
    'ai_requests',      coalesce((
      SELECT um.total_requests FROM public.usage_monthly um
      WHERE um.user_id = auth.uid()
        AND um.year  = extract(year  FROM current_date)::integer
        AND um.month = extract(month FROM current_date)::integer
    ), 0)
  )
  FROM public.plans p
  JOIN public.user_roles ur ON ur.plan_id = p.id AND ur.user_id = auth.uid();
$$;

-- ── RPC: adjust_storage_usage (signed delta, positive=upload, negative=delete) ─
CREATE OR REPLACE FUNCTION public.adjust_storage_usage(p_delta bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.storage_usage (user_id, bytes_used, updated_at)
  VALUES (auth.uid(), greatest(0, p_delta), now())
  ON CONFLICT (user_id) DO UPDATE SET
    bytes_used = greatest(0, public.storage_usage.bytes_used + p_delta),
    updated_at = now();
END;
$$;

-- ── RPC: check_matter_quota — returns true if user can create another matter ──
CREATE OR REPLACE FUNCTION public.check_matter_quota()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    CASE
      WHEN p.matter_limit IS NULL THEN true
      ELSE (SELECT count(*) FROM public.matters WHERE user_id = auth.uid()) < p.matter_limit
    END
  FROM public.user_roles ur
  JOIN public.plans p ON p.id = ur.plan_id
  WHERE ur.user_id = auth.uid();
$$;

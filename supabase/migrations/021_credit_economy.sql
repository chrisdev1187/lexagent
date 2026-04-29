-- Migration 021: Credit Economy
-- Unified per-action credit system replacing USD budget enforcement.
-- Apply via Supabase Dashboard SQL editor or: supabase db push

-- ── 1. Add credits_monthly to plans ──────────────────────────────────────
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS credits_monthly int;

UPDATE public.plans SET credits_monthly = 0     WHERE id = 'free';
UPDATE public.plans SET credits_monthly = 500   WHERE id = 'starter';
UPDATE public.plans SET credits_monthly = 1500  WHERE id = 'professional';
UPDATE public.plans SET credits_monthly = 5000  WHERE id = 'firm';
UPDATE public.plans SET credits_monthly = 20000 WHERE id = 'premium';

-- ── 2. Add credit_cost to existing ai_usage (backward compat) ────────────
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS credit_cost int DEFAULT 0;

-- ── 3. action_log — unified log for all platform actions ─────────────────
CREATE TABLE IF NOT EXISTS public.action_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users NOT NULL,
  matter_id    uuid REFERENCES public.matters(id) ON DELETE SET NULL,
  action_type  text NOT NULL,
  credit_cost  int  NOT NULL DEFAULT 0,
  model        text,
  provider     text,
  input_tok    int,
  output_tok   int,
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS action_log_user_id_idx    ON public.action_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS action_log_action_type_idx ON public.action_log (action_type);

ALTER TABLE public.action_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "action_log_own_read"   ON public.action_log;
DROP POLICY IF EXISTS "action_log_own_insert" ON public.action_log;
DROP POLICY IF EXISTS "action_log_admin_all"  ON public.action_log;

CREATE POLICY "action_log_own_read" ON public.action_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "action_log_own_insert" ON public.action_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "action_log_admin_all" ON public.action_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','owner'))
  );

-- ── 4. credit_balance — monthly balance per user ──────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_balance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users UNIQUE NOT NULL,
  plan_id       text REFERENCES public.plans(id),
  credits_used  int DEFAULT 0,
  credits_limit int NOT NULL DEFAULT 0,
  period_start  timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  period_end    timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.credit_balance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_balance_own"   ON public.credit_balance;
DROP POLICY IF EXISTS "credit_balance_admin" ON public.credit_balance;

CREATE POLICY "credit_balance_own" ON public.credit_balance
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "credit_balance_admin" ON public.credit_balance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','owner'))
  );

-- ── 5. RPC: get_credit_status ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_credit_status(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan_id     text;
  v_limit       int;
  v_used        int;
  v_period_end  timestamptz;
  v_balance_row public.credit_balance%ROWTYPE;
BEGIN
  -- Get user plan
  SELECT plan_id INTO v_plan_id
  FROM public.user_roles WHERE user_id = p_user_id;

  -- Get credit limit for plan
  SELECT credits_monthly INTO v_limit
  FROM public.plans WHERE id = v_plan_id;

  v_limit := COALESCE(v_limit, 0);

  -- Get or create balance row
  SELECT * INTO v_balance_row
  FROM public.credit_balance WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Bootstrap: insert initial balance for this period
    INSERT INTO public.credit_balance (user_id, plan_id, credits_used, credits_limit, period_start, period_end)
    VALUES (
      p_user_id, v_plan_id, 0, v_limit,
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object(
      'plan_id',     v_plan_id,
      'used',        0,
      'limit',       v_limit,
      'remaining',   v_limit,
      'period_end',  (date_trunc('month', now()) + interval '1 month'),
      'pct_used',    0
    );
  END IF;

  -- Auto-reset if new period
  IF now() >= v_balance_row.period_end THEN
    UPDATE public.credit_balance SET
      credits_used  = 0,
      credits_limit = v_limit,
      period_start  = date_trunc('month', now()),
      period_end    = date_trunc('month', now()) + interval '1 month',
      updated_at    = now()
    WHERE user_id = p_user_id;

    v_used := 0;
  ELSE
    v_used := v_balance_row.credits_used;
  END IF;

  RETURN jsonb_build_object(
    'plan_id',     v_plan_id,
    'used',        v_used,
    'limit',       v_limit,
    'remaining',   GREATEST(v_limit - v_used, 0),
    'period_end',  v_balance_row.period_end,
    'pct_used',    CASE WHEN v_limit > 0 THEN ROUND((v_used::numeric / v_limit) * 100) ELSE 0 END
  );
END;
$$;

-- ── 6. RPC: deduct_credits ────────────────────────────────────────────────
-- Returns jsonb: { ok: bool, remaining: int, reason: text }
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id    uuid,
  p_action     text,
  p_cost       int,
  p_matter_id  uuid DEFAULT NULL,
  p_model      text DEFAULT NULL,
  p_provider   text DEFAULT NULL,
  p_input_tok  int  DEFAULT 0,
  p_output_tok int  DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan_id     text;
  v_limit       int;
  v_used        int;
  v_period_end  timestamptz;
  v_balance_row public.credit_balance%ROWTYPE;
BEGIN
  -- Free-plan users bypass credit deduction (free_tier_usage handles them)
  SELECT plan_id INTO v_plan_id FROM public.user_roles WHERE user_id = p_user_id;
  IF v_plan_id = 'free' OR v_plan_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'remaining', 0, 'reason', 'free_tier');
  END IF;

  SELECT credits_monthly INTO v_limit FROM public.plans WHERE id = v_plan_id;
  v_limit := COALESCE(v_limit, 0);

  -- Get/create balance row
  SELECT * INTO v_balance_row FROM public.credit_balance WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.credit_balance (user_id, plan_id, credits_used, credits_limit, period_start, period_end)
    VALUES (p_user_id, v_plan_id, 0, v_limit, date_trunc('month', now()), date_trunc('month', now()) + interval '1 month')
    ON CONFLICT (user_id) DO NOTHING;
    v_used := 0;
    v_period_end := date_trunc('month', now()) + interval '1 month';
  ELSE
    -- Auto-reset if period expired
    IF now() >= v_balance_row.period_end THEN
      UPDATE public.credit_balance SET
        credits_used = 0, credits_limit = v_limit,
        period_start = date_trunc('month', now()),
        period_end   = date_trunc('month', now()) + interval '1 month',
        updated_at   = now()
      WHERE user_id = p_user_id;
      v_used := 0;
    ELSE
      v_used := v_balance_row.credits_used;
    END IF;
    v_period_end := COALESCE(v_balance_row.period_end, date_trunc('month', now()) + interval '1 month');
  END IF;

  -- Check limit: block at 110%
  IF p_cost > 0 AND v_limit > 0 AND (v_used + p_cost) > (v_limit * 1.1) THEN
    RETURN jsonb_build_object(
      'ok',        false,
      'remaining', GREATEST(v_limit - v_used, 0),
      'reason',    'credit_exhausted'
    );
  END IF;

  -- Deduct
  IF p_cost > 0 THEN
    UPDATE public.credit_balance
    SET credits_used = credits_used + p_cost, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Log action
  INSERT INTO public.action_log (user_id, matter_id, action_type, credit_cost, model, provider, input_tok, output_tok)
  VALUES (p_user_id, p_matter_id, p_action, p_cost, p_model, p_provider, p_input_tok, p_output_tok);

  RETURN jsonb_build_object(
    'ok',        true,
    'remaining', GREATEST(v_limit - v_used - p_cost, 0),
    'reason',    'ok'
  );
END;
$$;

-- ── 7. Grant execute on RPCs ──────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.get_credit_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, text, int, uuid, text, text, int, int) TO authenticated, service_role;

-- Verify
SELECT 'Migration 021 (credit economy) applied. Bootstrap credit_balance rows via get_credit_status() on first login.' AS status;

-- 026: Abuse signal — heavy daily usage (>5× user's own 30-day daily average)
-- Fires on ai_usage INSERT via trigger on the API.

CREATE OR REPLACE FUNCTION public.check_heavy_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_count  int;
  v_avg_daily    numeric;
BEGIN
  -- Count today's requests for this user
  SELECT COUNT(*) INTO v_today_count
    FROM public.ai_usage
    WHERE user_id   = NEW.user_id
      AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  -- 30-day daily average (exclude today to avoid self-reference)
  SELECT COALESCE(
    COUNT(*)::numeric / NULLIF(
      (EXTRACT(EPOCH FROM (date_trunc('day', now()) - date_trunc('day', now() - interval '30 days'))) / 86400)
    , 0), 0)
  INTO v_avg_daily
    FROM public.ai_usage
    WHERE user_id   = NEW.user_id
      AND created_at >= now() - interval '30 days'
      AND created_at <  date_trunc('day', now() AT TIME ZONE 'UTC');

  -- Flag if today's count exceeds 5× the daily average (min avg of 3 to avoid noise)
  IF v_avg_daily >= 3 AND v_today_count > (v_avg_daily * 5) THEN
    INSERT INTO public.abuse_flags (user_id, flag_type, details)
      VALUES (
        NEW.user_id,
        'heavy_usage',
        jsonb_build_object(
          'today_count', v_today_count,
          'avg_daily',   round(v_avg_daily, 1),
          'ratio',       round(v_today_count / v_avg_daily, 1)
        )
      )
      ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_heavy_usage ON public.ai_usage;
CREATE TRIGGER trg_check_heavy_usage
  AFTER INSERT ON public.ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.check_heavy_usage();

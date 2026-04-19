-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — Phase 4: Compliance (ACP Tagging + Audit Log)
-- ═══════════════════════════════════════════════════════════════════════════

-- Requires pgcrypto for SHA-256 checkpoints
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Append-only Audit Log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES auth.users ON DELETE SET NULL,
  matter_id   uuid REFERENCES public.matters ON DELETE SET NULL,
  action      text NOT NULL,       -- 'matter.create' | 'matter.delete' | 'doc.upload' etc.
  entity_type text,                -- 'matter' | 'document' | 'user' | 'team'
  entity_id   text,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_user_id_idx    ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_log_matter_id_idx  ON public.audit_log(matter_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx     ON public.audit_log(action);

-- ── Monthly SHA-256 Checkpoints ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_checkpoints (
  id         bigserial PRIMARY KEY,
  year       integer NOT NULL,
  month      integer NOT NULL,
  event_count bigint NOT NULL DEFAULT 0,
  sha256     text NOT NULL,
  sealed_at  timestamptz NOT NULL DEFAULT now(),
  sealed_by  uuid REFERENCES auth.users ON DELETE SET NULL,
  UNIQUE (year, month)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_checkpoints ENABLE ROW LEVEL SECURITY;

-- Audit log: INSERT own events, SELECT own or admin
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_read"   ON public.audit_log;

CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "audit_log_read" ON public.audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- NO UPDATE or DELETE policies — append-only by design

-- Checkpoints: admin read/write, anyone can read own-matter checkpoints
DROP POLICY IF EXISTS "audit_checkpoints_admin" ON public.audit_checkpoints;

CREATE POLICY "audit_checkpoints_admin" ON public.audit_checkpoints FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Helper: log_audit_event RPC ───────────────────────────────────────────────
-- Called from the client; SECURITY DEFINER so it can always insert regardless
-- of calling context, but enforces user_id = auth.uid()
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action      text,
  p_entity_type text DEFAULT NULL,
  p_entity_id   text DEFAULT NULL,
  p_matter_id   uuid DEFAULT NULL,
  p_payload     jsonb DEFAULT '{}'::jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, matter_id, action, entity_type, entity_id, payload)
  VALUES (auth.uid(), p_matter_id, p_action, p_entity_type, p_entity_id, p_payload);
END;
$$;

-- ── Helper: generate monthly checkpoint (admin only) ─────────────────────────
CREATE OR REPLACE FUNCTION public.generate_audit_checkpoint(p_year integer, p_month integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hash text;
  v_count bigint;
  v_data text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT
    count(*),
    encode(
      digest(
        string_agg(
          id::text || '|' || coalesce(user_id::text,'') || '|' || action || '|' || created_at::text,
          E'\n' ORDER BY id
        ),
        'sha256'
      ),
      'hex'
    )
  INTO v_count, v_hash
  FROM public.audit_log
  WHERE extract(year  FROM created_at)::integer = p_year
    AND extract(month FROM created_at)::integer = p_month;

  INSERT INTO public.audit_checkpoints (year, month, event_count, sha256, sealed_by)
  VALUES (p_year, p_month, v_count, coalesce(v_hash, encode(digest('', 'sha256'), 'hex')), auth.uid())
  ON CONFLICT (year, month) DO UPDATE SET
    event_count = excluded.event_count,
    sha256      = excluded.sha256,
    sealed_at   = now(),
    sealed_by   = excluded.sealed_by;

  RETURN v_hash;
END;
$$;

-- ── ACP flag on documents table ───────────────────────────────────────────────
-- Documents stored as JSONB in matters.metadata.vaultDocs carry acp flag client-side.
-- For documents in the documents table, add the column.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS acp boolean NOT NULL DEFAULT false;

-- ACP documents: only the matter owner can read them, even if matter is team-shared
-- Override the existing documents_read policy
DROP POLICY IF EXISTS "documents_read" ON public.documents;

CREATE POLICY "documents_read" ON public.documents FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      NOT acp
      AND (
        public.can_access_matter(matter_id)
        OR public.is_admin()
      )
    )
    OR public.is_admin()
  );

-- ── Admin: paginated audit log query ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_audit_log(
  p_limit  integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_matter_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL
)
RETURNS TABLE (
  id          bigint,
  user_email  text,
  matter_title text,
  action      text,
  entity_type text,
  entity_id   text,
  payload     jsonb,
  created_at  timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT
      al.id,
      au.email::text,
      m.title,
      al.action,
      al.entity_type,
      al.entity_id,
      al.payload,
      al.created_at
    FROM public.audit_log al
    LEFT JOIN auth.users   au ON au.id = al.user_id
    LEFT JOIN public.matters m ON m.id = al.matter_id
    WHERE (p_matter_id IS NULL OR al.matter_id = p_matter_id)
      AND (p_action IS NULL OR al.action = p_action)
    ORDER BY al.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — Phase 2: Matter & Vault ACLs
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Add visibility column to matters ─────────────────────────────────────────
ALTER TABLE public.matters
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','team','custom'));

-- Backfill: existing shared=true matters → visibility='team'
UPDATE public.matters SET visibility = 'team' WHERE shared = true AND visibility = 'private';

-- ── Matter Access (explicit per-user grants for 'custom' visibility) ──────────
CREATE TABLE IF NOT EXISTS public.matter_access (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id   uuid NOT NULL REFERENCES public.matters ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  can_write   boolean NOT NULL DEFAULT false,
  granted_by  uuid REFERENCES auth.users ON DELETE SET NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (matter_id, user_id)
);

CREATE INDEX IF NOT EXISTS matter_access_matter_id_idx ON public.matter_access(matter_id);
CREATE INDEX IF NOT EXISTS matter_access_user_id_idx   ON public.matter_access(user_id);

-- ── Document Access (per-document granular grants) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_access (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  can_write   boolean NOT NULL DEFAULT false,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, user_id)
);

CREATE INDEX IF NOT EXISTS document_access_doc_id_idx  ON public.document_access(document_id);
CREATE INDEX IF NOT EXISTS document_access_user_id_idx ON public.document_access(user_id);

-- ── Helper: can_access_matter(uuid) ──────────────────────────────────────────
-- Returns true if the calling user may read this matter
CREATE OR REPLACE FUNCTION public.can_access_matter(p_matter_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matters m
    WHERE m.id = p_matter_id
      AND (
        m.user_id = auth.uid()
        OR public.is_admin()
        OR (
          m.visibility = 'team'
          AND EXISTS (
            SELECT 1 FROM public.team_members tm1
            JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
            WHERE tm1.user_id = m.user_id
              AND tm2.user_id = auth.uid()
          )
        )
        OR (
          m.visibility = 'custom'
          AND EXISTS (
            SELECT 1 FROM public.matter_access ma
            WHERE ma.matter_id = m.id AND ma.user_id = auth.uid()
          )
        )
      )
  )
$$;

-- ── Rewrite matters RLS ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "matters: own matters" ON public.matters;
DROP POLICY IF EXISTS "matters_read"         ON public.matters;
DROP POLICY IF EXISTS "matters_write"        ON public.matters;
DROP POLICY IF EXISTS "matters_update"       ON public.matters;
DROP POLICY IF EXISTS "matters_delete"       ON public.matters;

-- SELECT: own + team-shared + custom-granted + admin
CREATE POLICY "matters_read" ON public.matters FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR (
      visibility = 'team'
      AND EXISTS (
        SELECT 1 FROM public.team_members tm1
        JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm1.user_id = matters.user_id AND tm2.user_id = auth.uid()
      )
    )
    OR (
      visibility = 'custom'
      AND EXISTS (
        SELECT 1 FROM public.matter_access ma
        WHERE ma.matter_id = matters.id AND ma.user_id = auth.uid()
      )
    )
  );

-- INSERT: own only
CREATE POLICY "matters_write" ON public.matters FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: own, or write-granted team member, or admin
CREATE POLICY "matters_update" ON public.matters FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.matter_access ma
      WHERE ma.matter_id = matters.id AND ma.user_id = auth.uid() AND ma.can_write = true
    )
  );

-- DELETE: own or admin
CREATE POLICY "matters_delete" ON public.matters FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ── Rewrite documents RLS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "documents: own documents" ON public.documents;
DROP POLICY IF EXISTS "documents_read"           ON public.documents;
DROP POLICY IF EXISTS "documents_insert"         ON public.documents;
DROP POLICY IF EXISTS "documents_update"         ON public.documents;
DROP POLICY IF EXISTS "documents_delete"         ON public.documents;

CREATE POLICY "documents_read" ON public.documents FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_access_matter(matter_id)
    OR public.is_admin()
  );

CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "documents_update" ON public.documents FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.matter_access ma
      WHERE ma.matter_id = documents.matter_id AND ma.user_id = auth.uid() AND ma.can_write = true
    )
  );

CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ── RLS for new ACL tables ────────────────────────────────────────────────────
ALTER TABLE public.matter_access   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access ENABLE ROW LEVEL SECURITY;

-- matter_access: matter owner + admin can read/write; grantee can read own row
DROP POLICY IF EXISTS "matter_access_owner_all"   ON public.matter_access;
DROP POLICY IF EXISTS "matter_access_grantee_read" ON public.matter_access;

CREATE POLICY "matter_access_owner_all" ON public.matter_access FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id AND user_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "matter_access_grantee_read" ON public.matter_access FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- document_access: same pattern
DROP POLICY IF EXISTS "document_access_owner_all"   ON public.document_access;
DROP POLICY IF EXISTS "document_access_grantee_read" ON public.document_access;

CREATE POLICY "document_access_owner_all" ON public.document_access FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.matters m ON m.id = d.matter_id
      WHERE d.id = document_id AND m.user_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.matters m ON m.id = d.matter_id
      WHERE d.id = document_id AND m.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "document_access_grantee_read" ON public.document_access FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── Extend storage RLS for team vault access ─────────────────────────────────
-- Path format: {owner_uid}/{matter_id}/{uuid}.{ext}
-- Allow team members to read vault files for accessible matters
DROP POLICY IF EXISTS "vault_docs_select" ON storage.objects;

CREATE POLICY "vault_docs_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'vault-docs'
    AND (
      (string_to_array(name, '/'))[1] = auth.uid()::text
      OR public.can_access_matter(
        (string_to_array(name, '/'))[2]::uuid
      )
    )
  );

-- INSERT: still uploader's own folder only
DROP POLICY IF EXISTS "vault_docs_insert" ON storage.objects;

CREATE POLICY "vault_docs_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vault-docs'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- DELETE: own files or write-granted on matter
DROP POLICY IF EXISTS "vault_docs_delete" ON storage.objects;

CREATE POLICY "vault_docs_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vault-docs'
    AND (
      (string_to_array(name, '/'))[1] = auth.uid()::text
      OR public.can_access_matter(
        (string_to_array(name, '/'))[2]::uuid
      )
    )
  );

-- ── Convenience RPC: grant matter access ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.grant_matter_access(
  p_matter_id uuid,
  p_user_id   uuid,
  p_can_write boolean DEFAULT false
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.matters WHERE id = p_matter_id AND user_id = auth.uid()
  ) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.matter_access (matter_id, user_id, can_write, granted_by)
  VALUES (p_matter_id, p_user_id, p_can_write, auth.uid())
  ON CONFLICT (matter_id, user_id) DO UPDATE SET
    can_write  = excluded.can_write,
    granted_by = excluded.granted_by,
    granted_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_matter_access(
  p_matter_id uuid,
  p_user_id   uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.matters WHERE id = p_matter_id AND user_id = auth.uid()
  ) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM public.matter_access
  WHERE matter_id = p_matter_id AND user_id = p_user_id;
END;
$$;

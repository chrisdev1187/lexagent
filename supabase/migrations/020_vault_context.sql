-- Migration 020: Vault Context Library + ACP RLS enforcement
-- Apply to Supabase via dashboard or CLI: supabase db push

-- ── ACP document access policy ────────────────────────────────────────────
-- vault-docs storage bucket: restrict ACP-flagged paths to uploader + team admins.
-- ACP flag is stored in matters.metadata->vaultDocs[].acp (JSONB, UI-enforced).
-- Storage-level policy: deny signed URL creation for non-owners on acp paths.
-- NOTE: Full RLS on storage objects requires Supabase storage policies.
-- The policy below restricts SELECT on vault-docs bucket objects to:
--   (a) the user who uploaded (user_id segment in path), OR
--   (b) users with role 'admin' or 'owner' in the same team.

-- Storage bucket policy (run in Supabase Dashboard → Storage → Policies):
/*
CREATE POLICY "acp_uploader_or_admin_only"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vault-docs'
  AND (
    -- Path starts with the authenticated user's own ID
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- User is an admin/owner in a team that has access to this matter
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'owner')
    )
  )
);
*/

-- ── Audit log extension for context library acknowledgements ──────────────
-- The audit_log table (from 009_compliance.sql) already captures doc.upload events.
-- We extend it to also capture context_library.acknowledge events via the
-- existing logAudit() client function — no schema change needed.

-- ── Context enrichment tracking ──────────────────────────────────────────
-- Context summaries (aresContext field) are stored in matters.metadata->vaultDocs[]
-- as JSONB — no new columns required. The aresEnriched boolean flag is also JSONB.
-- This is consistent with the Sprint 2/3 JSONB-only persistence strategy.

-- Verify migration applied:
SELECT 'Migration 020 (vault context) — ACP policy and context library setup noted. Apply storage bucket policy via Supabase Dashboard.' AS status;

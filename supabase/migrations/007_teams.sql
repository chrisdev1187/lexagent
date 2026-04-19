-- ═══════════════════════════════════════════════════════════════════════════
-- LexAgent — Phase 1: Teams Foundation + Session Tracking
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Migrate role values: 'user' → 'member' ───────────────────────────────────
-- First widen the constraint to allow both values during migration
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('user','member','admin','owner'));

UPDATE public.user_roles SET role = 'member' WHERE role = 'user';

-- Now tighten to final set
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('member','admin','owner'));

-- Update trigger to assign 'member' on new signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, plan_id)
  VALUES (NEW.id, 'member', 'starter')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── Teams ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  owner_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_id     text NOT NULL DEFAULT 'starter' REFERENCES public.plans(id),
  max_seats   integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_teams_updated_at ON public.teams;
CREATE TRIGGER set_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── Team Members ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES public.teams ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin','owner')),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_members_user_id_idx  ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS team_members_team_id_idx  ON public.team_members(team_id);

-- ── Team Invites ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL REFERENCES public.teams ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  token       text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  uuid REFERENCES auth.users ON DELETE SET NULL,
  expires_at  timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_invites_email_idx   ON public.team_invites(email);
CREATE INDEX IF NOT EXISTS team_invites_team_id_idx ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS team_invites_token_idx   ON public.team_invites(token);

-- ── User Sessions (concurrent session tracking) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  supabase_session_id text UNIQUE,
  ip_address          text,
  user_agent          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  last_seen_at        timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_expires_idx ON public.user_sessions(expires_at);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Teams: visible to members of that team + global admins
DROP POLICY IF EXISTS "teams_member_read"  ON public.teams;
DROP POLICY IF EXISTS "teams_owner_update" ON public.teams;
DROP POLICY IF EXISTS "teams_owner_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_owner_delete" ON public.teams;

CREATE POLICY "teams_member_read" ON public.teams FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "teams_owner_insert" ON public.teams FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "teams_owner_update" ON public.teams FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "teams_owner_delete" ON public.teams FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- Team members
DROP POLICY IF EXISTS "team_members_read"   ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;

CREATE POLICY "team_members_read" ON public.team_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('admin','owner')
    )
    OR public.is_admin()
  );

CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('admin','owner')
    )
    OR public.is_admin()
  );

CREATE POLICY "team_members_delete" ON public.team_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Team invites
DROP POLICY IF EXISTS "team_invites_admin_read"   ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_admin_insert"  ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_admin_delete"  ON public.team_invites;

CREATE POLICY "team_invites_admin_read" ON public.team_invites FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('admin','owner')
    )
    OR team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "team_invites_admin_insert" ON public.team_invites FOR INSERT TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('admin','owner')
    )
    OR team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "team_invites_admin_delete" ON public.team_invites FOR DELETE TO authenticated
  USING (
    team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

-- User sessions: own only
DROP POLICY IF EXISTS "user_sessions_own" ON public.user_sessions;

CREATE POLICY "user_sessions_own" ON public.user_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Helper Functions ──────────────────────────────────────────────────────────

-- Returns the calling user's teams with their role in each
CREATE OR REPLACE FUNCTION public.get_my_teams()
RETURNS TABLE (
  team_id      uuid,
  team_name    text,
  team_slug    text,
  my_role      text,
  member_count bigint,
  plan_id      text
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    t.id,
    t.name,
    t.slug,
    tm.role,
    (SELECT count(*) FROM public.team_members WHERE team_id = t.id),
    t.plan_id
  FROM public.teams t
  JOIN public.team_members tm ON tm.team_id = t.id AND tm.user_id = auth.uid();
$$;

-- Returns active session count for a user (for concurrent session enforcement)
CREATE OR REPLACE FUNCTION public.get_active_session_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT count(*)::integer
  FROM public.user_sessions
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > now());
$$;

-- Admin function: list all teams with owner + member count
CREATE OR REPLACE FUNCTION public.get_admin_teams()
RETURNS TABLE (
  team_id      uuid,
  team_name    text,
  team_slug    text,
  owner_email  text,
  member_count bigint,
  plan_id      text,
  created_at   timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT
      t.id,
      t.name,
      t.slug,
      au.email::text,
      (SELECT count(*) FROM public.team_members WHERE team_id = t.id),
      t.plan_id,
      t.created_at
    FROM public.teams t
    JOIN auth.users au ON au.id = t.owner_id
    ORDER BY t.created_at DESC;
END;
$$;

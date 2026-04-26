-- 023_feedback.sql
-- Feedback and bug report system

CREATE TABLE IF NOT EXISTS feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete set null,
  type        text not null check (type in ('bug', 'feature', 'general')),
  title       text not null,
  body        text not null,
  status      text not null default 'open' check (status in ('open', 'in_review', 'done', 'closed')),
  priority    text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  rating      int check (rating between 1 and 5),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "feedback_insert_own"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY "feedback_select_own"
  ON feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all feedback
CREATE POLICY "feedback_admin_select"
  ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update status/priority
CREATE POLICY "feedback_admin_update"
  ON feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();

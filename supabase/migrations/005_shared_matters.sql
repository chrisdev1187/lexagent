-- Allow any authenticated user to read matters marked as shared
CREATE POLICY "shared_matters_read"
  ON matters
  FOR SELECT
  TO authenticated
  USING (shared = true);

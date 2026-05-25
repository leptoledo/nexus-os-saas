-- ============================================================
-- NexusOS - Migration 002: RLS Policies & Helper Functions
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns true if the current user is a member of the given org
CREATE OR REPLACE FUNCTION is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_members.org_id = $1
      AND organization_members.user_id = auth.uid()
      AND organization_members.is_active = true
  );
$$;

-- Returns the current user's role in the given org (null if not a member)
CREATE OR REPLACE FUNCTION get_user_role(org_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM organization_members
  WHERE organization_members.org_id = $1
    AND organization_members.user_id = auth.uid()
    AND organization_members.is_active = true
  LIMIT 1;
$$;

-- Returns true if the current user is an admin of the given org
CREATE OR REPLACE FUNCTION is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_members.org_id = $1
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
      AND organization_members.is_active = true
  );
$$;

-- ============================================================
-- RLS POLICIES: organizations
-- ============================================================

-- SELECT: member of the org or admin
CREATE POLICY "org_select_members"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (is_org_member(id));

-- INSERT: any authenticated user can create their own org
CREATE POLICY "org_insert_authenticated"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: only org admin
CREATE POLICY "org_update_admin"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (is_org_admin(id))
  WITH CHECK (is_org_admin(id));

-- DELETE: only org admin
CREATE POLICY "org_delete_admin"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (is_org_admin(id));

-- ============================================================
-- RLS POLICIES: organization_members
-- ============================================================

-- SELECT: members of the same org
CREATE POLICY "members_select_same_org"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (is_org_member(org_id));

-- INSERT: admin of the org can invite
CREATE POLICY "members_insert_admin"
  ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (is_org_admin(org_id));

-- UPDATE: admin of the org
CREATE POLICY "members_update_admin"
  ON organization_members
  FOR UPDATE
  TO authenticated
  USING (is_org_admin(org_id))
  WITH CHECK (is_org_admin(org_id));

-- DELETE: admin of the org or the member themselves
CREATE POLICY "members_delete_admin_or_self"
  ON organization_members
  FOR DELETE
  TO authenticated
  USING (is_org_admin(org_id) OR user_id = auth.uid());

-- ============================================================
-- RLS POLICIES: user_profiles
-- ============================================================

-- SELECT: any authenticated user (needed for names/avatars in the UI)
CREATE POLICY "profiles_select_authenticated"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE: only the profile owner
CREATE POLICY "profiles_update_owner"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT: only the profile owner (handled by trigger, but allow manual insert)
CREATE POLICY "profiles_insert_owner"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================
-- RLS POLICIES: audit_logs
-- ============================================================

-- SELECT: only org admin
CREATE POLICY "audit_select_admin"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (is_org_admin(org_id));

-- INSERT: service role only (server-side functions)
-- No INSERT policy for authenticated role means only service_role can insert

-- ============================================================
-- RLS POLICIES: invitations
-- ============================================================

-- SELECT: admin of the org OR anyone who has the token (token lookup done via service role)
CREATE POLICY "invitations_select_admin"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (
    is_org_admin(org_id)
    OR invited_by = auth.uid()
  );

-- INSERT: admin of the org
CREATE POLICY "invitations_insert_admin"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (is_org_admin(org_id));

-- UPDATE: admin of the org (e.g., revoke invitation)
CREATE POLICY "invitations_update_admin"
  ON invitations
  FOR UPDATE
  TO authenticated
  USING (is_org_admin(org_id))
  WITH CHECK (is_org_admin(org_id));

-- DELETE: admin of the org
CREATE POLICY "invitations_delete_admin"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (is_org_admin(org_id));

-- ============================================================
-- RLS POLICIES: onboarding_steps
-- ============================================================

-- SELECT: members of the org
CREATE POLICY "onboarding_select_members"
  ON onboarding_steps
  FOR SELECT
  TO authenticated
  USING (is_org_member(org_id));

-- INSERT: admin of the org
CREATE POLICY "onboarding_insert_admin"
  ON onboarding_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (is_org_admin(org_id));

-- UPDATE: admin of the org
CREATE POLICY "onboarding_update_admin"
  ON onboarding_steps
  FOR UPDATE
  TO authenticated
  USING (is_org_admin(org_id))
  WITH CHECK (is_org_admin(org_id));

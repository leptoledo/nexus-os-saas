-- ============================================================
-- NexusOS - Migration 007: Notifications & Webhooks
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE notification_type AS ENUM (
  'info',
  'success',
  'warning',
  'error'
);

CREATE TYPE notification_category AS ENUM (
  'system',
  'marketing',
  'project',
  'analytics',
  'whatsapp',
  'billing'
);

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  message       text NOT NULL,
  type          notification_type NOT NULL DEFAULT 'info',
  category      notification_category NOT NULL DEFAULT 'system',
  resource_type text,
  resource_id   text,
  is_read       boolean NOT NULL DEFAULT false,
  read_at       timestamptz,
  action_url    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_org_id ON notifications(org_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);

-- ============================================================
-- TABLE: notification_preferences
-- ============================================================

CREATE TABLE notification_preferences (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  in_app              boolean NOT NULL DEFAULT true,
  email               boolean NOT NULL DEFAULT true,
  whatsapp            boolean NOT NULL DEFAULT false,
  categories          jsonb NOT NULL DEFAULT '{"system":true,"marketing":true,"project":true,"analytics":true,"whatsapp":true,"billing":true}',
  quiet_hours_start   time,
  quiet_hours_end     time,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- ============================================================
-- TABLE: webhook_configs
-- ============================================================

CREATE TABLE webhook_configs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  url               text NOT NULL,
  secret            text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  events            text[] NOT NULL DEFAULT '{}',
  is_active         boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_configs_org_id ON webhook_configs(org_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs           ENABLE ROW LEVEL SECURITY;

-- Notifications: user can only see their own
CREATE POLICY "notifications_select_owner"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_owner"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role inserts notifications (no INSERT policy for authenticated)

-- Notification preferences: user can manage their own
CREATE POLICY "notif_prefs_owner"
  ON notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Webhook configs: org admin manages, org members can view
CREATE POLICY "webhook_configs_select_member"
  ON webhook_configs
  FOR SELECT
  TO authenticated
  USING (is_org_member(org_id));

CREATE POLICY "webhook_configs_insert_admin"
  ON webhook_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (is_org_admin(org_id));

CREATE POLICY "webhook_configs_update_admin"
  ON webhook_configs
  FOR UPDATE
  TO authenticated
  USING (is_org_admin(org_id))
  WITH CHECK (is_org_admin(org_id));

CREATE POLICY "webhook_configs_delete_admin"
  ON webhook_configs
  FOR DELETE
  TO authenticated
  USING (is_org_admin(org_id));

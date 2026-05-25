-- ============================================================
-- NexusOS - Migration 006: WhatsApp Module
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE whatsapp_provider AS ENUM (
  'twilio',
  'meta'
);

CREATE TYPE conversation_status AS ENUM (
  'active',
  'waiting_agent',
  'resolved',
  'closed'
);

CREATE TYPE message_direction AS ENUM (
  'inbound',
  'outbound'
);

CREATE TYPE message_type AS ENUM (
  'text',
  'image',
  'audio',
  'video',
  'document',
  'template'
);

CREATE TYPE message_status AS ENUM (
  'sent',
  'delivered',
  'read',
  'failed'
);

CREATE TYPE template_category AS ENUM (
  'utility',
  'marketing',
  'authentication'
);

CREATE TYPE template_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- ============================================================
-- TABLE: whatsapp_configs
-- ============================================================

CREATE TABLE whatsapp_configs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider            whatsapp_provider NOT NULL DEFAULT 'meta',
  account_sid         text,
  auth_token_encrypted text,
  phone_number        text NOT NULL,
  is_active           boolean NOT NULL DEFAULT false,
  webhook_url         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

CREATE TRIGGER trg_whatsapp_configs_updated_at
  BEFORE UPDATE ON whatsapp_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: conversation_flows
-- ============================================================

CREATE TABLE conversation_flows (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  description       text,
  trigger_keywords  text[] DEFAULT '{}',
  flow_data         jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  is_active         boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_conversation_flows_updated_at
  BEFORE UPDATE ON conversation_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_conversation_flows_org_id ON conversation_flows(org_id);

-- ============================================================
-- TABLE: contacts
-- ============================================================

CREATE TABLE contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number  text NOT NULL,
  name          text,
  email         text,
  tags          text[] DEFAULT '{}',
  custom_fields jsonb DEFAULT '{}',
  opt_in        boolean NOT NULL DEFAULT false,
  opted_in_at   timestamptz,
  opted_out_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, phone_number)
);

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_contacts_org_id ON contacts(org_id);
CREATE INDEX idx_contacts_phone_number ON contacts(org_id, phone_number);

-- ============================================================
-- TABLE: conversations
-- ============================================================

CREATE TABLE conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status          conversation_status NOT NULL DEFAULT 'active',
  assigned_to     uuid REFERENCES auth.users(id),
  flow_id         uuid REFERENCES conversation_flows(id) ON DELETE SET NULL,
  current_node_id text,
  context         jsonb DEFAULT '{}',
  started_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_conversations_org_id ON conversations(org_id);
CREATE INDEX idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX idx_conversations_status ON conversations(org_id, status);

-- ============================================================
-- TABLE: messages
-- ============================================================

CREATE TABLE messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  direction           message_direction NOT NULL,
  content             text,
  type                message_type NOT NULL DEFAULT 'text',
  media_url           text,
  provider_message_id text,
  status              message_status NOT NULL DEFAULT 'sent',
  sent_at             timestamptz,
  delivered_at        timestamptz,
  read_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_org_id ON messages(org_id);
CREATE INDEX idx_messages_provider_id ON messages(provider_message_id);

-- ============================================================
-- TABLE: whatsapp_templates
-- ============================================================

CREATE TABLE whatsapp_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       text NOT NULL,
  language   text NOT NULL DEFAULT 'pt_BR',
  category   template_category NOT NULL DEFAULT 'utility',
  body_text  text NOT NULL,
  header     jsonb,
  footer     text,
  buttons    jsonb DEFAULT '[]',
  status     template_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_templates_org_id ON whatsapp_templates(org_id);

-- ============================================================
-- TABLE: whatsapp_metrics
-- ============================================================

CREATE TABLE whatsapp_metrics (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date                     date NOT NULL,
  total_conversations      integer NOT NULL DEFAULT 0,
  resolved_conversations   integer NOT NULL DEFAULT 0,
  avg_resolution_minutes   numeric(8, 2),
  total_messages_sent      integer NOT NULL DEFAULT 0,
  total_messages_received  integer NOT NULL DEFAULT 0,
  bot_handled              integer NOT NULL DEFAULT 0,
  agent_handled            integer NOT NULL DEFAULT 0,
  conversions              integer NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, date)
);

CREATE INDEX idx_whatsapp_metrics_org_id ON whatsapp_metrics(org_id, date DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE whatsapp_configs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_flows  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_metrics    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_configs_org_member" ON whatsapp_configs FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "conversation_flows_org_member" ON conversation_flows FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "contacts_org_member" ON contacts FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "conversations_org_member" ON conversations FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "messages_org_member" ON messages FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "whatsapp_templates_org_member" ON whatsapp_templates FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "whatsapp_metrics_org_member" ON whatsapp_metrics FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

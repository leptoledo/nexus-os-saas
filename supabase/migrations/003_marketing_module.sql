-- ============================================================
-- NexusOS - Migration 003: Marketing Module
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE lead_stage AS ENUM (
  'new',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost'
);

CREATE TYPE activity_type AS ENUM (
  'call',
  'email',
  'meeting',
  'note'
);

CREATE TYPE campaign_status AS ENUM (
  'draft',
  'scheduled',
  'sending',
  'sent',
  'paused'
);

CREATE TYPE recipient_status AS ENUM (
  'pending',
  'sent',
  'opened',
  'clicked',
  'bounced',
  'unsubscribed'
);

CREATE TYPE content_platform AS ENUM (
  'instagram',
  'linkedin',
  'facebook',
  'twitter'
);

CREATE TYPE content_status AS ENUM (
  'draft',
  'scheduled',
  'published',
  'failed'
);

-- ============================================================
-- TABLE: leads
-- ============================================================

CREATE TABLE leads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  email            text,
  phone            text,
  company          text,
  stage            lead_stage NOT NULL DEFAULT 'new',
  score            integer CHECK (score >= 0 AND score <= 100) DEFAULT 0,
  value_estimated  numeric(12, 2),
  source           text,
  assignee_id      uuid REFERENCES auth.users(id),
  notes            text,
  custom_fields    jsonb DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_leads_org_id ON leads(org_id);
CREATE INDEX idx_leads_stage ON leads(org_id, stage);
CREATE INDEX idx_leads_assignee ON leads(assignee_id);

-- ============================================================
-- TABLE: lead_activities
-- ============================================================

CREATE TABLE lead_activities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  type         activity_type NOT NULL,
  description  text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_org_id ON lead_activities(org_id);

-- ============================================================
-- TABLE: email_campaigns
-- ============================================================

CREATE TABLE email_campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  subject          text NOT NULL,
  body_html        text,
  body_text        text,
  status           campaign_status NOT NULL DEFAULT 'draft',
  segment_filters  jsonb DEFAULT '{}',
  scheduled_at     timestamptz,
  sent_at          timestamptz,
  stats            jsonb DEFAULT '{"total_sent":0,"opens":0,"clicks":0,"bounces":0,"unsubscribes":0}',
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_email_campaigns_org_id ON email_campaigns(org_id);

-- ============================================================
-- TABLE: campaign_recipients
-- ============================================================

CREATE TABLE campaign_recipients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email        text NOT NULL,
  name         text,
  status       recipient_status NOT NULL DEFAULT 'pending',
  sent_at      timestamptz,
  opened_at    timestamptz,
  clicked_at   timestamptz
);

CREATE INDEX idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_org_id ON campaign_recipients(org_id);

-- ============================================================
-- TABLE: content_calendar
-- ============================================================

CREATE TABLE content_calendar (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title         text NOT NULL,
  content       text,
  platform      content_platform NOT NULL,
  status        content_status NOT NULL DEFAULT 'draft',
  scheduled_at  timestamptz,
  published_at  timestamptz,
  media_urls    text[] DEFAULT '{}',
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_calendar_org_id ON content_calendar(org_id);
CREATE INDEX idx_content_calendar_scheduled_at ON content_calendar(org_id, scheduled_at);

-- ============================================================
-- TABLE: landing_pages
-- ============================================================

CREATE TABLE landing_pages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title             text NOT NULL,
  slug              text NOT NULL,
  content           jsonb DEFAULT '{}',
  is_published      boolean NOT NULL DEFAULT false,
  views_count       integer NOT NULL DEFAULT 0,
  conversions_count integer NOT NULL DEFAULT 0,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, slug)
);

CREATE TRIGGER trg_landing_pages_updated_at
  BEFORE UPDATE ON landing_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_landing_pages_org_id ON landing_pages(org_id);

-- ============================================================
-- TABLE: form_submissions
-- ============================================================

CREATE TABLE form_submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id  uuid NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  data             jsonb NOT NULL DEFAULT '{}',
  ip_address       inet,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_submissions_landing_page_id ON form_submissions(landing_page_id);
CREATE INDEX idx_form_submissions_org_id ON form_submissions(org_id);

-- ============================================================
-- TABLE: seo_keywords
-- ============================================================

CREATE TABLE seo_keywords (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  keyword           text NOT NULL,
  target_url        text,
  current_position  integer,
  best_position     integer,
  monthly_volume    integer,
  last_checked_at   timestamptz,
  history           jsonb DEFAULT '[]',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_keywords_org_id ON seo_keywords(org_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar    ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords        ENABLE ROW LEVEL SECURITY;

-- leads
CREATE POLICY "leads_org_member" ON leads FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- lead_activities
CREATE POLICY "lead_activities_org_member" ON lead_activities FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- email_campaigns
CREATE POLICY "email_campaigns_org_member" ON email_campaigns FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- campaign_recipients
CREATE POLICY "campaign_recipients_org_member" ON campaign_recipients FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- content_calendar
CREATE POLICY "content_calendar_org_member" ON content_calendar FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- landing_pages
CREATE POLICY "landing_pages_org_member" ON landing_pages FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

-- form_submissions: public INSERT (landing page visitors), org member SELECT
CREATE POLICY "form_submissions_select_org" ON form_submissions FOR SELECT TO authenticated
  USING (is_org_member(org_id));

CREATE POLICY "form_submissions_insert_public" ON form_submissions FOR INSERT
  WITH CHECK (true);

-- seo_keywords
CREATE POLICY "seo_keywords_org_member" ON seo_keywords FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

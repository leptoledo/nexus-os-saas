-- ============================================================
-- NexusOS - Migration 005: Analytics Module
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE widget_type AS ENUM (
  'line',
  'bar',
  'pie',
  'area',
  'funnel',
  'table',
  'kpi',
  'sparkline'
);

CREATE TYPE data_source_type AS ENUM (
  'csv',
  'excel',
  'api_rest',
  'internal'
);

CREATE TYPE report_format AS ENUM (
  'pdf',
  'excel',
  'both'
);

CREATE TYPE alert_condition AS ENUM (
  'gt',
  'lt',
  'eq',
  'gte',
  'lte'
);

CREATE TYPE insight_type AS ENUM (
  'summary',
  'anomaly',
  'forecast',
  'recommendation'
);

-- ============================================================
-- TABLE: analytics_dashboards
-- ============================================================

CREATE TABLE analytics_dashboards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  is_default  boolean NOT NULL DEFAULT false,
  layout      jsonb DEFAULT '{}',
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_analytics_dashboards_updated_at
  BEFORE UPDATE ON analytics_dashboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_analytics_dashboards_org_id ON analytics_dashboards(org_id);

-- Ensure only one default dashboard per org
CREATE UNIQUE INDEX idx_analytics_dashboards_default
  ON analytics_dashboards(org_id)
  WHERE is_default = true;

-- ============================================================
-- TABLE: dashboard_widgets
-- ============================================================

CREATE TABLE dashboard_widgets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES analytics_dashboards(id) ON DELETE CASCADE,
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title        text NOT NULL,
  type         widget_type NOT NULL,
  config       jsonb DEFAULT '{}',
  position     jsonb DEFAULT '{"x":0,"y":0,"w":4,"h":3}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_dashboard_widgets_org_id ON dashboard_widgets(org_id);

-- ============================================================
-- TABLE: data_sources
-- ============================================================

CREATE TABLE data_sources (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  type              data_source_type NOT NULL,
  connection_config jsonb DEFAULT '{}', -- store encrypted or reference to secrets
  last_synced_at    timestamptz,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_sources_org_id ON data_sources(org_id);

-- ============================================================
-- TABLE: imported_data
-- ============================================================

CREATE TABLE imported_data (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id uuid NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_name     text NOT NULL,
  schema         jsonb DEFAULT '{}',
  row_count      integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_imported_data_data_source_id ON imported_data(data_source_id);
CREATE INDEX idx_imported_data_org_id ON imported_data(org_id);

-- ============================================================
-- TABLE: scheduled_reports
-- ============================================================

CREATE TABLE scheduled_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          text NOT NULL,
  dashboard_id  uuid REFERENCES analytics_dashboards(id) ON DELETE SET NULL,
  schedule_cron text NOT NULL,
  recipients    jsonb DEFAULT '[]',
  format        report_format NOT NULL DEFAULT 'pdf',
  last_run_at   timestamptz,
  next_run_at   timestamptz,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  is_active     boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_scheduled_reports_org_id ON scheduled_reports(org_id);
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;

-- ============================================================
-- TABLE: analytics_alerts
-- ============================================================

CREATE TABLE analytics_alerts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  metric                text NOT NULL,
  condition             alert_condition NOT NULL,
  threshold_value       numeric NOT NULL,
  notification_channels jsonb DEFAULT '[]',
  is_active             boolean NOT NULL DEFAULT true,
  last_triggered_at     timestamptz,
  created_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_alerts_org_id ON analytics_alerts(org_id);

-- ============================================================
-- TABLE: ai_insights
-- ============================================================

CREATE TABLE ai_insights (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type         insight_type NOT NULL,
  content      text NOT NULL,
  data         jsonb DEFAULT '{}',
  period_start date,
  period_end   date,
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_insights_org_id ON ai_insights(org_id);
CREATE INDEX idx_ai_insights_unread ON ai_insights(org_id, is_read) WHERE is_read = false;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources          ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_data         ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_alerts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_dashboards_org_member" ON analytics_dashboards FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "dashboard_widgets_org_member" ON dashboard_widgets FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "data_sources_org_member" ON data_sources FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "imported_data_org_member" ON imported_data FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "scheduled_reports_org_member" ON scheduled_reports FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "analytics_alerts_org_member" ON analytics_alerts FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "ai_insights_org_member" ON ai_insights FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

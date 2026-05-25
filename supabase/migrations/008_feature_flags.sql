-- ============================================================
-- NexusOS - Migration 008: Feature Flags
-- ============================================================

CREATE TABLE feature_flags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text NOT NULL UNIQUE,
  starter      boolean NOT NULL DEFAULT false,
  pro          boolean NOT NULL DEFAULT false,
  business     boolean NOT NULL DEFAULT true,
  description  text
);

-- ============================================================
-- SEED: Feature flags per plan
-- ============================================================

INSERT INTO feature_flags (feature_name, starter, pro, business, description) VALUES

  -- Marketing CRM
  ('marketing_crm',               true,  true,  true,  'CRM de leads e pipeline de vendas'),
  ('marketing_campaigns',         false, true,  true,  'Campanhas de email marketing'),
  ('marketing_calendar',          false, true,  true,  'Calendário editorial de conteúdo'),
  ('marketing_seo',               false, false, true,  'Monitorização de keywords SEO'),

  -- Projects
  ('projects_kanban',             true,  true,  true,  'Boards Kanban para gestão de tarefas'),
  ('projects_gantt',              false, true,  true,  'Diagrama de Gantt e timeline'),
  ('projects_sprints',            false, true,  true,  'Sprints e metodologia Agile'),
  ('projects_okrs',               false, true,  true,  'OKRs e objetivos estratégicos'),
  ('projects_time_tracking',      false, true,  true,  'Registo de tempo por tarefa'),

  -- Analytics & BI
  ('analytics_bi',                true,  true,  true,  'Dashboards de BI e métricas base'),
  ('analytics_ai_insights',       false, true,  true,  'Insights gerados por IA'),
  ('analytics_forecasting',       false, false, true,  'Previsões e análise preditiva'),
  ('analytics_scheduled_reports', false, true,  true,  'Relatórios agendados automáticos'),

  -- WhatsApp
  ('whatsapp_bot',                false, true,  true,  'Bot de WhatsApp com flows automáticos'),
  ('whatsapp_flows',              false, true,  true,  'Editor visual de fluxos de conversa'),

  -- Platform
  ('api_access',                  false, true,  true,  'Acesso à API REST pública'),
  ('webhooks',                    false, true,  true,  'Webhooks para integrações externas'),
  ('custom_domains',              false, false, true,  'Domínios personalizados para landing pages'),
  ('white_label',                 false, false, true,  'Remoção de branding NexusOS'),
  ('advanced_rbac',               false, false, true,  'Controlo de acesso granular por papel'),
  ('sso',                         false, false, true,  'Single Sign-On (SAML/OIDC)'),
  ('priority_support',            false, false, true,  'Suporte prioritário com SLA garantido');

-- ============================================================
-- FUNCTION: check if org has access to a feature
-- ============================================================

CREATE OR REPLACE FUNCTION org_has_feature(p_org_id uuid, p_feature_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN o.plan = 'starter'  THEN ff.starter
    WHEN o.plan = 'pro'      THEN ff.pro
    WHEN o.plan = 'business' THEN ff.business
    ELSE false
  END
  FROM organizations o
  CROSS JOIN feature_flags ff
  WHERE o.id = p_org_id
    AND ff.feature_name = p_feature_name;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Feature flags are readable by all authenticated users
CREATE POLICY "feature_flags_select_authenticated"
  ON feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can modify feature flags

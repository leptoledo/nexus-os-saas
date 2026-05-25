-- ============================================================
-- NexusOS - Migration 009: RLS Hardening & RBAC Policies
-- ============================================================

-- ============================================================
-- 1. HELPER FUNCTIONS
-- ============================================================

-- Returns true if the current user is a manager or admin of the given org
CREATE OR REPLACE FUNCTION is_org_write_allowed(org_id uuid)
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
      AND organization_members.role IN ('admin', 'manager')
      AND organization_members.is_active = true
  );
$$;

-- Returns true if the form submission landing page exists, is published, and matches the org_id
CREATE OR REPLACE FUNCTION is_valid_form_submission(landing_page_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM landing_pages
    WHERE landing_pages.id = $1
      AND landing_pages.org_id = $2
      AND landing_pages.is_published = true
  );
$$;


-- ============================================================
-- 2. HARDENING MARKETING MODULE
-- ============================================================

-- Table: leads
DROP POLICY IF EXISTS "leads_org_member" ON leads;
CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "leads_insert" ON leads FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "leads_update" ON leads FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "leads_delete" ON leads FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: lead_activities
DROP POLICY IF EXISTS "lead_activities_org_member" ON lead_activities;
CREATE POLICY "lead_activities_select" ON lead_activities FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "lead_activities_insert" ON lead_activities FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "lead_activities_update" ON lead_activities FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "lead_activities_delete" ON lead_activities FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: email_campaigns
DROP POLICY IF EXISTS "email_campaigns_org_member" ON email_campaigns;
CREATE POLICY "email_campaigns_select" ON email_campaigns FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "email_campaigns_insert" ON email_campaigns FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "email_campaigns_update" ON email_campaigns FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "email_campaigns_delete" ON email_campaigns FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: campaign_recipients
DROP POLICY IF EXISTS "campaign_recipients_org_member" ON campaign_recipients;
CREATE POLICY "campaign_recipients_select" ON campaign_recipients FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "campaign_recipients_insert" ON campaign_recipients FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "campaign_recipients_update" ON campaign_recipients FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "campaign_recipients_delete" ON campaign_recipients FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: content_calendar
DROP POLICY IF EXISTS "content_calendar_org_member" ON content_calendar;
CREATE POLICY "content_calendar_select" ON content_calendar FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "content_calendar_insert" ON content_calendar FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "content_calendar_update" ON content_calendar FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "content_calendar_delete" ON content_calendar FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: landing_pages
DROP POLICY IF EXISTS "landing_pages_org_member" ON landing_pages;
CREATE POLICY "landing_pages_select" ON landing_pages FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "landing_pages_insert" ON landing_pages FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "landing_pages_update" ON landing_pages FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "landing_pages_delete" ON landing_pages FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: seo_keywords
DROP POLICY IF EXISTS "seo_keywords_org_member" ON seo_keywords;
CREATE POLICY "seo_keywords_select" ON seo_keywords FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "seo_keywords_insert" ON seo_keywords FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "seo_keywords_update" ON seo_keywords FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "seo_keywords_delete" ON seo_keywords FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: form_submissions (Harden public insert)
DROP POLICY IF EXISTS "form_submissions_insert_public" ON form_submissions;
CREATE POLICY "form_submissions_insert_public" ON form_submissions FOR INSERT
  WITH CHECK (is_valid_form_submission(landing_page_id, org_id));


-- ============================================================
-- 3. HARDENING PROJECTS MODULE
-- ============================================================

-- Table: projects
DROP POLICY IF EXISTS "projects_org_member" ON projects;
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: project_members
DROP POLICY IF EXISTS "project_members_org_member" ON project_members;
CREATE POLICY "project_members_select" ON project_members FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "project_members_insert" ON project_members FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "project_members_update" ON project_members FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "project_members_delete" ON project_members FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: boards
DROP POLICY IF EXISTS "boards_org_member" ON boards;
CREATE POLICY "boards_select" ON boards FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "boards_insert" ON boards FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "boards_update" ON boards FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "boards_delete" ON boards FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: board_columns
DROP POLICY IF EXISTS "board_columns_org_member" ON board_columns;
CREATE POLICY "board_columns_select" ON board_columns FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "board_columns_insert" ON board_columns FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "board_columns_update" ON board_columns FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "board_columns_delete" ON board_columns FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: tasks
DROP POLICY IF EXISTS "tasks_org_member" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: task_comments
DROP POLICY IF EXISTS "task_comments_org_member" ON task_comments;
CREATE POLICY "task_comments_select" ON task_comments FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "task_comments_update" ON task_comments FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "task_comments_delete" ON task_comments FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: time_entries
DROP POLICY IF EXISTS "time_entries_org_member" ON time_entries;
CREATE POLICY "time_entries_select" ON time_entries FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "time_entries_insert" ON time_entries FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "time_entries_update" ON time_entries FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "time_entries_delete" ON time_entries FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: sprints
DROP POLICY IF EXISTS "sprints_org_member" ON sprints;
CREATE POLICY "sprints_select" ON sprints FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "sprints_insert" ON sprints FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "sprints_update" ON sprints FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "sprints_delete" ON sprints FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: sprint_tasks
DROP POLICY IF EXISTS "sprint_tasks_org_member" ON sprint_tasks;
CREATE POLICY "sprint_tasks_select" ON sprint_tasks FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "sprint_tasks_insert" ON sprint_tasks FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "sprint_tasks_update" ON sprint_tasks FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "sprint_tasks_delete" ON sprint_tasks FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: okrs
DROP POLICY IF EXISTS "okrs_org_member" ON okrs;
CREATE POLICY "okrs_select" ON okrs FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "okrs_insert" ON okrs FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "okrs_update" ON okrs FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "okrs_delete" ON okrs FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: task_dependencies
DROP POLICY IF EXISTS "task_dependencies_org_member" ON task_dependencies;
CREATE POLICY "task_dependencies_select" ON task_dependencies FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "task_dependencies_insert" ON task_dependencies FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "task_dependencies_update" ON task_dependencies FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "task_dependencies_delete" ON task_dependencies FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));


-- ============================================================
-- 4. HARDENING ANALYTICS MODULE
-- ============================================================

-- Table: analytics_dashboards
DROP POLICY IF EXISTS "analytics_dashboards_org_member" ON analytics_dashboards;
CREATE POLICY "analytics_dashboards_select" ON analytics_dashboards FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "analytics_dashboards_insert" ON analytics_dashboards FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "analytics_dashboards_update" ON analytics_dashboards FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "analytics_dashboards_delete" ON analytics_dashboards FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: dashboard_widgets
DROP POLICY IF EXISTS "dashboard_widgets_org_member" ON dashboard_widgets;
CREATE POLICY "dashboard_widgets_select" ON dashboard_widgets FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "dashboard_widgets_insert" ON dashboard_widgets FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "dashboard_widgets_update" ON dashboard_widgets FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "dashboard_widgets_delete" ON dashboard_widgets FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: data_sources
DROP POLICY IF EXISTS "data_sources_org_member" ON data_sources;
CREATE POLICY "data_sources_select" ON data_sources FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "data_sources_insert" ON data_sources FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "data_sources_update" ON data_sources FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "data_sources_delete" ON data_sources FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: imported_data
DROP POLICY IF EXISTS "imported_data_org_member" ON imported_data;
CREATE POLICY "imported_data_select" ON imported_data FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "imported_data_insert" ON imported_data FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "imported_data_update" ON imported_data FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "imported_data_delete" ON imported_data FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: scheduled_reports
DROP POLICY IF EXISTS "scheduled_reports_org_member" ON scheduled_reports;
CREATE POLICY "scheduled_reports_select" ON scheduled_reports FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "scheduled_reports_insert" ON scheduled_reports FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "scheduled_reports_update" ON scheduled_reports FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "scheduled_reports_delete" ON scheduled_reports FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: analytics_alerts
DROP POLICY IF EXISTS "analytics_alerts_org_member" ON analytics_alerts;
CREATE POLICY "analytics_alerts_select" ON analytics_alerts FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "analytics_alerts_insert" ON analytics_alerts FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "analytics_alerts_update" ON analytics_alerts FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "analytics_alerts_delete" ON analytics_alerts FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: ai_insights (Select only, no write access)
DROP POLICY IF EXISTS "ai_insights_org_member" ON ai_insights;
CREATE POLICY "ai_insights_select" ON ai_insights FOR SELECT TO authenticated
  USING (is_org_member(org_id));


-- ============================================================
-- 5. HARDENING WHATSAPP CONFIGS & TEMPLATES
-- ============================================================

-- Table: whatsapp_configs
DROP POLICY IF EXISTS "whatsapp_configs_org_member" ON whatsapp_configs;
CREATE POLICY "whatsapp_configs_select" ON whatsapp_configs FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "whatsapp_configs_insert" ON whatsapp_configs FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "whatsapp_configs_update" ON whatsapp_configs FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "whatsapp_configs_delete" ON whatsapp_configs FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: conversation_flows
DROP POLICY IF EXISTS "conversation_flows_org_member" ON conversation_flows;
CREATE POLICY "conversation_flows_select" ON conversation_flows FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "conversation_flows_insert" ON conversation_flows FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "conversation_flows_update" ON conversation_flows FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "conversation_flows_delete" ON conversation_flows FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: whatsapp_templates
DROP POLICY IF EXISTS "whatsapp_templates_org_member" ON whatsapp_templates;
CREATE POLICY "whatsapp_templates_select" ON whatsapp_templates FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "whatsapp_templates_insert" ON whatsapp_templates FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "whatsapp_templates_update" ON whatsapp_templates FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "whatsapp_templates_delete" ON whatsapp_templates FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

-- Table: whatsapp_metrics
DROP POLICY IF EXISTS "whatsapp_metrics_org_member" ON whatsapp_metrics;
CREATE POLICY "whatsapp_metrics_select" ON whatsapp_metrics FOR SELECT TO authenticated
  USING (is_org_member(org_id));
CREATE POLICY "whatsapp_metrics_insert" ON whatsapp_metrics FOR INSERT TO authenticated
  WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "whatsapp_metrics_update" ON whatsapp_metrics FOR UPDATE TO authenticated
  USING (is_org_write_allowed(org_id)) WITH CHECK (is_org_write_allowed(org_id));
CREATE POLICY "whatsapp_metrics_delete" ON whatsapp_metrics FOR DELETE TO authenticated
  USING (is_org_write_allowed(org_id));

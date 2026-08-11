-- ============================================================
-- NexusOS - Seed Data
-- Example organizations, users, projects, leads, campaigns
-- and dashboards for development/demo purposes.
--
-- NOTE: Run AFTER all migrations.
-- User passwords are 'Password123!' for all seed users.
-- ============================================================

-- ============================================================
-- SEED: Auth Users (via auth.users)
-- ============================================================

-- Tech Startup org users
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES
  -- Admin: Ana Silva
  (
    'a1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'ana.silva@nexusdemo.pt',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"full_name":"Ana Silva","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Ana"}',
    now(), now(), '', '', '', ''
  ),
  -- Manager: Bruno Costa
  (
    'a1000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'bruno.costa@nexusdemo.pt',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"full_name":"Bruno Costa","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Bruno"}',
    now(), now(), '', '', '', ''
  ),
  -- Viewer: Catarina Lopes
  (
    'a1000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'catarina.lopes@nexusdemo.pt',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"full_name":"Catarina Lopes","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Catarina"}',
    now(), now(), '', '', '', ''
  ),

  -- Retail org users
  -- Admin: Daniel Ferreira
  (
    'a2000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'daniel.ferreira@retaildemo.pt',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"full_name":"Daniel Ferreira","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel"}',
    now(), now(), '', '', '', ''
  ),
  -- Manager: Elisa Martins
  (
    'a2000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'elisa.martins@retaildemo.pt',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"full_name":"Elisa Martins","avatar_url":"https://api.dicebear.com/7.x/avataaars/svg?seed=Elisa"}',
    now(), now(), '', '', '', ''
  );

-- ============================================================
-- SEED: User Profiles (trigger should handle this,
-- but inserting manually for seed reliability)
-- ============================================================

INSERT INTO user_profiles (id, full_name, avatar_url, email, language) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Ana Silva',       'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',      'ana.silva@nexusdemo.pt',       'pt'),
  ('a1000000-0000-0000-0000-000000000002', 'Bruno Costa',     'https://api.dicebear.com/7.x/avataaars/svg?seed=Bruno',    'bruno.costa@nexusdemo.pt',     'pt'),
  ('a1000000-0000-0000-0000-000000000003', 'Catarina Lopes',  'https://api.dicebear.com/7.x/avataaars/svg?seed=Catarina', 'catarina.lopes@nexusdemo.pt',  'pt'),
  ('a2000000-0000-0000-0000-000000000001', 'Daniel Ferreira', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel',   'daniel.ferreira@retaildemo.pt','pt'),
  ('a2000000-0000-0000-0000-000000000002', 'Elisa Martins',   'https://api.dicebear.com/7.x/avataaars/svg?seed=Elisa',    'elisa.martins@retaildemo.pt',  'pt')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: Organizations
-- ============================================================

INSERT INTO organizations (
  id, name, slug, sector, plan, subscription_status,
  onboarding_completed, timezone
) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'NexusDemo Tech',
    'nexusdemo-tech',
    'technology',
    'pro',
    'active',
    true,
    'Europe/Lisbon'
  ),
  (
    'b2000000-0000-0000-0000-000000000001',
    'RetailDemo Store',
    'retaildemo-store',
    'retail',
    'starter',
    'active',
    false,
    'Europe/Lisbon'
  );

-- ============================================================
-- SEED: Organization Members
-- ============================================================

-- NexusDemo Tech members
INSERT INTO organization_members (id, org_id, user_id, role, joined_at, is_active) VALUES
  (gen_random_uuid(), 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'admin',   now(), true),
  (gen_random_uuid(), 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'manager', now(), true),
  (gen_random_uuid(), 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'viewer',  now(), true);

-- RetailDemo Store members
INSERT INTO organization_members (id, org_id, user_id, role, joined_at, is_active) VALUES
  (gen_random_uuid(), 'b2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'admin',   now(), true),
  (gen_random_uuid(), 'b2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'manager', now(), true);

-- ============================================================
-- SEED: Onboarding Steps (NexusDemo Tech - completed)
-- ============================================================

INSERT INTO onboarding_steps (org_id, step_name, completed, completed_at, data) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'create_organization', true, now() - interval '30 days', '{"skipped":false}'),
  ('b1000000-0000-0000-0000-000000000001', 'invite_team',         true, now() - interval '29 days', '{"members_invited":2}'),
  ('b1000000-0000-0000-0000-000000000001', 'setup_first_project', true, now() - interval '28 days', '{"project_name":"Plataforma NexusOS"}'),
  ('b1000000-0000-0000-0000-000000000001', 'connect_whatsapp',    true, now() - interval '25 days', '{"provider":"meta"}'),
  ('b1000000-0000-0000-0000-000000000001', 'setup_pipeline',      true, now() - interval '20 days', '{"leads_added":5}');

-- RetailDemo - partially completed
INSERT INTO onboarding_steps (org_id, step_name, completed, completed_at) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'create_organization', true, now() - interval '5 days'),
  ('b2000000-0000-0000-0000-000000000001', 'invite_team',         false, null),
  ('b2000000-0000-0000-0000-000000000001', 'setup_first_project', false, null),
  ('b2000000-0000-0000-0000-000000000001', 'connect_whatsapp',    false, null),
  ('b2000000-0000-0000-0000-000000000001', 'setup_pipeline',      false, null);

-- ============================================================
-- SEED: Projects (NexusDemo Tech)
-- ============================================================

INSERT INTO projects (id, org_id, name, description, status, priority, start_date, end_date, budget, created_by) VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Plataforma NexusOS v2',
    'Desenvolvimento da segunda versão da plataforma com módulo de IA e WhatsApp avançado',
    'active', 'critical',
    current_date - interval '60 days',
    current_date + interval '90 days',
    85000.00,
    'a1000000-0000-0000-0000-000000000001'
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'Campanha de Lançamento Q2',
    'Estratégia de marketing para o lançamento do produto no segundo trimestre',
    'active', 'high',
    current_date - interval '14 days',
    current_date + interval '45 days',
    12000.00,
    'a1000000-0000-0000-0000-000000000002'
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    'Migração para Cloud',
    'Migração da infraestrutura para AWS com zero downtime',
    'planning', 'medium',
    current_date + interval '30 days',
    current_date + interval '120 days',
    35000.00,
    'a1000000-0000-0000-0000-000000000001'
  );

-- Project members
INSERT INTO project_members (project_id, org_id, user_id, role) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'owner'),
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'member'),
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'viewer'),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'owner');

-- ============================================================
-- SEED: Boards & Columns for NexusOS v2
-- ============================================================

INSERT INTO boards (id, project_id, org_id, name) VALUES
  (
    'd1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Sprint Board'
  );

INSERT INTO board_columns (id, board_id, org_id, name, position, color) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Backlog',     0, '#6b7280'),
  ('e1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'A Fazer',     1, '#3b82f6'),
  ('e1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Em Progresso', 2, '#f59e0b'),
  ('e1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Em Revisão',  3, '#8b5cf6'),
  ('e1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Concluído',   4, '#10b981');

-- ============================================================
-- SEED: Tasks
-- ============================================================

INSERT INTO tasks (id, board_id, column_id, org_id, project_id, title, description, priority, status, assignee_id, reporter_id, position, story_points, due_date) VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Implementar módulo de IA Insights',
    'Desenvolver a edge function e UI para geração de insights com GPT-4',
    'critical', 'in_progress',
    'a1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    0, 13,
    current_date + interval '7 days'
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Editor visual de flows WhatsApp',
    'Criar componente React Flow para edição visual de fluxos de chatbot',
    'high', 'todo',
    'a1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    0, 8,
    current_date + interval '14 days'
  ),
  (
    'f1000000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'RLS policies para todos os módulos',
    'Implementar e testar todas as políticas RLS do schema',
    'critical', 'review',
    'a1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    0, 5,
    current_date + interval '2 days'
  ),
  (
    'f1000000-0000-0000-0000-000000000004',
    'd1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Setup Supabase Auth com SSO',
    'Configurar autenticação com Google OAuth e magic links',
    'high', 'done',
    'a1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    0, 5, null
  ),
  (
    'f1000000-0000-0000-0000-000000000005',
    'd1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Dashboard de Analytics responsivo',
    'Adaptar todos os widgets do dashboard para mobile e tablet',
    'medium', 'backlog',
    'a1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000002',
    0, 8,
    current_date + interval '21 days'
  ),
  (
    'f1000000-0000-0000-0000-000000000006',
    'd1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Integração Stripe Billing',
    'Implementar checkout, webhooks e portal do cliente com Stripe',
    'critical', 'in_progress',
    'a1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    1, 13,
    current_date + interval '10 days'
  );

-- ============================================================
-- SEED: Sprint
-- ============================================================

INSERT INTO sprints (id, project_id, org_id, name, goal, status, start_date, end_date, velocity) VALUES
  (
    '11000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Sprint 3 - Módulos Core',
    'Finalizar IA Insights, WhatsApp Flows e Billing antes do lançamento beta',
    'active',
    current_date - interval '7 days',
    current_date + interval '7 days',
    34
  );

INSERT INTO sprint_tasks (sprint_id, task_id, org_id) VALUES
  ('11000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('11000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001'),
  ('11000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001'),
  ('11000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001');

-- ============================================================
-- SEED: OKRs
-- ============================================================

INSERT INTO okrs (id, org_id, project_id, title, description, type, progress, owner_id, period_start, period_end) VALUES
  (
    '21000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Lançar NexusOS v2 com sucesso no Q2',
    'Entregar a plataforma com todos os módulos core funcionais e pelo menos 50 clientes beta',
    'objective',
    35,
    'a1000000-0000-0000-0000-000000000001',
    date_trunc('quarter', current_date)::date,
    (date_trunc('quarter', current_date) + interval '3 months - 1 day')::date
  ),
  (
    '21000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Atingir 50 clientes beta ativos',
    'Recrutar e onboar 50 empresas no programa beta com NPS > 7',
    'key_result',
    20,
    'a1000000-0000-0000-0000-000000000002',
    date_trunc('quarter', current_date)::date,
    (date_trunc('quarter', current_date) + interval '3 months - 1 day')::date
  ),
  (
    '21000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Completar 100% dos módulos core',
    'Marketing CRM, Projetos Kanban, Analytics BI e WhatsApp Bot funcionais',
    'key_result',
    65,
    'a1000000-0000-0000-0000-000000000001',
    date_trunc('quarter', current_date)::date,
    (date_trunc('quarter', current_date) + interval '3 months - 1 day')::date
  );

-- Link KRs to the objective
UPDATE okrs SET parent_id = '21000000-0000-0000-0000-000000000001'
WHERE id IN (
  '21000000-0000-0000-0000-000000000002',
  '21000000-0000-0000-0000-000000000003'
);

-- ============================================================
-- SEED: Leads (NexusDemo Tech)
-- ============================================================

INSERT INTO leads (org_id, name, email, phone, company, stage, score, value_estimated, source, assignee_id, notes) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'TechStart Lda',        'ceo@techstart.pt',       '+351911000001', 'TechStart',       'proposal',     82, 18000.00, 'linkedin',    'a1000000-0000-0000-0000-000000000002', 'Empresa de 15 pessoas interessada no plano Pro. Demo agendada para a próxima semana.'),
  ('b1000000-0000-0000-0000-000000000001', 'LogiFlow SA',          'ops@logiflow.pt',         '+351922000002', 'LogiFlow',        'qualified',    65, 36000.00, 'referral',    'a1000000-0000-0000-0000-000000000002', 'Empresa de logística com interesse em automação WhatsApp. Contato via parceiro.'),
  ('b1000000-0000-0000-0000-000000000001', 'HealthCare Plus',      'ti@healthcareplus.pt',    '+351933000003', 'HealthCare Plus', 'negotiation',  91, 72000.00, 'website',     'a1000000-0000-0000-0000-000000000001', 'Empresa de saúde com 200+ funcionários. Negociação avançada para Business plan anual.'),
  ('b1000000-0000-0000-0000-000000000001', 'Retail360',            'cto@retail360.pt',        '+351944000004', 'Retail360',       'closed_won',   95, 24000.00, 'event',       'a1000000-0000-0000-0000-000000000002', 'Fechado no Web Summit. Integração em curso.'),
  ('b1000000-0000-0000-0000-000000000001', 'ServicePro',           'info@servicepro.pt',      '+351955000005', 'ServicePro',      'new',          30,  9600.00, 'ads_google',  'a1000000-0000-0000-0000-000000000002', 'Lead frio de campanha Google Ads. Aguarda primeiro contacto.'),
  ('b1000000-0000-0000-0000-000000000001', 'DigitalAgency XYZ',    'hello@digitalagency.pt',  '+351966000006', 'DigitalAgency',   'proposal',     75, 15000.00, 'instagram',   'a1000000-0000-0000-0000-000000000002', 'Agência de marketing interessada em revenda. Proposta enviada.'),
  ('b1000000-0000-0000-0000-000000000001', 'Construção Moderna',   'geral@construcao.pt',     '+351977000007', 'Construção Mod.', 'closed_lost',  40, 12000.00, 'cold_outreach','a1000000-0000-0000-0000-000000000001', 'Optaram por solução concorrente. Possível revisita em Q4.'),
  ('b1000000-0000-0000-0000-000000000001', 'EduTech Portugal',     'parcerias@edutech.pt',    '+351988000008', 'EduTech',         'qualified',    70, 28000.00, 'linkedin',    'a1000000-0000-0000-0000-000000000002', 'Startup de edtech. Interesse nos módulos de projetos e analytics.');

-- ============================================================
-- SEED: Email Campaign (NexusDemo Tech)
-- ============================================================

INSERT INTO email_campaigns (
  id, org_id, name, subject, body_html, body_text, status,
  sent_at, stats, created_by
) VALUES (
  '31000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'Lançamento Beta NexusOS',
  'Seja um dos primeiros a experimentar o NexusOS v2 beta',
  '<h1>NexusOS v2 está chegando!</h1><p>Aceda já ao programa beta exclusivo...</p>',
  'NexusOS v2 está chegando! Aceda já ao programa beta exclusivo...',
  'sent',
  now() - interval '7 days',
  '{"total_sent":245,"opens":118,"clicks":67,"bounces":3,"unsubscribes":2}',
  'a1000000-0000-0000-0000-000000000002'
);

-- ============================================================
-- SEED: WhatsApp Config (NexusDemo Tech)
-- ============================================================

INSERT INTO whatsapp_configs (org_id, provider, phone_number, is_active, webhook_url) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'meta',
    '+351910000001',
    true,
    'https://app.nexusos.pt/api/webhooks/whatsapp/b1000000-0000-0000-0000-000000000001'
  );

-- ============================================================
-- SEED: Conversation Flow
-- ============================================================

INSERT INTO conversation_flows (
  id, org_id, name, description, trigger_keywords, flow_data, is_active, created_by
) VALUES (
  '41000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'Atendimento Inicial',
  'Flow de boas-vindas e triagem inicial de clientes',
  ARRAY['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi'],
  '{
    "nodes": [
      {"id": "start", "type": "trigger", "data": {"label": "Início", "keywords": ["oi","olá"]}},
      {"id": "welcome", "type": "message", "data": {"label": "Boas-vindas", "text": "Olá! Bem-vindo ao NexusOS. Como posso ajudar?\n1️⃣ Suporte técnico\n2️⃣ Informações comerciais\n3️⃣ Falar com um humano"}},
      {"id": "route", "type": "condition", "data": {"label": "Routing", "conditions": [{"value": "1", "next": "support"}, {"value": "2", "next": "sales"}, {"value": "3", "next": "human"}]}},
      {"id": "support", "type": "message", "data": {"label": "Suporte", "text": "A encaminhar para suporte técnico. Aguarde um momento..."}},
      {"id": "sales", "type": "message", "data": {"label": "Vendas", "text": "Excelente! Partilhe-me o seu email e um comercial entrará em contacto em breve."}},
      {"id": "human", "type": "handoff", "data": {"label": "Transferir para humano"}}
    ],
    "edges": [
      {"id": "e1", "source": "start", "target": "welcome"},
      {"id": "e2", "source": "welcome", "target": "route"},
      {"id": "e3", "source": "route", "target": "support", "label": "1"},
      {"id": "e4", "source": "route", "target": "sales", "label": "2"},
      {"id": "e5", "source": "route", "target": "human", "label": "3"}
    ]
  }',
  true,
  'a1000000-0000-0000-0000-000000000001'
);

-- ============================================================
-- SEED: WhatsApp Metrics (last 7 days)
-- ============================================================

INSERT INTO whatsapp_metrics (
  org_id, date, total_conversations, resolved_conversations,
  avg_resolution_minutes, total_messages_sent, total_messages_received,
  bot_handled, agent_handled, conversions
)
SELECT
  'b1000000-0000-0000-0000-000000000001',
  (current_date - i)::date,
  (15 + floor(random() * 20))::int,
  (10 + floor(random() * 15))::int,
  (8 + floor(random() * 22))::numeric,
  (40 + floor(random() * 60))::int,
  (30 + floor(random() * 50))::int,
  (8 + floor(random() * 12))::int,
  (5 + floor(random() * 8))::int,
  (1 + floor(random() * 5))::int
FROM generate_series(0, 6) AS i;

-- ============================================================
-- SEED: Analytics Dashboard (NexusDemo Tech)
-- ============================================================

INSERT INTO analytics_dashboards (
  id, org_id, name, description, is_default, layout, created_by
) VALUES (
  '51000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'Dashboard Principal',
  'Visão geral de todas as métricas do negócio',
  true,
  '{"cols": 12, "rowHeight": 60}',
  'a1000000-0000-0000-0000-000000000001'
);

-- Dashboard Widgets
INSERT INTO dashboard_widgets (
  dashboard_id, org_id, title, type, config, position
) VALUES
  (
    '51000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Pipeline de Vendas',
    'funnel',
    '{"metric": "leads_by_stage", "colors": ["#6366f1","#8b5cf6","#a78bfa","#c4b5fd","#ddd6fe"]}',
    '{"x":0,"y":0,"w":6,"h":4}'
  ),
  (
    '51000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Valor Total do Pipeline',
    'kpi',
    '{"metric": "pipeline_value", "format": "currency", "prefix": "€", "comparison": "last_month"}',
    '{"x":6,"y":0,"w":3,"h":2}'
  ),
  (
    '51000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Conversas WhatsApp',
    'kpi',
    '{"metric": "whatsapp_conversations", "comparison": "last_week"}',
    '{"x":9,"y":0,"w":3,"h":2}'
  ),
  (
    '51000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Tarefas por Estado',
    'bar',
    '{"metric": "tasks_by_status", "colors": ["#3b82f6","#f59e0b","#8b5cf6","#10b981"]}',
    '{"x":6,"y":2,"w":6,"h":4}'
  ),
  (
    '51000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Leads por Semana',
    'line',
    '{"metric": "leads_over_time", "period": "4w", "color": "#6366f1"}',
    '{"x":0,"y":4,"w":8,"h":4}'
  ),
  (
    '51000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Taxa de Resolução WhatsApp',
    'sparkline',
    '{"metric": "whatsapp_resolution_rate", "period": "7d", "color": "#10b981"}',
    '{"x":8,"y":4,"w":4,"h":4}'
  );

-- ============================================================
-- SEED: AI Insight (example)
-- ============================================================

INSERT INTO ai_insights (
  org_id, type, content, data, period_start, period_end, is_read
) VALUES (
  'b1000000-0000-0000-0000-000000000001',
  'summary',
  '{"headline":"Semana positiva com oportunidades de melhoria no WhatsApp","highlights":["Taxa de conversão de leads aumentou 12% face à semana anterior","Campanha de email atingiu 48% de open rate, acima da média do setor","Sprint 3 com 65% das tasks concluídas, no prazo previsto"],"concerns":["Tempo médio de resolução WhatsApp aumentou 18 minutos (38%)","3 tarefas críticas com prazo nos próximos 2 dias","Lead HealthCare Plus em negociação há 21 dias sem atualização"],"health_score":7.2,"health_justification":"Negócio saudável com bom momentum comercial, mas atenção ao suporte WhatsApp e velocidade de closing","summary":"Semana globalmente positiva. O pipeline cresceu com 2 novos leads qualificados e a campanha beta teve excelente receção. Prioridade: fechar HealthCare Plus e otimizar o fluxo de atendimento WhatsApp."}',
  '{"headline":"Semana positiva com oportunidades de melhoria no WhatsApp","highlights":["Taxa de conversão de leads aumentou 12% face à semana anterior","Campanha de email atingiu 48% de open rate, acima da média do setor","Sprint 3 com 65% das tasks concluídas, no prazo previsto"],"concerns":["Tempo médio de resolução WhatsApp aumentou 18 minutos (38%)","3 tarefas críticas com prazo nos próximos 2 dias","Lead HealthCare Plus em negociação há 21 dias sem atualização"],"health_score":7.2,"health_justification":"Negócio saudável com bom momentum comercial, mas atenção ao suporte WhatsApp e velocidade de closing","summary":"Semana globalmente positiva."}',
  current_date - interval '7 days',
  current_date,
  false
);

-- ============================================================
-- SEED: Notifications for Ana Silva
-- ============================================================

INSERT INTO notifications (
  org_id, user_id, title, message, type, category,
  resource_type, resource_id, is_read, action_url
) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'IA: Resumo semanal disponível',
    'Um novo insight gerado por IA está disponível no seu dashboard.',
    'info', 'analytics',
    'ai_insight', '51000000-0000-0000-0000-000000000001',
    false,
    '/analytics/insights'
  ),
  (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Tarefa em revisão: RLS policies',
    'A tarefa "RLS policies para todos os módulos" está aguardando a sua revisão.',
    'warning', 'project',
    'task', 'f1000000-0000-0000-0000-000000000003',
    false,
    '/projects/tasks/f1000000-0000-0000-0000-000000000003'
  ),
  (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Lead HealthCare Plus atualizado',
    'Bruno Costa moveu HealthCare Plus para a fase de Negociação.',
    'info', 'marketing',
    'lead', 'b1000000-0000-0000-0000-000000000001',
    true,
    '/marketing/leads'
  );

-- ============================================================
-- SEED: Notification Preferences
-- ============================================================

INSERT INTO notification_preferences (user_id, org_id, in_app, email, whatsapp, quiet_hours_start, quiet_hours_end) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', true, true,  false, '22:00', '08:00'),
  ('a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', true, true,  true,  '23:00', '07:00'),
  ('a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', true, false, false, null,    null),
  ('a2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', true, true,  false, '22:00', '08:00');

-- ============================================================
-- SEED: Audit Logs
-- ============================================================

INSERT INTO audit_logs (org_id, user_id, action, resource_type, resource_id, details, ip_address) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'organization.created', 'organization', 'b1000000-0000-0000-0000-000000000001', '{"plan":"pro"}', '192.168.1.1'),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'member.invited',       'invitation',   'c1000000-0000-0000-0000-000000000001', '{"email":"bruno.costa@nexusdemo.pt","role":"manager"}', '192.168.1.1'),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'lead.stage_changed',   'lead',         'b1000000-0000-0000-0000-000000000001', '{"from":"qualified","to":"negotiation","lead":"HealthCare Plus"}', '192.168.1.2'),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'project.created',      'project',      'c1000000-0000-0000-0000-000000000001', '{"name":"Plataforma NexusOS v2"}', '192.168.1.1');

-- ============================================================
-- SEED: WhatsApp Module
-- ============================================================

INSERT INTO whatsapp_configs (id, org_id, provider, phone_number, is_active, webhook_url) VALUES
  (
    'w1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'meta',
    '+351912345678',
    true,
    'https://nexusos.io/api/whatsapp/webhooks/twilio'
  )
ON CONFLICT (org_id) DO NOTHING;

INSERT INTO conversation_flows (id, org_id, name, description, trigger_keywords, flow_data, is_active, created_by) VALUES
  (
    'f2000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Qualificação Automática de Leads',
    'Fluxo principal de atendimento e triagem inicial de novos contactos',
    ARRAY['preço', 'plano', 'orçamento', 'demo', 'informação'],
    '{"nodes":[{"id":"n1","type":"message","content":"👋 Olá! Bem-vindo à NexusOS. Como podemos impulsionar o seu negócio hoje?"}]}',
    true,
    'a1000000-0000-0000-0000-000000000001'
  ),
  (
    'f2000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'Suporte Técnico 24/7',
    'Atendimento automático fora de horas para dúvidas frequentes',
    ARRAY['ajuda', 'suporte', 'erro', 'problema', 'ticket'],
    '{"nodes":[{"id":"n1","type":"message","content":"🛠️ Olá! Registámos o seu pedido de suporte. Um especialista responderá em menos de 15 min."}]}',
    false,
    'a1000000-0000-0000-0000-000000000001'
  );

INSERT INTO contacts (id, org_id, phone_number, name, email, tags, opt_in, opted_in_at) VALUES
  ('c2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '+351919876543', 'João Silva', 'joao.silva@empresa.pt', ARRAY['VIP', 'Lead'], true, now() - interval '5 days'),
  ('c2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', '+351931122334', 'Maria Santos', 'maria.santos@tech.pt', ARRAY['Cliente Pro'], true, now() - interval '3 days'),
  ('c2000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', '+351964455667', 'Pedro Oliveira', 'pedro@inovacao.com', ARRAY['Novo Lead'], true, now() - interval '1 day')
ON CONFLICT (org_id, phone_number) DO NOTHING;

INSERT INTO conversations (id, org_id, contact_id, status, assigned_to, started_at) VALUES
  ('v1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'active', 'a1000000-0000-0000-0000-000000000002', now() - interval '2 hours'),
  ('v1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000002', 'waiting_agent', null, now() - interval '4 hours'),
  ('v1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000003', 'resolved', 'a1000000-0000-0000-0000-000000000001', now() - interval '1 day');

INSERT INTO messages (conversation_id, org_id, direction, content, type, status, sent_at) VALUES
  ('v1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'inbound', 'Olá! Gostaria de saber mais sobre o plano Pro da agência.', 'text', 'read', now() - interval '2 hours'),
  ('v1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'outbound', '👋 Olá João! O plano Pro inclui automação de WhatsApp, CRM ilimitado e relatórios de IA.', 'text', 'read', now() - interval '1 hour 55 min'),
  ('v1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'inbound', 'Excelente! Qual o valor mensal e como agendo uma demo?', 'text', 'read', now() - interval '10 min'),

  ('v1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'inbound', 'Preciso de ajuda urgente para integrar as campanhas de Meta Ads.', 'text', 'read', now() - interval '4 hours'),
  ('v1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'outbound', '🤖 Olá Maria! Estou a transferir o seu atendimento para um gestor de conta humano.', 'text', 'sent', now() - interval '3 hours 50 min'),

  ('v1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'inbound', 'Onde posso descarregar a fatura deste mês?', 'text', 'read', now() - interval '1 day'),
  ('v1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'outbound', '📄 Olá Pedro! As faturas estão disponíveis no menu Definições > Assinatura & Faturação.', 'text', 'read', now() - interval '23 hours');

-- ============================================================
-- End of seed data
-- ============================================================

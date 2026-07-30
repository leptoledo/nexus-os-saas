# NexusOS — Documentação Geral do Sistema

> **Status do Documento:** Ativo / Vivo  
> **Última Atualização:** 30 de Julho de 2026  
> **Nota de Manutenção:** Este documento é mantido e atualizado automaticamente pela equipa de desenvolvimento a cada nova funcionalidade, refatoração ou alteração arquitetural.

---

## 1. Visão Geral e Propósito

O **NexusOS** é uma plataforma SaaS multi-tenant integrada "All-in-One" desenvolvida especificamente para **Agências Digitais**. O objetivo principal da plataforma é centralizar a gestão de clientes, campanhas de marketing, projetos, inteligência de dados (BI) e comunicação via WhatsApp num único painel unificado.

### Principais Pilares:
* **Multi-Tenancy Nativa:** Isolamento estrito de dados por organização (`tenant_id`) utilizando Row Level Security (RLS) diretamente no PostgreSQL.
* **Escalabilidade & Performance:** Backend assíncrono de alta performance com FastAPI, processamento de tarefas em background via Celery + Redis.
* **Inteligência Artificial Integrada:** Agentes de atendimento e geração de conteúdos suportados por OpenAI GPT-4o.
* **Faturamento Automatizado:** Gestão de planos e subscrições recorrentes com Stripe.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Detalhes |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Lucide Icons |
| **Backend** | FastAPI (Python 3.11) | Pydantic v2, Uvicorn, Asyncio, Supabase Python Client |
| **Base de Dados** | Supabase (PostgreSQL 15) | Auth (JWT/OAuth), Storage, Realtime, RLS, Migrações SQL |
| **Tarefas Assíncronas** | Celery + Redis | Filas de background para automações, sincronização e e-mails |
| **Integradores Externos** | Stripe | Subscrições, Checkout, Webhooks e gestão de planos |
| **Comunicação / IA** | Twilio & OpenAI | API do WhatsApp Business e modelos GPT-4o / Text Embeddings |
| **E-mails** | Resend | Transacional via SMTP e API |
| **Infraestrutura** | Docker & Nginx | Containerização com Docker Compose e proxy reverso Nginx |

---

## 3. Estrutura do Repositório

```
nexus-os/
├── docs/                        # Documentação viva do projeto
│   └── DOCUMENTACAO_GERAL.md    # Este documento
├── backend/                     # API FastAPI (Python)
│   ├── app/
│   │   ├── analytics/           # Endpoints e serviços de Analytics & BI
│   │   ├── auth/                # Autenticação e gestão de sessões
│   │   ├── billing/             # Integração Stripe e gestão de subscrições
│   │   ├── marketing/           # Campanhas, calendário e automações
│   │   ├── middleware/          # TenantMiddleware (extração e validação de tenant_id)
│   │   ├── notifications/       # Sistema de notificações internas
│   │   ├── projects/            # Gestão de projetos, tarefas e time tracking
│   │   ├── tasks/               # Tarefas assíncronas Celery
│   │   ├── tenants/             # Organizações, membros e onboarding
│   │   ├── whatsapp/            # Webhooks Twilio, chatbots IA e campanhas
│   │   ├── config.py            # Variáveis de ambiente e Pydantic Settings
│   │   └── database.py          # Conexão e cliente Supabase Admin/Anon
│   ├── main.py                  # Entry point da aplicação FastAPI
│   └── requirements.txt         # Dependências Python
├── frontend/                    # Aplicação Next.js 14 (TypeScript)
│   ├── app/
│   │   ├── (auth)/              # Rotas públicas (login, register, reset-password)
│   │   └── (dashboard)/         # Rotas autenticadas (dashboard, marketing, projects, etc.)
│   ├── components/              # Componentes de UI reutilizáveis (shadcn/ui)
│   ├── hooks/                   # Custom Hooks React
│   ├── lib/                     # Clientes API, Supabase browser client, helpers
│   ├── stores/                  # Gestão de estado (Zustand)
│   └── types/                   # Definições de tipos TypeScript (gerados do Supabase)
├── supabase/                    # Configuração e Migrações do Supabase
│   ├── migrations/              # Scripts SQL ordenados (001 a 010)
│   └── seed.sql                 # Dados iniciais para desenvolvimento
├── infra/                       # Configurações de Nginx e CI/CD
│   └── nginx/                   # Nginx reverse proxy
├── docker-compose.yml           # Ambiente local de desenvolvimento
├── docker-compose.prod.yml      # Overrides para ambiente de produção
└── Makefile                     # Atalhos de comandos (`make dev`, `make backend-test`, etc.)
```

---

## 4. Arquitetura Multi-Tenant e Segurança

### 4.1 Isolamento de Dados (RLS)
Cada pedido enviado à API carrega o cabeçalho `Authorization: Bearer <JWT>`. O Supabase Auth valida o JWT e extrai o `user_id`. O middleware do backend (`TenantMiddleware`) resolve a organização ativa (`tenant_id`) associada ao utilizador e assegura que todas as queries à base de dados apliquem os filtros RLS correspondentes.

### 4.2 Níveis de Acesso (RBAC)
* **`owner`:** Controlo total da organização, faturamento, eliminação da conta e convites de administradores.
* **`admin`:** Gestão de membros, configuração de integrações, criação e edição de todos os projetos/campanhas.
* **`member`:** Criação e edição de tarefas, campanhas e visualização de dashboards.
* **`viewer`:** Acesso em modo de leitura a relatórios e status de projetos.

---

## 5. Módulos do Sistema

### 5.1 Onboarding e Gestão de Tenants
* **Fluxo:** Registro de utilizador → Criação do Perfil → Criação/Seleção da Organização (`/tenants`).
* **Resiliência:** Tratamento idempotente para evitar duplicidade de slugs (`POST /organizations` gera sufixo caso o slug esteja em uso).
* **Armazenamento de Sessão:** Leitura otimizada no frontend via `localStorage` para evitar bloqueios de concorrência com o Supabase JS SDK.

### 5.2 Marketing Digital
* **Campanhas:** Criação, acompanhamento de métricas (cliques, conversões, ROI).
* **Calendário Editorial:** Agendamento visual de publicações e conteúdos.
* **Automações:** Triggers e ações automatizadas para fluxos de marketing.

### 5.3 Gestão de Projetos
* **Kanban & Listas:** Organização flexível de tarefas com drag-and-drop.
* **Time Tracking:** Registo de horas trabalhadas por tarefa/membro da equipa.
* **Sprints:** Planeamento de iterações de trabalho.

### 5.4 Analytics & BI
* **Dashboards:** Widgets personalizáveis para visualização de métricas estratégicas.
* **Exportação:** Geração de relatórios em CSV e PDF.

### 5.5 WhatsApp Bot & Atendimento IA
* **Integração Twilio:** Recebimento e envio de mensagens em tempo real via Webhooks (`/api/whatsapp/webhooks`).
* **Motor IA (GPT-4o):** Respostas automáticas contextuais baseadas em base de conhecimento da agência.
* **Campanhas de Mensagens:** Disparos em massa com agendamento.

### 5.6 Billing & Planos de Subscrição
* **Planos:**
  * **Starter (49€/mês):** 3 utilizadores, 5 clientes, 5 campanhas ativas, 500 msgs WhatsApp.
  * **Pro (149€/mês):** 10 utilizadores, 25 clientes, 20 campanhas ativas, 5.000 msgs WhatsApp, IA habilitada.
  * **Business (399€/mês):** Utilizadores e clientes ilimitados, IA avançada, multi-agente, relatórios customizados.
* **Integração Stripe:** Webhooks em `/api/billing/webhooks/stripe` para ativação, cancelamento e atualização de subscrições.

---

## 6. Histórico de Migrações da Base de Dados

1. `001_initial_schema.sql` — Tabelas base: `organizations`, `profiles`, `organization_members`.
2. `002_rls_policies.sql` — Políticas de segurança RLS para isolamento por `tenant_id`.
3. `003_marketing_module.sql` — Tabelas `campaigns`, `editorial_calendar`, `automations`.
4. `004_projects_module.sql` — Tabelas `projects`, `tasks`, `time_entries`, `sprints`.
5. `005_analytics_module.sql` — Tabelas `dashboards`, `reports`, `metrics`.
6. `006_whatsapp_module.sql` — Tabelas `whatsapp_flows`, `whatsapp_messages`, `whatsapp_campaigns`.
7. `007_notifications.sql` — Tabela `notifications` e preferências do utilizador.
8. `008_feature_flags.sql` — Gestão de funcionalidades ativas por plano de subscrição.
9. `009_rls_security_hardening.sql` — Reforço e otimização das políticas RLS.
10. `010_sector_text.sql` — Alteração da coluna `organizations.sector` de ENUM restritivo para TEXT.

---

## 7. Registro de Alterações (Changelog Automático)

### [2026-07-30] — Correção de Notificação 'Application not found' nas Definições
* **Resiliência Frontend & API:** Sanitização de erros 404 brutos da Vercel (`Application not found`) em `ApiClient.request()` (`frontend/lib/api.ts`).
* **Settings Page:** Substituição de chamadas relativas `/backend/` por `apiClient` e inclusão de fallback via `useAuthStore` em `settings/page.tsx` e `useSettings.ts`, garantindo que os dados do perfil (Nome e Email) permaneçam visíveis sem disparar alertas vermelhos de erro.

### [2026-07-30] — Correção de Deploy Vercel (Monorepo)
* **Vercel Build Fix:** Configurado `vercel.json` na raiz apontando o comando de build (`cd frontend && npm install && npm run build`) e o diretório de saída (`frontend/.next`), resolvendo falhas de build de diretório em monorepo (Erro `dpl_D11Sif41eZUyS3K6ScGiaGiiNfLT`).

### [2026-07-30] — Passo 4: Setup & Execução Local
* **Setup & Docker:** Validação e alinhamento do ambiente local de desenvolvimento (`docker-compose.yml`, `.env.example`, `Makefile`).
* **Conclusão:** Finalização do ciclo completo de desenvolvimento em 4 passos (Expansão de Módulos, Refatoração/Bugs, Testes e Setup).
* **Doc:** Sincronização do registo de alterações.

### [2026-07-30] — Passo 3: Testes & Cobertura
* **Suíte de Testes Backend (`pytest`):** Estruturada a diretoria `backend/tests/` com fixtures em `conftest.py`, testes de liveness e metadata (`test_health.py`), validação de setores e middleware (`test_tenants.py`) e validação de schemas do WhatsApp (`test_whatsapp.py`).
* **Doc:** Sincronização do registo de alterações.

### [2026-07-30] — Passo 2: Correção de Bugs & Refatoração
* **Segurança Backend:** Ocultação/mascaramento de tokens sensíveis de integração em `upsert_config` (`backend/app/whatsapp/router.py`).
* **Resiliência Frontend:** Refatoração de `ApiClient.request()` (`frontend/lib/api.ts`) para tratamento defensivo de erros HTTP (401, 403, 404, 409, 500) com mensagens amigáveis em português.
* **Doc:** Sincronização do registo de alterações.

### [2026-07-30] — Passo 1: Expansão de Módulos & Features
* **Projetos:** Implementado modal de criação rápida de tarefas (`CreateTaskModal.tsx`) integrado diretamente no quadro Kanban e visão de Lista.
* **WhatsApp Bot:** Desenvolvido o **Simulador do Bot WhatsApp com IA (`WhatsAppSimulatorModal.tsx`)** em tempo real no frontend, permitindo testar respostas contextuais geradas pelo GPT-4o antes do envio via Twilio.
* **Doc:** Atualização da documentação viva e sincronização do registo de alterações.

### [2026-07-30] — Inicialização da Documentação Viva
* **Doc:** Criação do documento oficial `docs/DOCUMENTACAO_GERAL.md` cobrindo toda a arquitetura, módulos e migrações.
* **Estabilização:** Consolidação das correções no fluxo de Onboarding (higienização do campo `sector`, isolamento de `getProfile`/`getOrganization`, resolução de lock no Supabase JS client).

*(Nota: Novas implementações serão anexadas automaticamente nesta secção).*

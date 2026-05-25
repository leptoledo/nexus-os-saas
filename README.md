# NexusOS — Plataforma SaaS Multi-Tenant

Plataforma integrada para agências digitais com módulos de Marketing Digital, Gestão de Projetos, Analytics & BI e Automação via WhatsApp.

---

## Visão Geral

O NexusOS é uma plataforma SaaS multi-tenant construída para agências que precisam de gerir clientes, campanhas, projetos e comunicação num único lugar. Cada cliente tem o seu próprio espaço isolado com dados separados por Row Level Security (RLS).

**Módulos principais:**

| Módulo | Descrição |
|---|---|
| Marketing Digital | Gestão de campanhas, conteúdos, calendário editorial e automações |
| Gestão de Projetos | Kanban, sprints, time tracking, gestão de equipa |
| Analytics & BI | Dashboards customizáveis, relatórios automáticos, integração GA4/Meta Ads |
| WhatsApp Bot | Chatbot com IA, atendimento automatizado, campanha de mensagens |

**Stack Técnica:**

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI (Python 3.11), Pydantic v2
- **Base de Dados:** Supabase (PostgreSQL 15 + Auth + Storage + Realtime)
- **Filas:** Celery + Redis
- **Pagamentos:** Stripe (subscriptions + webhooks)
- **IA:** OpenAI GPT-4o
- **WhatsApp:** Twilio API
- **Email:** Resend (SMTP)
- **Infra:** Docker, Nginx, GitHub Actions

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    INTERNET                          │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Nginx (Proxy)   │
              └────────┬────────┘
              ┌────────┴────────┐
    ┌─────────▼────┐     ┌──────▼──────┐
    │  Next.js 14  │     │  FastAPI    │
    │  (Frontend)  │     │  (Backend)  │
    └──────────────┘     └──────┬──────┘
                         ┌──────┴──────┐
                 ┌────────▼───┐  ┌─────▼──────┐
                 │  Supabase  │  │   Redis +  │
                 │(PostgreSQL │  │   Celery   │
                 │  Auth,RLS) │  │            │
                 └────────────┘  └────────────┘
```

---

## Pré-requisitos

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

## Setup Local

### 1. Clonar e configurar

```bash
git clone https://github.com/your-org/nexus-os.git
cd nexus-os
cp .env.example .env
# Preencher as variáveis em .env
```

### 2. Configurar Supabase local

```bash
supabase start
supabase db reset --with-seed
supabase gen types typescript --local > frontend/types/supabase.ts
```

### 3. Configurar Stripe (webhook local)

```bash
stripe listen --forward-to localhost:8000/api/billing/webhooks/stripe
# Copiar o webhook secret para STRIPE_WEBHOOK_SECRET no .env
```

### 4. Iniciar com Docker

```bash
make dev
```

**Acessos:**

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:8000/api/docs |
| Flower (Celery Monitor) | http://localhost:5555 |
| Supabase Studio | http://localhost:54323 |

---

## Variáveis de Ambiente

| Variável | Descrição | Como obter |
|---|---|---|
| `SUPABASE_URL` | URL do projeto Supabase | [supabase.com/dashboard](https://supabase.com/dashboard) → Settings → API |
| `SUPABASE_ANON_KEY` | Chave pública Supabase | Mesmo local |
| `SUPABASE_SERVICE_KEY` | Chave de serviço (admin) | Mesmo local — **nunca expor no frontend** |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe | [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe | `stripe listen` ou dashboard Stripe |
| `STRIPE_PRICE_STARTER` | Price ID do plano Starter | Stripe → Products |
| `STRIPE_PRICE_PRO` | Price ID do plano Pro | Stripe → Products |
| `STRIPE_PRICE_BUSINESS` | Price ID do plano Business | Stripe → Products |
| `OPENAI_API_KEY` | Chave da API OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) |
| `REDIS_URL` | URL de ligação ao Redis | `redis://redis:6379/0` (Docker local) |
| `TWILIO_ACCOUNT_SID` | SID da conta Twilio | [console.twilio.com](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | Auth Token Twilio | Mesmo local |
| `TWILIO_WHATSAPP_NUMBER` | Número WhatsApp Twilio | Twilio → Messaging → WhatsApp |
| `SMTP_HOST` | Host SMTP para envio de email | `smtp.resend.com` (Resend) |
| `SMTP_USER` / `SMTP_PASS` | Credenciais SMTP | [resend.com](https://resend.com) → API Keys |
| `SECRET_KEY` | Chave secreta JWT | Gerar: `openssl rand -hex 32` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave pública Stripe | Stripe → Developers → API Keys |

---

## Estrutura do Projeto

```
nexus-os/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── api/             # Routers por módulo
│   │   ├── models/          # Modelos Pydantic
│   │   ├── services/        # Lógica de negócio
│   │   ├── tasks/           # Tarefas Celery
│   │   └── utils/           # Utilitários
│   ├── main.py              # Entry point FastAPI
│   └── requirements.txt
├── frontend/                # App Next.js 14
│   ├── app/                 # App Router (páginas e layouts)
│   ├── components/          # Componentes React
│   ├── lib/                 # Clientes e utilitários
│   ├── types/               # Tipos TypeScript (incl. supabase.ts)
│   └── package.json
├── supabase/                # Configuração Supabase
│   ├── migrations/          # Migrations SQL
│   ├── seed.sql             # Dados iniciais
│   └── config.toml
├── infra/
│   ├── nginx/
│   │   └── nginx.conf       # Configuração Nginx
│   └── .github/
│       └── workflows/
│           ├── ci.yml       # Pipeline CI
│           └── deploy.yml   # Pipeline Deploy
├── docker-compose.yml       # Serviços de desenvolvimento
├── docker-compose.prod.yml  # Overrides de produção
├── Makefile                 # Comandos úteis
├── .env.example             # Template de variáveis
└── README.md
```

---

## Módulos

### Marketing Digital

**Features por plano:**

| Feature | Starter | Pro | Business |
|---|---|---|---|
| Campanhas activas | 5 | 20 | Ilimitado |
| Calendário editorial | Sim | Sim | Sim |
| Automações | Não | 10 | Ilimitado |
| Relatórios | Básico | Avançado | Custom |
| Integração Meta Ads | Não | Sim | Sim |
| Integração GA4 | Não | Sim | Sim |

**Endpoints principais:**
- `GET /api/marketing/campaigns` — Listar campanhas
- `POST /api/marketing/campaigns` — Criar campanha
- `GET /api/marketing/calendar` — Calendário editorial
- `POST /api/marketing/automations` — Criar automação

---

### Gestão de Projetos

**Features por plano:**

| Feature | Starter | Pro | Business |
|---|---|---|---|
| Projetos activos | 3 | 15 | Ilimitado |
| Membros por projeto | 5 | 20 | Ilimitado |
| Time tracking | Não | Sim | Sim |
| Sprints | Não | Sim | Sim |
| Relatórios de equipa | Não | Não | Sim |

**Endpoints principais:**
- `GET /api/projects` — Listar projetos
- `POST /api/projects` — Criar projeto
- `GET /api/projects/{id}/tasks` — Tarefas do projeto
- `POST /api/projects/{id}/tasks` — Criar tarefa

---

### Analytics & BI

**Features por plano:**

| Feature | Starter | Pro | Business |
|---|---|---|---|
| Dashboards | 2 | 10 | Ilimitado |
| Exportação CSV | Não | Sim | Sim |
| Exportação PDF | Não | Não | Sim |
| Alertas automáticos | Não | 5 | Ilimitado |
| API de dados | Não | Não | Sim |

**Endpoints principais:**
- `GET /api/analytics/dashboards` — Listar dashboards
- `GET /api/analytics/reports` — Gerar relatório
- `POST /api/analytics/exports` — Exportar dados

---

### WhatsApp Bot

**Features por plano:**

| Feature | Starter | Pro | Business |
|---|---|---|---|
| Mensagens/mês | 500 | 5.000 | Ilimitado |
| Flows de atendimento | 1 | 10 | Ilimitado |
| IA (GPT-4o) | Não | Sim | Sim |
| Campanhas em massa | Não | Não | Sim |
| Multi-agente | Não | Não | Sim |

**Endpoints principais:**
- `POST /api/whatsapp/webhooks` — Receber mensagens Twilio
- `GET /api/whatsapp/flows` — Listar flows
- `POST /api/whatsapp/campaigns` — Criar campanha

---

## Planos de Subscrição

| | Starter | Pro | Business |
|---|---|---|---|
| **Preço** | 49€/mês | 149€/mês | 399€/mês |
| Utilizadores | 3 | 10 | Ilimitado |
| Clientes | 5 | 25 | Ilimitado |
| Storage | 5 GB | 25 GB | 100 GB |
| Suporte | Email | Email + Chat | Dedicado |
| SLA | Sem garantia | 99,5% | 99,9% |

---

## API Documentation

A documentação interativa (Swagger UI) está disponível em:

- **Desenvolvimento:** http://localhost:8000/api/docs
- **Produção:** https://api.nexusos.io/api/docs

**Autenticação:**

```
Authorization: Bearer <JWT_TOKEN>
```

O token JWT é obtido através do Supabase Auth. Incluir em todos os pedidos autenticados.

**Rate Limits por plano:**

| Plano | Requests/minuto |
|---|---|
| Starter | 60 |
| Pro | 300 |
| Business | 1.000 |

---

## Deploy em Produção

### Com Docker (VPS Ubuntu)

```bash
# 1. Preparar servidor
apt update && apt install -y docker.io docker-compose-plugin git

# 2. Clonar repositório
git clone https://github.com/your-org/nexus-os.git /opt/nexus-os
cd /opt/nexus-os

# 3. Configurar variáveis de ambiente
cp .env.example .env
nano .env  # Preencher variáveis de produção

# 4. Configurar SSL (Let's Encrypt)
apt install -y certbot
certbot certonly --standalone -d nexusos.io -d www.nexusos.io
cp /etc/letsencrypt/live/nexusos.io/fullchain.pem infra/nginx/ssl/
cp /etc/letsencrypt/live/nexusos.io/privkey.pem infra/nginx/ssl/

# 5. Iniciar em produção
make prod-up

# 6. Aplicar migrations
make db-migrate
```

### Com Railway / Render

1. Ligar o repositório GitHub ao serviço
2. Configurar as variáveis de ambiente no dashboard
3. O deploy é automático a cada push para `main`

### Supabase (Hosted)

1. Criar projeto em [supabase.com](https://supabase.com)
2. Obter `SUPABASE_URL` e as chaves no Settings → API
3. Aplicar migrations: `supabase db push --project-ref <ref>`
4. Activar Row Level Security em todas as tabelas

---

## Segurança

- **RLS (Row Level Security):** Todas as tabelas têm políticas que isolam dados por `tenant_id`
- **MFA:** Suportado via Supabase Auth (TOTP)
- **RBAC:** Papéis por tenant — `owner`, `admin`, `member`, `viewer`
- **JWT:** Tokens com expiração de 1h, refresh tokens de 7 dias
- **HTTPS:** Obrigatório em produção (HSTS activado)
- **RGPD:** Dados armazenados em servidores EU, direito ao esquecimento implementado

**Reportar vulnerabilidades:** security@nexusos.io

---

## Contribuir

1. Fork do repositório
2. Criar branch: `git checkout -b feat/nome-da-feature`
3. Commits com [Conventional Commits](https://conventionalcommits.org): `feat:`, `fix:`, `chore:`, etc.
4. Garantir que os testes passam: `make backend-test`
5. Garantir que o lint passa: `make backend-lint`
6. Abrir Pull Request para `develop`

**Code Style:**
- Python: [ruff](https://docs.astral.sh/ruff/) + [black](https://black.readthedocs.io/)
- TypeScript: ESLint + Prettier (config no projecto)

---

## Licença

MIT — ver [LICENSE](./LICENSE)

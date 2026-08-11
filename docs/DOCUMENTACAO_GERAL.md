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

### [2026-08-11] — Implementação Completa & Interativa do Módulo WhatsApp Bot (`/whatsapp`)
* **Persistência de Dados & Seed SQL (`seed.sql`):** Adicionados dados de semente para `whatsapp_configs`, `conversation_flows`, `contacts`, `conversations` e `messages`, garantindo dados de demonstração realistas em base de dados.
* **Fallbacks & Cache Reativo no React Query (`useWhatsApp.ts`):** Implementada estrutura de dados de demonstração com atualização otimista de cache, permitindo criar conversas, enviar respostas e simular fluxos mesmo em ambiente offline.
* **Simulador WhatsApp Conectado ao Vivo (`WhatsAppSimulatorModal.tsx`):** O simulador interativo GPT-4o sincroniza agora em tempo real as conversas simuladas diretamente com a lista de atendimento do WhatsApp Bot.
* **Modais Interativos de Ação (`CreateFlowModal`, `ProactiveMsgModal`, `AssignAgentModal`, `EditFlowModal`):**
  - *Novo Fluxo:* Suporte a palavras-chave gatilho e criação rápida de fluxos de triagem.
* **Melhorias de UX no Separador de Configuração (`/whatsapp/page.tsx`):**
  - Corrigido o botão de atalho **"Configurar Provedor Real"** para alternar de forma segura o separador ativo para a aba de Configuração.
  - Adicionado botão com ícone de olho (`Eye` / `EyeOff`) no campo **Auth Token / Token de Acesso** para visualizar e ocultar a chave com um clique.
  - Integração com a chamada real ao endpoint de backend `/whatsapp/send` e tratamento gracioso em dev/staging.
  - Adicionado seletor da **Agenda de Contactos da Empresa** (ex: *Leandro Toledo*, *João Silva*, *Maria Santos*, *Pedro Oliveira*), preenchendo automaticamente nome e telemóvel (`+351 912 329 104`) e abrindo a nova conversa na lista ao enviar.
  - *Atribuir Agente:* Carregamento e atribuição de membros reais da equipa.
* **Redesign Visual Dark Navy & Mint Green (`/whatsapp/page.tsx`):** Reestruturação visual completa com tema escuro `#090d16` / `#0f1422` e detalhes em Verde Menta `#00e699`, gráficos de volume de conversas e separador de configuração de APIs (Meta Cloud API / Twilio).

### [2026-08-11] — Validação de Build & Preparação para Deploy na Vercel
* **Ajuste de Configuração da Vercel (`vercel.json`):** Removido o comando redundante `cd frontend` das configurações de build para compatibilidade com o Root Directory `frontend` configurado no painel da Vercel.
* **Criação do Componente UI Textarea (`textarea.tsx`):** Adicionado o componente `Textarea` em `frontend/components/ui/textarea.tsx` para suporte nativo ao formulário de `/feedback`.
* **Validação de Compilação Frontend:** Executada verificação de build com Next.js (`npm run build`), garantindo que 100% das 16 páginas estáticas/dinâmicas compilam com zero erros antes do envio ao GitHub e Vercel.
* **Atualização Geral da Documentação:** Documentação sincronizada em `docs/DOCUMENTACAO_GERAL.md` conforme diretrizes do projeto.

### [2026-07-31] — Correção de Destaque Duplicado na Sidebar (`layout.tsx`)
* **Eliminação de Rotas Duplicadas:** Removidos os atalhos redundantes (`Painel Admin` e `Gestão de Equipa`) que redirecionavam para `/dashboard` e `/settings`, fazendo com que dois itens ficassem ativados simultaneamente. Agora apenas **um único item** fica ativo por cada rota.

### [2026-07-31] — Padronização de Espaçamento na Sidebar (`layout.tsx`)
* **Espaçamento 100% Uniforme:** Unificada a estrutura da barra lateral numa única lista contínua (`space-y-0.5 px-2`), eliminando o espaçamento irregular que existia entre os grupos de navegação.

### [2026-07-31] — Criação da Tela Feedback & Suporte (`/feedback`)
* **Nova Página de Feedback:** Criada a tela `/feedback` exatamente alinhada com a imagem modelo enviada:
  - Header principal com título `Feedback & Suporte` e subtítulo explicativo.
  - Cartão com fundo `#0f1422` e cabeçalho `Reportar Problema` com ícone 🚀 em caixa Verde Menta.
  - Campos: *Título do Problema*, *Descrição Detalhada* (textarea), *Prioridade* (dropdown: Baixa 🟢, Média 🟡, Alta 🔴), e *Imagem do Erro (Opcional)* com área de dropzone drag & drop, pré-visualização e validação de tamanho (máx. 2MB).
  - Botão principal `Enviar Feedback` em Verde Menta (`#00e699`) com estado de carregamento e confirmação visual.
  - Ligação do botão `Feedback` no cabeçalho superior apontando diretamente para `/feedback`.

### [2026-07-31] — Remoção de Cabeçalhos de Seção da Sidebar (`layout.tsx`)
* **Barra Lateral Mais Limpa:** Removidos os textos de cabeçalho das seções (`Geral` e `Administração`) da barra lateral (`layout.tsx`), apresentando uma lista de links de navegação limpa, uniforme e contínua.

### [2026-07-31] — Ajuste de Tamanho dos Ícones da Sidebar (`layout.tsx`)
* **Ícones Encorpados e Visíveis:** Aumentado o tamanho de todos os ícones da barra lateral de `16px` (`h-4 w-4`) para `20px` (`h-5 w-5`), garantindo perfeita visibilidade, alinhamento e proporção tanto quando a sidebar está recolhida/fechada (`w-16`) quanto expandida (`w-64`).

### [2026-07-31] — Padronização de Fontes e Cores da Sidebar (`layout.tsx`)
* **Tamanhos e Cores Alinhados ao Modelo (Imagem 1):**
  - Títulos das seções (`GERAL`, `ADMINISTRAÇÃO`): Ajustados para `text-[11px] font-semibold text-slate-500 uppercase`, substituindo o tom fúcsia/púrpura anterior.
  - Links da barra lateral: Aumentado o tamanho da fonte para `text-sm font-medium` (14px com espaçamento `py-2 px-3`), melhorando a legibilidade e proporcionalidade.
  - Item ativo (`Gestão de Projetos`, etc.): Aplicado fundo `bg-[#0e2a24]` com contorno `border-[#00e699]/30` e texto Verde Menta (`#00e699`) sem caixa de sombra neon.

### [2026-07-31] — Ajuste Fino de Estilo no Botão Nova Tarefa (`/projects`)
* **Remoção de Conflito de Variante:** Removida a propriedade `variant="outline"` e o estado desativado `disabled` que bloqueavam as regras de cor customizadas do botão `Nova Tarefa`. O botão aplica agora a 100% o estilo idêntico a `Solicitar exportação` (`bg-[#090d16]`, borda `border-slate-800`, hover verde menta `hover:border-emerald-500/40 hover:text-emerald-400`).

### [2026-07-31] — Padronização Visual do Botão Nova Tarefa (`/projects`)
* **Botão Nova Tarefa:** Aplicada exatamente a mesma configuração estética do botão `Solicitar exportação` / `Ver documentação Swagger` ao botão `Nova Tarefa` na página de Projetos (`bg-[#090d16]`, borda `border-slate-800`, hover com destaque em verde menta `hover:border-emerald-500/40 hover:text-emerald-400`).

### [2026-07-31] — Correção de Importação de Button (`/projects`)
* **Importação de Componente UI:** Adicionado o import de `Button` a partir de `@/components/ui/button` em `/projects/page.tsx`, resolvendo a exceção `Button is not defined`.

### [2026-07-31] — Remodelação Visual de Projetos (`/projects`)
* **Layout Dark Navy & Verde Menta:** Atualizada a página de Projetos para corresponder 100% à imagem modelo enviada:
  - Header com título `Projetos` (`text-3xl font-extrabold text-white`) e subtítulo `0 projetos ativos · 0 tarefas pendentes`.
  - Widget de cronómetro em pill escura `#090d16` com botão Play em Verde Menta (`#00e699`).
  - Botão `+ Nova Tarefa` com contorno escuro e botão `+ Novo Projeto` em Verde Menta.
  - Cartão de estado vazio com borda tracejada `#0f1422`, ícone em caixa azul/índigo, títulos brancos e botão central `+ Criar primeiro projeto` em Verde Menta.

### [2026-07-31] — Correção de Erro Runtime em Projetos (`/projects`)
* **Importações Restauradas:** Corrigido o erro `ReferenceError: useProjects is not defined` adicionando os imports de hooks e tipos (`useProjects`, `useCreateProject`, `Project`, etc.) a partir de `@/hooks/useProjects` em `/projects/page.tsx`.

### [2026-07-31] — Remoção de Sombra na Aba Ativa (`/marketing`)
* **Abas de Navegação Limpas:** Removido o efeito de sombra/brilho neon (`shadow-[0_2px_10px_rgba(0,230,153,0.15)]`) da aba ativa no módulo Marketing & CRM, mantendo apenas a linha de realce Verde Menta (`#00e699`) limpa e minimalista.

### [2026-07-31] — Estilização do Cartão Resumo IA (`/dashboard`)
* **Cartão Resumo IA:** Aplicado o novo tema Dark Navy & Indigo no cartão `Resumo IA` da Dashboard (`/dashboard`), utilizando fundo `#0f1422`, gradiente violeta/índigo no ícone de Sparkles ✨, ícones de lâmpada em tom azul/índigo e texto em slate-200.

### [2026-07-31] — Padronização Visual do Botão de Exportação (`/settings`)
* **Botão Solicitar Exportação:** Atualizado o botão `Solicitar exportação` na aba `RGPD` para utilizar exatamente a mesma configuração estética do botão `Ver documentação Swagger` (`bg-[#090d16]`, borda `border-slate-800`, hover suave com destaque em verde menta `hover:border-emerald-500/40 hover:text-emerald-400`).

### [2026-07-31] — Reestruturação da Aba RGPD (`/settings`)
* **Privacidade & Consentimentos:** Atualizada a aba `RGPD` para conter estritamente a estrutura de 3 cartões da imagem modelo:
  - **Card 1: Exportar os meus dados** — Subtítulo explicativo sobre ficheiro ZIP e botão `Solicitar exportação` com ícone de download.
  - **Card 2: Gestão de consentimentos** — Switches para *Comunicações de marketing*, *Análise de utilização (analytics)* e *Partilha de dados com parceiros*.
  - **Card 3: Zona Perigosa** — Cartão com contorno e aviso em vermelho ⚠️ e botão `Eliminar a minha conta` em vermelho.

### [2026-07-31] — Ajuste de Cabeçalho da Aba Segurança (`/settings`)
* **Remoção de Título Interno Duplicado:** Removido o bloco de título e subtítulo duplicado do primeiro cartão da aba `Segurança`. O topo principal da página exibe agora **Autenticação Multifator (MFA)** e *Adiciona uma camada extra de segurança*, mantendo a interface limpa e alinhada ao padrão.

### [2026-07-31] — Reestruturação da Aba Segurança (`/settings`)
* **MFA & Sessões Ativas:** Atualizada a aba `Segurança` para conter estritamente os 2 cartões da imagem modelo:
  - **Card 1: Autenticação Multifator (MFA)** — Título, subtítulo *Adiciona uma camada extra de segurança*, item *MFA via app autenticadora (TOTP)* e botão `Ativar MFA`.
  - **Card 2: Sessões Ativas** — Título, subtítulo *Dispositivos com sessão iniciada*, item `MacBook Pro — Chrome 124` com badge `Esta sessão` e item `iPhone 15 — Safari` com acção em vermelho `Terminar`.

### [2026-07-31] — Remoção de Animações de Movimento nos Botões (`/settings`)
* **Comportamento de Hover Estático:** Removido qualquer movimento de elevação (`hover:-translate-y`) de todos os botões de acção. Ao passar o cursor, os botões permanecem perfeitamente fixos, realizando apenas a transição suave de cor (`#00e699` ➔ `#05df8a`).

### [2026-07-31] — Padronização de Botões de Acção (`/settings`)
* **Botões Verde Menta com Hover:** Padronizados todos os botões de acção (`+ Adicionar`, `Exportar dados`, `Configurar MFA`, `+ Convidar`, `Guardar alterações`, `Guardar preferências`) com o fundo Verde Menta (`bg-[#00e699]`), texto escuro em negrito (`text-slate-950`), transição hover (`hover:bg-[#05df8a]`), sombra verde neon e elevação suave no hover.

### [2026-07-31] — Reestruturação da Aba API & Webhooks (`/settings`)
* **Campos & Layout de API & Webhooks:** Atualizada a aba `API & Webhooks` para refletir 100% o modelo visual enviado: Chave de API com acções (Mostrar 👁️, Copiar 📋, Regenerar 🔄) e aviso de header `Authorization: Bearer <chave>`, secção de Webhooks com botão `+ Adicionar` e caixa tracejada para estado vazio, e botão full-width para `Ver documentação Swagger →`.

### [2026-07-30] — Cabeçalho Dinâmico Superior & Eliminação de Títulos Duplicados (`/settings`)
* **Cabeçalho Dinâmico no Topo:** O título e subtítulo de cada aba (*ex: Preferências de Notificação / Escolhe como e quando recebes notificações*) passaram a ser exibidos diretamente no topo principal da página, atualizando-se instantaneamente ao trocar de aba.
* **Remoção de Títulos Duplicados:** Removidos os títulos e subtítulos que ficavam repetidos no topo interior de cada cartão, tornando a interface mais limpa e moderna.

### [2026-07-30] — Padronização de Títulos & Subtítulos (`/settings`)
* **Hierarquia de Cabeçalhos:** Padronizados todos os títulos e subtítulos das 7 abas de Definições (*Perfil Pessoal*, *Organização*, *Membros da Equipa*, *Preferências de Notificação*, *API & Webhooks*, *Segurança*, *RGPD*) para corresponderem exatamente ao estilo da imagem modelo.

### [2026-07-30] — Reestruturação da Aba Notificações (`/settings`)
* **Preferências de Notificação:** Atualizada a aba `Notificações` para conter estritamente a estrutura da imagem modelo: Título `Preferências de Notificação`, Subtítulo `Escolhe como e quando recebes notificações`, Secção `Canais` (*In-app*, *Email*, *WhatsApp*), Secção `Categorias` (*Marketing*, *Projetos*, *Analytics*, *Faturação*) e botão `Guardar preferências` em Verde Menta (`#00e699`).

### [2026-07-30] — Reestruturação da Aba Membros (`/settings`)
* **Campos & Tabela de Membros:** Atualizada a aba `Membros` para conter estritamente a estrutura da imagem modelo: Título `Membros da Equipa`, Subtítulo `Gere os utilizadores da tua organização`, Botão `+ Convidar` em Verde Menta (`#00e699`), e tabela com as colunas `Utilizador`, `Role`, `Estado` e `Membro desde`.

### [2026-07-30] — Reestruturação da Aba Organização (`/settings`)
* **Campos da Aba Organização:** Atualizada a aba `Organização` para conter exatamente a estrutura da nova imagem de referência: Upload de Logo (`Carregar logo`), `Nome da empresa`, `Slug (URL)`, `Plano (Pro)` e botão `Guardar` em Verde Menta (`#00e699`).

### [2026-07-30] — Resolução do Runtime Error (`/settings`)
* **Correção de Referência de Variável:** Corrigido o `ReferenceError: user is not defined` ao renderizar o avatar do utilizador na página de Definições, direcionando a referência para a variável de estado `authUser`.

### [2026-07-30] — Centralização do Layout & Dados Autênticos do NexusOS (`/settings`)
* **Centralização do Conteúdo no Ecrã:** Reformulado o container principal da página de Definições para alinhamento perfeitamente centrado (`mx-auto max-w-4xl`), idêntico à posição no modelo de referência.
* **Informações Reais do NexusOS Preservadas:** Restauradas as informações autênticas da página de Definições da Imagem 2 (Foto de Perfil, Nome completo, Email, Idioma, Password, Organização, Membros, Notificações, API & Webhooks, Segurança e RGPD) com o tema visual escuro (`#090d16` / `#0f1422`) e botão em Verde Menta (`#00e699`).

### [2026-07-30] — Restauração dos Módulos NexusOS na Sidebar & Cabeçalho Topbar
* **Módulos Originais Preservados:** Restaurados todos os nomes genuínos de módulos do NexusOS na barra lateral (`Dashboard`, `Marketing & CRM`, `Gestão de Projetos`, `Analytics & BI`, `WhatsApp Bot`, `NexusAI`, `Assinatura`, `Notificações`, `Configurações`), mantendo intacta a nova estética visual (Dark Navy `#090d16`, pílulas e realce em Verde Menta `#00e699`).
* **Breadcrumb Topbar Corrigido:** Ajustada a navegação superior para exibir o caminho autêntico da aplicação: `/ NexusOS` `PRO` `/ Configurações` (ou o nome do módulo ativo).

### [2026-07-30] — Ajuste de Seleção na Sidebar & Cartão Perfil Público (`/settings`)
* **Correção da Seleção na Sidebar:** Resolvida a seleção múltipla de ícones ativos na barra lateral quando em `/settings`. Agora apenas um único item (`Configurações`) é destacado com o pílula verde menta.
* **Alinhamento do Cartão Perfil Público:** Reformulado o cartão `Perfil Público` para conter estritamente a estrutura da Imagem 1 de referência (apenas o campo `Nome Público` com instrução e o botão `Salvar Alterações` em Verde Menta no canto inferior direito).

### [2026-07-30] — Redesign Visual do Calendário Editorial (`/marketing`)
* **Calendário Editorial & Sub-abas:** Botão `+ Novo Evento`, marcação do dia atual (`30`) com brilho em Verde Menta (`#00e699`), grelha do calendário e secções de SEO/Analytics adaptados ao tema **Dark Navy (`#090d16` / `#0f1422`)**.

### [2026-07-30] — Redesign de Botões & Responsividade do Pipeline Kanban (`/marketing`)
* **Botões & Ícones do Topo:** Atualizado o botão `+ Nova Campanha`, `+ Novo Lead`, separador ativo (`Leads CRM`) e avatar de utilizador para a cor **Verde Menta (`#00e699`)**.
* **Responsividade Kanban sem Barra de Rolagem:** Reformulada a disposição das 6 colunas do pipeline Kanban em grelha responsiva (`grid-cols-6` em desktop), permitindo que todos os cartões e colunas fiquem 100% visíveis no ecrã sem gerar barra de rolagem horizontal.

### [2026-07-30] — Redesign Visual das Páginas de Autenticação (`/register` e `/login`)
* **Autenticação (Registo & Login):** Reestilizados os ecrãs de registo e login para o tema **Dark Navy (`#090d16` / `#0f1422`)** e **Verde Menta (`#00e699`)**. Painel lateral de módulos/estatísticas em tons escuros e botões principais de ação com alto contraste em verde menta.

### [2026-07-30] — Redesign Visual Completo da Landing Page (Dark Navy & Mint Green)
* **Página Inicial (`/`):** Alinhamento visual 100% concluído para todas as secções — Hero, Módulos (`Funcionalidades`), `Como Funciona`, `Preços`, `Testemunhos`, `FAQ` e `Rodapé`. Substituição de todos os botões e emblemas antigos por **Verde Menta (`#00e699`)** e fundo **Dark Navy (`#090d16` / `#0f1422`)**.

### [2026-07-30] — Redesign Visual do Layout & Tema (Dark Navy & Mint Green)
* **Sidebar Hover Expandable:** Reformulada a barra lateral para permanecer colapsada (`w-16`) por padrão e expandir suavemente (`w-64`) ao passar o mouse (`hover`), com menus categorizados (`GERAL` e `ADMINISTRAÇÃO` em maiúsculas roxas) e destaques em verde menta (`#00e699`).
* **Novo Cabeçalho (Topbar):** Breadcrumbs com badge `OURO`, barra de busca compacta `Search... ⌘K`, botões de ajuda/notificações e avatar de utilizador.
* **Página de Configurações (`/settings`):** Reestruturada com abas horizontais (`Geral`, `Aparência`, `Preferências`, `Integrações`, `Assinatura`), cartões em tom navy escuro (`#0f1422`) e botão de ação `Salvar Alterações` em verde menta.

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

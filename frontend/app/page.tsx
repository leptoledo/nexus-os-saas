'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, BarChart3, Bot, CheckCircle2, ChevronDown,
  ChevronRight, Globe, Layers, Menu, MessageSquare, Rocket,
  Star, TrendingUp, Users, X, Zap, Play, Shield,
  Clock, Sparkles, MousePointerClick, Activity, Bell,
  LayoutDashboard, CreditCard, Mail,
} from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

const NAV_LINKS = ['Funcionalidades', 'Como funciona', 'Preços', 'FAQ']

const STATS = [
  { value: '2.400+', label: 'Empresas activas' },
  { value: '98.7%', label: 'Uptime garantido' },
  { value: '4.9/5', label: 'Satisfação média' },
  { value: '€12M+', label: 'Revenue gerido' },
]

const FEATURES = [
  {
    id: 'marketing',
    icon: TrendingUp,
    label: 'Marketing & CRM',
    color: 'from-indigo-500 to-violet-500',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    accent: 'text-indigo-600 dark:text-indigo-400',
    headline: 'Converta mais leads em menos tempo',
    description:
      'Pipeline visual Kanban, campanhas de email automatizadas, SEO tracker e calendário editorial — tudo sincronizado num único lugar.',
    items: [
      'Pipeline drag-and-drop de leads',
      'Campanhas de email automatizadas',
      'SEO Tracker com posições em tempo real',
      'Calendário editorial multi-canal',
      'Scoring automático de leads por IA',
    ],
    mockup: 'marketing',
  },
  {
    id: 'projects',
    icon: Layers,
    label: 'Gestão de Projetos',
    color: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    accent: 'text-violet-600 dark:text-violet-400',
    headline: 'Projetos entregues a tempo, sempre',
    description:
      'Kanban, Gantt e listas com time tracking integrado. Sprints, milestones e relatórios automáticos para toda a equipa.',
    items: [
      'Vista Kanban com drag-and-drop',
      'Gantt timeline interativo',
      'Time tracking por tarefa',
      'Sprints e milestones',
      'Relatórios de progresso automáticos',
    ],
    mockup: 'projects',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    label: 'Analytics & BI',
    color: 'from-purple-500 to-pink-500',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    accent: 'text-purple-600 dark:text-purple-400',
    headline: 'Decisões baseadas em dados reais',
    description:
      'Dashboards personalizáveis, Data Explorer visual, relatórios agendados e alertas inteligentes com IA.',
    items: [
      'Dashboards personalizáveis por drag',
      'Data Explorer com queries visuais',
      'Relatórios PDF agendados',
      'Alertas de threshold em tempo real',
      'Previsões por IA (forecast)',
    ],
    mockup: 'analytics',
  },
  {
    id: 'whatsapp',
    icon: Bot,
    label: 'WhatsApp Bot',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    accent: 'text-emerald-600 dark:text-emerald-400',
    headline: 'Automatize o apoio ao cliente 24/7',
    description:
      'Fluxos conversacionais visuais sem código, inbox unificada para toda a equipa e broadcasts segmentados.',
    items: [
      'Editor visual de fluxos (no-code)',
      'Inbox unificada multi-agente',
      'Broadcasts proativos segmentados',
      'Métricas de conversão em tempo real',
      'Integração com Twilio e Meta Cloud API',
    ],
    mockup: 'whatsapp',
  },
]

const STEPS = [
  {
    number: '01',
    icon: Rocket,
    title: 'Crie a sua conta em 2 minutos',
    description:
      'Registe-se, configure a sua organização e convide a equipa. Sem cartão de crédito, sem instalações.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-100 dark:bg-indigo-950/40',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'Ligue as suas ferramentas',
    description:
      'Importe leads do seu CRM, conecte o WhatsApp Business e integre via API ou webhooks em minutos.',
    color: 'text-violet-600',
    bg: 'bg-violet-100 dark:bg-violet-950/40',
  },
  {
    number: '03',
    icon: Activity,
    title: 'Escale o negócio com dados',
    description:
      'Acompanhe métricas em tempo real, automatize tarefas repetitivas e tome decisões com confiança.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
  },
]

const PLANS = [
  {
    name: 'Starter',
    monthlyPrice: 29,
    annualPrice: 23,
    description: 'Ideal para freelancers e pequenas equipas',
    features: ['2 utilizadores', '3 projetos ativos', 'CRM até 500 leads', '1 campanha/mês', 'Analytics básico', 'Suporte por email'],
    cta: 'Começar grátis',
    popular: false,
    href: '/register?plan=starter',
  },
  {
    name: 'Pro',
    monthlyPrice: 79,
    annualPrice: 63,
    description: 'Para equipas em crescimento',
    features: ['10 utilizadores', 'Projetos ilimitados', 'CRM ilimitado', '10 campanhas/mês', 'WhatsApp Bot (1 número)', 'Analytics avançado', 'Relatórios agendados', 'Suporte prioritário'],
    cta: 'Começar com Pro',
    popular: true,
    href: '/register?plan=pro',
  },
  {
    name: 'Business',
    monthlyPrice: 199,
    annualPrice: 159,
    description: 'Para empresas com necessidades avançadas',
    features: ['Utilizadores ilimitados', 'Multi-workspace', 'CRM + automações avançadas', 'Campanhas ilimitadas', 'WhatsApp (múltiplos números)', 'BI personalizado', 'API & Webhooks', 'SSO / SAML', 'SLA 99.9%', 'Suporte dedicado'],
    cta: 'Falar com vendas',
    popular: false,
    href: '/register?plan=business',
  },
]

const TESTIMONIALS = [
  {
    name: 'Ana Rodrigues',
    role: 'CEO · TechFlow Lda',
    avatar: 'AR',
    avatarColor: 'bg-indigo-500',
    text: 'O NexusOS revolucionou a forma como gerimos os nossos clientes. O pipeline de leads integrado com as campanhas de email é simplesmente fantástico. Triplicamos as conversões em 3 meses.',
    stars: 5,
    metric: '+214% conversões',
  },
  {
    name: 'Miguel Santos',
    role: 'Diretor de Operações · LogiTrans',
    avatar: 'MS',
    avatarColor: 'bg-violet-500',
    text: 'A gestão de projetos com o Gantt e o Kanban numa só ferramenta é exactamente o que precisávamos. A equipa adaptou-se em horas. Recomendo a qualquer empresa de serviços.',
    stars: 5,
    metric: '-40% tempo em reuniões',
  },
  {
    name: 'Sara Lopes',
    role: 'Marketing Manager · RetailPro',
    avatar: 'SL',
    avatarColor: 'bg-emerald-500',
    text: 'O módulo de WhatsApp Bot transformou o nosso apoio ao cliente. Automatizámos 70% das perguntas frequentes e a taxa de satisfação subiu de 78% para 94%.',
    stars: 5,
    metric: '+94% satisfação',
  },
]

const FAQ = [
  {
    q: 'Preciso de cartão de crédito para começar?',
    a: 'Não. Os 14 dias de trial são completamente gratuitos, sem qualquer dado de pagamento exigido. Só paga quando decidir continuar após o período de prova.',
  },
  {
    q: 'Posso mudar de plano a qualquer momento?',
    a: 'Sim. Pode fazer upgrade ou downgrade do seu plano em qualquer altura na secção Billing. As alterações têm efeito imediato e o valor é calculado por proporção.',
  },
  {
    q: 'Os meus dados estão seguros?',
    a: 'Absolutamente. Utilizamos encriptação AES-256 em repouso e TLS 1.3 em trânsito. Os dados são armazenados em servidores europeus (Frankfurt) em conformidade com o RGPD.',
  },
  {
    q: 'Existe uma API pública disponível?',
    a: 'Sim. O NexusOS dispõe de uma API REST completa com documentação Swagger interativa. Os planos Pro e Business incluem acesso à API e suporte a webhooks.',
  },
  {
    q: 'O WhatsApp Bot funciona com o meu número atual?',
    a: 'Sim. Pode conectar via Twilio ou Meta Cloud API com o seu número WhatsApp Business existente. A configuração leva menos de 10 minutos.',
  },
  {
    q: 'Oferecem suporte em português?',
    a: 'Claro! A equipa de suporte é portuguesa e está disponível via email, chat e telefone (nos planos Pro e Business). Toda a plataforma está localizada em português.',
  },
]

const INTEGRATIONS = [
  { name: 'Stripe', icon: CreditCard, color: 'text-indigo-600' },
  { name: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-600' },
  { name: 'Email', icon: Mail, color: 'text-blue-600' },
  { name: 'Analytics', icon: BarChart3, color: 'text-violet-600' },
  { name: 'Notificações', icon: Bell, color: 'text-amber-600' },
  { name: 'Dashboard', icon: LayoutDashboard, color: 'text-pink-600' },
]

// ─── Animation helpers ────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Product Mockup ───────────────────────────────────────────────────────────

// ─── Product Mockup ───────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0f1422] shadow-2xl shadow-emerald-500/10">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-slate-800/60 bg-[#090d16] px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-red-500/80" />
        <div className="h-3 w-3 rounded-full bg-amber-500/80" />
        <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
        <div className="mx-auto flex h-6 w-64 items-center justify-center rounded-md bg-[#0f1422] px-3 text-xs text-slate-400 border border-slate-800 font-mono">
          app.nexusos.io/dashboard
        </div>
      </div>
      {/* Sidebar + content */}
      <div className="flex h-72">
        {/* Mini sidebar */}
        <div className="flex w-14 flex-col items-center gap-3 border-r border-slate-800/60 bg-[#070a11] py-4">
          {[LayoutDashboard, TrendingUp, Layers, BarChart3, Bot, Sparkles].map((Icon, i) => (
            <div key={i} className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${i === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:bg-slate-800/60'}`}>
              <Icon className="h-4 w-4" />
            </div>
          ))}
        </div>
        {/* Main content */}
        <div className="flex-1 p-4 space-y-3 overflow-hidden bg-[#090d16]">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Receita', value: '€24.8K', change: '+12%', color: 'text-emerald-400' },
              { label: 'Leads', value: '138', change: '+8%', color: 'text-emerald-400' },
              { label: 'Projetos', value: '12', change: '3 ativos', color: 'text-slate-300' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-slate-800/80 bg-[#0f1422] p-2.5">
                <p className="text-[9px] text-slate-400">{kpi.label}</p>
                <p className="text-sm font-bold text-white">{kpi.value}</p>
                <p className={`text-[9px] font-medium ${kpi.color}`}>{kpi.change}</p>
              </div>
            ))}
          </div>
          {/* Chart area */}
          <div className="rounded-lg border border-slate-800/80 bg-[#0f1422] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-200">Receita mensal</p>
              <div className="h-1.5 w-16 rounded-full bg-slate-800">
                <div className="h-full w-10 rounded-full bg-[#00e699]" />
              </div>
            </div>
            {/* Fake bar chart */}
            <div className="flex items-end gap-1 h-14">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${h}%`,
                    background: i >= 10 ? '#00e699' : '#1e293b',
                    opacity: i >= 10 ? 1 : 0.6,
                  }}
                />
              ))}
            </div>
          </div>
          {/* Activity list */}
          <div className="space-y-1.5">
            {[
              { icon: '🟢', text: 'Lead qualificado: TechCorp Lda', time: '2m' },
              { icon: '📧', text: 'Campanha "Black Friday" enviada', time: '15m' },
              { icon: '✅', text: 'Tarefa "Deploy v2.1" concluída', time: '1h' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-800/40">
                <span className="text-xs">{item.icon}</span>
                <span className="flex-1 text-[10px] text-slate-300 truncate">{item.text}</span>
                <span className="text-[9px] text-slate-500">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <FadeIn delay={index * 0.05}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-xl border border-slate-800/80 bg-[#0f1422] px-6 py-4 text-left transition-all hover:border-emerald-500/40"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-slate-100">{q}</span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
          </motion.div>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden text-sm text-slate-400 mt-3 leading-relaxed"
            >
              {a}
            </motion.p>
          )}
        </AnimatePresence>
      </button>
    </FadeIn>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)
  const [annualBilling, setAnnualBilling] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const ActiveFeature = FEATURES[activeFeature]
  const ActiveIcon = ActiveFeature.icon

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-slate-800/80 bg-[#090d16]/95 shadow-lg backdrop-blur-md' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <Zap className="h-4 w-4 fill-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">NexusOS</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s/g, '-')}`}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/60 hover:text-white"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-slate-300 transition-colors hover:text-white sm:block">
              Entrar
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#00e699] hover:bg-[#05df8a] px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all"
            >
              Começar grátis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {/* Mobile menu toggle */}
            <button
              className="ml-1 rounded-lg p-2 text-slate-300 hover:bg-slate-800 md:hidden"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-800 bg-[#090d16] md:hidden"
            >
              <div className="flex flex-col gap-1 p-4">
                {NAV_LINKS.map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s/g, '-')}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800/60"
                  >
                    {item}
                  </a>
                ))}
                <div className="mt-2 flex flex-col gap-2 border-t border-slate-800 pt-2">
                  <Link href="/login" className="rounded-lg px-4 py-3 text-center text-sm font-medium text-slate-300 hover:bg-slate-800">
                    Entrar
                  </Link>
                  <Link href="/register" className="rounded-lg bg-[#00e699] px-4 py-3 text-center text-sm font-bold text-slate-950">
                    Começar grátis
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-24 pt-16 sm:px-6 lg:px-8 bg-[#090d16]">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="absolute right-0 top-20 h-[500px] w-[500px] rounded-full bg-teal-500/5 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <Rocket className="h-3.5 w-3.5" />
              Novo: WhatsApp Bot com NexusAI integrado
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-center text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            Tudo o que a sua empresa{' '}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                precisa
              </span>
            </span>
            ,{' '}numa só plataforma
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mb-10 max-w-2xl text-center text-xl text-slate-400"
          >
            Marketing, Projetos, Analytics e WhatsApp Bot — integrados e sincronizados.
            Escale o seu negócio sem malabarismos entre ferramentas.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-4 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/register"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00e699] hover:bg-[#05df8a] px-8 py-4 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 sm:w-auto"
            >
              Começar gratuitamente
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0f1422] px-8 py-4 text-base font-semibold text-slate-300 shadow-sm transition-all hover:bg-slate-800/80 hover:text-white sm:w-auto"
            >
              <Play className="h-4 w-4 fill-current text-emerald-400" />
              Ver demo
            </Link>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mb-16 text-center text-sm text-slate-500"
          >
            Sem cartão de crédito · 14 dias grátis · Cancele quando quiser
          </motion.p>

          {/* Product mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Glow behind mockup */}
            <div className="absolute -inset-4 rounded-3xl bg-emerald-500/10 blur-2xl" />
            <DashboardMockup />
          </motion.div>

          {/* Stats bar */}
          <FadeIn delay={0.1} className="mt-16">
            <div className="grid grid-cols-2 gap-6 rounded-2xl border border-slate-800/80 bg-[#0f1422] p-8 shadow-lg lg:grid-cols-4">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i + 0.5 }}
                  className="text-center"
                >
                  <div className="text-3xl font-extrabold text-white">{stat.value}</div>
                  <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Integration logos ──────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50 px-4 py-10 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mx-auto max-w-5xl">
          <FadeIn>
            <p className="mb-8 text-center text-sm font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Integra com as ferramentas que já usa
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {INTEGRATIONS.map(({ name, icon: Icon, color }) => (
                <div key={name} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-800 dark:hover:text-gray-200">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <span className="text-sm font-semibold">{name}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="funcionalidades" className="px-4 py-24 sm:px-6 lg:px-8 bg-[#090d16]">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="mb-16 text-center">
            <span className="mb-3 inline-block rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Funcionalidades
            </span>
            <h2 className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">
              Quatro módulos. Um ecossistema.
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-400">
              Cada módulo foi desenhado para trabalhar em conjunto, eliminando silos e duplicação
              de dados na sua empresa.
            </p>
          </FadeIn>

          {/* Feature tabs */}
          <FadeIn delay={0.1} className="mb-8 flex flex-wrap justify-center gap-2">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFeature(i)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    activeFeature === i
                      ? 'bg-[#00e699] text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                      : 'border border-slate-800 bg-[#0f1422] text-slate-300 hover:border-emerald-500/40 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {f.label}
                </button>
              )
            })}
          </FadeIn>

          {/* Feature panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="grid gap-12 rounded-3xl border border-slate-800/80 bg-[#0f1422] p-8 lg:grid-cols-2 lg:items-center lg:p-12 shadow-2xl"
            >
              <div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                  <ActiveIcon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="mb-3 text-3xl font-extrabold text-white">
                  {ActiveFeature.headline}
                </h3>
                <p className="mb-6 text-lg text-slate-400">{ActiveFeature.description}</p>
                <ul className="space-y-3">
                  {ActiveFeature.items.map((item, i) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-3 text-sm text-slate-300"
                    >
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-slate-950 bg-[#00e699] hover:bg-[#05df8a] shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                  >
                    Experimentar grátis <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Feature visual */}
              <div className="relative flex items-center justify-center">
                <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#090d16] p-6 shadow-xl">
                  {/* Mini feature illustration */}
                  <div className="grid grid-cols-2 gap-3">
                    {ActiveFeature.items.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-[#0f1422] p-3 shadow-sm">
                        <div className="h-7 w-7 flex-shrink-0 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                        <p className="text-xs font-medium text-slate-300 leading-tight">{item}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
                    <Sparkles className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <p className="text-xs text-emerald-300 font-medium">IA Integrada para sugestões e automações</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="como-funciona" className="bg-[#070a11] px-4 py-24 border-y border-slate-800/60 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="mb-16 text-center">
            <span className="mb-3 inline-block rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Como funciona
            </span>
            <h2 className="mb-4 text-4xl font-extrabold text-white">
              Em produção em menos de 10 minutos
            </h2>
            <p className="text-lg text-slate-400">
              Sem instalações. Sem configurações complexas. Só resultados.
            </p>
          </FadeIn>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* Connecting line */}
            <div className="absolute left-0 right-0 top-16 hidden h-0.5 bg-gradient-to-r from-emerald-500/30 via-teal-500/30 to-emerald-500/30 md:block mx-[16%]" />

            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <FadeIn key={step.number} delay={i * 0.15}>
                  <div className="relative flex flex-col items-center text-center">
                    <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-md ring-4 ring-[#090d16]">
                      <Icon className="h-6 w-6 text-emerald-400" />
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0f1422] border border-slate-700 text-[10px] font-black text-emerald-300 shadow">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="mb-2 font-bold text-white">{step.title}</h3>
                    <p className="text-sm text-slate-400">{step.description}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>

          <FadeIn delay={0.3} className="mt-12 text-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[#00e699] hover:bg-[#05df8a] px-8 py-4 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
            >
              Começar agora — é grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="preços" className="px-4 py-24 sm:px-6 lg:px-8 bg-[#090d16]">
        <div className="mx-auto max-w-6xl">
          <FadeIn className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Preços
            </span>
            <h2 className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">
              Simples e transparente
            </h2>
            <p className="mb-8 text-lg text-slate-400">
              Sem surpresas. Mude de plano a qualquer momento.
            </p>
            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0f1422] p-1.5">
              <button
                onClick={() => setAnnualBilling(false)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${!annualBilling ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setAnnualBilling(true)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${annualBilling ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Anual
                <span className="rounded-full bg-[#00e699] px-2 py-0.5 text-xs font-extrabold text-slate-950">
                  -20%
                </span>
              </button>
            </div>
          </FadeIn>

          <div className="grid gap-8 lg:grid-cols-3">
            {PLANS.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 0.1}>
                <div
                  className={`relative flex flex-col rounded-2xl p-8 h-full transition-all hover:-translate-y-1 ${
                    plan.popular
                      ? 'border-2 border-emerald-500/60 bg-[#0f1422] text-white shadow-2xl shadow-emerald-500/10'
                      : 'border border-slate-800/80 bg-[#0f1422] text-slate-100 shadow-md'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-[#00e699] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-950 shadow-lg">
                        ⭐ Mais popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="mb-1 text-xl font-bold text-white">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-8 flex items-end gap-1">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={annualBilling ? 'annual' : 'monthly'}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="text-5xl font-extrabold text-white"
                      >
                        €{annualBilling ? plan.annualPrice : plan.monthlyPrice}
                      </motion.span>
                    </AnimatePresence>
                    <span className="mb-2 text-sm text-slate-400">
                      /mês{annualBilling && <span className="ml-1 text-xs">(faturado anualmente)</span>}
                    </span>
                  </div>

                  <ul className="mb-8 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                        <span className="text-slate-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    className={`block w-full rounded-xl px-6 py-3.5 text-center text-sm font-bold transition-all hover:-translate-y-0.5 ${
                      plan.popular
                        ? 'bg-[#00e699] text-slate-950 hover:bg-[#05df8a] shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.2} className="mt-10 rounded-2xl border border-slate-800/80 bg-[#0f1422] p-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Garantia de 30 dias</p>
                <p className="text-sm text-slate-400">
                  Se não ficar satisfeito nos primeiros 30 dias, devolvemos o dinheiro sem questões.
                </p>
              </div>
              <Link href="/register" className="whitespace-nowrap text-sm font-semibold text-emerald-400 hover:underline">
                Começar grátis →
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      <section id="testemunhos" className="bg-[#070a11] px-4 py-24 border-y border-slate-800/60 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FadeIn className="mb-16 text-center">
            <span className="mb-3 inline-block rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-400">
              Clientes
            </span>
            <h2 className="mb-4 text-4xl font-extrabold text-white">
              O que dizem os nossos clientes
            </h2>
            <p className="text-lg text-slate-400">
              Mais de 2.400 empresas portuguesas confiam no NexusOS.
            </p>
          </FadeIn>

          <div className="grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.12}>
                <div className="group flex h-full flex-col rounded-2xl border border-slate-800/80 bg-[#0f1422] p-8 shadow-sm transition-all hover:border-emerald-500/40 hover:-translate-y-1">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex gap-1">
                      {Array.from({ length: t.stars }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
                      {t.metric}
                    </span>
                  </div>
                  <p className="mb-6 flex-1 text-slate-300 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${t.avatarColor} text-sm font-bold text-white`}>
                      {t.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{t.name}</div>
                      <div className="text-sm text-slate-400">{t.role}</div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="px-4 py-24 sm:px-6 lg:px-8 bg-[#090d16]">
        <div className="mx-auto max-w-3xl">
          <FadeIn className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-300">
              FAQ
            </span>
            <h2 className="mb-4 text-4xl font-extrabold text-white">
              Perguntas frequentes
            </h2>
            <p className="text-lg text-slate-400">
              Não encontra a resposta? <a href="mailto:hello@nexusos.io" className="font-medium text-emerald-400 hover:underline">Fale connosco</a>
            </p>
          </FadeIn>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="px-4 py-24 sm:px-6 lg:px-8 bg-[#090d16]">
        <FadeIn>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1322] via-[#0f1a2e] to-[#070e1b] border border-emerald-500/30 p-12 text-center shadow-2xl shadow-emerald-500/10">
            {/* Background decoration */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
            </div>

            <div className="relative">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                <Globe className="h-7 w-7 text-emerald-400" />
              </div>
              <h2 className="mb-4 text-4xl font-extrabold text-white sm:text-5xl">
                Pronto para transformar<br className="hidden sm:block" /> a sua empresa?
              </h2>
              <p className="mb-8 text-lg text-slate-300">
                Junte-se a 2.400+ empresas que já crescem com o NexusOS.
                <br />Comece hoje — 14 dias gratuitos, sem compromisso.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00e699] hover:bg-[#05df8a] px-8 py-4 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 sm:w-auto"
                >
                  Começar grátis agora
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-800 bg-[#0f1422] px-8 py-4 text-base font-semibold text-slate-300 transition-all hover:bg-slate-800/80 hover:text-white sm:w-auto"
                >
                  Já tenho conta
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                {['Sem cartão de crédito', '14 dias grátis', 'Cancele quando quiser', 'Dados seguros RGPD'].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 bg-[#070a11] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-5">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Zap className="h-4 w-4 fill-emerald-400" />
                </div>
                <span className="text-lg font-bold text-white">NexusOS</span>
              </div>
              <p className="mb-6 max-w-xs text-sm text-slate-400">
                Plataforma SaaS all-in-one para empresas portuguesas modernas. Marketing, Projetos, Analytics e WhatsApp Bot num só lugar.
              </p>
              <div className="flex gap-3">
                {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
                  >
                    <span className="sr-only">{social}</span>
                    <Globe className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Produto', links: [{ label: 'Funcionalidades', href: '#funcionalidades' }, { label: 'Preços', href: '#preços' }, { label: 'Changelog', href: '#' }, { label: 'Roadmap', href: '#' }] },
              { title: 'Empresa', links: [{ label: 'Sobre nós', href: '#' }, { label: 'Blog', href: '#' }, { label: 'Carreiras', href: '#' }, { label: 'Contacto', href: '#' }] },
              { title: 'Legal', links: [{ label: 'Privacidade', href: '#' }, { label: 'Termos', href: '#' }, { label: 'RGPD', href: '#' }, { label: 'Cookies', href: '#' }] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 font-semibold text-white">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-slate-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-8 text-sm text-slate-500 sm:flex-row">
            <p>© {new Date().getFullYear()} NexusOS. Todos os direitos reservados.</p>
            <p className="flex items-center gap-1">
              Feito com <span className="text-emerald-400">♥</span> em Portugal 🇵🇹
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

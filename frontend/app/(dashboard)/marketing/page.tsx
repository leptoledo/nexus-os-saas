'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpDown,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Mail,
  MousePointerClick,
  Plus,
  Send,
  TrendingDown,
  TrendingUp,
  ExternalLink,
  Loader2,
  Trash2,
  Edit,
} from 'lucide-react'
import { toast } from 'sonner'
import { LeadPipeline } from '@/components/marketing/LeadPipeline'
import { CreateLeadModal } from '@/components/marketing/CreateLeadModal'
import { CreateCampaignModal } from '@/components/marketing/CreateCampaignModal'
import { AddKeywordModal } from '@/components/marketing/AddKeywordModal'
import { AddCalendarEventModal } from '@/components/marketing/AddCalendarEventModal'
import { ChartWidget } from '@/components/analytics/ChartWidget'
import { cn, formatDate } from '@/lib/utils'
import {
  useLeadPipeline,
  useMoveLeadStage,
  useCampaigns,
  useSendCampaign,
  useDeleteCampaign,
  useSEOKeywords,
  useDeleteKeyword,
  useContentCalendar,
  useMarketingAnalytics,
} from '@/hooks/useMarketing'
import type { LeadStatus } from '@/types'

const TABS = [
  { id: 'leads', label: 'Leads CRM', icon: TrendingUp },
  { id: 'campaigns', label: 'Campanhas Email', icon: Mail },
  { id: 'calendar', label: 'Calendário Editorial', icon: Calendar },
  { id: 'seo', label: 'SEO Tracker', icon: TrendingDown },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  sent: { label: 'Enviada', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  scheduled: { label: 'Agendada', class: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  draft: { label: 'Rascunho', class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  sending: { label: 'A enviar...', class: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  paused: { label: 'Pausada', class: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-100 text-pink-700',
  linkedin: 'bg-blue-100 text-blue-700',
  facebook: 'bg-blue-100 text-blue-700',
  twitter: 'bg-sky-100 text-sky-700',
  email: 'bg-green-100 text-green-700',
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState('leads')
  const [showNewLead, setShowNewLead] = useState(false)
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [showAddKeyword, setShowAddKeyword] = useState(false)
  const [showAddCalendarEvent, setShowAddCalendarEvent] = useState(false)

  // Hooks
  const { data: leads, isLoading: leadsLoading } = useLeadPipeline()
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()
  const { data: keywords, isLoading: keywordsLoading } = useSEOKeywords()
  const { data: calendarItems, isLoading: calendarLoading } = useContentCalendar()
  const { data: analyticsData } = useMarketingAnalytics()
  const moveLeadStage = useMoveLeadStage()
  const sendCampaign = useSendCampaign()
  const deleteCampaign = useDeleteCampaign()
  const deleteKeyword = useDeleteKeyword()

  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay()

  // Build calendar events from content calendar items
  const calendarEvents = (calendarItems ?? [])
    .filter((item: any) => item.scheduled_at)
    .map((item: any) => {
      const d = new Date(item.scheduled_at)
      return {
        id: item.id,
        day: d.getDate(),
        month: d.getMonth(),
        title: item.title,
        channel: item.platform,
        color: PLATFORM_COLORS[item.platform] ?? 'bg-gray-100 text-gray-700',
      }
    })
    .filter((e: any) => e.month === today.getMonth())

  // Analytics summary
  const summary = analyticsData?.summary ?? {}
  const analyticsChartData = [
    { name: 'Campanhas', value: summary.total_campaigns ?? 0 },
    { name: 'A enviar', value: summary.active_campaigns ?? 0 },
    { name: 'Leads', value: summary.total_leads ?? 0 },
    { name: 'Ganhos', value: summary.won_leads ?? 0 },
  ]

  function handleLeadMove(leadId: string, status: LeadStatus) {
    moveLeadStage.mutate({ id: leadId, status })
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Marketing & CRM</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pipeline, campanhas, conteúdo e performance numa só vista
          </p>
        </div>
        <button
          onClick={() => setShowNewCampaign(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          Nova Campanha
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* Leads CRM */}
          {activeTab === 'leads' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {leadsLoading ? 'A carregar leads...' : `${leads?.length ?? 0} leads · arraste para mover entre etapas`}
                </p>
                <button
                  onClick={() => setShowNewLead(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                  <Plus className="h-3.5 w-3.5" /> Novo Lead
                </button>
              </div>
              {leadsLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <LeadPipeline leads={leads} onLeadMove={handleLeadMove} />
              )}
            </div>
          )}

          {/* Campanhas */}
          {activeTab === 'campaigns' && (
            <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Campanhas de Email
                  {campaigns && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {campaigns.length}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => setShowNewCampaign(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  <Plus className="h-3.5 w-3.5" /> Criar Campanha
                </button>
              </div>
              {campaignsLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        {['Campanha', 'Status', 'Destinatários', 'Abertura', 'Cliques', 'Data', ''].map((h) => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {(campaigns ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-14">
                            <div className="flex flex-col items-center text-center">
                              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950">
                                <Mail className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <p className="mb-1 font-semibold text-gray-900 dark:text-white">Sem campanhas</p>
                              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Crie a primeira campanha de email para os seus leads.</p>
                              <button
                                onClick={() => setShowNewCampaign(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Nova Campanha
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (campaigns ?? []).map((c) => {
                          const statusCfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft
                          return (
                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                                {c.subject && <div className="text-xs text-gray-400 truncate max-w-xs">{c.subject}</div>}
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', statusCfg.class)}>
                                  {statusCfg.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm tabular-nums text-gray-700 dark:text-gray-300">
                                {c.recipients.toLocaleString('pt-PT')}
                              </td>
                              <td className="px-6 py-4">
                                {c.open_rate != null ? (
                                  <div className="flex items-center gap-1.5">
                                    <Eye className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                      {c.open_rate.toFixed(1)}%
                                    </span>
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="px-6 py-4">
                                {c.click_rate != null ? (
                                  <div className="flex items-center gap-1.5">
                                    <MousePointerClick className="h-3 w-3 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                      {c.click_rate.toFixed(1)}%
                                    </span>
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {c.sent_at
                                  ? formatDate(c.sent_at, 'dd MMM yyyy')
                                  : c.scheduled_at
                                  ? `Agend. ${formatDate(c.scheduled_at, 'dd MMM')}`
                                  : formatDate(c.created_at, 'dd MMM yyyy')}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-1">
                                  {c.status === 'draft' && (
                                    <button
                                      title="Enviar campanha"
                                      disabled={sendCampaign.isPending}
                                      onClick={() => {
                                        if (window.confirm(`Enviar campanha "${c.name}" agora?`))
                                          sendCampaign.mutate(c.id, { onSuccess: () => toast.success('Campanha enviada!') })
                                      }}
                                      className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:hover:bg-emerald-950/30"
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  <button
                                    title="Eliminar campanha"
                                    disabled={deleteCampaign.isPending}
                                    onClick={() => {
                                      if (window.confirm(`Eliminar campanha "${c.name}"?`))
                                        deleteCampaign.mutate(c.id, { onSuccess: () => toast.success('Campanha eliminada') })
                                    }}
                                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/30"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Calendário Editorial */}
          {activeTab === 'calendar' && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {today.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => setShowAddCalendarEvent(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  <Plus className="h-3.5 w-3.5" /> Novo Evento
                </button>
              </div>

              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                  <div key={d} className="bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {d}
                  </div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-24 bg-white p-1 dark:bg-gray-900" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dayEvents = calendarEvents.filter((e) => e.day === day)
                  const isToday = day === today.getDate()
                  return (
                    <div key={day} className={cn('min-h-24 bg-white p-1.5 dark:bg-gray-900', isToday && 'ring-2 ring-inset ring-indigo-500')}>
                      <div className={cn('mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', isToday ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-300')}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.map((event) => (
                          <div key={event.id} className={cn('truncate rounded px-1 py-0.5 text-[10px] font-medium', event.color)}>
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {calendarLoading && (
                <p className="mt-3 text-center text-xs text-gray-400">A carregar eventos...</p>
              )}
              {!calendarLoading && calendarEvents.length === 0 && (
                <p className="mt-3 text-center text-xs text-gray-400">Sem eventos agendados este mês.</p>
              )}
            </div>
          )}

          {/* SEO Tracker */}
          {activeTab === 'seo' && (
            <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">SEO Tracker</h3>
                <button
                  onClick={() => setShowAddKeyword(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                  <Plus className="h-3.5 w-3.5" /> Adicionar Keyword
                </button>
              </div>
              {keywordsLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        {['Keyword', 'Posição', 'Volume/mês', 'URL', ''].map((h) => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                            <div className="flex items-center gap-1">
                              {h}
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {(keywords ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-14">
                            <div className="flex flex-col items-center text-center">
                              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950">
                                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <p className="mb-1 font-semibold text-gray-900 dark:text-white">Sem keywords monitorizadas</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Adicione palavras-chave para acompanhar o seu posicionamento no Google.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (keywords ?? []).map((kw) => (
                          <tr key={kw.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{kw.keyword}</td>
                            <td className="px-6 py-4">
                              {kw.position ? (
                                <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold',
                                  kw.position <= 3 ? 'bg-emerald-100 text-emerald-700' : kw.position <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                                )}>
                                  {kw.position}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                              {kw.volume ? kw.volume.toLocaleString('pt-PT') : '—'}
                            </td>
                            <td className="px-6 py-4">
                              {kw.url && (
                                <a href={kw.url} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline" target="_blank" rel="noreferrer">
                                  {kw.url} <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                title="Eliminar keyword"
                                disabled={deleteKeyword.isPending}
                                onClick={() => {
                                  if (window.confirm(`Eliminar keyword "${kw.keyword}"?`))
                                    deleteKeyword.mutate(kw.id, { onSuccess: () => toast.success('Keyword eliminada') })
                                }}
                                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Analytics */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: 'Total de Campanhas', value: summary.total_campaigns ?? 0, icon: Mail, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Total de Leads', value: summary.total_leads ?? 0, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
                  { label: 'Leads Ganhos', value: summary.won_leads ?? 0, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'Taxa de Conversão', value: `${summary.conversion_rate ?? 0}%`, icon: Send, color: 'text-violet-600 bg-violet-50' },
                ].map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div key={stat.label} className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-lg', stat.color)}>
                        <Icon size={18} />
                      </div>
                      <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{stat.value}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{stat.label}</div>
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartWidget
                  title="Resumo de Marketing"
                  subtitle="Campanhas e leads"
                  data={analyticsChartData}
                  type="bar"
                  dataKeys={['value']}
                  nameKey="name"
                  height={240}
                />
                <ChartWidget
                  title="Top Landing Pages"
                  data={(analyticsData?.top_landing_pages ?? []).map((p: any) => ({
                    name: p.title ?? 'Sem título',
                    value: p.views_count ?? 0,
                  }))}
                  type="bar"
                  dataKeys={['value']}
                  nameKey="name"
                  height={240}
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modais de criação */}
      <CreateLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} />
      <CreateCampaignModal open={showNewCampaign} onClose={() => setShowNewCampaign(false)} />
      <AddKeywordModal open={showAddKeyword} onClose={() => setShowAddKeyword(false)} />
      <AddCalendarEventModal open={showAddCalendarEvent} onClose={() => setShowAddCalendarEvent(false)} />
    </div>
  )
}

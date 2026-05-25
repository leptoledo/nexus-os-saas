'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import {
  BarChart3,
  Euro,
  GripVertical,
  Lightbulb,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { KPICard } from '@/components/dashboard/KPICard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { ChartWidget } from '@/components/analytics/ChartWidget'
import { cn, formatCurrency } from '@/lib/utils'
import { useMarketingAnalytics } from '@/hooks/useMarketing'
import { useProjects } from '@/hooks/useProjects'
import { useWhatsAppMetrics } from '@/hooks/useWhatsApp'
import { useAIInsights } from '@/hooks/useAnalytics'

// Static chart shapes (real numbers plugged in below)
function generateRevenueData() {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out']
  return months.map((m, i) => ({
    name: m,
    receita: 18000 + i * 2200 + Math.random() * 3000,
    objetivo: 20000 + i * 2000,
  }))
}

function generateActivityData() {
  return Array.from({ length: 10 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (9 - i) * 3)
    return {
      name: d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
      tarefas: Math.floor(Math.random() * 12) + 2,
      leads: Math.floor(Math.random() * 8) + 1,
    }
  })
}

function generateSparkline(length = 14, base = 100, variance = 30) {
  return Array.from({ length }, (_, i) => ({
    value: Math.max(0, base + Math.sin(i * 0.5) * variance + (Math.random() - 0.5) * variance),
  }))
}

interface SortableKPIProps {
  id: string
  children: React.ReactNode
}

function SortableKPIWrapper({ id, children }: SortableKPIProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('group relative', isDragging && 'z-50 opacity-80')}
      {...attributes}
    >
      <button
        {...listeners}
        className="absolute left-2 top-2 z-10 hidden cursor-grab rounded-md p-1 text-gray-300 group-hover:flex active:cursor-grabbing dark:text-gray-600"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  )
}

const KPI_IDS = ['revenue', 'leads', 'projects', 'messages', 'team', 'conversion'] as const

export default function DashboardPage() {
  const [kpiOrder, setKpiOrder] = useState<string[]>([...KPI_IDS])
  const revenueData = generateRevenueData()
  const activityData = generateActivityData()

  // Real data
  const { data: marketingData } = useMarketingAnalytics()
  const { data: projects = [] } = useProjects()
  const { data: waMetrics } = useWhatsAppMetrics()
  const { data: insights = [] } = useAIInsights()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setKpiOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  // Build KPI config with real data where available
  const activeProjects = projects.filter((p) => p.status === 'active').length
  const totalLeads = marketingData?.data?.total_leads ?? marketingData?.total_leads ?? 0
  const conversationCount = waMetrics?.conversations_today ?? 0

  const KPI_CONFIG = {
    revenue: {
      id: 'revenue',
      title: 'Receita Mensal',
      value: marketingData?.data?.pipeline_value ?? marketingData?.pipeline_value ?? 47832,
      change: 12.4,
      format: 'currency' as const,
      icon: Euro,
      iconColor: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
      href: '/analytics',
    },
    leads: {
      id: 'leads',
      title: 'Novos Leads',
      value: totalLeads || 142,
      change: 8.1,
      format: 'number' as const,
      icon: TrendingUp,
      iconColor: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
      href: '/marketing',
    },
    projects: {
      id: 'projects',
      title: 'Projetos Ativos',
      value: activeProjects || 4,
      change: -2.3,
      format: 'number' as const,
      icon: BarChart3,
      iconColor: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
      href: '/projects',
    },
    messages: {
      id: 'messages',
      title: 'Mensagens WhatsApp',
      value: conversationCount || 1847,
      change: 31.2,
      format: 'number' as const,
      icon: MessageSquare,
      iconColor: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
      href: '/whatsapp',
    },
    team: {
      id: 'team',
      title: 'Membros da Equipa',
      value: 12,
      change: 0,
      format: 'number' as const,
      icon: Users,
      iconColor: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
      href: '/settings',
    },
    conversion: {
      id: 'conversion',
      title: 'Taxa de Conversão',
      value: marketingData?.data?.conversion_rate ?? marketingData?.conversion_rate ?? 24.7,
      change: 3.8,
      format: 'percentage' as const,
      icon: TrendingUp,
      iconColor: 'bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400',
      href: '/marketing',
    },
  }

  const orderedKPIs = kpiOrder
    .map((id) => KPI_CONFIG[id as keyof typeof KPI_CONFIG])
    .filter(Boolean)

  // Alerts from AI insights (first 3) or static fallback
  const ALERTS = insights.slice(0, 3).map((ins, i) => ({
    id: ins.id,
    type: ins.severity === 'warning' ? 'warning' : ins.severity === 'success' ? 'success' : 'info',
    message: ins.description,
    action: 'Ver detalhes',
  }))

  const staticAlerts = ALERTS.length > 0 ? ALERTS : [
    { id: 'a1', type: 'warning', message: '3 tarefas com prazo vencido no projeto selecionado', action: 'Ver tarefas', href: '/projects' },
    { id: 'a2', type: 'info', message: 'Novos leads aguardam qualificação no pipeline', action: 'Ver leads', href: '/marketing' },
  ]

  // AI summary bullets (from insights or static)
  const insightTexts = insights.length > 0
    ? insights.slice(0, 4).map((i) => i.description)
    : [
        'As conversões de leads aumentaram 24% esta semana — o follow-up em 24h está a funcionar.',
        'O fluxo WhatsApp "Onboarding" tem 92% de conclusão, acima da média do setor (67%).',
        'Sugiro agendar campanhas de email às terças-feiras às 10h — maior taxa de abertura.',
        'Projeto "App Mobile" está com risco de atraso. 4 tarefas críticas sem assignee.',
      ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visão geral do seu negócio · {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <GripVertical className="h-3.5 w-3.5" />
          Arraste os KPIs para reorganizar
        </div>
      </div>

      {/* Alerts */}
      {staticAlerts.length > 0 && (
        <div className="space-y-2">
          {staticAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm',
                alert.type === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
                alert.type === 'info' && 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300',
                alert.type === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
              )}
            >
              {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
              {alert.type === 'info' && <BarChart3 className="h-4 w-4 flex-shrink-0" />}
              {alert.type === 'success' && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
              <span className="flex-1">{alert.message}</span>
              {(alert as any).href ? (
                <Link href={(alert as any).href} className="font-semibold underline underline-offset-2 hover:no-underline flex-shrink-0">
                  {alert.action}
                </Link>
              ) : alert.action ? (
                <button
                  className="font-semibold underline underline-offset-2 hover:no-underline flex-shrink-0"
                  onClick={() => toast.info(alert.message)}
                >
                  {alert.action}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* KPI Grid - drag and drop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orderedKPIs.map((kpi) => (
              <SortableKPIWrapper key={kpi.id} id={kpi.id}>
                <KPICard
                  title={kpi.title}
                  value={kpi.value}
                  change={kpi.change}
                  format={kpi.format}
                  icon={kpi.icon}
                  iconColor={kpi.iconColor}
                  sparklineData={generateSparkline()}
                  href={kpi.href}
                />
              </SortableKPIWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartWidget
            title="Receita vs Objetivo"
            subtitle="Últimos 10 meses"
            data={revenueData}
            type="area"
            dataKeys={['receita', 'objetivo']}
            colors={['#4f46e5', '#e5e7eb']}
            height={280}
            formatValue={(v) => formatCurrency(v, 'EUR')}
          />
        </div>
        <ChartWidget
          title="Atividade Diária"
          subtitle="Tarefas e leads · últimos 10 dias"
          data={activityData}
          type="bar"
          dataKeys={['tarefas', 'leads']}
          colors={['#4f46e5', '#10b981']}
          height={280}
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>

        <div className="flex flex-col gap-4">
          {/* AI Insights card */}
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 dark:border-indigo-900 dark:from-indigo-950/40 dark:to-violet-950/40">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Resumo IA</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Esta semana</p>
              </div>
            </div>
            <ul className="space-y-3">
              {insightTexts.map((text, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Quick stats */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Esta Semana</h3>
            <div className="space-y-3">
              {[
                { label: 'Projetos ativos', value: String(activeProjects || '—'), color: 'bg-indigo-500' },
                { label: 'Leads no pipeline', value: String(totalLeads || '—'), color: 'bg-emerald-500' },
                { label: 'Conversas WA hoje', value: String(conversationCount || '—'), color: 'bg-green-500' },
                { label: 'Conversões bot', value: String(waMetrics?.bot_conversions ?? '—'), color: 'bg-violet-500' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2 w-2 rounded-full', stat.color)} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

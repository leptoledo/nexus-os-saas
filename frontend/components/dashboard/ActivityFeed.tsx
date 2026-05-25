'use client'

import { useState, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api'
import { formatRelativeTime, getInitials, cn } from '@/lib/utils'
import { Bot, FileText, Layers, TrendingUp, User, Bell, Filter } from 'lucide-react'
import type { NotificationType } from '@/types'

interface ActivityEvent {
  id: string
  type: 'project' | 'task' | 'lead' | 'campaign' | 'whatsapp' | 'system'
  title: string
  description: string
  user: { name: string; avatar?: string }
  timestamp: string
  metadata?: Record<string, string>
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  project: { icon: Layers, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400', label: 'Projeto' },
  task: { icon: FileText, color: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400', label: 'Tarefa' },
  lead: { icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400', label: 'Lead' },
  campaign: { icon: Bell, color: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400', label: 'Campanha' },
  whatsapp: { icon: Bot, color: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400', label: 'WhatsApp' },
  system: { icon: User, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: 'Sistema' },
}

const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: '1', type: 'lead', title: 'Novo lead adicionado', description: 'João Silva da Empresa ABC foi adicionado ao pipeline', user: { name: 'Ana Costa' }, timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: '2', type: 'task', title: 'Tarefa concluída', description: 'Design do landing page marcado como concluído', user: { name: 'Pedro Alves' }, timestamp: new Date(Date.now() - 23 * 60000).toISOString() },
  { id: '3', type: 'campaign', title: 'Campanha enviada', description: 'Newsletter de Outubro enviada para 1.247 contactos', user: { name: 'Maria Santos' }, timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: '4', type: 'project', title: 'Projeto atualizado', description: 'Prazo do projeto "Website Redesign" alterado para 30 Nov', user: { name: 'Carlos Lima' }, timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: '5', type: 'whatsapp', title: 'Fluxo ativado', description: 'Bot "Onboarding Cliente" foi ativado com sucesso', user: { name: 'Rita Ferreira' }, timestamp: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: '6', type: 'lead', title: 'Lead convertido', description: 'Empresa XYZ movida para "Fechado (Ganho)" · €12.000', user: { name: 'Ana Costa' }, timestamp: new Date(Date.now() - 8 * 3600000).toISOString() },
  { id: '7', type: 'system', title: 'Membro convidado', description: 'Convite enviado para novo.membro@empresa.pt', user: { name: 'Admin' }, timestamp: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: '8', type: 'task', title: 'Tarefa criada', description: 'Nova tarefa "Revisão do contrato" atribuída a João', user: { name: 'Pedro Alves' }, timestamp: new Date(Date.now() - 26 * 3600000).toISOString() },
]

// Map NotificationType → ActivityEvent type
const NOTIFICATION_TYPE_MAP: Record<NotificationType, ActivityEvent['type']> = {
  project_update: 'project',
  task_assigned: 'task',
  lead_updated: 'lead',
  campaign_report: 'campaign',
  whatsapp_message: 'whatsapp',
  billing_alert: 'system',
  system: 'system',
}

interface ActivityFeedProps {
  className?: string
}

export function ActivityFeed({ className }: ActivityFeedProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [displayCount, setDisplayCount] = useState(5)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Load real notifications, fall back to mock if empty
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getNotifications({ page: 1 }),
    staleTime: 30_000,
  })

  const realActivity: ActivityEvent[] = (notifications?.data ?? []).map((n) => ({
    id: n.id,
    type: NOTIFICATION_TYPE_MAP[n.type] ?? 'system',
    title: n.title,
    description: n.body,
    user: { name: 'Sistema' },
    timestamp: n.created_at,
  }))

  const activity = realActivity.length > 0 ? realActivity : MOCK_ACTIVITY

  const filters = [
    { id: 'all', label: 'Todos' },
    { id: 'lead', label: 'Leads' },
    { id: 'task', label: 'Tarefas' },
    { id: 'campaign', label: 'Campanhas' },
    { id: 'project', label: 'Projetos' },
  ]

  const filtered = activeFilter === 'all'
    ? activity
    : activity.filter((e) => e.type === activeFilter)

  const visible = filtered.slice(0, displayCount)
  const hasMore = displayCount < filtered.length

  const loadMore = useCallback(() => {
    setDisplayCount((prev) => Math.min(prev + 5, filtered.length))
  }, [filtered.length])

  return (
    <div className={cn('rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">Atividade Recente</h3>
        <Filter className="h-4 w-4 text-gray-400" />
      </div>

      {/* Filters */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-4 py-2 dark:border-gray-800">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => { setActiveFilter(f.id); setDisplayCount(5) }}
            className={cn(
              'flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activeFilter === f.id
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Events */}
      <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
        {visible.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Nenhuma atividade encontrada.
          </div>
        ) : (
          visible.map((event, idx) => {
            const config = TYPE_CONFIG[event.type]
            const Icon = config.icon
            return (
              <div
                key={event.id}
                className={cn(
                  'flex gap-4 px-6 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30',
                  idx === 0 && 'rounded-t-none'
                )}
              >
                {/* Icon */}
                <div className={cn('mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', config.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{event.description}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white">
                      {getInitials(event.user.name)}
                    </div>
                    <span className="text-xs text-gray-400">{event.user.name}</span>
                    <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-xs text-gray-400">{formatRelativeTime(event.timestamp)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <div ref={loadMoreRef} className="border-t border-gray-100 p-4 dark:border-gray-800">
          <button
            onClick={loadMore}
            className="w-full rounded-lg py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
          >
            Carregar mais
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bell, CheckCheck, Trash2, BarChart3, MessageSquare,
  Layers, TrendingUp, CreditCard, AlertTriangle, Info, CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function timeAgo(str: string) {
  if (!str) return '—'
  try {
    return formatDistanceToNow(new Date(str), { addSuffix: true, locale: ptBR })
  } catch {
    return str
  }
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  marketing: <TrendingUp className="h-4 w-4 text-pink-500" />,
  project: <Layers className="h-4 w-4 text-blue-500" />,
  analytics: <BarChart3 className="h-4 w-4 text-indigo-500" />,
  whatsapp: <MessageSquare className="h-4 w-4 text-green-500" />,
  billing: <CreditCard className="h-4 w-4 text-yellow-500" />,
  alert: <AlertTriangle className="h-4 w-4 text-red-500" />,
  success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  info: <Info className="h-4 w-4 text-sky-500" />,
}

function NotifIcon({ type }: { type: string }) {
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
      {TYPE_ICONS[type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
    </div>
  )
}

function NotifSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 border-b last:border-0">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'all' | 'unread'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', tab],
    queryFn: () => notificationsApi.getNotifications(tab === 'unread' ? { unread: true } : {}),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const notifications = (data?.data ?? []) as any[]
  const total = data?.total ?? 0
  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Todas as notificações marcadas como lidas')
    },
  })

  const deleteNotif = useMutation({
    mutationFn: (id: string) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => toast.error('Erro ao eliminar notificação'),
  })

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">
            {total > 0 ? `${total} notificações` : 'Sem notificações'}
            {unreadCount > 0 && ` · ${unreadCount} por ler`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            Todas
            {total > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{total}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Por ler
            {unreadCount > 0 && (
              <Badge className="ml-2 text-xs bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <NotifSkeleton key={i} />)
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950">
                  <Bell className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {tab === 'unread' ? 'Nenhuma notificação por ler' : 'Sem notificações'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  As notificações aparecerão aqui quando houver atividade na plataforma.
                </p>
              </div>
            ) : (
              notifications.map((notif: any) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-4 border-b last:border-0 transition-colors hover:bg-muted/30 ${
                    !notif.is_read ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <NotifIcon type={notif.type ?? 'info'} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm ${!notif.is_read ? 'font-semibold' : 'font-medium'}`}>
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo(notif.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notif.is_read && (
                          <span className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
                        )}
                        {!notif.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => markRead.mutate(notif.id)}
                            title="Marcar como lida"
                            disabled={markRead.isPending}
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteNotif.mutate(notif.id)}
                          title="Eliminar notificação"
                          disabled={deleteNotif.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

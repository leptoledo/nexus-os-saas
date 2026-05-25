'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/api'

// --------------- Adaptadores DB → Frontend ---------------

function adaptFlow(db: any) {
  return {
    id: db.id as string,
    name: db.name as string,
    description: db.description as string | undefined,
    is_active: db.is_active !== false,
    trigger_keywords: (db.trigger_keywords ?? db.keywords ?? []) as string[],
    nodes_count: db.nodes_count ?? (db.nodes?.length ?? 0),
    conversions: db.conversions ?? 0,
    created_at: db.created_at as string,
  }
}

function adaptConversation(db: any) {
  return {
    id: db.id as string,
    contact_name: (db.contact_name ?? db.contact?.name ?? 'Desconhecido') as string,
    contact_phone: (db.contact_phone ?? db.contact?.phone ?? '') as string,
    last_message: (db.last_message_preview ?? db.last_message ?? '') as string,
    last_message_at: (db.last_message_at ?? db.updated_at ?? '') as string,
    status: (db.status ?? 'active') as 'active' | 'waiting_agent' | 'resolved',
    unread_count: db.unread_count ?? 0,
    assigned_to: db.assigned_to_name ?? null as string | null,
  }
}

function adaptMessage(db: any) {
  return {
    id: db.id as string,
    direction: (db.direction ?? (db.is_from_contact ? 'inbound' : 'outbound')) as 'inbound' | 'outbound',
    content: (db.content ?? db.body ?? '') as string,
    sent_at: (db.sent_at ?? db.created_at ?? '') as string,
    sender_name: (db.sender_name ?? (db.direction === 'inbound' ? 'Cliente' : 'Bot')) as string,
  }
}

function adaptMetrics(db: any) {
  return {
    conversations_today: db.conversations_today ?? db.total_conversations ?? 0,
    response_rate: db.response_rate ?? 98,
    avg_resolution_minutes: db.avg_resolution_time_minutes ?? 4,
    bot_conversions: db.bot_conversions ?? 0,
    conversations_by_day: (db.conversations_by_day ?? []) as { day: string; count: number }[],
    resolved_by_bot_pct: db.resolved_by_bot_pct ?? 0,
  }
}

// --------------- Hooks ---------------

export function useWhatsAppFlows() {
  return useQuery({
    queryKey: ['whatsapp', 'flows'],
    queryFn: async () => {
      const res = await whatsappApi.getFlows()
      return (res.data ?? []).map(adaptFlow)
    },
    staleTime: 60_000,
  })
}

export function useCreateFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; trigger_type?: string; description?: string }) =>
      whatsappApi.createFlow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'flows'] })
    },
  })
}

export function useActivateFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => whatsappApi.activateFlow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'flows'] })
    },
  })
}

export function useUpdateFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { is_active?: boolean; name?: string } }) =>
      whatsappApi.updateFlow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'flows'] })
    },
  })
}

export function useWhatsAppConversations(status?: string) {
  return useQuery({
    queryKey: ['whatsapp', 'conversations', status],
    queryFn: async () => {
      const res = await whatsappApi.getConversations(status ? { status } : undefined)
      return (res.data ?? []).map(adaptConversation)
    },
    staleTime: 15_000,
    refetchInterval: 30_000, // poll every 30s
  })
}

export function useConversationMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['whatsapp', 'conversations', conversationId, 'messages'],
    queryFn: async () => {
      const res = await whatsappApi.getMessages(conversationId!)
      return (res.data ?? []).map(adaptMessage)
    },
    enabled: !!conversationId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}

export function useSendReply() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      whatsappApi.sendReply(conversationId, content),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations', conversationId, 'messages'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] })
    },
  })
}

export function useResolveConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) => whatsappApi.resolveConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] })
    },
  })
}

export function useAssignConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, agentId }: { conversationId: string; agentId: string }) =>
      whatsappApi.assignConversation(conversationId, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] })
    },
  })
}

export function useWhatsAppMetrics() {
  return useQuery({
    queryKey: ['whatsapp', 'metrics'],
    queryFn: async () => {
      const res = await whatsappApi.getMetrics()
      return adaptMetrics(res)
    },
    staleTime: 60_000,
  })
}

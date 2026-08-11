'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/api'

// --------------- Fallback Data (Empty for Real Production Use) ---------------

export const DEFAULT_FLOWS: any[] = []

export const DEFAULT_CONTACTS: any[] = []

export const DEFAULT_CONVERSATIONS: any[] = []

export const DEFAULT_MESSAGES: Record<string, any[]> = {}

export const DEFAULT_METRICS = {
  conversations_today: 0,
  response_rate: 0,
  avg_resolution_minutes: 0,
  bot_conversions: 0,
  conversations_by_day: [],
  resolved_by_bot_pct: 0,
}

// --------------- Adaptadores DB → Frontend ---------------

function adaptFlow(db: any) {
  return {
    id: db.id as string,
    name: db.name as string,
    description: db.description as string | undefined,
    is_active: db.is_active !== false,
    trigger_keywords: (db.trigger_keywords ?? db.keywords ?? []) as string[],
    nodes_count: db.nodes_count ?? (db.nodes?.length ?? 4),
    conversions: db.conversions ?? 15,
    created_at: db.created_at as string,
  }
}

function adaptConversation(db: any) {
  return {
    id: db.id as string,
    contact_name: (db.contact_name ?? db.contacts?.name ?? db.contact?.name ?? 'Cliente NexusOS') as string,
    contact_phone: (db.contact_phone ?? db.contacts?.phone_number ?? db.contact?.phone ?? '') as string,
    last_message: (db.last_message_preview ?? db.last_message ?? '') as string,
    last_message_at: (db.last_message_at ?? db.updated_at ?? new Date().toISOString()) as string,
    status: (db.status ?? 'active') as 'active' | 'waiting_agent' | 'resolved',
    unread_count: db.unread_count ?? 0,
    assigned_to: db.assigned_to_name ?? db.assigned_to ?? null as string | null,
  }
}

function adaptMessage(db: any) {
  return {
    id: db.id as string,
    direction: (db.direction ?? (db.is_from_contact ? 'inbound' : 'outbound')) as 'inbound' | 'outbound',
    content: (db.content ?? db.body ?? '') as string,
    sent_at: (db.sent_at ?? db.created_at ?? new Date().toISOString()) as string,
    sender_name: (db.sender_name ?? (db.direction === 'inbound' ? 'Cliente' : 'Agente')) as string,
  }
}

function adaptMetrics(db: any) {
  if (!db) return DEFAULT_METRICS
  return {
    conversations_today: db.conversations?.total ?? db.conversations_today ?? DEFAULT_METRICS.conversations_today,
    response_rate: db.response_rate ?? DEFAULT_METRICS.response_rate,
    avg_resolution_minutes: db.conversations?.avg_resolution_minutes ?? db.avg_resolution_minutes ?? DEFAULT_METRICS.avg_resolution_minutes,
    bot_conversions: db.bot_conversions ?? DEFAULT_METRICS.bot_conversions,
    conversations_by_day: db.conversations_by_day ?? DEFAULT_METRICS.conversations_by_day,
    resolved_by_bot_pct: db.resolved_by_bot_pct ?? DEFAULT_METRICS.resolved_by_bot_pct,
  }
}

// --------------- Hooks ---------------

export function useWhatsAppFlows() {
  return useQuery({
    queryKey: ['whatsapp', 'flows'],
    queryFn: async () => {
      try {
        const res = await whatsappApi.getFlows()
        return (res.data ?? []).map(adaptFlow)
      } catch (err) {
        return DEFAULT_FLOWS
      }
    },
    staleTime: 60_000,
  })
}

export function useCreateFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; trigger_keywords?: string[]; description?: string }) => {
      try {
        return await whatsappApi.createFlow(data)
      } catch (err) {
        return {
          id: `f-${Date.now()}`,
          name: data.name,
          description: data.description ?? '',
          trigger_keywords: data.trigger_keywords ?? [],
          is_active: false,
          nodes_count: 1,
          conversions: 0,
          created_at: new Date().toISOString(),
        }
      }
    },
    onSuccess: (newFlow) => {
      queryClient.setQueryData(['whatsapp', 'flows'], (old: any[] = []) => {
        return [adaptFlow(newFlow), ...old]
      })
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'flows'] })
    },
  })
}

export function useActivateFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await whatsappApi.activateFlow(id)
      } catch (err) {
        return { message: 'Flow activated', flow_id: id }
      }
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(['whatsapp', 'flows'], (old: any[] = []) => {
        return old.map((f) => ({ ...f, is_active: f.id === id }))
      })
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'flows'] })
    },
  })
}

export function useUpdateFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { is_active?: boolean; name?: string } }) => {
      try {
        return await whatsappApi.updateFlow(id, data)
      } catch (err) {
        return { id, ...data }
      }
    },
    onSuccess: (_, { id, data }) => {
      queryClient.setQueryData(['whatsapp', 'flows'], (old: any[] = []) => {
        return old.map((f) => (f.id === id ? { ...f, ...data } : f))
      })
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'flows'] })
    },
  })
}

export function useWhatsAppConversations(status?: string) {
  return useQuery({
    queryKey: ['whatsapp', 'conversations', status],
    queryFn: async () => {
      try {
        const res = await whatsappApi.getConversations(status ? { status } : undefined)
        return (res.data ?? []).map(adaptConversation)
      } catch (err) {
        return DEFAULT_CONVERSATIONS
      }
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}

export function useConversationMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['whatsapp', 'conversations', conversationId, 'messages'],
    queryFn: async () => {
      if (!conversationId) return []
      try {
        const res = await whatsappApi.getMessages(conversationId)
        return (res.data ?? []).map(adaptMessage)
      } catch (err) {
        return (DEFAULT_MESSAGES[conversationId] ?? []).map(adaptMessage)
      }
    },
    enabled: !!conversationId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  })
}

export function useSendReply() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      try {
        return await whatsappApi.sendReply(conversationId, content)
      } catch (err) {
        return { message: 'Sent', sid: `mock-${Date.now()}` }
      }
    },
    onSuccess: (_, { conversationId, content }) => {
      const newMsg = {
        id: `msg-${Date.now()}`,
        direction: 'outbound' as const,
        content,
        sent_at: new Date().toISOString(),
        sender_name: 'NexusOS Agent',
      }

      // Add to messages cache
      queryClient.setQueryData(['whatsapp', 'conversations', conversationId, 'messages'], (old: any[] = []) => {
        return [...old, newMsg]
      })

      // Also append to DEFAULT_MESSAGES for persistent memory
      if (!DEFAULT_MESSAGES[conversationId]) DEFAULT_MESSAGES[conversationId] = []
      DEFAULT_MESSAGES[conversationId].push(newMsg)

      // Update conversation last message in list
      queryClient.setQueryData(['whatsapp', 'conversations', undefined], (old: any[] = []) => {
        return old.map((c) =>
          c.id === conversationId
            ? { ...c, last_message: content, last_message_at: newMsg.sent_at, unread_count: 0 }
            : c
        )
      })
    },
  })
}

export function useResolveConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (conversationId: string) => {
      try {
        return await whatsappApi.resolveConversation(conversationId)
      } catch (err) {
        return { message: 'Conversation resolved' }
      }
    },
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData(['whatsapp', 'conversations', undefined], (old: any[] = []) => {
        return old.map((c) => (c.id === conversationId ? { ...c, status: 'resolved' as const } : c))
      })
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] })
    },
  })
}

export function useAssignConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, agentId }: { conversationId: string; agentId: string }) => {
      try {
        return await whatsappApi.assignConversation(conversationId, agentId)
      } catch (err) {
        return { message: 'Assigned', agent_id: agentId }
      }
    },
    onSuccess: (_, { conversationId, agentId }) => {
      queryClient.setQueryData(['whatsapp', 'conversations', undefined], (old: any[] = []) => {
        return old.map((c) =>
          c.id === conversationId ? { ...c, assigned_to: agentId, status: 'waiting_agent' as const } : c
        )
      })
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] })
    },
  })
}

export function useWhatsAppMetrics() {
  return useQuery({
    queryKey: ['whatsapp', 'metrics'],
    queryFn: async () => {
      try {
        const res = await whatsappApi.getMetrics()
        return adaptMetrics(res)
      } catch (err) {
        return DEFAULT_METRICS
      }
    },
    staleTime: 60_000,
  })
}

export function useWhatsAppContacts(q?: string) {
  return useQuery({
    queryKey: ['whatsapp', 'contacts', q],
    queryFn: async () => {
      try {
        const res = await whatsappApi.getContacts(q ? { q } : undefined)
        return res.data ?? []
      } catch (err) {
        return DEFAULT_CONTACTS
      }
    },
    staleTime: 30_000,
  })
}

export function useSendProactiveMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ to, message, name }: { to: string; message: string; name?: string }) => {
      try {
        const res = await whatsappApi.sendProactiveMessage(to, message)
        return res
      } catch (err) {
        return { message: 'Sent', sid: `mock-${Date.now()}`, conversation_id: `conv-pro-${Date.now()}` }
      }
    },
    onSuccess: (res, { to, message, name }) => {
      const convId = res?.conversation_id ?? `pro-${Date.now()}`
      const contactName = name?.trim() || `Contacto (${to.trim()})`
      const nowIso = new Date().toISOString()

      const newMsg = {
        id: `msg-${Date.now()}`,
        direction: 'outbound' as const,
        content: message.trim(),
        sent_at: nowIso,
        sender_name: 'NexusOS Agent',
      }

      if (!DEFAULT_MESSAGES[convId]) {
        DEFAULT_MESSAGES[convId] = []
      }
      DEFAULT_MESSAGES[convId].push(newMsg)

      // Set messages cache for this conversation
      queryClient.setQueryData(['whatsapp', 'conversations', convId, 'messages'], (old: any[] = []) => [
        ...old,
        newMsg,
      ])

      // Add to conversation list
      const newConv = {
        id: convId,
        contact_name: contactName,
        contact_phone: to.trim(),
        last_message: message.trim(),
        last_message_at: nowIso,
        status: 'active' as const,
        unread_count: 0,
        assigned_to: 'NexusOS Agent',
      }

      queryClient.setQueryData(['whatsapp', 'conversations', undefined], (old: any[] = []) => {
        const existingIdx = old.findIndex((c) => c.contact_phone.replace(/\s+/g, '') === to.replace(/\s+/g, ''))
        if (existingIdx >= 0) {
          const updated = [...old]
          updated[existingIdx] = {
            ...updated[existingIdx],
            last_message: message.trim(),
            last_message_at: nowIso,
          }
          return updated
        }
        return [newConv, ...old]
      })

      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] })
    },
  })
}

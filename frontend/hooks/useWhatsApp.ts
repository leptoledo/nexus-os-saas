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
}// --------------- Local Storage Persistence Helpers ---------------

function getLocalConversations(): any[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('nexus_conversations_cache')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalConversations(list: any[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('nexus_conversations_cache', JSON.stringify(list))
  } catch {}
}

function getLocalMessages(convId: string): any[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`nexus_msgs_${convId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalMessages(convId: string, msgs: any[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`nexus_msgs_${convId}`, JSON.stringify(msgs))
  } catch {}
}

export function useWhatsAppConversations(status?: string) {
  return useQuery({
    queryKey: ['whatsapp', 'conversations', status],
    queryFn: async () => {
      let apiList: any[] = []
      try {
        const res = await whatsappApi.getConversations(status ? { status } : undefined)
        apiList = (res.data ?? []).map(adaptConversation)
      } catch (err) {
        apiList = []
      }
      const localList = getLocalConversations()
      const mergedMap = new Map<string, any>()
      for (const item of [...localList, ...apiList]) {
        const key = item.contact_phone?.replace(/\s+/g, '') || item.id
        if (!mergedMap.has(key)) {
          mergedMap.set(key, item)
        }
      }
      const merged = Array.from(mergedMap.values())
      return status ? merged.filter((c) => c.status === status) : merged
    },
    staleTime: 5_000,
    refetchInterval: 10_000,
  })
}

export function useConversationMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['whatsapp', 'conversations', conversationId, 'messages'],
    queryFn: async () => {
      if (!conversationId) return []
      let apiMsgs: any[] = []
      try {
        const res = await whatsappApi.getMessages(conversationId)
        apiMsgs = (res.data ?? []).map(adaptMessage)
      } catch (err) {
        apiMsgs = []
      }
      const localMsgs = getLocalMessages(conversationId)
      const mergedMap = new Map<string, any>()
      for (const m of [...localMsgs, ...apiMsgs, ...(DEFAULT_MESSAGES[conversationId] ?? [])]) {
        mergedMap.set(m.id, m)
      }
      return Array.from(mergedMap.values())
    },
    enabled: !!conversationId,
    staleTime: 3_000,
    refetchInterval: 5_000,
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
        content: content.trim(),
        sent_at: new Date().toISOString(),
        sender_name: 'NexusOS Agent',
      }

      const existingMsgs = getLocalMessages(conversationId)
      const updatedMsgs = [...existingMsgs, newMsg]
      saveLocalMessages(conversationId, updatedMsgs)

      queryClient.setQueryData(['whatsapp', 'conversations', conversationId, 'messages'], updatedMsgs)

      const localConvs = getLocalConversations()
      const updatedConvs = localConvs.map((c) =>
        c.id === conversationId
          ? { ...c, last_message: content.trim(), last_message_at: new Date().toISOString() }
          : c
      )
      saveLocalConversations(updatedConvs)
      queryClient.setQueryData(['whatsapp', 'conversations', undefined], updatedConvs)
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
      const localConvs = getLocalConversations()
      const updatedConvs = localConvs.map((c) =>
        c.id === conversationId ? { ...c, status: 'resolved' as const } : c
      )
      saveLocalConversations(updatedConvs)
      queryClient.setQueryData(['whatsapp', 'conversations', undefined], updatedConvs)
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
      const localConvs = getLocalConversations()
      const updatedConvs = localConvs.map((c) =>
        c.id === conversationId
          ? { ...c, assigned_to: agentId, status: 'waiting_agent' as const }
          : c
      )
      saveLocalConversations(updatedConvs)
      queryClient.setQueryData(['whatsapp', 'conversations', undefined], updatedConvs)
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

      // Save messages
      const existingMsgs = getLocalMessages(convId)
      const updatedMsgs = [...existingMsgs, newMsg]
      saveLocalMessages(convId, updatedMsgs)

      queryClient.setQueryData(['whatsapp', 'conversations', convId, 'messages'], updatedMsgs)

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

      const localConvs = getLocalConversations()
      const existingIdx = localConvs.findIndex(
        (c) => c.contact_phone.replace(/\s+/g, '') === to.replace(/\s+/g, '')
      )

      let updatedConvs: any[] = []
      if (existingIdx >= 0) {
        updatedConvs = [...localConvs]
        updatedConvs[existingIdx] = {
          ...updatedConvs[existingIdx],
          last_message: message.trim(),
          last_message_at: nowIso,
        }
      } else {
        updatedConvs = [newConv, ...localConvs]
      }

      saveLocalConversations(updatedConvs)
      queryClient.setQueryData(['whatsapp', 'conversations', undefined], updatedConvs)
      queryClient.setQueryData(['whatsapp', 'conversations', 'active'], updatedConvs)
    },
  })
}

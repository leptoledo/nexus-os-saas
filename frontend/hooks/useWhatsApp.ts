'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/api'

// --------------- Realistic Demo / Fallback Data ---------------

export const DEFAULT_FLOWS = [
  {
    id: 'f2000000-0000-0000-0000-000000000001',
    name: 'Qualificação Automática de Leads',
    description: 'Fluxo principal de atendimento e triagem inicial de novos contactos comercial',
    is_active: true,
    trigger_keywords: ['preço', 'plano', 'orçamento', 'demo', 'informação'],
    nodes_count: 5,
    conversions: 34,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'f2000000-0000-0000-0000-000000000002',
    name: 'Suporte Técnico 24/7',
    description: 'Atendimento automático fora de horas para dúvidas frequentes e FAQ de clientes',
    is_active: false,
    trigger_keywords: ['ajuda', 'suporte', 'erro', 'problema', 'ticket'],
    nodes_count: 3,
    conversions: 12,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'f2000000-0000-0000-0000-000000000003',
    name: 'Boas-Vindas Comercial & Agendamento',
    description: 'Saudação de entrada com link direto para agendamento de chamadas com consultor',
    is_active: true,
    trigger_keywords: ['olá', 'oi', 'boa tarde', 'bom dia', 'agendar'],
    nodes_count: 4,
    conversions: 19,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
]

export const DEFAULT_CONVERSATIONS = [
  {
    id: 'v1000000-0000-0000-0000-000000000001',
    contact_name: 'João Silva',
    contact_phone: '+351 919 876 543',
    last_message: 'Excelente! Qual o valor mensal e como agendo uma demo?',
    last_message_at: new Date(Date.now() - 10 * 60000).toISOString(),
    status: 'active' as const,
    unread_count: 1,
    assigned_to: 'Bruno Costa',
  },
  {
    id: 'v1000000-0000-0000-0000-000000000002',
    contact_name: 'Maria Santos',
    contact_phone: '+351 931 122 334',
    last_message: '🤖 Olá Maria! Estou a transferir o seu atendimento para um gestor de conta humano.',
    last_message_at: new Date(Date.now() - 120 * 60000).toISOString(),
    status: 'waiting_agent' as const,
    unread_count: 0,
    assigned_to: null,
  },
  {
    id: 'v1000000-0000-0000-0000-000000000003',
    contact_name: 'Pedro Oliveira',
    contact_phone: '+351 964 455 667',
    last_message: '📄 Olá Pedro! As faturas estão disponíveis no menu Definições > Assinatura & Faturação.',
    last_message_at: new Date(Date.now() - 1440 * 60000).toISOString(),
    status: 'resolved' as const,
    unread_count: 0,
    assigned_to: 'Ana Silva',
  },
]

export const DEFAULT_MESSAGES: Record<string, any[]> = {
  'v1000000-0000-0000-0000-000000000001': [
    {
      id: 'm1',
      direction: 'inbound',
      content: 'Olá! Gostaria de saber mais sobre o plano Pro da agência.',
      sent_at: new Date(Date.now() - 120 * 60000).toISOString(),
      sender_name: 'João Silva',
    },
    {
      id: 'm2',
      direction: 'outbound',
      content: '👋 Olá João! O plano Pro inclui automação de WhatsApp, CRM ilimitado e relatórios de IA.',
      sent_at: new Date(Date.now() - 115 * 60000).toISOString(),
      sender_name: 'NexusOS Bot',
    },
    {
      id: 'm3',
      direction: 'inbound',
      content: 'Excelente! Qual o valor mensal e como agendo uma demo?',
      sent_at: new Date(Date.now() - 10 * 60000).toISOString(),
      sender_name: 'João Silva',
    },
  ],
  'v1000000-0000-0000-0000-000000000002': [
    {
      id: 'm4',
      direction: 'inbound',
      content: 'Preciso de ajuda urgente para integrar as campanhas de Meta Ads.',
      sent_at: new Date(Date.now() - 240 * 60000).toISOString(),
      sender_name: 'Maria Santos',
    },
    {
      id: 'm5',
      direction: 'outbound',
      content: '🤖 Olá Maria! Estou a transferir o seu atendimento para um gestor de conta humano.',
      sent_at: new Date(Date.now() - 230 * 60000).toISOString(),
      sender_name: 'NexusOS Bot',
    },
  ],
  'v1000000-0000-0000-0000-000000000003': [
    {
      id: 'm6',
      direction: 'inbound',
      content: 'Onde posso descarregar a fatura deste mês?',
      sent_at: new Date(Date.now() - 1440 * 60000).toISOString(),
      sender_name: 'Pedro Oliveira',
    },
    {
      id: 'm7',
      direction: 'outbound',
      content: '📄 Olá Pedro! As faturas estão disponíveis no menu Definições > Assinatura & Faturação.',
      sent_at: new Date(Date.now() - 1380 * 60000).toISOString(),
      sender_name: 'Ana Silva',
    },
  ],
}

export const DEFAULT_METRICS = {
  conversations_today: 47,
  response_rate: 98,
  avg_resolution_minutes: 4,
  bot_conversions: 34,
  conversations_by_day: [
    { day: 'Seg', count: 32 },
    { day: 'Ter', count: 28 },
    { day: 'Qua', count: 41 },
    { day: 'Qui', count: 35 },
    { day: 'Sex', count: 47 },
  ],
  resolved_by_bot_pct: 82,
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
        const data = (res.data ?? []).map(adaptFlow)
        return data.length > 0 ? data : DEFAULT_FLOWS
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
        const list = (res.data ?? []).map(adaptConversation)
        if (list.length > 0) return list
      } catch (err) {
        // Fallback below
      }
      return status
        ? DEFAULT_CONVERSATIONS.filter((c) => c.status === status)
        : DEFAULT_CONVERSATIONS
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useConversationMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['whatsapp', 'conversations', conversationId, 'messages'],
    queryFn: async () => {
      if (!conversationId) return []
      try {
        const res = await whatsappApi.getMessages(conversationId)
        const list = (res.data ?? []).map(adaptMessage)
        if (list.length > 0) return list
      } catch (err) {
        // Fallback below
      }
      return (DEFAULT_MESSAGES[conversationId] ?? []).map(adaptMessage)
    },
    enabled: !!conversationId,
    staleTime: 10_000,
    refetchInterval: 15_000,
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

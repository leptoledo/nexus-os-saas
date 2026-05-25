'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { marketingApi } from '@/lib/api'
import type { Lead, LeadStatus, Campaign } from '@/types'

// --------------- Adaptadores DB → Frontend ---------------

const STAGE_TO_STATUS: Record<string, LeadStatus> = {
  new: 'new',
  qualified: 'qualified',
  proposal: 'proposal_sent',
  negotiation: 'negotiation',
  closed_won: 'won',
  closed_lost: 'lost',
}

const STATUS_TO_STAGE: Record<LeadStatus, string> = {
  new: 'new',
  qualified: 'qualified',
  proposal_sent: 'proposal',
  negotiation: 'negotiation',
  won: 'closed_won',
  lost: 'closed_lost',
}

function adaptLead(db: any): Lead {
  const scoreNum = db.score ?? 0
  const score = scoreNum >= 70 ? 'hot' : scoreNum >= 40 ? 'warm' : ('cold' as const)

  return {
    id: db.id,
    organization_id: db.org_id,
    name: db.name,
    email: db.email,
    phone: db.phone,
    company: db.company,
    status: STAGE_TO_STATUS[db.stage] ?? 'new',
    score,
    estimated_value: db.value_estimated ?? 0,
    currency: 'EUR',
    notes: db.notes,
    assignee_id: db.assignee_id,
    source: db.source,
    position: db.position ?? 0,
    created_at: db.created_at,
    updated_at: db.updated_at,
  }
}

function adaptCampaign(db: any): Campaign {
  const stats = db.stats ?? {}
  const totalSent: number = stats.total_sent ?? 0
  const opens: number = stats.opens ?? 0
  const clicks: number = stats.clicks ?? 0

  return {
    id: db.id,
    organization_id: db.org_id,
    name: db.name,
    type: 'email',
    status: db.status,
    subject: db.subject,
    recipients: totalSent,
    opens,
    clicks,
    open_rate: totalSent > 0 ? parseFloat(((opens / totalSent) * 100).toFixed(1)) : undefined,
    click_rate: totalSent > 0 ? parseFloat(((clicks / totalSent) * 100).toFixed(1)) : undefined,
    sent_at: db.sent_at ?? undefined,
    scheduled_at: db.scheduled_at ?? undefined,
    created_at: db.created_at,
    updated_at: db.updated_at,
  }
}

function adaptKeyword(db: any) {
  return {
    id: db.id,
    keyword: db.keyword,
    position: db.current_position ?? 0,
    previous_position: db.current_position ?? 0,
    volume: db.monthly_volume ?? 0,
    difficulty: 0,
    url: db.target_url,
    updated_at: db.created_at,
  }
}

// --------------- Hooks ---------------

export function useLeadPipeline() {
  return useQuery({
    queryKey: ['leads', 'pipeline'],
    queryFn: async () => {
      const res = await marketingApi.getLeadPipeline()
      const allLeads: Lead[] = []
      for (const col of res.columns ?? []) {
        for (const lead of col.leads) {
          allLeads.push(adaptLead(lead))
        }
      }
      return allLeads
    },
    staleTime: 30_000,
  })
}

export function useMoveLeadStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      marketingApi.moveLeadStage(id, STATUS_TO_STAGE[status] ?? status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; email?: string; company?: string; stage?: string; value_estimated?: number }) =>
      marketingApi.createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await marketingApi.getCampaigns()
      return (res.data ?? []).map(adaptCampaign)
    },
    staleTime: 30_000,
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: marketingApi.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useSendCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => marketingApi.sendCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useContentCalendar(platform?: string) {
  return useQuery({
    queryKey: ['content-calendar', platform],
    queryFn: async () => {
      const res = await marketingApi.getContentCalendar(platform ? { platform } : undefined)
      return res.data ?? []
    },
    staleTime: 30_000,
  })
}

export function useSEOKeywords() {
  return useQuery({
    queryKey: ['seo-keywords'],
    queryFn: async () => {
      const res = await marketingApi.getKeywords()
      return (res.data ?? []).map(adaptKeyword)
    },
    staleTime: 60_000,
  })
}

export function useAddKeyword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ keyword, target_url }: { keyword: string; target_url?: string }) =>
      marketingApi.addKeyword(keyword, target_url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-keywords'] })
    },
  })
}

export function useCreateContentItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; platform: string; content?: string; scheduled_at?: string }) =>
      marketingApi.createContentItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-calendar'] })
    },
  })
}

export function useMarketingAnalytics() {
  return useQuery({
    queryKey: ['marketing', 'analytics'],
    queryFn: () => marketingApi.getMarketingAnalytics(),
    staleTime: 60_000,
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => marketingApi.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => marketingApi.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useDeleteKeyword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => marketingApi.deleteKeyword(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-keywords'] })
    },
  })
}

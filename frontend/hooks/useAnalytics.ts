'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api'

// --------------- Adaptadores DB → Frontend ---------------

function adaptDashboard(db: any) {
  return {
    id: db.id as string,
    name: db.name as string,
    description: db.description as string | undefined,
    is_default: db.is_default as boolean | undefined,
    created_at: db.created_at as string,
    updated_at: db.updated_at as string,
  }
}

function adaptWidget(db: any) {
  return {
    id: db.id as string,
    dashboard_id: db.dashboard_id as string,
    title: db.title as string,
    type: db.type as string,
    config: db.config ?? {},
    position: db.position ?? 0,
    created_at: db.created_at as string,
  }
}

function adaptReport(db: any) {
  return {
    id: db.id as string,
    name: db.name as string,
    schedule_cron: db.schedule_cron as string | undefined,
    format: (db.format ?? 'pdf') as string,
    is_active: db.is_active !== false,
    last_run_at: db.last_run_at as string | undefined,
    created_at: db.created_at as string,
  }
}

function adaptAlert(db: any) {
  return {
    id: db.id as string,
    name: db.name as string,
    metric: db.metric as string,
    condition: db.condition as string,
    threshold_value: db.threshold_value as number,
    is_active: db.is_active !== false,
    last_triggered_at: db.last_triggered_at as string | undefined,
    created_at: db.created_at as string,
  }
}

function adaptInsight(db: any) {
  return {
    id: db.id as string,
    type: (db.type ?? 'recommendation') as 'anomaly' | 'forecast' | 'recommendation',
    title: db.title as string,
    description: db.description as string,
    severity: (db.severity ?? 'info') as 'warning' | 'success' | 'info',
    created_at: db.created_at as string,
  }
}

// --------------- Hooks ---------------

export function useAnalyticsDashboards() {
  return useQuery({
    queryKey: ['analytics', 'dashboards'],
    queryFn: async () => {
      const res = await analyticsApi.getDashboards()
      return (res.data ?? []).map(adaptDashboard)
    },
    staleTime: 60_000,
  })
}

export function useCreateDashboard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      analyticsApi.createDashboard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'dashboards'] })
    },
  })
}

export function useDashboardWidgets(dashboardId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'dashboards', dashboardId, 'widgets'],
    queryFn: async () => {
      const res = await analyticsApi.getWidgets(dashboardId!)
      return (res.data ?? []).map(adaptWidget)
    },
    enabled: !!dashboardId,
    staleTime: 30_000,
  })
}

export function useAnalyticsReports() {
  return useQuery({
    queryKey: ['analytics', 'reports'],
    queryFn: async () => {
      const res = await analyticsApi.getReports()
      return (res.data ?? []).map(adaptReport)
    },
    staleTime: 60_000,
  })
}

export function useCreateReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; schedule_cron: string; format?: string; recipients?: string[] }) =>
      analyticsApi.createReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'reports'] })
    },
  })
}

export function useDeleteReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => analyticsApi.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'reports'] })
    },
  })
}

export function useExportReportPDF() {
  return useMutation({
    mutationFn: (id: string) => analyticsApi.exportReportPDF(id),
  })
}

export function useAnalyticsAlerts() {
  return useQuery({
    queryKey: ['analytics', 'alerts'],
    queryFn: async () => {
      const res = await analyticsApi.getAlerts()
      return (res.data ?? []).map(adaptAlert)
    },
    staleTime: 30_000,
  })
}

export function useCreateAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; metric: string; condition: string; threshold_value: number }) =>
      analyticsApi.createAlert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'alerts'] })
    },
  })
}

export function useDeleteAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => analyticsApi.deleteAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'alerts'] })
    },
  })
}

export function useAIInsights() {
  return useQuery({
    queryKey: ['analytics', 'insights'],
    queryFn: async () => {
      const res = await analyticsApi.getInsights()
      const insights = res.insights ?? res.data ?? []
      return (insights as any[]).map(adaptInsight)
    },
    staleTime: 300_000, // 5 min – insights don't change that often
  })
}

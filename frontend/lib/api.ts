import { getSupabaseBrowser, getSession } from './supabase'
import type {
  User,
  Organization,
  Project,
  Task,
  Lead,
  Campaign,
  Keyword,
  WhatsAppFlow,
  Conversation,
  Message,
  Notification,
  Invoice,
  Dashboard,
  ScheduledReport,
  ThresholdAlert,
  PaginatedResponse,
} from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// --------------- Core API Client ---------------

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    // Read from localStorage directly to avoid Supabase client lock contention
    // (AuthProvider holds the shared client lock via onAuthStateChange)
    const session = await getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }

  async request<T>(
    path: string,
    options: RequestInit & { params?: Record<string, string | number | boolean | undefined> } = {}
  ): Promise<T> {
    const { params, ...fetchOptions } = options
    const authHeader = await this.getAuthHeader()

    let url = `${this.baseURL}${path}`
    if (params) {
      const query = new URLSearchParams()
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) query.set(k, String(v))
      }
      const qs = query.toString()
      if (qs) url += `?${qs}`
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...(fetchOptions.headers ?? {}),
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: null }))
      let fallbackMsg = `Erro ${response.status}: Ocorreu uma falha no servidor.`
      if (response.status === 401) fallbackMsg = 'Sessão expirada ou não autenticada.'
      else if (response.status === 403) fallbackMsg = 'Sem permissões para realizar esta ação.'
      else if (response.status === 404) fallbackMsg = 'Recurso não encontrado.'
      else if (response.status === 409) fallbackMsg = 'Conflito de dados ou registo já existente.'

      throw new Error(error?.detail ?? error?.message ?? fallbackMsg)
    }

    if (response.status === 204) return undefined as T
    return response.json().catch(() => ({} as T)) as Promise<T>
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>(path, { method: 'GET', params })
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) })
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

// --------------- Auth API ---------------

export const authApi = {
  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<any>('/auth/me')
    // Backend returns full_name; map to frontend User.name
    return { ...res, name: res.full_name ?? res.name ?? null } as User
  },
  updateProfile: (data: Partial<User>) => {
    // Map frontend name → backend full_name
    const { name, ...rest } = data as any
    const payload = { ...rest, ...(name !== undefined ? { full_name: name } : {}) }
    return apiClient.put<any>('/auth/me', payload).then((res: any) => ({
      ...res,
      name: res.full_name ?? res.name ?? null,
    })) as Promise<User>
  },
  uploadAvatar: async (file: File) => {
    const session = await getSession()
    const formData = new FormData()
    formData.append('file', file)
    return fetch(`${API_BASE_URL}/auth/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: formData,
    }).then((r) => r.json() as Promise<{ url: string }>)
  },
  enableMFA: () => apiClient.post<{ qr_code: string; secret: string }>('/auth/mfa/enroll'),
  disableMFA: (code: string) => apiClient.post<void>('/auth/mfa/verify', { code }),
}

// --------------- Tenants / Organization API ---------------

export const tenantsApi = {
  getOrganization: () => apiClient.get<Organization>('/organizations/me'),
  createOrganization: (data: { name: string; industry?: string }) =>
    apiClient.post<Organization>('/organizations', data),
  updateOrganization: (data: Partial<Organization>) =>
    apiClient.put<Organization>('/organizations/me', data),
  getMembers: () =>
    apiClient.get<{ data: User[] }>('/organizations/me/members').then((r) => r.data ?? []),
  inviteMember: (email: string, role: string) =>
    apiClient.post<void>('/organizations/me/invite', { email, role }),
  updateMemberRole: (userId: string, role: string) =>
    apiClient.put<void>(`/organizations/me/members/${userId}`, { role }),
  removeMember: (userId: string) =>
    apiClient.delete<void>(`/organizations/me/members/${userId}`),
}

// --------------- Billing API ---------------

export const billingApi = {
  getSubscription: () =>
    apiClient.get<{
      plan: string
      status: string
      current_period_end: string
      cancel_at_period_end: boolean
    }>('/billing/subscription'),
  getInvoices: () =>
    apiClient.get<{ invoices: Invoice[] }>('/billing/invoices').then((r) => r.invoices ?? []),
  createCheckoutSession: (plan: string) =>
    apiClient
      .post<{ checkout_url: string }>('/billing/checkout', { plan, interval: 'month' })
      .then((r) => ({ url: r.checkout_url })),
  createPortalSession: () =>
    apiClient
      .post<{ portal_url: string }>('/billing/portal')
      .then((r) => ({ url: r.portal_url })),
  cancelSubscription: () => apiClient.put<void>('/billing/subscription/cancel'),
}

// --------------- Marketing API ---------------

export const marketingApi = {
  // Leads
  getLeads: (params?: { stage?: string; assignee_id?: string; page_size?: number }) =>
    apiClient.get<{ data: any[]; page: number; page_size: number }>('/marketing/leads', {
      page_size: 100,
      ...params,
    }),
  getLeadPipeline: () =>
    apiClient.get<{ columns: { id: string; title: string; leads: any[] }[] }>(
      '/marketing/leads/pipeline'
    ),
  createLead: (data: {
    name: string
    email?: string
    company?: string
    phone?: string
    stage?: string
    value_estimated?: number
    notes?: string
    assignee_id?: string
    source?: string
  }) => apiClient.post<any>('/marketing/leads', data),
  updateLead: (id: string, data: Record<string, unknown>) =>
    apiClient.put<any>(`/marketing/leads/${id}`, data),
  moveLeadStage: (id: string, stage: string, reason?: string) =>
    apiClient.put<any>(`/marketing/leads/${id}/stage`, { stage, reason }),
  deleteLead: (id: string) => apiClient.delete<void>(`/marketing/leads/${id}`),

  // Campaigns
  getCampaigns: (params?: { page_size?: number }) =>
    apiClient.get<{ data: any[]; page: number; page_size: number }>('/marketing/campaigns', {
      page_size: 50,
      ...params,
    }),
  createCampaign: (data: {
    name: string
    subject: string
    body_html?: string
    body_text?: string
    scheduled_at?: string
  }) => apiClient.post<any>('/marketing/campaigns', data),
  updateCampaign: (id: string, data: Record<string, unknown>) =>
    apiClient.put<any>(`/marketing/campaigns/${id}`, data),
  deleteCampaign: (id: string) => apiClient.delete<void>(`/marketing/campaigns/${id}`),
  sendCampaign: (id: string) => apiClient.post<any>(`/marketing/campaigns/${id}/send`),
  getCampaignStats: (id: string) => apiClient.get<any>(`/marketing/campaigns/${id}/stats`),

  // Content Calendar
  getContentCalendar: (params?: { platform?: string }) =>
    apiClient.get<{ data: any[] }>('/marketing/content-calendar', params),
  createContentItem: (data: {
    title: string
    platform: string
    content?: string
    scheduled_at?: string
  }) => apiClient.post<any>('/marketing/content-calendar', data),

  // Landing Pages
  getLandingPages: () => apiClient.get<{ data: any[] }>('/marketing/landing-pages'),

  // SEO
  getKeywords: () => apiClient.get<{ data: any[] }>('/marketing/seo/keywords'),
  addKeyword: (keyword: string, target_url?: string) =>
    apiClient.post<any>('/marketing/seo/keywords', { keyword, target_url }),
  deleteKeyword: (id: string) => apiClient.delete<void>(`/marketing/seo/keywords/${id}`),

  // Analytics summary
  getMarketingAnalytics: () => apiClient.get<any>('/marketing/analytics'),
}

// --------------- Projects API ---------------

export const projectsApi = {
  getProjects: (params?: { page_size?: number }) =>
    apiClient.get<{ data: any[]; page: number; page_size: number }>('/projects', {
      page_size: 50,
      ...params,
    }),
  createProject: (data: {
    name: string
    description?: string
    status?: string
    priority?: string
    start_date?: string
    end_date?: string
    budget?: number
  }) => apiClient.post<any>('/projects', data),
  updateProject: (id: string, data: Record<string, unknown>) =>
    apiClient.put<any>(`/projects/${id}`, data),
  deleteProject: (id: string) => apiClient.delete<void>(`/projects/${id}`),

  // Boards
  getBoards: (projectId: string) =>
    apiClient.get<{ data: any[] }>(`/projects/${projectId}/boards`),
  createBoard: (projectId: string, data: { name: string; description?: string }) =>
    apiClient.post<any>(`/projects/${projectId}/boards`, data),

  // Tasks
  getTasks: (projectId: string, boardId: string, params?: { column_id?: string; sprint_id?: string }) =>
    apiClient.get<{ data: any[] }>(`/projects/${projectId}/boards/${boardId}/tasks`, params),
  createTask: (
    projectId: string,
    boardId: string,
    data: {
      title: string
      column_id: string
      description?: string
      priority?: string
      due_date?: string
      estimated_hours?: number
      assignee_id?: string
      labels?: string[]
    }
  ) => apiClient.post<any>(`/projects/${projectId}/boards/${boardId}/tasks`, data),
  updateTask: (projectId: string, boardId: string, taskId: string, data: Record<string, unknown>) =>
    apiClient.put<any>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}`, data),
  moveTask: (
    projectId: string,
    boardId: string,
    taskId: string,
    columnId: string,
    position?: number
  ) =>
    apiClient.put<any>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}/move`, {
      column_id: columnId,
      position,
    }),
  deleteTask: (projectId: string, boardId: string, taskId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}`),

  // Sprints
  getSprints: (projectId: string) =>
    apiClient.get<{ data: any[] }>(`/projects/${projectId}/sprints`),
  createSprint: (projectId: string, data: { name: string; goal?: string; start_date?: string; end_date?: string }) =>
    apiClient.post<any>(`/projects/${projectId}/sprints`, data),

  // OKRs
  getOKRs: (projectId: string) => apiClient.get<{ data: any[] }>(`/projects/${projectId}/okrs`),

  // Report
  getProjectReport: (projectId: string) =>
    apiClient.get<any>(`/projects/${projectId}/report`),
}

// --------------- Analytics API ---------------

export const analyticsApi = {
  getDashboards: () => apiClient.get<{ data: any[] }>('/analytics/dashboards'),
  createDashboard: (data: { name: string; description?: string; is_default?: boolean }) =>
    apiClient.post<any>('/analytics/dashboards', data),
  updateDashboard: (id: string, data: Record<string, unknown>) =>
    apiClient.put<any>(`/analytics/dashboards/${id}`, data),
  deleteDashboard: (id: string) => apiClient.delete<void>(`/analytics/dashboards/${id}`),

  // Widgets
  getWidgets: (dashboardId: string) =>
    apiClient.get<{ data: any[] }>(`/analytics/dashboards/${dashboardId}/widgets`),
  createWidget: (dashboardId: string, data: { title: string; type: string; config?: Record<string, unknown>; position?: Record<string, unknown> }) =>
    apiClient.post<any>(`/analytics/dashboards/${dashboardId}/widgets`, data),

  // Reports
  getReports: () => apiClient.get<{ data: any[] }>('/analytics/reports'),
  createReport: (data: {
    name: string
    schedule_cron: string
    recipients?: string[]
    format?: string
    dashboard_id?: string
  }) => apiClient.post<any>('/analytics/reports', data),
  updateReport: (id: string, data: Record<string, unknown>) =>
    apiClient.put<any>(`/analytics/reports/${id}`, data),
  deleteReport: (id: string) => apiClient.delete<void>(`/analytics/reports/${id}`),
  exportReportPDF: (id: string) =>
    apiClient.post<{ task_id?: string; url?: string }>(`/analytics/reports/${id}/export/pdf`),

  // Alerts
  getAlerts: () => apiClient.get<{ data: any[] }>('/analytics/alerts'),
  createAlert: (data: {
    name: string
    metric: string
    condition: string
    threshold_value: number
    notification_channels?: string[]
  }) => apiClient.post<any>('/analytics/alerts', data),
  updateAlert: (id: string, data: Record<string, unknown>) =>
    apiClient.put<any>(`/analytics/alerts/${id}`, data),
  deleteAlert: (id: string) => apiClient.delete<void>(`/analytics/alerts/${id}`),

  // Data query
  runQuery: (sql: string) =>
    apiClient.post<{ results: any[]; columns: string[] }>('/analytics/query', { sql }),

  // AI
  getInsights: () => apiClient.get<any>('/analytics/ai/insights'),
  getForecast: (metric: string, periods?: number) =>
    apiClient.get<any>('/analytics/ai/forecast', { metric, periods }),

  // Import
  importCSV: async (file: File, datasetName?: string) => {
    const session = await getSession()
    const formData = new FormData()
    formData.append('file', file)
    if (datasetName) formData.append('dataset_name', datasetName)
    return fetch(`${API_BASE_URL}/analytics/import/csv`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: formData,
    }).then((r) => r.json())
  },

  importExcel: async (file: File, datasetName?: string) => {
    const session = await getSession()
    const formData = new FormData()
    formData.append('file', file)
    if (datasetName) formData.append('dataset_name', datasetName)
    return fetch(`${API_BASE_URL}/analytics/import/excel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: formData,
    }).then((r) => r.json())
  },
}

// --------------- WhatsApp API ---------------

export const whatsappApi = {
  getFlows: () => apiClient.get<{ data: any[] }>('/whatsapp/flows'),
  createFlow: (data: Partial<WhatsAppFlow>) => apiClient.post<WhatsAppFlow>('/whatsapp/flows', data),
  updateFlow: (id: string, data: Partial<WhatsAppFlow>) =>
    apiClient.put<WhatsAppFlow>(`/whatsapp/flows/${id}`, data),
  deleteFlow: (id: string) => apiClient.delete<void>(`/whatsapp/flows/${id}`),
  activateFlow: (id: string) => apiClient.post<any>(`/whatsapp/flows/${id}/activate`),

  getConversations: (params?: { status?: string }) =>
    apiClient.get<{ data: any[]; total: number }>('/whatsapp/conversations', params),
  getMessages: (conversationId: string) =>
    apiClient.get<{ data: any[] }>(`/whatsapp/conversations/${conversationId}/messages`),
  sendReply: (conversationId: string, content: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${conversationId}/reply`, { content }),
  resolveConversation: (conversationId: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${conversationId}/resolve`),
  assignConversation: (conversationId: string, agentId: string) =>
    apiClient.post<any>(`/whatsapp/conversations/${conversationId}/assign`, { agent_id: agentId }),

  getMetrics: () => apiClient.get<any>('/whatsapp/metrics'),
}

// --------------- Notifications API ---------------

export const notificationsApi = {
  getNotifications: (params?: { unread?: boolean; page?: number }) =>
    apiClient.get<{ data: Notification[]; total: number }>('/notifications', params),
  markRead: (id: string) => apiClient.put<void>(`/notifications/${id}/read`),
  markAllRead: () => apiClient.put<void>('/notifications/read-all'),
  getPreferences: () => apiClient.get<Record<string, unknown>>('/notifications/preferences'),
  updatePreferences: (prefs: Record<string, unknown>) =>
    apiClient.put<void>('/notifications/preferences', prefs),
  deleteNotification: (id: string) => apiClient.delete<void>(`/notifications/${id}`),
}

// ============================================================
// NexusOS – Shared TypeScript Types
// ============================================================

// --------------- Auth & Users ---------------

export type UserRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer'

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role: UserRole
  organization_id: string
  is_mfa_enabled: boolean
  last_sign_in_at?: string
  created_at: string
  updated_at: string
}

// --------------- Organization ---------------

export type Industry =
  | 'logistics'
  | 'tech'
  | 'retail'
  | 'health'
  | 'services'
  | 'finance'
  | 'education'
  | 'other'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url?: string
  industry: Industry
  timezone: string
  plan: SubscriptionPlan
  subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled'
  stripe_customer_id?: string
  stripe_subscription_id?: string
  created_at: string
  updated_at: string
}

// --------------- Billing ---------------

export type SubscriptionPlan = 'starter' | 'pro' | 'business'

export interface PlanFeature {
  label: string
  included: boolean
  value?: string
}

export interface Plan {
  id: SubscriptionPlan
  name: string
  price: number
  currency: string
  interval: 'month' | 'year'
  description: string
  features: PlanFeature[]
  stripe_price_id: string
  popular?: boolean
}

export interface Invoice {
  id: string
  number: string
  amount: number
  currency: string
  status: 'paid' | 'open' | 'void' | 'uncollectible'
  created_at: string
  pdf_url?: string
  period_start: string
  period_end: string
}

// --------------- Notifications ---------------

export type NotificationType =
  | 'project_update'
  | 'task_assigned'
  | 'lead_updated'
  | 'campaign_report'
  | 'whatsapp_message'
  | 'billing_alert'
  | 'system'

export interface Notification {
  id: string
  user_id: string
  organization_id: string
  type: NotificationType
  title: string
  body: string
  is_read: boolean
  link?: string
  metadata?: Record<string, unknown>
  created_at: string
}

// --------------- Projects ---------------

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'

export interface TaskLabel {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  project_id: string
  sprint_id?: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignee?: User
  assignee_id?: string
  labels: TaskLabel[]
  due_date?: string
  estimated_hours?: number
  logged_hours?: number
  subtasks?: SubTask[]
  position: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface SubTask {
  id: string
  task_id: string
  title: string
  is_completed: boolean
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'

export interface Project {
  id: string
  organization_id: string
  name: string
  description?: string
  status: ProjectStatus
  color: string
  icon?: string
  owner: User
  owner_id: string
  members: User[]
  progress: number
  start_date?: string
  due_date?: string
  tasks_total: number
  tasks_completed: number
  created_at: string
  updated_at: string
}

export interface Sprint {
  id: string
  project_id: string
  name: string
  goal?: string
  start_date: string
  end_date: string
  status: 'planning' | 'active' | 'completed'
  tasks: Task[]
}

// --------------- Marketing / CRM ---------------

export type LeadStatus =
  | 'new'
  | 'qualified'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost'

export type LeadScore = 'hot' | 'warm' | 'cold'

export interface Lead {
  id: string
  organization_id: string
  name: string
  email?: string
  phone?: string
  company?: string
  status: LeadStatus
  score: LeadScore
  estimated_value: number
  currency: string
  next_action?: string
  next_action_date?: string
  assignee?: User
  assignee_id?: string
  source?: string
  notes?: string
  position: number
  created_at: string
  updated_at: string
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
export type CampaignType = 'email' | 'sms' | 'whatsapp' | 'push'

export interface Campaign {
  id: string
  organization_id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  subject?: string
  recipients: number
  opens?: number
  clicks?: number
  conversions?: number
  open_rate?: number
  click_rate?: number
  sent_at?: string
  scheduled_at?: string
  created_at: string
  updated_at: string
}

export interface Keyword {
  id: string
  keyword: string
  position: number
  previous_position: number
  volume: number
  difficulty: number
  url?: string
  updated_at: string
}

// --------------- Analytics ---------------

export type WidgetType = 'line' | 'bar' | 'pie' | 'area' | 'funnel' | 'kpi' | 'table'

export interface Widget {
  id: string
  dashboard_id: string
  type: WidgetType
  title: string
  data_source: string
  config: Record<string, unknown>
  position: { x: number; y: number; w: number; h: number }
  created_at: string
}

export interface Dashboard {
  id: string
  organization_id: string
  name: string
  description?: string
  is_default: boolean
  widgets: Widget[]
  created_at: string
  updated_at: string
}

export interface ScheduledReport {
  id: string
  name: string
  schedule: string
  recipients: string[]
  last_sent?: string
  next_run: string
  status: 'active' | 'paused'
}

export interface ThresholdAlert {
  id: string
  name: string
  metric: string
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'
  threshold: number
  current_value?: number
  is_triggered: boolean
  channels: ('email' | 'in_app' | 'whatsapp')[]
  created_at: string
}

// --------------- WhatsApp Bot ---------------

export type FlowStatus = 'draft' | 'active' | 'paused' | 'archived'

export interface FlowNode {
  id: string
  type: 'message' | 'condition' | 'action' | 'input' | 'end'
  label: string
  data: Record<string, unknown>
  position: { x: number; y: number }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface WhatsAppFlow {
  id: string
  organization_id: string
  name: string
  description?: string
  status: FlowStatus
  trigger_keywords: string[]
  nodes: FlowNode[]
  edges: FlowEdge[]
  total_triggered: number
  total_completed: number
  completion_rate: number
  created_at: string
  updated_at: string
}

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed'

export interface Conversation {
  id: string
  organization_id: string
  contact_name: string
  contact_phone: string
  contact_avatar?: string
  status: ConversationStatus
  last_message?: string
  last_message_at?: string
  unread_count: number
  assigned_to?: User
  tags: string[]
  created_at: string
  updated_at: string
}

export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'template'
export type MessageDirection = 'inbound' | 'outbound'

export interface Message {
  id: string
  conversation_id: string
  type: MessageType
  direction: MessageDirection
  content: string
  media_url?: string
  is_read: boolean
  sent_at: string
  delivered_at?: string
  read_at?: string
  sender_id?: string
  sender_name?: string
}

// --------------- Generic ---------------

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface TimeSeriesPoint {
  date: string
  value: number
  label?: string
}

export interface ChartDataPoint {
  name: string
  [key: string]: string | number
}

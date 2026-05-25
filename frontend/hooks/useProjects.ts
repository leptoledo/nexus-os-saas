'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/lib/api'
import type { Project, Task, TaskStatus, TaskPriority } from '@/types'

// --------------- Adaptadores DB → Frontend ---------------

const COLUMN_NAME_TO_STATUS: Record<string, TaskStatus> = {
  backlog: 'backlog',
  'to do': 'todo',
  'in progress': 'in_progress',
  review: 'in_review',
  done: 'done',
}

function getStatusFromName(name: string): TaskStatus {
  return COLUMN_NAME_TO_STATUS[name.toLowerCase()] ?? 'todo'
}

function adaptProject(db: any): Project {
  return {
    id: db.id,
    organization_id: db.org_id,
    name: db.name,
    description: db.description,
    status: db.status ?? 'planning',
    color: '#4f46e5',
    owner: {
      id: db.created_by ?? '',
      name: 'Owner',
      email: '',
      role: 'owner',
      organization_id: db.org_id,
      is_mfa_enabled: false,
      created_at: db.created_at,
      updated_at: db.updated_at,
    },
    owner_id: db.created_by ?? '',
    members: [],
    progress: 0,
    start_date: db.start_date ?? undefined,
    due_date: db.end_date ?? undefined,
    tasks_total: 0,
    tasks_completed: 0,
    created_at: db.created_at,
    updated_at: db.updated_at,
  }
}

function adaptTask(db: any, columnIdToStatus: Map<string, TaskStatus>): Task {
  return {
    id: db.id,
    project_id: db.project_id,
    title: db.title,
    description: db.description,
    status: columnIdToStatus.get(db.column_id) ?? 'todo',
    priority: (db.priority as TaskPriority) ?? 'medium',
    labels: (db.labels ?? []).map((l: string) => ({ id: l, name: l, color: '#6366f1' })),
    due_date: db.due_date ?? undefined,
    estimated_hours: db.estimated_hours ?? undefined,
    assignee_id: db.assignee_id ?? undefined,
    position: db.position ?? 0,
    created_by: db.reporter_id ?? '',
    created_at: db.created_at,
    updated_at: db.updated_at,
  }
}

// --------------- Hooks ---------------

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await projectsApi.getProjects()
      return (res.data ?? []).map(adaptProject)
    },
    staleTime: 30_000,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useProjectBoard(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'board'],
    queryFn: async () => {
      const res = await projectsApi.getBoards(projectId!)
      const boards = res.data ?? []
      const board = boards[0] // main board
      if (!board) return { boardId: null, columns: [], columnIdToStatus: new Map<string, TaskStatus>(), statusToColumnId: new Map<string, string>() }

      const columnIdToStatus = new Map<string, TaskStatus>()
      const statusToColumnId = new Map<string, string>()

      for (const col of board.columns ?? []) {
        const status = getStatusFromName(col.name)
        columnIdToStatus.set(col.id, status)
        // Only set if not already set (keep first match for each status)
        if (!statusToColumnId.has(status)) {
          statusToColumnId.set(status, col.id)
        }
      }

      return {
        boardId: board.id as string,
        columns: board.columns as any[],
        columnIdToStatus,
        statusToColumnId,
      }
    },
    enabled: !!projectId,
    staleTime: 60_000,
  })
}

export function useBoardTasks(projectId: string | undefined, boardId: string | undefined, columnIdToStatus: Map<string, TaskStatus>) {
  return useQuery({
    queryKey: ['projects', projectId, 'boards', boardId, 'tasks'],
    queryFn: async () => {
      const res = await projectsApi.getTasks(projectId!, boardId!)
      return (res.data ?? []).map((t) => adaptTask(t, columnIdToStatus))
    },
    enabled: !!projectId && !!boardId && columnIdToStatus.size > 0,
    staleTime: 30_000,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      boardId,
      data,
    }: {
      projectId: string
      boardId: string
      data: { title: string; column_id: string; priority?: string; labels?: string[] }
    }) => projectsApi.createTask(projectId, boardId, data),
    onSuccess: (_, { projectId, boardId }) => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'boards', boardId, 'tasks'] })
    },
  })
}

export function useMoveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      boardId,
      taskId,
      columnId,
      position,
    }: {
      projectId: string
      boardId: string
      taskId: string
      columnId: string
      position?: number
    }) => projectsApi.moveTask(projectId, boardId, taskId, columnId, position),
    onSuccess: (_, { projectId, boardId }) => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'boards', boardId, 'tasks'] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectsApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      projectsApi.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, boardId, taskId }: { projectId: string; boardId: string; taskId: string }) =>
      projectsApi.deleteTask(projectId, boardId, taskId),
    onSuccess: (_, { projectId, boardId }) => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'boards', boardId, 'tasks'] })
    },
  })
}

export function useProjectReport(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'report'],
    queryFn: () => projectsApi.getProjectReport(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  })
}

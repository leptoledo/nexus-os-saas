'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GripVertical, Calendar, User, ChevronDown, AlertCircle } from 'lucide-react'
import { cn, formatDate, getInitials } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  { id: 'todo', label: 'A Fazer', color: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
  { id: 'in_progress', label: 'Em Progresso', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' },
  { id: 'in_review', label: 'Em Revisão', color: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
  { id: 'done', label: 'Concluído', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
]

const PRIORITY_CONFIG = {
  critical: { label: 'Crítica', class: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900' },
  high: { label: 'Alta', class: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900' },
  medium: { label: 'Média', class: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900' },
  low: { label: 'Baixa', class: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900' },
}

// Generate realistic mock tasks
function generateMockTasks(): Task[] {
  const tasks: Task[] = [
    { id: 't1', project_id: 'p1', title: 'Redesign da homepage', status: 'in_progress', priority: 'high', labels: [], position: 0, created_by: 'u1', created_at: '', updated_at: '', assignee: { id: 'u1', name: 'Ana Costa', email: '', role: 'member', organization_id: '', is_mfa_enabled: false, created_at: '', updated_at: '' }, due_date: '2025-06-15', subtasks: [{ id: 's1', task_id: 't1', title: 'Wireframes', is_completed: true }, { id: 's2', task_id: 't1', title: 'Design final', is_completed: false }] },
    { id: 't2', project_id: 'p1', title: 'Integração API pagamentos', status: 'in_progress', priority: 'critical', labels: [], position: 1, created_by: 'u2', created_at: '', updated_at: '', assignee: { id: 'u2', name: 'Pedro Silva', email: '', role: 'member', organization_id: '', is_mfa_enabled: false, created_at: '', updated_at: '' }, due_date: '2025-06-10' },
    { id: 't3', project_id: 'p1', title: 'Testes de performance', status: 'todo', priority: 'medium', labels: [], position: 0, created_by: 'u1', created_at: '', updated_at: '' },
    { id: 't4', project_id: 'p1', title: 'Documentação da API', status: 'todo', priority: 'low', labels: [], position: 1, created_by: 'u3', created_at: '', updated_at: '', assignee: { id: 'u3', name: 'Maria Ferreira', email: '', role: 'member', organization_id: '', is_mfa_enabled: false, created_at: '', updated_at: '' } },
    { id: 't5', project_id: 'p1', title: 'Setup CI/CD pipeline', status: 'done', priority: 'high', labels: [], position: 0, created_by: 'u2', created_at: '', updated_at: '' },
    { id: 't6', project_id: 'p1', title: 'Auditoria de segurança', status: 'in_review', priority: 'critical', labels: [], position: 0, created_by: 'u1', created_at: '', updated_at: '', due_date: '2025-06-20' },
    { id: 't7', project_id: 'p1', title: 'Migração de base de dados', status: 'backlog', priority: 'high', labels: [], position: 0, created_by: 'u1', created_at: '', updated_at: '' },
    { id: 't8', project_id: 'p1', title: 'Mobile responsiveness fix', status: 'done', priority: 'medium', labels: [], position: 1, created_by: 'u3', created_at: '', updated_at: '' },
  ]
  return tasks
}

interface TaskCardProps {
  task: Task
  isDragging?: boolean
}

function TaskCard({ task, isDragging }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority]
  const completedSubtasks = task.subtasks?.filter((s) => s.is_completed).length ?? 0
  const totalSubtasks = task.subtasks?.length ?? 0

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-3 shadow-sm transition-shadow dark:bg-gray-800',
        isDragging
          ? 'rotate-2 border-indigo-300 shadow-lg dark:border-indigo-700'
          : 'border-gray-200 hover:shadow-md dark:border-gray-700'
      )}
    >
      {/* Priority badge */}
      <div className="mb-2 flex items-center justify-between">
        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', priority.class)}>
          {priority.label}
        </span>
        {task.due_date && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Calendar className="h-3 w-3" />
            {formatDate(task.due_date, 'dd MMM')}
          </div>
        )}
      </div>

      <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>

      {/* Subtasks progress */}
      {totalSubtasks > 0 && (
        <div className="mb-2">
          <div className="mb-1 flex justify-between text-[10px] text-gray-400">
            <span>Subtarefas</span>
            <span>{completedSubtasks}/{totalSubtasks}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Assignee */}
      {task.assignee && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
            {getInitials(task.assignee.name)}
          </div>
          {task.assignee.name}
        </div>
      )}
    </div>
  )
}

interface SortableTaskCardProps {
  task: Task
}

function SortableTaskCard({ task }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="group relative">
        <button
          {...listeners}
          className="absolute -left-2 top-2 hidden cursor-grab rounded p-0.5 text-gray-300 group-hover:flex active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <TaskCard task={task} />
      </div>
    </div>
  )
}

interface KanbanBoardProps {
  projectId?: string
  tasks?: Task[]
  statusToColumnId?: Map<string, string>
  onTaskUpdate?: (taskId: string, status: TaskStatus, columnId?: string) => void
  onTaskCreate?: (title: string, status: TaskStatus, columnId?: string) => void
}

export function KanbanBoard({ projectId, tasks: externalTasks, statusToColumnId, onTaskUpdate, onTaskCreate }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(externalTasks ?? generateMockTasks())
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Sync external tasks when they change
  useEffect(() => {
    if (externalTasks) setTasks(externalTasks)
  }, [externalTasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  )

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeTaskObj = tasks.find((t) => t.id === active.id)
    if (!activeTaskObj) return

    // Check if dragging over a column (status)
    const overColumn = COLUMNS.find((col) => col.id === over.id)
    if (overColumn && activeTaskObj.status !== overColumn.id) {
      setTasks((prev) =>
        prev.map((t) => (t.id === active.id ? { ...t, status: overColumn.id } : t))
      )
      return
    }

    // Check if dragging over another task
    const overTask = tasks.find((t) => t.id === over.id)
    if (overTask && activeTaskObj.status !== overTask.status) {
      setTasks((prev) =>
        prev.map((t) => (t.id === active.id ? { ...t, status: overTask.status } : t))
      )
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    if (task && onTaskUpdate) {
      const columnId = statusToColumnId?.get(task.status)
      onTaskUpdate(task.id, task.status, columnId)
    }
    setActiveTask(null)
  }

  function addTask(status: TaskStatus) {
    if (!newTaskTitle.trim()) return
    const title = newTaskTitle.trim()

    if (onTaskCreate) {
      const columnId = statusToColumnId?.get(status)
      onTaskCreate(title, status, columnId)
    } else {
      // Local-only mode (mock)
      const newTask: Task = {
        id: `t${Date.now()}`,
        project_id: projectId ?? 'p1',
        title,
        status,
        priority: 'medium',
        labels: [],
        position: getTasksByStatus(status).length,
        created_by: 'current-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setTasks((prev) => [...prev, newTask])
    }

    setNewTaskTitle('')
    setAddingTo(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id)
          return (
            <div
              key={column.id}
              className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50"
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', column.color)}>
                    {column.label}
                  </span>
                  <span className="text-xs font-medium text-gray-400">{columnTasks.length}</span>
                </div>
                <button
                  onClick={() => setAddingTo(column.id)}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Tasks */}
              <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-3">
                <SortableContext
                  items={columnTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columnTasks.map((task) => (
                    <SortableTaskCard key={task.id} task={task} />
                  ))}
                </SortableContext>

                {/* Inline add form */}
                {addingTo === column.id && (
                  <div className="rounded-lg border border-indigo-300 bg-white p-3 dark:bg-gray-800">
                    <input
                      autoFocus
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addTask(column.id)
                        if (e.key === 'Escape') setAddingTo(null)
                      }}
                      placeholder="Título da tarefa..."
                      className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                    />
                    <div className="mt-2 flex gap-1.5">
                      <button
                        onClick={() => addTask(column.id)}
                        className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Adicionar
                      </button>
                      <button
                        onClick={() => setAddingTo(null)}
                        className="rounded px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}

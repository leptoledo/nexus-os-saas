'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  GanttChartSquare,
  Kanban,
  List,
  Play,
  Plus,
  Square,
  Timer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Edit,
} from 'lucide-react'
import { KanbanBoard } from '@/components/projects/KanbanBoard'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { CreateTaskModal } from '@/components/projects/CreateTaskModal'
import { cn, formatDate, getInitials } from '@/lib/utils'

// ... remaining imports stay intact ...
export default function ProjectsPage() {
  const [activeView, setActiveView] = useState('kanban')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)
  const [listFilter, setListFilter] = useState('')

  // Data hooks
  const { data: projects = [], isLoading: loadingProjects } = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const updateProject = useUpdateProject()
  const moveTask = useMoveTask()
  const createTask = useCreateTask()
  const deleteTask = useDeleteTask()

  // Board + tasks for selected project
  const { data: boardData } = useProjectBoard(selectedProject?.id)
  const { data: boardTasks = [], isLoading: loadingTasks } = useBoardTasks(
    selectedProject?.id,
    boardData?.boardId ?? undefined,
    boardData?.columnIdToStatus ?? new Map()
  )

  // Auto-select first project once loaded
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0])
    }
  }, [projects, selectedProject])

  function formatTimer(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function toggleTimer() {
    if (timerRunning) {
      clearInterval(timerInterval!)
      setTimerInterval(null)
      setTimerRunning(false)
    } else {
      const interval = setInterval(() => setTimerSeconds((s) => s + 1), 1000)
      setTimerInterval(interval)
      setTimerRunning(true)
    }
  }

  function resetTimer() {
    if (timerInterval) clearInterval(timerInterval)
    setTimerInterval(null)
    setTimerRunning(false)
    setTimerSeconds(0)
  }

  function handleTaskUpdate(taskId: string, status: TaskStatus, columnId?: string) {
    if (!selectedProject?.id || !boardData?.boardId || !columnId) return
    moveTask.mutate({
      projectId: selectedProject.id,
      boardId: boardData.boardId,
      taskId,
      columnId,
    })
  }

  function handleTaskCreate(title: string, status: TaskStatus, columnId?: string) {
    if (!selectedProject?.id || !boardData?.boardId || !columnId) return
    createTask.mutate({
      projectId: selectedProject.id,
      boardId: boardData.boardId,
      data: { title, column_id: columnId, priority: 'medium' },
    })
  }

  const activeProjectsCount = projects.filter((p) => p.status === 'active').length
  const pendingTasksCount = boardTasks.filter((t) => t.status !== 'done').length

  const filteredListTasks = boardTasks.filter((t) =>
    !listFilter || t.title.toLowerCase().includes(listFilter.toLowerCase())
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Projetos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {loadingProjects ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> A carregar...</span>
            ) : (
              `${activeProjectsCount} projetos ativos · ${pendingTasksCount} tarefas pendentes`
            )}
          </p>
        </div>

        {/* Time tracker widget */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
          <Timer className="h-4 w-4 text-gray-400" />
          <span className="font-mono text-lg font-bold tabular-nums text-gray-900 dark:text-white">
            {formatTimer(timerSeconds)}
          </span>
          <button
            onClick={toggleTimer}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
              timerRunning ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
            )}
          >
            {timerRunning ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button onClick={resetTimer} className="text-xs text-gray-400 hover:text-gray-600">
            Reset
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewTask(true)}
            disabled={!selectedProject || !boardData?.boardId}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-600/30 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </button>

          <button
            onClick={() => setShowNewProject(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Novo Projeto
          </button>
        </div>
      </div>

      {/* Project cards */}
      {loadingProjects ? (
        <div className="mb-6 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : projects.length === 0 ? (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950">
            <Kanban className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Ainda não tem projetos</h3>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Crie o primeiro projeto e comece a organizar as tarefas da sua equipa.
          </p>
          <button
            onClick={() => setShowNewProject(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Criar primeiro projeto
          </button>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((project) => {
            const statusCfg = STATUS_PROJECT_CONFIG[project.status] ?? STATUS_PROJECT_CONFIG.planning
            const StatusIcon = statusCfg.icon
            const isSelected = selectedProject?.id === project.id

            return (
              <div
                key={project.id}
                className={cn(
                  'group relative rounded-xl border p-4 text-left transition-all hover:shadow-md cursor-pointer',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md dark:bg-indigo-950/30'
                    : 'border-gray-200 bg-white hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-900'
                )}
                onClick={() => setSelectedProject(project)}
              >
                {/* Action buttons — appear on hover */}
                <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex" onClick={(e) => e.stopPropagation()}>
                  <button
                    title="Editar projeto"
                    onClick={() => {
                      const newName = window.prompt('Novo nome do projeto:', project.name)
                      if (newName && newName.trim() && newName.trim() !== project.name) {
                        updateProject.mutate(
                          { id: project.id, data: { name: newName.trim() } },
                          { onSuccess: () => toast.success('Projeto atualizado!') }
                        )
                      }
                    }}
                    className="rounded-md bg-white/90 p-1 text-gray-500 shadow-sm hover:text-indigo-600 dark:bg-gray-800/90"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title="Eliminar projeto"
                    onClick={() => {
                      if (window.confirm(`Eliminar projeto "${project.name}"? Esta ação é irreversível.`)) {
                        deleteProject.mutate(project.id, {
                          onSuccess: () => {
                            toast.success('Projeto eliminado')
                            if (selectedProject?.id === project.id) setSelectedProject(null)
                          }
                        })
                      }
                    }}
                    className="rounded-md bg-white/90 p-1 text-gray-500 shadow-sm hover:text-red-600 dark:bg-gray-800/90"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: (project.color ?? '#4f46e5') + '20' }}>
                    <div className="h-3 w-3 rounded-sm" style={{ background: project.color ?? '#4f46e5' }} />
                  </div>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', statusCfg.class)}>
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </span>
                </div>

                <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                <p className="mb-3 line-clamp-2 text-xs text-gray-500">{project.description ?? '—'}</p>

                {/* Progress */}
                <div className="mb-2">
                  <div className="mb-1 flex justify-between text-xs text-gray-400">
                    <span>Progresso</span>
                    <span className="font-medium text-gray-600 dark:text-gray-300">{project.progress ?? 0}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${project.progress ?? 0}%`, background: project.color ?? '#4f46e5' }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{project.tasks_completed ?? 0}/{project.tasks_total ?? 0} tarefas</span>
                  {project.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(project.due_date, 'dd MMM')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* View selector */}
      {selectedProject && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">{selectedProject.name}</h2>
            <div className="flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
              {VIEWS.map((view) => {
                const Icon = view.icon
                return (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      activeView === view.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {view.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* View content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'kanban' && (
                loadingTasks ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <KanbanBoard
                    projectId={selectedProject.id}
                    tasks={boardTasks}
                    statusToColumnId={boardData?.statusToColumnId}
                    onTaskUpdate={handleTaskUpdate}
                    onTaskCreate={handleTaskCreate}
                  />
                )
              )}

              {activeView === 'gantt' && (
                <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                  <div className="overflow-x-auto">
                    {/* Gantt header */}
                    <div className="flex border-b border-gray-100 dark:border-gray-800">
                      <div className="w-56 flex-shrink-0 border-r border-gray-100 px-4 py-3 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800">
                        Tarefa
                      </div>
                      <div className="flex flex-1">
                        {Array.from({ length: TOTAL_GANTT_DAYS }, (_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'flex-1 border-r border-gray-50 py-3 text-center text-[10px] text-gray-400 dark:border-gray-800/50',
                              (i + 1) % 5 === 0 && 'text-gray-500 font-medium'
                            )}
                          >
                            {(i + 1) % 5 === 0 ? `D${i + 1}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gantt rows */}
                    {GANTT_TASKS.map((task) => (
                      <div key={task.id} className="flex border-b border-gray-50 hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-gray-800/30">
                        <div className="flex w-56 flex-shrink-0 items-center border-r border-gray-100 px-4 py-3 dark:border-gray-800">
                          <span className="text-sm text-gray-800 dark:text-gray-200">{task.name}</span>
                        </div>
                        <div className="relative flex flex-1 items-center py-3">
                          <div
                            className={cn('absolute h-6 rounded-md opacity-90 flex items-center px-2', task.color)}
                            style={{
                              left: `${((task.start - 1) / TOTAL_GANTT_DAYS) * 100}%`,
                              width: `${(task.duration / TOTAL_GANTT_DAYS) * 100}%`,
                            }}
                          >
                            <span className="truncate text-[10px] font-semibold text-white">{task.name}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeView === 'list' && (
                <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                    <input
                      value={listFilter}
                      onChange={(e) => setListFilter(e.target.value)}
                      placeholder="Filtrar tarefas..."
                      className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-600"
                    />
                  </div>

                  {loadingTasks ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    </div>
                  ) : filteredListTasks.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">
                      {listFilter ? 'Nenhuma tarefa encontrada.' : 'Nenhuma tarefa neste projeto.'}
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          {['Tarefa', 'Status', 'Prioridade', 'Responsável', 'Prazo', 'Horas', ''].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {filteredListTasks.map((task) => (
                          <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{task.title}</td>
                            <td className="px-4 py-3">
                              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TASK_STATUS_CLASSES[task.status] ?? 'bg-gray-100 text-gray-600')}>
                                {TASK_STATUS_LABELS[task.status] ?? task.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_CLASSES[task.priority] ?? 'bg-gray-100 text-gray-600')}>
                                {task.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {task.assignee ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
                                    {getInitials(task.assignee.name)}
                                  </div>
                                  {task.assignee.name}
                                </div>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {task.due_date ? formatDate(task.due_date, 'dd/MM') : '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {task.estimated_hours ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                                  {task.estimated_hours}h
                                </div>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                title="Eliminar tarefa"
                                disabled={deleteTask.isPending}
                                onClick={() => {
                                  if (window.confirm(`Eliminar tarefa "${task.title}"?`) && boardData?.boardId && selectedProject) {
                                    deleteTask.mutate(
                                      { projectId: selectedProject.id, boardId: boardData.boardId, taskId: task.id },
                                      { onSuccess: () => toast.success('Tarefa eliminada') }
                                    )
                                  }
                                }}
                                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      <CreateProjectModal
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreate={async (data) => {
          await createProject.mutateAsync(data)
        }}
        isPending={createProject.isPending}
      />

      <CreateTaskModal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        projectId={selectedProject?.id}
        boardId={boardData?.boardId ?? undefined}
        columns={boardData?.columns ?? []}
      />
    </div>
  )
}

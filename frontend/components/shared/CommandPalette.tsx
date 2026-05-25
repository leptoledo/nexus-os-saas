'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  BarChart3,
  Bell,
  Bot,
  FileText,
  Hash,
  Layers,
  LayoutDashboard,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  User,
  X,
} from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  /** Optional modal openers — layout passes these so Create commands open real modals */
  onCreateProject?: () => void
  onCreateCampaign?: () => void
  onCreateLead?: () => void
  onCreateTask?: () => void
}

type Command = {
  id: string
  label: string
  icon: React.ElementType
  category: string
  action: string | (() => void)
}

const NAV_COMMANDS: Command[] = [
  { id: 'go-dashboard', label: 'Dashboard', icon: LayoutDashboard, action: '/dashboard', category: 'Navegar' },
  { id: 'go-marketing', label: 'Marketing & CRM', icon: TrendingUp, action: '/marketing', category: 'Navegar' },
  { id: 'go-projects', label: 'Projetos', icon: Layers, action: '/projects', category: 'Navegar' },
  { id: 'go-analytics', label: 'Analytics', icon: BarChart3, action: '/analytics', category: 'Navegar' },
  { id: 'go-whatsapp', label: 'WhatsApp Bot', icon: MessageCircle, action: '/whatsapp', category: 'Navegar' },
  { id: 'go-ai', label: 'NexusAI', icon: Sparkles, action: '/ai', category: 'Navegar' },
  { id: 'go-notifications', label: 'Notificações', icon: Bell, action: '/notifications', category: 'Navegar' },
  { id: 'go-settings', label: 'Definições', icon: Settings, action: '/settings', category: 'Navegar' },
  { id: 'go-profile', label: 'Perfil', icon: User, action: '/settings', category: 'Navegar' },
]

const MOCK_RECENT: Command[] = [
  { id: 'r1', label: 'Projeto Website Redesign', icon: Layers, action: '/projects', category: 'Recente' },
  { id: 'r2', label: 'Lead: Empresa ABC', icon: TrendingUp, action: '/marketing', category: 'Recente' },
  { id: 'r3', label: 'Campanha Newsletter Outubro', icon: Hash, action: '/marketing', category: 'Recente' },
  { id: 'r4', label: 'Relatório Q3 2024', icon: FileText, action: '/analytics', category: 'Recente' },
]

export function CommandPalette({
  open,
  onClose,
  onCreateProject,
  onCreateCampaign,
  onCreateLead,
  onCreateTask,
}: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  // Build quick commands dynamically — use modal callbacks when available, fallback to navigation
  const QUICK_COMMANDS: Command[] = [
    {
      id: 'new-project',
      label: 'Novo Projeto',
      icon: Plus,
      category: 'Criar',
      action: onCreateProject ?? '/projects',
    },
    {
      id: 'new-campaign',
      label: 'Nova Campanha',
      icon: Plus,
      category: 'Criar',
      action: onCreateCampaign ?? '/marketing',
    },
    {
      id: 'new-lead',
      label: 'Novo Lead',
      icon: Plus,
      category: 'Criar',
      action: onCreateLead ?? '/marketing',
    },
    {
      id: 'new-task',
      label: 'Nova Tarefa',
      icon: Plus,
      category: 'Criar',
      action: onCreateTask ?? '/projects',
    },
  ]

  const ALL_COMMANDS = [...QUICK_COMMANDS, ...NAV_COMMANDS, ...MOCK_RECENT]

  function handleSelect(action: string | (() => void)) {
    if (typeof action === 'function') {
      action()
    } else {
      router.push(action)
    }
    onClose()
  }

  if (!open) return null

  const filteredBySearch = search
    ? ALL_COMMANDS.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(search.toLowerCase()) ||
          cmd.category.toLowerCase().includes(search.toLowerCase())
      )
    : ALL_COMMANDS

  const grouped = filteredBySearch.reduce<Record<string, typeof ALL_COMMANDS>>(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = []
      acc[cmd.category].push(cmd)
      return acc
    },
    {}
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <Command className="flex flex-col">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Pesquisar ou ir para..."
              className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
              autoFocus
            />
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <Command.List className="max-h-96 overflow-y-auto py-2">
            <Command.Empty className="py-12 text-center text-sm text-gray-400">
              Nenhum resultado encontrado.
            </Command.Empty>

            {Object.entries(grouped).map(([category, commands]) => (
              <Command.Group
                key={category}
                heading={
                  <span className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    {category}
                  </span>
                }
              >
                {commands.map((cmd) => {
                  const Icon = cmd.icon
                  return (
                    <Command.Item
                      key={cmd.id}
                      value={cmd.label}
                      onSelect={() => handleSelect(cmd.action)}
                      className="mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 aria-selected:bg-indigo-50 aria-selected:text-indigo-700 dark:text-gray-300 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300 dark:aria-selected:bg-indigo-950/30"
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{cmd.label}</span>
                      {typeof cmd.action === 'function' && (
                        <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">
                          modal
                        </span>
                      )}
                    </Command.Item>
                  )
                })}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-gray-200 px-1.5 dark:border-gray-700">↑↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-gray-200 px-1.5 dark:border-gray-700">↵</kbd>
                selecionar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-gray-200 px-1.5 dark:border-gray-700">Esc</kbd>
                fechar
              </span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  )
}

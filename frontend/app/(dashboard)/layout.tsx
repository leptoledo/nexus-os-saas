'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  BarChart3,
  Bell,
  Bot,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  TrendingUp,
  User,
  X,
  Zap,
  Layers,
  Search,
  Sparkles,
  CheckCheck,
  ArrowRight,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { FirstRunModal } from '@/components/shared/FirstRunModal'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { CreateCampaignModal } from '@/components/marketing/CreateCampaignModal'
import { CreateLeadModal } from '@/components/marketing/CreateLeadModal'
import { cn, getInitials } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/marketing', label: 'Marketing', icon: TrendingUp },
  { href: '/projects', label: 'Projetos', icon: Layers },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/whatsapp', label: 'WhatsApp Bot', icon: Bot },
  { href: '/ai', label: 'NexusAI', icon: Sparkles },
  { href: '/notifications', label: 'Notificações', icon: Bell },
  { href: '/settings', label: 'Configurações', icon: Settings },
  { href: '/billing', label: 'Billing', icon: CreditCard },
]

const PLAN_BADGE: Record<string, { label: string; class: string }> = {
  starter: { label: 'Starter', class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  pro: { label: 'Pro', class: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  business: { label: 'Business', class: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, organization, logout } = useAuthStore()
  const { unreadCount } = useRealtimeNotifications()
  const { theme, setTheme } = useTheme()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false)
  const [createLeadOpen, setCreateLeadOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const queryClient = useQueryClient()

  // Notifications dropdown data
  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'dropdown'],
    queryFn: () => notificationsApi.getNotifications({ unread: true }),
    staleTime: 30_000,
    enabled: notifOpen,
  })
  const dropdownNotifs = (notifData?.data ?? []).slice(0, 5) as any[]

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // ⌘K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const planBadge = PLAN_BADGE[organization?.plan ?? 'starter']

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col bg-gray-900 transition-all duration-300 dark:bg-gray-950 lg:relative lg:z-auto',
          sidebarCollapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className={cn('flex h-16 items-center border-b border-gray-800 px-4', sidebarCollapsed ? 'justify-center' : 'justify-between')}>
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">NexusOS</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
          )}

          {/* Collapse toggle (desktop) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              'hidden rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white lg:flex',
              sidebarCollapsed && 'absolute -right-3 top-16 rounded-full border border-gray-700 bg-gray-900 p-0.5'
            )}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-gray-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Plan badge */}
        {!sidebarCollapsed && planBadge && (
          <div className="px-4 pt-3">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', planBadge.class)}>
              {planBadge.label}
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                      sidebarCollapsed ? 'justify-center' : '',
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 flex-shrink-0" size={18} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className={cn('border-t border-gray-800 p-3', sidebarCollapsed ? 'flex justify-center' : '')}>
          {sidebarCollapsed ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {getInitials(user?.name || user?.email || 'U')}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                {getInitials(user?.name || user?.email || 'U')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                <p className="truncate text-xs text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="rounded-md p-1 text-gray-400 hover:text-red-400"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search / Command palette */}
            <button
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-indigo-300 hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-indigo-600"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Pesquisar...</span>
              <kbd className="hidden rounded border border-gray-200 px-1.5 py-0.5 text-xs dark:border-gray-700 sm:inline">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
                className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">
                          Notificações
                          {unreadCount > 0 && (
                            <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950 dark:text-red-400">
                              {unreadCount}
                            </span>
                          )}
                        </p>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllRead.mutate()}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                          >
                            <CheckCheck className="h-3 w-3" /> Marcar todas
                          </button>
                        )}
                      </div>

                      {/* Notification list */}
                      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                        {dropdownNotifs.length === 0 ? (
                          <div className="py-8 text-center text-sm text-gray-400">
                            <Bell className="mx-auto h-6 w-6 mb-2 opacity-30" />
                            Sem notificações por ler
                          </div>
                        ) : (
                          dropdownNotifs.map((n: any) => (
                            <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{n.title}</p>
                                {n.body && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{n.body}</p>}
                              </div>
                              <button
                                onClick={() => markRead.mutate(n.id)}
                                className="flex-shrink-0 text-gray-300 hover:text-indigo-600 dark:text-gray-600 dark:hover:text-indigo-400"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
                        <Link
                          href="/notifications"
                          onClick={() => setNotifOpen(false)}
                          className="flex items-center justify-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                        >
                          Ver todas as notificações <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar / Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                {getInitials(user?.name || user?.email || 'U')}
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                      <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <User className="h-4 w-4" /> Perfil
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <Settings className="h-4 w-4" /> Definições
                    </Link>
                    <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                    <button
                      onClick={() => { setProfileOpen(false); logout() }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onCreateProject={() => setCreateProjectOpen(true)}
        onCreateCampaign={() => setCreateCampaignOpen(true)}
        onCreateLead={() => setCreateLeadOpen(true)}
      />

      {/* Global create modals (triggered from CommandPalette) */}
      <CreateProjectModal open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} />
      <CreateCampaignModal open={createCampaignOpen} onClose={() => setCreateCampaignOpen(false)} />
      <CreateLeadModal open={createLeadOpen} onClose={() => setCreateLeadOpen(false)} />

      {/* First-run: ask for name if not set */}
      <FirstRunModal />
    </div>
  )
}

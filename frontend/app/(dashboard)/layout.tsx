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
  Calendar,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  TrendingUp,
  X,
  Zap,
  Layers,
  Search,
  Sparkles,
  BookOpen,
  FileText,
  Users,
  PenTool,
  ShieldAlert,
  Upload,
  Globe,
  UserCheck,
  FileCode,
  HelpCircle,
  CheckCheck,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { FirstRunModal } from '@/components/shared/FirstRunModal'
import { cn, getInitials } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/marketing', label: 'Marketing & CRM', icon: TrendingUp },
  { href: '/projects', label: 'Gestão de Projetos', icon: Layers },
  { href: '/analytics', label: 'Analytics & BI', icon: BarChart3 },
  { href: '/whatsapp', label: 'WhatsApp Bot', icon: MessageSquare },
  { href: '/ai', label: 'NexusAI', icon: Bot },
  { href: '/billing', label: 'Assinatura', icon: CreditCard },
  { href: '/notifications', label: 'Notificações', icon: Bell },
  { href: '/settings', label: 'Configurações', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, organization, logout } = useAuthStore()
  const { unreadCount } = useRealtimeNotifications()

  const [isHovered, setIsHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const queryClient = useQueryClient()

  // Map route path to human-readable page name
  const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/marketing': 'Marketing & CRM',
    '/projects': 'Gestão de Projetos',
    '/analytics': 'Analytics & BI',
    '/whatsapp': 'WhatsApp Bot',
    '/ai': 'NexusAI',
    '/billing': 'Assinatura & Planos',
    '/notifications': 'Notificações',
    '/settings': 'Configurações',
    '/feedback': 'Feedback & Suporte',
  }
  const currentPageTitle = pageTitles[pathname] ?? 'Dashboard'

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

  return (
    <div className="flex h-screen overflow-hidden bg-[#090d16] text-slate-100 font-sans antialiased">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Collapsed by default (w-16), expands on hover (w-64) */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col bg-[#070a11] border-r border-slate-800/60 backdrop-blur-md transition-all duration-300 ease-in-out lg:relative lg:z-auto',
          isHovered ? 'w-64 shadow-2xl shadow-black/80' : 'w-16',
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo / Brand Header */}
        <div className="flex h-14 items-center px-4 border-b border-slate-800/40">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <Zap className="h-4 w-4 fill-emerald-400" />
            </div>
            {(isHovered || mobileOpen) && (
              <span className="text-base font-bold tracking-tight text-white">NexusOS</span>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto text-slate-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 no-scrollbar">
          <ul className="space-y-0.5 px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={!isHovered ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                      !isHovered && !mobileOpen ? 'justify-center' : '',
                      isActive
                        ? 'bg-[#0e2a24] text-[#00e699] border border-[#00e699]/30 font-semibold'
                        : 'text-slate-300 hover:bg-slate-900/80 hover:text-white border border-transparent'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-[#00e699]' : 'text-slate-400')} />
                    {(isHovered || mobileOpen) && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Footer */}
        <div className="border-t border-slate-800/40 p-2.5">
          {(!isHovered && !mobileOpen) ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white mx-auto">
              {getInitials(user?.name || user?.email || 'L')}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-1">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {getInitials(user?.name || user?.email || 'L')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-100">{user?.name || 'Leandro Toledo'}</p>
                <p className="truncate text-[10px] text-slate-400">{user?.email || 'leptoledo@hotmail.com'}</p>
              </div>
              <button
                onClick={logout}
                className="text-slate-400 hover:text-red-400 p-1"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#090d16]">
        {/* Topbar Header */}
        <header className="flex h-14 items-center justify-between border-b border-slate-800/60 bg-[#090d16] px-4 sm:px-6">
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setMobileOpen(true)}
              className="mr-1 text-slate-400 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-slate-400">
              <div className="h-5 w-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Zap className="h-3 w-3" />
              </div>
              <span className="text-slate-400 font-medium">/ NexusOS</span>
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wide">
                PRO
              </span>
              <span className="text-slate-500">/</span>
              <span className="text-white font-semibold">
                {currentPageTitle}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <Link href="/feedback" className="text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors">
              Feedback
            </Link>

            {/* Search Input Pill */}
            <button
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 rounded-full border border-slate-800 bg-[#0d121f] px-3 py-1 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search...</span>
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.2 text-[10px]">
                ⌘K
              </kbd>
            </button>

            {/* Help Icon */}
            <button className="text-slate-400 hover:text-slate-200 p-1">
              <HelpCircle className="h-4 w-4" />
            </button>

            {/* Notification Bell */}
            <button className="relative text-slate-400 hover:text-slate-200 p-1">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#090d16]"></span>
              )}
            </button>

            {/* User Avatar Circle */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]">
              {getInitials(user?.name || user?.email || 'L')}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#090d16]">
          {children}
        </main>
      </div>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <FirstRunModal />
    </div>
  )
}

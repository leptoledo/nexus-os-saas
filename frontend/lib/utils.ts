import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistance, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// --------------- Tailwind class merge ---------------

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --------------- Currency ---------------

export function formatCurrency(
  value: number,
  currency: string = 'EUR',
  locale: string = 'pt-PT'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

// --------------- Dates ---------------

export function formatDate(
  date: string | Date,
  pattern: string = 'dd MMM yyyy',
  locale = ptBR
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale })
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistance(d, new Date(), { addSuffix: true, locale: ptBR })
}

export function formatDatetime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd MMM yyyy 'às' HH:mm", { locale: ptBR })
}

// --------------- Strings ---------------

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

// --------------- Avatars ---------------

export function generateAvatar(name: string, background?: string): string {
  const bg = background ?? 'random'
  const encoded = encodeURIComponent(name)
  return `https://ui-avatars.com/api/?name=${encoded}&background=${bg}&color=fff&size=128&bold=true`
}

// --------------- Numbers ---------------

export function formatNumber(value: number, locale: string = 'pt-PT'): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`
  }
  return new Intl.NumberFormat(locale).format(value)
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// --------------- Functions ---------------

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastRun = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastRun >= limit) {
      lastRun = now
      fn(...args)
    }
  }
}

// --------------- Colors ---------------

export const CHART_COLORS = [
  '#4f46e5',
  '#7c3aed',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
]

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    inactive: 'text-gray-600 bg-gray-50 border-gray-200',
    draft: 'text-amber-600 bg-amber-50 border-amber-200',
    pending: 'text-amber-600 bg-amber-50 border-amber-200',
    completed: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    cancelled: 'text-red-600 bg-red-50 border-red-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    won: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    lost: 'text-red-600 bg-red-50 border-red-200',
    hot: 'text-red-600 bg-red-50 border-red-200',
    warm: 'text-amber-600 bg-amber-50 border-amber-200',
    cold: 'text-blue-600 bg-blue-50 border-blue-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    medium: 'text-amber-600 bg-amber-50 border-amber-200',
    low: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  }
  return map[status] ?? 'text-gray-600 bg-gray-50 border-gray-200'
}

// --------------- Storage ---------------

export function getLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const item = window.localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : fallback
  } catch {
    return fallback
  }
}

export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable
  }
}

// --------------- URL / Query ---------------

export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  return search.toString()
}

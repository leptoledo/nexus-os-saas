'use client'

import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts'
import { cn, formatNumber, formatCurrency } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: number
  change?: number
  format?: 'number' | 'currency' | 'percentage'
  currency?: string
  icon: LucideIcon
  iconColor?: string
  sparklineData?: { value: number }[]
  isLoading?: boolean
  description?: string
  href?: string
}

function KPICardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-12 rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  )
}

export function KPICard({
  title,
  value,
  change,
  format = 'number',
  currency = 'EUR',
  icon: Icon,
  iconColor = 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
  sparklineData,
  isLoading = false,
  description,
  href,
}: KPICardProps) {
  if (isLoading) return <KPICardSkeleton />

  function formatValue(v: number): string {
    if (format === 'currency') return formatCurrency(v, currency)
    if (format === 'percentage') return `${v.toFixed(1)}%`
    return formatNumber(v)
  }

  const isPositive = (change ?? 0) > 0
  const isNegative = (change ?? 0) < 0
  const isNeutral = change === 0 || change === undefined

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus
  const changeColor = isPositive
    ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30'
    : isNegative
    ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30'
    : 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-gray-800'

  const lineColor = isPositive ? '#10b981' : isNegative ? '#ef4444' : '#6366f1'

  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-extrabold tabular-nums text-gray-900 dark:text-white">
            {formatValue(value)}
          </p>
          {description && (
            <p className="mt-1 text-xs text-gray-400">{description}</p>
          )}
        </div>

        <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Change badge */}
      {change !== undefined && (
        <div className="mb-3 flex items-center gap-1.5">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', changeColor)}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">vs. mês anterior</span>
        </div>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="h-14">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs shadow dark:border-gray-700 dark:bg-gray-800">
                      {formatValue(payload[0].value as number)}
                    </div>
                  ) : null
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* View more link */}
      {href && (
        <Link
          href={href}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
        >
          Ver detalhes <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}

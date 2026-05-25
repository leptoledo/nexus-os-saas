'use client'

import { type ReactNode } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { cn, CHART_COLORS } from '@/lib/utils'
import { MoreHorizontal } from 'lucide-react'

type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'funnel'

interface ChartWidgetProps {
  title: string
  subtitle?: string
  data: Record<string, string | number>[]
  type: ChartType
  dataKeys?: string[]
  colors?: string[]
  nameKey?: string
  valueKey?: string
  className?: string
  isLoading?: boolean
  actions?: ReactNode
  height?: number
  formatValue?: (value: number) => string
}

function LoadingSkeleton({ height }: { height: number }) {
  return (
    <div
      className="animate-pulse rounded bg-gray-100 dark:bg-gray-800"
      style={{ height }}
    />
  )
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      Sem dados disponíveis.
    </div>
  )
}

const CustomTooltip = ({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
  formatValue?: (v: number) => string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      {label && <p className="mb-1.5 text-xs font-semibold text-gray-500">{label}</p>}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatValue ? formatValue(entry.value) : entry.value.toLocaleString('pt-PT')}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ChartWidget({
  title,
  subtitle,
  data,
  type,
  dataKeys = ['value'],
  colors = CHART_COLORS,
  nameKey = 'name',
  className,
  isLoading = false,
  actions,
  height = 240,
  formatValue,
}: ChartWidgetProps) {
  const isEmpty = !data || data.length === 0

  function renderChart() {
    if (isLoading) return <LoadingSkeleton height={height} />
    if (isEmpty) return <EmptyState />

    const tooltipProps = {
      content: <CustomTooltip formatValue={formatValue} />,
    }

    if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip {...tooltipProps} />
            {dataKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {dataKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
            <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip {...tooltipProps} />
            {dataKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {dataKeys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[i % colors.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )
    }

    if (type === 'area') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              {dataKeys.map((key, i) => (
                <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip {...tooltipProps} />
            {dataKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {dataKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                fill={`url(#gradient-${key})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )
    }

    if (type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={height / 2 - 20}
              innerRadius={height / 4 - 10}
              dataKey={dataKeys[0]}
              nameKey={nameKey}
              paddingAngle={2}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  strokeWidth={0}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="text-xs">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {String(payload[0].name)}:
                      </span>{' '}
                      <span className="text-gray-600 dark:text-gray-300">
                        {formatValue
                          ? formatValue(payload[0].value as number)
                          : (payload[0].value as number).toLocaleString('pt-PT')}
                      </span>
                    </div>
                  </div>
                ) : null
              }
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    if (type === 'funnel') {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <FunnelChart>
            <Tooltip {...tooltipProps} />
            <Funnel dataKey={dataKeys[0]} data={data} isAnimationActive>
              <LabelList
                position="insideTop"
                fill="white"
                stroke="none"
                dataKey={nameKey}
                fontSize={12}
                fontWeight={600}
              />
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      )
    }

    return null
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900',
        className
      )}
    >
      <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        {actions ?? (
          <button className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="p-6">{renderChart()}</div>
    </div>
  )
}

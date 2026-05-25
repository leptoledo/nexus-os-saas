'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
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
import { Plus, Calendar, Building2, Euro } from 'lucide-react'
import { cn, formatCurrency, formatDate, getInitials } from '@/lib/utils'
import type { Lead, LeadStatus } from '@/types'

const COLUMNS: { id: LeadStatus; label: string; color: string; dotColor: string }[] = [
  { id: 'new', label: 'Novo Lead', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', dotColor: 'bg-blue-500' },
  { id: 'qualified', label: 'Qualificado', color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300', dotColor: 'bg-violet-500' },
  { id: 'proposal_sent', label: 'Proposta Enviada', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', dotColor: 'bg-amber-500' },
  { id: 'negotiation', label: 'Em Negociação', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', dotColor: 'bg-orange-500' },
  { id: 'won', label: 'Fechado (Ganho)', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', dotColor: 'bg-emerald-500' },
  { id: 'lost', label: 'Fechado (Perdido)', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', dotColor: 'bg-red-500' },
]

const SCORE_CONFIG = {
  hot: { label: '🔥 Quente', class: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300' },
  warm: { label: '🌤 Morno', class: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300' },
  cold: { label: '❄️ Frio', class: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300' },
}

const MOCK_LEADS: Lead[] = [
  { id: 'l1', organization_id: 'o1', name: 'João Rodrigues', company: 'TechCorp Lda', email: 'joao@techcorp.pt', status: 'new', score: 'hot', estimated_value: 8500, currency: 'EUR', next_action: 'Agendar demo', position: 0, created_at: '', updated_at: '' },
  { id: 'l2', organization_id: 'o1', name: 'Sara Mendes', company: 'Digital Studio', status: 'new', score: 'warm', estimated_value: 3200, currency: 'EUR', position: 1, created_at: '', updated_at: '' },
  { id: 'l3', organization_id: 'o1', name: 'Carlos Pereira', company: 'RetailMax', status: 'qualified', score: 'hot', estimated_value: 15000, currency: 'EUR', next_action: 'Enviar proposta', next_action_date: '2025-06-12', position: 0, created_at: '', updated_at: '' },
  { id: 'l4', organization_id: 'o1', name: 'Ana Lopes', company: 'HealthPlus', status: 'proposal_sent', score: 'warm', estimated_value: 7800, currency: 'EUR', position: 0, created_at: '', updated_at: '' },
  { id: 'l5', organization_id: 'o1', name: 'Miguel Costa', company: 'LogiTrans SA', status: 'negotiation', score: 'hot', estimated_value: 22000, currency: 'EUR', next_action: 'Reunião final', next_action_date: '2025-06-14', position: 0, created_at: '', updated_at: '' },
  { id: 'l6', organization_id: 'o1', name: 'Rui Santos', company: 'EduLearn', status: 'qualified', score: 'cold', estimated_value: 4500, currency: 'EUR', position: 1, created_at: '', updated_at: '' },
  { id: 'l7', organization_id: 'o1', name: 'Inês Ferreira', company: 'FinServ', status: 'won', score: 'hot', estimated_value: 18000, currency: 'EUR', position: 0, created_at: '', updated_at: '' },
]

interface LeadCardProps {
  lead: Lead
  isDragging?: boolean
}

function LeadCard({ lead, isDragging }: LeadCardProps) {
  const score = SCORE_CONFIG[lead.score]

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-3 shadow-sm transition-all dark:bg-gray-800',
        isDragging
          ? 'rotate-1 border-indigo-300 shadow-lg dark:border-indigo-700'
          : 'border-gray-200 hover:shadow-md dark:border-gray-700'
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{lead.name}</p>
          {lead.company && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
              <Building2 className="h-3 w-3" />
              {lead.company}
            </div>
          )}
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
          {getInitials(lead.name)}
        </div>
      </div>

      <div className="mb-2 flex items-center gap-1.5">
        <Euro className="h-3 w-3 text-emerald-600" />
        <span className="text-sm font-bold text-emerald-600">
          {formatCurrency(lead.estimated_value, lead.currency)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', score.class)}>
          {score.label}
        </span>

        {lead.next_action_date && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Calendar className="h-3 w-3" />
            {formatDate(lead.next_action_date, 'dd/MM')}
          </div>
        )}
      </div>

      {lead.next_action && (
        <p className="mt-2 truncate text-[11px] text-gray-500 dark:text-gray-400">
          → {lead.next_action}
        </p>
      )}
    </div>
  )
}

function SortableLeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCard lead={lead} />
    </div>
  )
}

interface LeadPipelineProps {
  leads?: Lead[]
  onLeadMove?: (leadId: string, status: LeadStatus) => void
}

export function LeadPipeline({ leads: externalLeads, onLeadMove }: LeadPipelineProps) {
  const [leads, setLeads] = useState<Lead[]>(externalLeads ?? MOCK_LEADS)
  const [activeLead, setActiveLead] = useState<Lead | null>(null)

  // Sync external leads when they change
  useEffect(() => {
    if (externalLeads) setLeads(externalLeads)
  }, [externalLeads])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const getLeadsByStatus = useCallback(
    (status: LeadStatus) => leads.filter((l) => l.status === status),
    [leads]
  )

  function getTotalValue(status: LeadStatus): number {
    return getLeadsByStatus(status).reduce((sum, l) => sum + l.estimated_value, 0)
  }

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id)
    if (lead) setActiveLead(lead)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeLead = leads.find((l) => l.id === active.id)
    if (!activeLead) return

    const overColumn = COLUMNS.find((col) => col.id === over.id)
    if (overColumn && activeLead.status !== overColumn.id) {
      setLeads((prev) =>
        prev.map((l) => (l.id === active.id ? { ...l, status: overColumn.id } : l))
      )
      return
    }

    const overLead = leads.find((l) => l.id === over.id)
    if (overLead && activeLead.status !== overLead.status) {
      setLeads((prev) =>
        prev.map((l) => (l.id === active.id ? { ...l, status: overLead.status } : l))
      )
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active } = event
    const lead = leads.find((l) => l.id === active.id)
    if (lead && onLeadMove) {
      onLeadMove(lead.id, lead.status)
    }
    setActiveLead(null)
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
          const columnLeads = getLeadsByStatus(column.id)
          const totalValue = getTotalValue(column.id)

          return (
            <div
              key={column.id}
              data-column-id={column.id}
              className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50"
            >
              {/* Column header */}
              <div className="px-4 py-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2 w-2 rounded-full', column.dotColor)} />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {column.label}
                    </span>
                    <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {columnLeads.length}
                    </span>
                  </div>
                  <button className="rounded-md p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {totalValue > 0 && (
                  <p className="text-xs text-gray-400">
                    {formatCurrency(totalValue, 'EUR')} potencial
                  </p>
                )}
              </div>

              {/* Leads */}
              <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-3">
                <SortableContext
                  items={columnLeads.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columnLeads.map((lead) => (
                    <SortableLeadCard key={lead.id} lead={lead} />
                  ))}
                </SortableContext>

                {columnLeads.length === 0 && (
                  <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-400 dark:border-gray-700">
                    Arraste leads aqui
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeLead && <LeadCard lead={activeLead} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}

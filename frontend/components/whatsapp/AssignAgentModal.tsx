'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check } from 'lucide-react'
import { useAssignConversation } from '@/hooks/useWhatsApp'
import { useMembers } from '@/hooks/useSettings'
import { toast } from 'sonner'

function getInitials(name: string): string {
  return (name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

const DEFAULT_AGENTS = [
  { id: 'agent-1', name: 'Ana Silva', email: 'ana.silva@nexusdemo.pt', role: 'admin' },
  { id: 'agent-2', name: 'Bruno Costa', email: 'bruno.costa@nexusdemo.pt', role: 'manager' },
  { id: 'agent-3', name: 'Catarina Lopes', email: 'catarina.lopes@nexusdemo.pt', role: 'member' },
]

interface Props {
  open: boolean
  onClose: () => void
  conversationId: string | null
  currentAssignee?: string | null
}

export function AssignAgentModal({ open, onClose, conversationId, currentAssignee }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: dbMembers = [], isLoading } = useMembers()
  const assign = useAssignConversation()

  const members = dbMembers.length > 0 ? dbMembers : DEFAULT_AGENTS

  function handleAssign() {
    if (!conversationId || !selectedId) return
    const agent = members.find((m: any) => m.id === selectedId)
    const agentName = agent?.name ?? 'Agente'

    assign.mutate(
      { conversationId, agentId: agentName },
      {
        onSuccess: () => {
          toast.success(`Atribuído a ${agentName} com sucesso!`)
          setSelectedId(null)
          onClose()
        },
        onError: (err: any) => {
          toast.error(err?.message ?? 'Erro ao atribuir agente')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setSelectedId(null); onClose() } }}>
      <DialogContent className="max-w-sm bg-[#0f1422] text-white border border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold">Atribuir Agente de Atendimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#00e699]" />
            </div>
          ) : (
            members.map((m: any) => {
              const isSelected = selectedId === m.id
              const isCurrent = currentAssignee === m.id || currentAssignee === m.name
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(isSelected ? null : m.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-[#00e699] bg-[#0e2a24] text-white'
                      : 'border-slate-800 bg-[#090d16] hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <Avatar className="h-9 w-9 border border-slate-700">
                    <AvatarFallback className="text-xs font-bold bg-slate-800 text-[#00e699]">
                      {getInitials(m.name ?? m.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-white">{m.name ?? '—'}</p>
                    <p className="text-xs text-slate-400 truncate">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCurrent && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-[#00e699]">
                        Atual
                      </Badge>
                    )}
                    {isSelected && <Check className="h-4 w-4 text-[#00e699]" />}
                  </div>
                </button>
              )
            })
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-800 text-slate-300 hover:bg-slate-800">
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedId || assign.isPending}
            className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold"
          >
            {assign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Atribuir Agente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

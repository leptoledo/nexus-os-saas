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

interface Props {
  open: boolean
  onClose: () => void
  conversationId: string | null
  currentAssignee?: string | null
}

export function AssignAgentModal({ open, onClose, conversationId, currentAssignee }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: members = [], isLoading } = useMembers()
  const assign = useAssignConversation()

  function handleAssign() {
    if (!conversationId || !selectedId) return
    assign.mutate(
      { conversationId, agentId: selectedId },
      {
        onSuccess: () => {
          toast.success('Agente atribuído com sucesso')
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Atribuir Agente</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              Nenhum membro encontrado
            </p>
          ) : (
            members.map((m: any) => {
              const isSelected = selectedId === m.id
              const isCurrent = currentAssignee === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(isSelected ? null : m.id)}
                  className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{getInitials(m.name ?? m.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCurrent && <Badge variant="outline" className="text-xs">Atual</Badge>}
                    {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                  </div>
                </button>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={!selectedId || assign.isPending}>
            {assign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Atribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

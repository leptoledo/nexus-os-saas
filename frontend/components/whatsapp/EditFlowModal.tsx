'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useUpdateFlow } from '@/hooks/useWhatsApp'

interface Flow {
  id: string
  name: string
  trigger_type?: string
  is_active: boolean
}

interface EditFlowModalProps {
  flow: Flow | null
  onClose: () => void
}

const TRIGGER_TYPES = [
  { value: 'keyword', label: 'Palavra-chave' },
  { value: 'welcome', label: 'Boas-vindas (primeira mensagem)' },
  { value: 'inactivity', label: 'Inatividade' },
  { value: 'manual', label: 'Manual' },
]

export function EditFlowModal({ flow, onClose }: EditFlowModalProps) {
  const updateFlow = useUpdateFlow()
  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState('keyword')

  useEffect(() => {
    if (flow) {
      setName(flow.name)
      setTriggerType(flow.trigger_type ?? 'keyword')
    }
  }, [flow])

  function handleClose() {
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!flow || !name.trim()) return
    try {
      await updateFlow.mutateAsync({ id: flow.id, data: { name: name.trim() } })
      toast.success('Fluxo atualizado!')
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar fluxo')
    }
  }

  return (
    <Dialog open={!!flow} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Fluxo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-flow-name">Nome do Fluxo *</Label>
            <Input
              id="edit-flow-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de Gatilho</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateFlow.isPending || !name.trim()}>
              {updateFlow.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

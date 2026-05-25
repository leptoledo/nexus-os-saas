'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useCreateFlow } from '@/hooks/useWhatsApp'

interface CreateFlowModalProps {
  open: boolean
  onClose: () => void
}

const TRIGGER_TYPES = [
  { value: 'keyword', label: 'Palavra-chave' },
  { value: 'welcome', label: 'Boas-vindas (primeira mensagem)' },
  { value: 'inactivity', label: 'Inatividade' },
  { value: 'manual', label: 'Manual' },
]

export function CreateFlowModal({ open, onClose }: CreateFlowModalProps) {
  const createFlow = useCreateFlow()
  const [form, setForm] = useState({
    name: '',
    trigger_type: 'keyword',
    description: '',
  })

  function handleClose() {
    setForm({ name: '', trigger_type: 'keyword', description: '' })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      await createFlow.mutateAsync({
        name: form.name.trim(),
        trigger_type: form.trigger_type,
        description: form.description.trim() || undefined,
      })
      toast.success(`Fluxo "${form.name}" criado com sucesso!`)
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar fluxo')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Fluxo WhatsApp</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="flow-name">Nome do Fluxo *</Label>
            <Input
              id="flow-name"
              placeholder="Ex: Suporte — Triagem Automática"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de Gatilho</Label>
            <Select value={form.trigger_type} onValueChange={(v) => setForm((f) => ({ ...f, trigger_type: v }))}>
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
          <div className="space-y-1.5">
            <Label htmlFor="flow-desc">Descrição (opcional)</Label>
            <Input
              id="flow-desc"
              placeholder="Para que serve este fluxo..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            O fluxo será criado inativo. Podes configurar as etapas e ativá-lo depois.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createFlow.isPending || !form.name.trim()}>
              {createFlow.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Fluxo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

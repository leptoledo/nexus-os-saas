'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useCreateLead } from '@/hooks/useMarketing'

interface CreateLeadModalProps {
  open: boolean
  onClose: () => void
}

const STAGES = [
  { value: 'new', label: 'Novo Lead' },
  { value: 'qualified', label: 'Qualificado' },
  { value: 'proposal', label: 'Proposta Enviada' },
  { value: 'negotiation', label: 'Em Negociação' },
  { value: 'won', label: 'Ganho' },
]

export function CreateLeadModal({ open, onClose }: CreateLeadModalProps) {
  const createLead = useCreateLead()
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    stage: 'new',
    value_estimated: '',
    phone: '',
  })

  function handleClose() {
    setForm({ name: '', email: '', company: '', stage: 'new', value_estimated: '', phone: '' })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      await createLead.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        company: form.company.trim() || undefined,
        stage: form.stage,
        value_estimated: form.value_estimated ? Number(form.value_estimated) : undefined,
      })
      toast.success(`Lead "${form.name}" criado com sucesso!`)
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar lead')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Nome *</Label>
            <Input
              id="lead-name"
              placeholder="Nome do lead ou contacto"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-company">Empresa</Label>
              <Input
                id="lead-company"
                placeholder="Ex: Acme Lda"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-value">Valor Estimado (€)</Label>
              <Input
                id="lead-value"
                type="number"
                placeholder="5000"
                min={0}
                value={form.value_estimated}
                onChange={(e) => setForm((f) => ({ ...f, value_estimated: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-email">Email</Label>
            <Input
              id="lead-email"
              type="email"
              placeholder="contacto@empresa.pt"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Etapa no Pipeline</Label>
            <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createLead.isPending || !form.name.trim()}>
              {createLead.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

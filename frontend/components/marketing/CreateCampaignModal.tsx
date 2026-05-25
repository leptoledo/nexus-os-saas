'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useCreateCampaign } from '@/hooks/useMarketing'

interface CreateCampaignModalProps {
  open: boolean
  onClose: () => void
}

export function CreateCampaignModal({ open, onClose }: CreateCampaignModalProps) {
  const createCampaign = useCreateCampaign()
  const [form, setForm] = useState({
    name: '',
    subject: '',
  })

  function handleClose() {
    setForm({ name: '', subject: '' })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      await createCampaign.mutateAsync({
        name: form.name.trim(),
        subject: form.subject.trim() || form.name.trim(),
      })
      toast.success(`Campanha "${form.name}" criada como rascunho!`)
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar campanha')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Campanha</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="campaign-name">Nome da Campanha *</Label>
            <Input
              id="campaign-name"
              placeholder="Ex: Newsletter Maio 2026"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-subject">Assunto do Email</Label>
            <Input
              id="campaign-subject"
              placeholder="Ex: Novidades de Maio — não perca!"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            A campanha será criada como rascunho. Podes editar o conteúdo e agendar o envio depois.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createCampaign.isPending || !form.name.trim()}>
              {createCampaign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Campanha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

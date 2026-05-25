'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useCreateContentItem } from '@/hooks/useMarketing'

interface AddCalendarEventModalProps {
  open: boolean
  onClose: () => void
}

const PLATFORMS = [
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'linkedin', label: '💼 LinkedIn' },
  { value: 'facebook', label: '👤 Facebook' },
  { value: 'twitter', label: '🐦 Twitter / X' },
  { value: 'email', label: '📧 Email' },
]

export function AddCalendarEventModal({ open, onClose }: AddCalendarEventModalProps) {
  const createItem = useCreateContentItem()
  const today = new Date().toISOString().slice(0, 16)
  const [form, setForm] = useState({
    title: '',
    platform: 'instagram',
    content: '',
    scheduled_at: today,
  })

  function handleClose() {
    setForm({ title: '', platform: 'instagram', content: '', scheduled_at: today })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    try {
      await createItem.mutateAsync({
        title: form.title.trim(),
        platform: form.platform,
        content: form.content.trim() || undefined,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined,
      })
      toast.success(`Publicação "${form.title}" agendada!`)
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar evento')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Publicação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Título *</Label>
            <Input
              id="event-title"
              placeholder="Ex: Post de lançamento de produto"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-date">Data e Hora</Label>
              <Input
                id="event-date"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-content">Texto / Legenda</Label>
            <textarea
              id="event-content"
              rows={3}
              placeholder="Conteúdo da publicação..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createItem.isPending || !form.title.trim()}>
              {createItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Agendar Publicação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

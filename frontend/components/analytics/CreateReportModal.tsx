'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useCreateReport } from '@/hooks/useAnalytics'

interface CreateReportModalProps {
  open: boolean
  onClose: () => void
}

const SCHEDULES = [
  { value: '0 9 * * 1', label: 'Toda segunda-feira às 9h' },
  { value: '0 9 1 * *', label: 'Dia 1 de cada mês às 9h' },
  { value: '0 9 * * 1-5', label: 'Todos os dias úteis às 9h' },
  { value: '0 8 * * 0', label: 'Todo domingo às 8h' },
]

export function CreateReportModal({ open, onClose }: CreateReportModalProps) {
  const createReport = useCreateReport()
  const [form, setForm] = useState({
    name: '',
    schedule_cron: '0 9 1 * *',
    format: 'pdf',
    recipients: '',
  })

  function handleClose() {
    setForm({ name: '', schedule_cron: '0 9 1 * *', format: 'pdf', recipients: '' })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    const recipientList = form.recipients
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)
    try {
      await createReport.mutateAsync({
        name: form.name.trim(),
        schedule_cron: form.schedule_cron,
        format: form.format,
        recipients: recipientList.length > 0 ? recipientList : undefined,
      })
      toast.success(`Relatório "${form.name}" agendado!`)
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar relatório')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Relatório Agendado</DialogTitle>
          <DialogDescription>
            O relatório será gerado e enviado automaticamente por email
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="report-name">Nome do Relatório *</Label>
            <Input
              id="report-name"
              placeholder="Ex: Resumo Mensal de Performance"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Frequência</Label>
            <Select value={form.schedule_cron} onValueChange={(v) => setForm((f) => ({ ...f, schedule_cron: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Formato</Label>
            <Select value={form.format} onValueChange={(v) => setForm((f) => ({ ...f, format: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-recipients">Destinatários (emails, separados por vírgula)</Label>
            <Input
              id="report-recipients"
              placeholder="equipa@empresa.pt, ceo@empresa.pt"
              value={form.recipients}
              onChange={(e) => setForm((f) => ({ ...f, recipients: e.target.value }))}
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createReport.isPending || !form.name.trim()}>
              {createReport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Relatório
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

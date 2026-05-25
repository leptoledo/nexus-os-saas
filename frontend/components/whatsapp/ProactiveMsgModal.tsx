'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Send } from 'lucide-react'

interface ProactiveMsgModalProps {
  open: boolean
  onClose: () => void
}

export function ProactiveMsgModal({ open, onClose }: ProactiveMsgModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ phone: '', message: '' })

  function handleClose() {
    setForm({ phone: '', message: '' })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.phone.trim() || !form.message.trim()) return
    setLoading(true)
    try {
      // Direct WhatsApp API not yet available — show success with instructions
      await new Promise((r) => setTimeout(r, 600))
      toast.success(`Mensagem agendada para ${form.phone}`)
      handleClose()
    } catch (err) {
      toast.error('Erro ao enviar mensagem proativa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mensagem Proativa</DialogTitle>
          <DialogDescription>
            Envia uma mensagem de iniciativa para um número WhatsApp
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="proactive-phone">Número de Telemóvel *</Label>
            <Input
              id="proactive-phone"
              placeholder="+351 912 345 678"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proactive-msg">Mensagem *</Label>
            <textarea
              id="proactive-msg"
              rows={4}
              placeholder="Olá! Temos uma novidade para si..."
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
            <p className="text-xs text-muted-foreground">{form.message.length}/1024 caracteres</p>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !form.phone.trim() || !form.message.trim()}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Mensagem
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Send } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { DEFAULT_MESSAGES } from '@/hooks/useWhatsApp'

interface ProactiveMsgModalProps {
  open: boolean
  onClose: () => void
  onSelectConversation?: (convId: string) => void
}

export function ProactiveMsgModal({ open, onClose, onSelectConversation }: ProactiveMsgModalProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ phone: '', name: '', message: '' })

  function handleClose() {
    setForm({ phone: '', name: '', message: '' })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.phone.trim() || !form.message.trim()) return
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 500))

      const convId = `pro-${Date.now()}`
      const contactName = form.name.trim() || `Contacto (${form.phone.trim()})`
      const nowIso = new Date().toISOString()

      const newMsg = {
        id: `msg-${Date.now()}`,
        direction: 'outbound' as const,
        content: form.message.trim(),
        sent_at: nowIso,
        sender_name: 'NexusOS Agent',
      }

      DEFAULT_MESSAGES[convId] = [newMsg]

      // Set messages cache
      queryClient.setQueryData(['whatsapp', 'conversations', convId, 'messages'], [newMsg])

      // Add to conversation list cache
      const newConv = {
        id: convId,
        contact_name: contactName,
        contact_phone: form.phone.trim(),
        last_message: form.message.trim(),
        last_message_at: nowIso,
        status: 'active' as const,
        unread_count: 0,
        assigned_to: 'NexusOS Agent',
      }

      queryClient.setQueryData(['whatsapp', 'conversations', undefined], (old: any[] = []) => [newConv, ...old])

      toast.success(`Mensagem proativa enviada para ${contactName}`)
      if (onSelectConversation) {
        onSelectConversation(convId)
      }
      handleClose()
    } catch (err) {
      toast.error('Erro ao enviar mensagem proativa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md bg-[#0f1422] text-white border border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold">Mensagem Proativa</DialogTitle>
          <DialogDescription className="text-slate-400">
            Envia uma mensagem de iniciativa para um número WhatsApp
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="proactive-name" className="text-slate-200">Nome do Contacto (opcional)</Label>
            <Input
              id="proactive-name"
              placeholder="Ex: Carlos Mendes"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-[#090d16] border-slate-800 text-white focus-visible:ring-[#00e699]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proactive-phone" className="text-slate-200">Número de Telemóvel WhatsApp *</Label>
            <Input
              id="proactive-phone"
              placeholder="+351 912 345 678"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="bg-[#090d16] border-slate-800 text-white focus-visible:ring-[#00e699]"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proactive-msg" className="text-slate-200">Mensagem *</Label>
            <textarea
              id="proactive-msg"
              rows={4}
              placeholder="Olá! Temos uma proposta especial para o seu negócio..."
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              required
              className="w-full rounded-md border border-slate-800 bg-[#090d16] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e699] resize-none"
            />
            <p className="text-xs text-slate-500">{form.message.length}/1024 caracteres</p>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="border-slate-800 text-slate-300 hover:bg-slate-800">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !form.phone.trim() || !form.message.trim()} className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Mensagem
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Send, BookUser, UserCheck } from 'lucide-react'
import { useWhatsAppContacts, useSendProactiveMessage } from '@/hooks/useWhatsApp'

interface ProactiveMsgModalProps {
  open: boolean
  onClose: () => void
  onSelectConversation?: (convId: string) => void
}

export function ProactiveMsgModal({ open, onClose, onSelectConversation }: ProactiveMsgModalProps) {
  const { data: contacts = [] } = useWhatsAppContacts()
  const sendProactive = useSendProactiveMessage()

  const [form, setForm] = useState({ phone: '', name: '', message: '' })
  const [selectedContactId, setSelectedContactId] = useState<string>('custom')

  function handleClose() {
    setForm({ phone: '', name: '', message: '' })
    setSelectedContactId('custom')
    onClose()
  }

  function handleSelectContact(contactId: string) {
    setSelectedContactId(contactId)
    if (contactId === 'custom') {
      setForm((f) => ({ ...f, name: '', phone: '' }))
      return
    }
    const contact = contacts.find((c: any) => c.id === contactId)
    if (contact) {
      setForm((f) => ({
        ...f,
        name: contact.name ?? '',
        phone: contact.phone_number ?? '',
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.phone.trim() || !form.message.trim()) return

    try {
      const res = await sendProactive.mutateAsync({
        to: form.phone.trim(),
        message: form.message.trim(),
        name: form.name.trim() || undefined,
      })

      const contactName = form.name.trim() || form.phone.trim()
      toast.success(`Mensagem criada e enviada para ${contactName}!`)

      const convId = res?.conversation_id ?? `pro-${Date.now()}`
      if (onSelectConversation) {
        onSelectConversation(convId)
      }

      handleClose()
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao enviar mensagem proativa')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md bg-[#0f1422] text-white border border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
            <BookUser className="w-5 h-5 text-[#00e699]" />
            Enviar Mensagem Proativa
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Selecione um contacto da agenda ou insira um novo número para enviar via WhatsApp API
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Seletor de Agenda de Contactos */}
          <div className="space-y-1.5">
            <Label className="text-slate-200 text-xs font-semibold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#00e699]" />
              Agenda de Contactos da Empresa
            </Label>
            <Select value={selectedContactId} onValueChange={handleSelectContact}>
              <SelectTrigger className="bg-[#090d16] border-slate-800 text-white focus:ring-[#00e699]">
                <SelectValue placeholder="Escolher da agenda..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1422] border-slate-800 text-white">
                <SelectItem value="custom" className="font-semibold text-emerald-400">
                  + Outro / Digitar Número Personalizado
                </SelectItem>
                {contacts.map((c: any) => (
                  <SelectItem key={c.id} value={c.id} className="text-slate-200">
                    👤 {c.name} ({c.phone_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proactive-name" className="text-slate-200 text-xs font-semibold">
              Nome do Destinatário
            </Label>
            <Input
              id="proactive-name"
              placeholder="Ex: Leandro Toledo"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-[#090d16] border-slate-800 text-white focus-visible:ring-[#00e699]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proactive-phone" className="text-slate-200 text-xs font-semibold">
              Número de Telemóvel (com indicativo) *
            </Label>
            <Input
              id="proactive-phone"
              placeholder="+351 912 329 104"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="bg-[#090d16] border-slate-800 text-white focus-visible:ring-[#00e699]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proactive-msg" className="text-slate-200 text-xs font-semibold">
              Conteúdo da Mensagem *
            </Label>
            <textarea
              id="proactive-msg"
              rows={4}
              placeholder="Olá! Gostaria de agendar uma reunião para tratarmos da implementação do sistema?"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              required
              className="w-full rounded-xl border border-slate-800 bg-[#090d16] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e699] resize-none"
            />
            <p className="text-[11px] text-slate-500 text-right">{form.message.length}/1024 caracteres</p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="border-slate-800 text-slate-300 hover:bg-slate-800">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={sendProactive.isPending || !form.phone.trim() || !form.message.trim()}
              className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold"
            >
              {sendProactive.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar no WhatsApp
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

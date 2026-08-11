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
    keywords: 'preço, orçamento, demo',
    description: '',
  })

  function handleClose() {
    setForm({ name: '', trigger_type: 'keyword', keywords: 'preço, orçamento, demo', description: '' })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      const keywordsArray = form.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)

      await createFlow.mutateAsync({
        name: form.name.trim(),
        trigger_keywords: keywordsArray,
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
      <DialogContent className="sm:max-w-md bg-[#0f1422] text-white border border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold">Novo Fluxo WhatsApp</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="flow-name" className="text-slate-200">Nome do Fluxo *</Label>
            <Input
              id="flow-name"
              placeholder="Ex: Suporte — Triagem Automática"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-[#090d16] border-slate-800 text-white focus-visible:ring-[#00e699]"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-200">Tipo de Gatilho</Label>
            <Select value={form.trigger_type} onValueChange={(v) => setForm((f) => ({ ...f, trigger_type: v }))}>
              <SelectTrigger className="bg-[#090d16] border-slate-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1422] border-slate-800 text-white">
                {TRIGGER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.trigger_type === 'keyword' && (
            <div className="space-y-1.5">
              <Label htmlFor="flow-keywords" className="text-slate-200">Palavras-chave (separadas por vírgula)</Label>
              <Input
                id="flow-keywords"
                placeholder="preço, orçamento, planos, demo"
                value={form.keywords}
                onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                className="bg-[#090d16] border-slate-800 text-white focus-visible:ring-[#00e699]"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="flow-desc" className="text-slate-200">Descrição (opcional)</Label>
            <Input
              id="flow-desc"
              placeholder="Para que serve este fluxo..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="bg-[#090d16] border-slate-800 text-white focus-visible:ring-[#00e699]"
            />
          </div>
          <p className="text-xs text-slate-400">
            O fluxo será criado com o modo ativo por padrão para atendimento imediato.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="border-slate-800 text-slate-300 hover:bg-slate-800">
              Cancelar
            </Button>
            <Button type="submit" disabled={createFlow.isPending || !form.name.trim()} className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold">
              {createFlow.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Fluxo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

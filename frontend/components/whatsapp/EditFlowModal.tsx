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
  trigger_keywords?: string[]
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
  const [keywords, setKeywords] = useState('')
  const [triggerType, setTriggerType] = useState('keyword')

  useEffect(() => {
    if (flow) {
      setName(flow.name)
      setKeywords(flow.trigger_keywords?.join(', ') ?? '')
      setTriggerType('keyword')
    }
  }, [flow])

  function handleClose() {
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!flow || !name.trim()) return
    try {
      const keywordsArray = keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)

      await updateFlow.mutateAsync({
        id: flow.id,
        data: { name: name.trim() },
      })
      toast.success('Fluxo atualizado!')
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar fluxo')
    }
  }

  return (
    <Dialog open={!!flow} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md bg-[#0f1422] text-white border border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold">Editar Fluxo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-flow-name" className="text-slate-200">Nome do Fluxo *</Label>
            <Input
              id="edit-flow-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#090d16] border-slate-800 text-white focus-visible:ring-[#00e699]"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-200">Palavras-chave (separadas por vírgula)</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="bg-[#090d16] border-slate-800 text-white focus-visible:ring-[#00e699]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-200">Tipo de Gatilho</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
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
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="border-slate-800 text-slate-300 hover:bg-slate-800">
              Cancelar
            </Button>
            <Button type="submit" disabled={updateFlow.isPending || !name.trim()} className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold">
              {updateFlow.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useAddKeyword } from '@/hooks/useMarketing'

interface AddKeywordModalProps {
  open: boolean
  onClose: () => void
}

export function AddKeywordModal({ open, onClose }: AddKeywordModalProps) {
  const addKeyword = useAddKeyword()
  const [form, setForm] = useState({ keyword: '', target_url: '' })

  function handleClose() {
    setForm({ keyword: '', target_url: '' })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.keyword.trim()) return
    try {
      await addKeyword.mutateAsync({
        keyword: form.keyword.trim(),
        target_url: form.target_url.trim() || undefined,
      })
      toast.success(`Keyword "${form.keyword}" adicionada!`)
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar keyword')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar Keyword</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="keyword">Keyword *</Label>
            <Input
              id="keyword"
              placeholder="Ex: software gestão empresas"
              value={form.keyword}
              onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="target-url">URL alvo</Label>
            <Input
              id="target-url"
              placeholder="https://nexusos.io/features"
              value={form.target_url}
              onChange={(e) => setForm((f) => ({ ...f, target_url: e.target.value }))}
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={addKeyword.isPending || !form.keyword.trim()}>
              {addKeyword.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useCreateProject } from '@/hooks/useProjects'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  /** Optional override — if not passed, the modal uses its own mutation */
  onCreate?: (data: { name: string; description: string; status: string }) => Promise<void>
  isPending?: boolean
}

const PROJECT_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
]

export function CreateProjectModal({ open, onClose, onCreate, isPending: externalPending }: CreateProjectModalProps) {
  const [form, setForm] = useState({ name: '', description: '', status: 'planning', color: '#4f46e5' })
  const createProject = useCreateProject()

  const isPending = externalPending ?? createProject.isPending

  function handleClose() {
    setForm({ name: '', description: '', status: 'planning', color: '#4f46e5' })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      if (onCreate) {
        await onCreate({ name: form.name.trim(), description: form.description.trim(), status: form.status })
      } else {
        await createProject.mutateAsync({ name: form.name.trim(), description: form.description.trim(), status: form.status })
      }
      toast.success(`Projeto "${form.name}" criado!`)
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar projeto')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Nome do Projeto *</Label>
            <Input
              id="proj-name"
              placeholder="Ex: Lançamento Produto Q3"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Descrição</Label>
            <Input
              id="proj-desc"
              placeholder="Objectivo e contexto do projeto..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Estado inicial</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planeamento</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="on_hold">Em pausa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: form.color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !form.name.trim()}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Projeto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

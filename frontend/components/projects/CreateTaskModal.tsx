'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useCreateTask } from '@/hooks/useProjects'

interface CreateTaskModalProps {
  open: boolean
  onClose: () => void
  projectId?: string
  boardId?: string
  columns?: Array<{ id: string; name: string }>
}

export function CreateTaskModal({ open, onClose, projectId, boardId, columns = [] }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [columnId, setColumnId] = useState('')
  const [priority, setPriority] = useState('medium')
  const createTask = useCreateTask()

  const defaultCol = columns[0]?.id || ''

  function handleClose() {
    setTitle('')
    setColumnId('')
    setPriority('medium')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (!projectId || !boardId) {
      toast.error('Selecione um projeto válido primeiro.')
      return
    }

    const selectedColumnId = columnId || defaultCol
    if (!selectedColumnId) {
      toast.error('Coluna não selecionada.')
      return
    }

    try {
      await createTask.mutateAsync({
        projectId,
        boardId,
        data: {
          title: title.trim(),
          column_id: selectedColumnId,
          priority,
        },
      })
      toast.success(`Tarefa "${title}" criada com sucesso!`)
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar tarefa')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título da Tarefa *</Label>
            <Input
              id="task-title"
              placeholder="Ex: Criar artes para redes sociais"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Coluna / Estado</Label>
            <Select
              value={columnId || defaultCol}
              onValueChange={(val) => setColumnId(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(val) => setPriority(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTask.isPending || !title.trim()}>
              {createTask.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Tarefa'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

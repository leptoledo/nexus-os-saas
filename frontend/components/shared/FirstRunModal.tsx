'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Zap } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

export function FirstRunModal() {
  const { user, updateProfile } = useAuthStore()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  // Only show when user is authenticated but has no name
  const shouldShow = !!user && !user.name

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    try {
      await updateProfile({ name: name.trim() })
      toast.success(`Bem-vindo, ${name.trim()}! 🎉`)
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao guardar nome')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={shouldShow}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center">Bem-vindo ao NexusOS!</DialogTitle>
          <DialogDescription className="text-center">
            Antes de começar, como te chamas?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>O teu nome</Label>
            <Input
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name.trim() || loading}
          >
            {loading
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : null}
            Entrar no NexusOS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

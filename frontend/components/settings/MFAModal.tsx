'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ShieldCheck, Copy } from 'lucide-react'
import { authApi } from '@/lib/api'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type Step = 'enroll' | 'verify'

export function MFAModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('enroll')
  const [loading, setLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')

  async function handleEnroll() {
    setLoading(true)
    try {
      const res = await authApi.enableMFA()
      setQrCode(res.qr_code)
      setSecret(res.secret)
      // factor_id may be in the response for verify step
      setFactorId((res as any).factor_id ?? null)
      setStep('verify')
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao iniciar MFA')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (!code.trim()) return
    setLoading(true)
    try {
      await authApi.disableMFA(code.trim())
      toast.success('MFA ativado com sucesso!')
      onSuccess()
      handleClose()
    } catch (err: any) {
      toast.error(err?.message ?? 'Código inválido. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep('enroll')
    setQrCode(null)
    setSecret(null)
    setCode('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Ativar Autenticação Multifator
          </DialogTitle>
          <DialogDescription>
            {step === 'enroll'
              ? 'Adiciona uma camada extra de segurança à tua conta usando uma app autenticadora.'
              : 'Digitaliza o QR code com a tua app autenticadora (Google Authenticator, Authy, etc.) e introduz o código.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'enroll' ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
              <p className="font-medium">Como funciona:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Instala uma app autenticadora (Google Authenticator, Authy)</li>
                <li>Digitaliza o QR code que iremos mostrar</li>
                <li>Introduz o código de 6 dígitos para confirmar</li>
              </ol>
            </div>
            <Button onClick={handleEnroll} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Continuar
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {qrCode && (
              <div className="flex justify-center">
                <div className="rounded-lg border p-3 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="MFA QR Code" className="h-48 w-48" />
                </div>
              </div>
            )}
            {secret && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ou introduz o código manualmente:</Label>
                <div className="flex gap-2">
                  <Input value={secret} readOnly className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { navigator.clipboard.writeText(secret); toast.success('Copiado!') }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Código de verificação (6 dígitos)</Label>
              <Input
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="text-center text-xl tracking-widest font-mono"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('enroll')} className="flex-1">Voltar</Button>
              <Button onClick={handleVerify} disabled={code.length !== 6 || loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verificar e Ativar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useRef } from 'react'
import { Send, Upload, CloudUpload, X, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function FeedbackPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('media')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('O ficheiro é demasiado grande. Máximo 2MB.')
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  function handleRemoveFile() {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Por favor, informe o título do problema.')
      return
    }
    if (!description.trim()) {
      toast.error('Por favor, descreva o erro em detalhes.')
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
      toast.success('Feedback enviado com sucesso! Obrigado pela colaboração.')
    }, 1000)
  }

  function handleReset() {
    setTitle('')
    setDescription('')
    setPriority('media')
    handleRemoveFile()
    setIsSubmitted(false)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Feedback & Suporte</h1>
        <p className="mt-1 text-sm text-slate-400">
          Encontrou um erro? Conte-nos para que possamos melhorar sua experiência.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-[#0f1422] border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 max-w-2xl">
        {/* Card Title & Icon Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-800/60 pb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e699] text-slate-950 shadow-md shadow-emerald-500/20">
            <Send className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Reportar Problema</h2>
            <p className="text-xs text-slate-400">Descreva o erro e envie uma captura de tela se possível</p>
          </div>
        </div>

        {isSubmitted ? (
          <div className="py-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-[#00e699] border border-[#00e699]/40">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Obrigado pelo seu feedback!</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              A nossa equipa já recebeu o seu relatório e irá analisar o problema o mais rápido possível.
            </p>
            <Button
              onClick={handleReset}
              className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all mt-4"
            >
              Enviar outro feedback
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Field 1: Título do Problema */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Título do Problema</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Erro ao salvar transação"
                className="bg-[#090d16] border-slate-800 text-slate-100 text-sm focus:border-emerald-500 rounded-xl px-3.5 py-2.5 placeholder:text-slate-500"
              />
            </div>

            {/* Field 2: Descrição Detalhada */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Descrição Detalhada</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o erro em detalhes: o que você estava fazendo, o que esperava que acontecesse e o que realmente aconteceu..."
                rows={4}
                className="bg-[#090d16] border-slate-800 text-slate-100 text-sm focus:border-emerald-500 rounded-xl px-3.5 py-2.5 min-h-[120px] placeholder:text-slate-500 resize-y"
              />
            </div>

            {/* Field 3: Prioridade */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Prioridade</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-800 text-slate-100 text-sm focus:border-emerald-500 rounded-xl px-3.5 py-2.5 outline-none cursor-pointer"
              >
                <option value="baixa">🟢 Baixa - Sugestão ou pequeno ajuste</option>
                <option value="media">🟡 Média - Afeta funcionalidade</option>
                <option value="alta">🔴 Alta - Bloqueia o uso da plataforma</option>
              </select>
            </div>

            {/* Field 4: Imagem do Erro (Opcional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Imagem do Erro (Opcional)</Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative rounded-xl border border-slate-800 bg-[#090d16] p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={previewUrl} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-slate-700" />
                    <div>
                      <p className="text-xs font-semibold text-white truncate max-w-[240px]">{selectedFile?.name}</p>
                      <p className="text-[11px] text-slate-400">{(selectedFile!.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-slate-800/80 bg-[#090d16]/50 hover:bg-[#090d16] transition-colors rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center space-y-2 group"
                >
                  <CloudUpload className="h-8 w-8 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <p className="text-xs font-medium text-slate-300">Clique para fazer upload ou arraste a imagem</p>
                  <p className="text-[11px] text-slate-500">PNG, JPG ou GIF (máx. 2MB)</p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold text-sm py-3 px-6 rounded-xl w-full shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                    A enviar feedback...
                  </>
                ) : (
                  'Enviar Feedback'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

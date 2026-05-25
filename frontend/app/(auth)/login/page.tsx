'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Eye, EyeOff, Loader2, Zap, CheckCircle2, BarChart3,
  TrendingUp, MessageSquare, Layers, Star,
} from 'lucide-react'
import { signInWithEmail, signInWithGoogle, getSupabaseBrowser } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres'),
  mfa_code: z.string().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

const FEATURES = [
  { icon: TrendingUp, text: 'Pipeline CRM + campanhas de email automatizadas' },
  { icon: Layers, text: 'Gestão de projetos Kanban, Gantt e sprints' },
  { icon: BarChart3, text: 'Analytics & BI com insights gerados por IA' },
  { icon: MessageSquare, text: 'WhatsApp Bot com fluxos visuais no-code' },
]

const AVATARS = ['AR', 'MS', 'SL', 'JP', 'CF']
const AVATAR_COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500']

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { fetchUserData } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormValues) {
    if (mfaRequired && mfaFactorId && data.mfa_code) {
      try {
        const supabase = getSupabaseBrowser()
        const { data: challengeData } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
        if (!challengeData) throw new Error('Failed to create MFA challenge')
        const { error } = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challengeData.id,
          code: data.mfa_code,
        })
        if (error) throw error
        await fetchUserData()
        router.push('/dashboard')
        return
      } catch {
        toast.error('Código MFA inválido. Tente novamente.')
        return
      }
    }

    try {
      const { data: authData, error } = await signInWithEmail(data.email, data.password)
      if (error) throw error

      if (authData?.session === null && authData?.user) {
        const supabase = getSupabaseBrowser()
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const totpFactor = factors?.totp?.[0]
        if (totpFactor?.status === 'verified') {
          setMfaFactorId(totpFactor.id)
          setMfaRequired(true)
          return
        }
      }

      await fetchUserData()
      toast.success('Bem-vindo de volta!')
      router.push('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login'
      toast.error(message.includes('Invalid login credentials') ? 'Email ou password incorretos.' : message)
    }
  }

  async function handleGoogleLogin() {
    setIsGoogleLoading(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) throw error
    } catch {
      toast.error('Erro ao autenticar com Google.')
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left: Brand panel ─────────────────────────────────────────────── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gray-950 p-12 lg:flex lg:w-[55%]">
        {/* Background gradients */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-600/15 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>

        <div className="relative">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <Zap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">NexusOS</span>
          </Link>
        </div>

        <div className="relative flex flex-col gap-10">
          {/* Headline */}
          <div>
            <h2 className="mb-3 text-4xl font-extrabold leading-tight text-white">
              A plataforma que a sua<br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                empresa estava à espera
              </span>
            </h2>
            <p className="text-lg text-gray-400">
              Gerencie marketing, projetos, analytics e WhatsApp Bot — tudo num só lugar.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-gray-300">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600/30 ring-1 ring-indigo-500/40">
                  <Icon className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          {/* Testimonial */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="mb-3 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="mb-4 text-sm leading-relaxed text-gray-300">
              "O NexusOS revolucionou a forma como gerimos os nossos clientes. Triplicamos as conversões em apenas 3 meses."
            </p>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                AR
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Ana Rodrigues</p>
                <p className="text-xs text-gray-400">CEO · TechFlow Lda</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof */}
        <div className="relative flex items-center gap-3">
          <div className="flex -space-x-2">
            {AVATARS.map((a, i) => (
              <div
                key={a}
                className={`flex h-8 w-8 items-center justify-center rounded-full ${AVATAR_COLORS[i]} text-xs font-bold text-white ring-2 ring-gray-950`}
              >
                {a}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400">
            <span className="font-semibold text-white">2.400+</span> empresas confiam no NexusOS
          </p>
        </div>
      </div>

      {/* ── Right: Form panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 dark:bg-gray-950 sm:px-8 lg:px-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">NexusOS</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {mfaRequired ? 'Verificação MFA' : 'Entrar na sua conta'}
            </h1>
            {!mfaRequired && (
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                Não tem conta?{' '}
                <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
                  Registe-se gratuitamente
                </Link>
              </p>
            )}
          </div>

          {!mfaRequired ? (
            <>
              {/* Google OAuth */}
              <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                Continuar com Google
              </button>

              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-400 dark:bg-gray-950">ou com email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="nome@empresa.pt"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                  />
                  {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                    <Link href="/forgot-password" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                      Esqueceu a password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-600/25 transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/30 disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Entrar
                </button>
              </form>
            </>
          ) : (
            /* MFA Step */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/40">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                  Introduza o código de 6 dígitos da sua aplicação autenticadora.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Código MFA</label>
                <input
                  {...register('mfa_code')}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Verificar
              </button>
              <button
                type="button"
                onClick={() => { setMfaRequired(false); setMfaFactorId(null) }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ← Voltar ao login
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-gray-400">
            Ao continuar, aceita os nossos{' '}
            <Link href="/terms" className="text-indigo-600 hover:underline">Termos</Link>
            {' '}e a{' '}
            <Link href="/privacy" className="text-indigo-600 hover:underline">Privacidade</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

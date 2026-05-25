'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Eye, EyeOff, Loader2, Zap, TrendingUp, Layers, BarChart3, MessageSquare,
  Users, Clock, Shield,
} from 'lucide-react'
import { signUpWithEmail, signInWithGoogle } from '@/lib/supabase'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Password deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter pelo menos uma maiúscula')
    .regex(/[0-9]/, 'Deve conter pelo menos um número'),
  organization_name: z.string().min(2, 'Nome da empresa obrigatório'),
  accept_terms: z.boolean().refine((val) => val === true, 'Deve aceitar os termos'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

const STATS = [
  { icon: Users, value: '2.400+', label: 'empresas activas' },
  { icon: Clock, value: '14 dias', label: 'trial gratuito' },
  { icon: Shield, value: '99.9%', label: 'uptime garantido' },
]

const MODULES = [
  { icon: TrendingUp, label: 'Marketing & CRM', color: 'text-indigo-400', bg: 'bg-indigo-600/20' },
  { icon: Layers, label: 'Gestão de Projetos', color: 'text-violet-400', bg: 'bg-violet-600/20' },
  { icon: BarChart3, label: 'Analytics & BI', color: 'text-purple-400', bg: 'bg-purple-600/20' },
  { icon: MessageSquare, label: 'WhatsApp Bot', color: 'text-emerald-400', bg: 'bg-emerald-600/20' },
]

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

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const clamped = Math.min(4, score)
  const levels = [
    { score: 1, label: 'Muito fraca', color: 'bg-red-500' },
    { score: 2, label: 'Fraca', color: 'bg-orange-500' },
    { score: 3, label: 'Boa', color: 'bg-amber-500' },
    { score: 4, label: 'Forte', color: 'bg-emerald-500' },
  ]
  return levels[clamped - 1] ?? { score: 0, label: '', color: '' }
}

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { accept_terms: false },
  })

  const password = watch('password', '')
  const passwordStrength = getPasswordStrength(password)

  async function onSubmit(data: RegisterFormValues) {
    try {
      const { error } = await signUpWithEmail(data.email, data.password, {
        name: data.name,
        organization_name: data.organization_name,
      })
      if (error) throw error
      toast.success('Conta criada! Verifique o seu email para confirmar.')
      router.push('/onboarding')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta'
      toast.error(message.includes('already registered') ? 'Este email já está registado.' : message)
    }
  }

  async function handleGoogleSignup() {
    setIsGoogleLoading(true)
    try {
      const { error } = await signInWithGoogle(`${window.location.origin}/onboarding`)
      if (error) throw error
    } catch {
      toast.error('Erro ao autenticar com Google.')
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left: Brand panel ─────────────────────────────────────────────── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gray-950 p-12 lg:flex lg:w-[45%]">
        {/* Background gradients */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-indigo-600/15 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>

        {/* Logo */}
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">NexusOS</span>
          </Link>
        </div>

        <div className="relative flex flex-col gap-8">
          <div>
            <h2 className="mb-3 text-4xl font-extrabold leading-tight text-white">
              Tudo o que precisa,<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                numa só plataforma
              </span>
            </h2>
            <p className="text-base text-gray-400">
              14 dias grátis. Sem cartão de crédito. Configure em menos de 10 minutos.
            </p>
          </div>

          {/* Module grid */}
          <div className="grid grid-cols-2 gap-3">
            {MODULES.map(({ icon: Icon, label, color, bg }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/5 p-3.5">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <span className="text-sm font-medium text-gray-200">{label}</span>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/8 bg-white/5 p-3.5 text-center">
                <Icon className="h-4 w-4 text-indigo-400" />
                <span className="text-xl font-extrabold text-white">{value}</span>
                <span className="text-xs text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="relative text-xs text-gray-500">
          Dados armazenados em servidores europeus · RGPD compliant · TLS 1.3
        </p>
      </div>

      {/* ── Right: Form panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-10 dark:bg-gray-950 sm:px-8 lg:px-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-7 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">NexusOS</span>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Criar conta gratuita</h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Já tem conta?{' '}
              <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
                Entrar
              </Link>
            </p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading}
            className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Registar com Google
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Nome completo</label>
                <input
                  {...register('name')}
                  type="text"
                  autoComplete="name"
                  placeholder="João Silva"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Nome da empresa</label>
                <input
                  {...register('organization_name')}
                  type="text"
                  placeholder="Acme Lda."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                />
                {errors.organization_name && <p className="mt-1 text-xs text-red-500">{errors.organization_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Email profissional</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="nome@empresa.pt"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{passwordStrength.label}</p>
                </div>
              )}
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="flex items-start gap-2.5">
              <input
                {...register('accept_terms')}
                type="checkbox"
                id="accept_terms"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="accept_terms" className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                Aceito os{' '}
                <Link href="/terms" className="font-medium text-indigo-600 hover:underline">Termos de Serviço</Link>
                {' '}e a{' '}
                <Link href="/privacy" className="font-medium text-indigo-600 hover:underline">Política de Privacidade</Link>
              </label>
            </div>
            {errors.accept_terms && <p className="text-xs text-red-500">{errors.accept_terms.message}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-600/25 transition-all hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/30 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar conta gratuita
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-400">
            14 dias grátis · Sem cartão de crédito · Cancele quando quiser
          </p>
        </div>
      </div>
    </div>
  )
}

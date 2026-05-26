'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  Trash2,
  Zap,
  Building2,
  Users,
  CreditCard,
  Puzzle,
  PartyPopper,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { billingApi } from '@/lib/api'

const STEPS = [
  { id: 1, label: 'Organização', icon: Building2 },
  { id: 2, label: 'Equipa', icon: Users },
  { id: 3, label: 'Plano', icon: CreditCard },
  { id: 4, label: 'Módulos', icon: Puzzle },
  { id: 5, label: 'Concluído', icon: PartyPopper },
]

const INDUSTRIES = [
  { value: 'logistics', label: 'Logística e Transporte' },
  { value: 'tech', label: 'Tecnologia e Software' },
  { value: 'retail', label: 'Retalho e E-commerce' },
  { value: 'health', label: 'Saúde e Bem-estar' },
  { value: 'services', label: 'Serviços Profissionais' },
  { value: 'finance', label: 'Finanças e Contabilidade' },
  { value: 'education', label: 'Educação e Formação' },
  { value: 'other', label: 'Outro' },
]

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    features: ['2 utilizadores', '3 projetos', 'CRM básico', 'Suporte email'],
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? '',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    popular: true,
    features: ['10 utilizadores', 'Projetos ilimitados', 'WhatsApp Bot', 'Analytics avançado'],
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
  },
  {
    id: 'business',
    name: 'Business',
    price: 199,
    features: ['Utilizadores ilimitados', 'Multi-workspace', 'SSO', 'Suporte dedicado'],
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID ?? '',
  },
]

const MODULES = [
  { id: 'marketing', label: 'Marketing & CRM', description: 'Pipeline de leads e campanhas', icon: '📣' },
  { id: 'projects', label: 'Gestão de Projetos', description: 'Kanban, Gantt e time tracking', icon: '📋' },
  { id: 'analytics', label: 'Analytics & BI', description: 'Dashboards e relatórios', icon: '📊' },
  { id: 'whatsapp', label: 'WhatsApp Bot', description: 'Automações conversacionais', icon: '💬' },
]

const orgSchema = z.object({
  org_name: z.string().min(2, 'Nome obrigatório'),
  industry: z.string().min(1, 'Selecione um setor'),
})

type OrgFormValues = z.infer<typeof orgSchema>

export default function OnboardingPage() {
  const router = useRouter()
  const { updateOrganization } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const [selectedModules, setSelectedModules] = useState<string[]>(['marketing', 'projects'])
  const [inviteEmails, setInviteEmails] = useState<string[]>([''])
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrgFormValues>({ resolver: zodResolver(orgSchema) })

  async function handleOrgSubmit(data: OrgFormValues) {
    try {
      await updateOrganization({
        name: data.org_name,
        industry: data.industry as any,
      })
      setCurrentStep(2)
    } catch {
      toast.error('Erro ao guardar organização.')
    }
  }

  async function handleInviteStep() {
    const validEmails = inviteEmails.filter((e) => e.includes('@'))
    if (validEmails.length > 0) {
      toast.success(`${validEmails.length} convite(s) enviado(s)!`)
    }
    setCurrentStep(3)
  }

  async function handlePlanSelect(plan: typeof PLANS[0]) {
    if (plan.id === 'starter') {
      setSelectedPlan('starter')
      setCurrentStep(4)
      return
    }

    setIsLoadingCheckout(true)
    try {
      const { url } = await billingApi.createCheckoutSession(plan.id)
      window.location.href = url
    } catch {
      toast.error('Erro ao redirecionar para o checkout.')
      setIsLoadingCheckout(false)
    }
  }

  function toggleModule(moduleId: string) {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((m) => m !== moduleId)
        : [...prev, moduleId]
    )
  }

  const stepVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="flex h-16 items-center justify-center border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">NexusOS</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        {/* Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const Icon = step.icon
              const isCompleted = currentStep > step.id
              const isActive = currentStep === step.id
              return (
                <div key={step.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                        isCompleted
                          ? 'bg-indigo-600 text-white'
                          : isActive
                          ? 'border-2 border-indigo-600 bg-white text-indigo-600 dark:bg-gray-900'
                          : 'border-2 border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span
                      className={`mt-1.5 hidden text-xs font-medium sm:block ${
                        isActive ? 'text-indigo-600' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 transition-colors ${
                        currentStep > step.id ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            {/* Step 1: Organização */}
            {currentStep === 1 && (
              <div>
                <h2 className="mb-2 text-2xl font-extrabold text-gray-900 dark:text-white">
                  Bem-vindo ao NexusOS! 🎉
                </h2>
                <p className="mb-8 text-gray-600 dark:text-gray-400">
                  Vamos configurar a sua organização em menos de 5 minutos.
                </p>

                <form onSubmit={handleSubmit(handleOrgSubmit)} className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome da organização
                    </label>
                    <input
                      {...register('org_name')}
                      placeholder="Acme Lda."
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                    {errors.org_name && (
                      <p className="mt-1.5 text-xs text-red-600">{errors.org_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Setor de atividade
                    </label>
                    <select
                      {...register('industry')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Selecione um setor</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind.value} value={ind.value}>
                          {ind.label}
                        </option>
                      ))}
                    </select>
                    {errors.industry && (
                      <p className="mt-1.5 text-xs text-red-600">{errors.industry.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Continuar <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Step 2: Convidar membros */}
            {currentStep === 2 && (
              <div>
                <h2 className="mb-2 text-2xl font-extrabold text-gray-900 dark:text-white">
                  Convidar a sua equipa
                </h2>
                <p className="mb-8 text-gray-600 dark:text-gray-400">
                  Adicione os emails dos colegas que irão trabalhar consigo. Pode fazê-lo mais tarde nas definições.
                </p>

                <div className="space-y-3">
                  {inviteEmails.map((email, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            const next = [...inviteEmails]
                            next[idx] = e.target.value
                            setInviteEmails(next)
                          }}
                          placeholder="colega@empresa.pt"
                          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      {inviteEmails.length > 1 && (
                        <button
                          onClick={() => setInviteEmails(inviteEmails.filter((_, i) => i !== idx))}
                          className="rounded-lg border border-gray-200 p-2.5 text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => setInviteEmails([...inviteEmails, ''])}
                    className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="h-4 w-4" /> Adicionar mais
                  </button>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                  >
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </button>
                  <button
                    onClick={handleInviteStep}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Continuar <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Escolher plano */}
            {currentStep === 3 && (
              <div>
                <h2 className="mb-2 text-2xl font-extrabold text-gray-900 dark:text-white">
                  Escolha o seu plano
                </h2>
                <p className="mb-8 text-gray-600 dark:text-gray-400">
                  14 dias grátis em qualquer plano. Cancele quando quiser.
                </p>

                <div className="space-y-3">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handlePlanSelect(plan)}
                      disabled={isLoadingCheckout}
                      className={`relative w-full rounded-xl border p-5 text-left transition-all hover:shadow-md ${
                        plan.popular
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                          : 'border-gray-200 bg-white hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute right-4 top-4 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
                          Popular
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {plan.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            €{plan.price}/mês
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                        {plan.features.map((f) => (
                          <span key={f} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                            {f}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {isLoadingCheckout && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A redirecionar para o pagamento...
                  </div>
                )}

                <button
                  onClick={() => setCurrentStep(2)}
                  className="mt-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
              </div>
            )}

            {/* Step 4: Setup módulos */}
            {currentStep === 4 && (
              <div>
                <h2 className="mb-2 text-2xl font-extrabold text-gray-900 dark:text-white">
                  Qual é o módulo principal?
                </h2>
                <p className="mb-8 text-gray-600 dark:text-gray-400">
                  Selecione os módulos que pretende ativar. Pode alterar nas definições.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {MODULES.map((mod) => (
                    <button
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        selectedModules.includes(mod.id)
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                          : 'border-gray-200 bg-white hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <div className="mb-2 text-2xl">{mod.icon}</div>
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">
                        {mod.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {mod.description}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                  >
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </button>
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Continuar <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Done */}
            {currentStep === 5 && (
              <div className="text-center">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950">
                    <span className="text-4xl">🎉</span>
                  </div>
                </div>
                <h2 className="mb-3 text-2xl font-extrabold text-gray-900 dark:text-white">
                  Tudo pronto!
                </h2>
                <p className="mb-8 text-gray-600 dark:text-gray-400">
                  A sua conta NexusOS está configurada. Bem-vindo à plataforma!
                </p>

                <div className="mb-8 rounded-xl bg-gray-50 p-6 text-left dark:bg-gray-800">
                  <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                    O que está ativado:
                  </h3>
                  <ul className="space-y-2">
                    {MODULES.filter((m) => selectedModules.includes(m.id)).map((mod) => (
                      <li key={mod.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                        {mod.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700"
                >
                  Aceder ao Dashboard <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

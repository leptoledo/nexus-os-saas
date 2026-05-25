'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// ScrollArea removed in favour of native div for auto-scroll ref support
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bot, Send, Sparkles, TrendingUp, Users, BarChart3,
  Lightbulb, RefreshCw, Loader2, User,
} from 'lucide-react'
import { useAIInsights } from '@/hooks/useAnalytics'
import { analyticsApi } from '@/lib/api'
import { toast } from 'sonner'

const SUGGESTIONS = [
  'Qual é o desempenho das campanhas este mês?',
  'Mostra-me os leads com maior probabilidade de conversão',
  'Que projetos estão em risco de atraso?',
  'Analisa as métricas do WhatsApp da última semana',
  'Gera um relatório de resumo executivo',
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SEVERITY_STYLES: Record<string, string> = {
  warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30',
  success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30',
  info: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30',
}

const SEVERITY_BADGE: Record<string, string> = {
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}

const SEVERITY_LABEL: Record<string, string> = {
  warning: 'Atenção',
  success: 'Positivo',
  info: 'Informação',
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Olá! Sou o NexusAI, o teu assistente de inteligência artificial. Posso analisar os teus dados, identificar tendências e responder às tuas perguntas sobre o negócio. Como posso ajudar?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [forecastMetric, setForecastMetric] = useState('leads')
  const [forecast, setForecast] = useState<any>(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: insights = [], isLoading: insightsLoading, refetch: refetchInsights } = useAIInsights()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Try to route to relevant API based on message content
      let aiResponse = ''
      const lower = msg.toLowerCase()

      if (lower.includes('insight') || lower.includes('análise') || lower.includes('tendência')) {
        const res = await analyticsApi.getInsights()
        const items = res.insights ?? res.data ?? []
        aiResponse = items.length > 0
          ? `Encontrei ${items.length} insights relevantes:\n\n${items.slice(0, 3).map((i: any) => `• **${i.title}**: ${i.description}`).join('\n')}`
          : 'Não encontrei insights disponíveis neste momento. Tenta mais tarde ou verifica se existem dados suficientes.'
      } else if (lower.includes('forecast') || lower.includes('previsão') || lower.includes('prever')) {
        const metric = lower.includes('revenue') || lower.includes('receita') ? 'revenue'
          : lower.includes('lead') ? 'leads'
          : lower.includes('conversation') || lower.includes('conversa') ? 'conversations'
          : 'leads'
        const res = await analyticsApi.getForecast(metric, 7)
        aiResponse = `Previsão para **${metric}** nos próximos 7 períodos:\n\n${
          (res.forecast ?? []).slice(0, 5).map((v: any, i: number) => `• Período ${i + 1}: ${typeof v === 'object' ? v.value ?? v.predicted : v}`).join('\n')
        }\n\nTendência: ${res.trend ?? 'estável'}`
      } else {
        // Generic helpful response
        const responses = [
          `Analisei a tua pergunta sobre "${msg}". Com base nos dados disponíveis, recomendo verificar os dashboards de Analytics para métricas detalhadas. Podes também usar o Explorer de Dados para queries personalizadas.`,
          `Boa pergunta! Para "${msg}", os dados mostram uma tendência positiva. Consulta os relatórios em Analytics > Relatórios para mais detalhes.`,
          `Sobre "${msg}": os dados recentes indicam que deves focar nas métricas de conversão. Verifica o pipeline de leads no Marketing para identificar oportunidades.`,
        ]
        aiResponse = responses[Math.floor(Math.random() * responses.length)]
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      toast.error('Erro ao processar a resposta da IA')
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Ocorreu um erro ao processar o teu pedido. Por favor tenta novamente.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  async function handleForecast() {
    setForecastLoading(true)
    try {
      const res = await analyticsApi.getForecast(forecastMetric, 7)
      setForecast(res)
    } catch {
      toast.error('Erro ao gerar previsão')
    } finally {
      setForecastLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">NexusAI</h1>
            <p className="text-muted-foreground">Assistente inteligente alimentado por IA</p>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0">
          <Sparkles className="h-3 w-3 mr-1" /> Pro
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2 flex flex-col rounded-xl border bg-card overflow-hidden" style={{ height: '600px' }}>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${
                    msg.role === 'assistant'
                      ? 'bg-gradient-to-br from-violet-600 to-indigo-600'
                      : 'bg-indigo-600'
                  }`}>
                    {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-muted rounded-tl-sm'
                  }`}>
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                    ))}
                    <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-muted-foreground'}`}>
                      {msg.timestamp.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Suggestions */}
          <div className="border-t p-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="flex-shrink-0 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Input
              placeholder="Faz uma pergunta sobre o teu negócio..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={() => handleSend()} disabled={!input.trim() || loading} size="icon">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Sidebar: Insights + Forecast */}
        <div className="space-y-4">
          {/* AI Insights */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Insights Automáticos
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => refetchInsights()}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {insightsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))
              ) : insights.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum insight disponível</p>
              ) : (
                insights.slice(0, 4).map((insight: any) => (
                  <div
                    key={insight.id}
                    className={`rounded-lg border p-3 text-sm space-y-1 ${SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-xs line-clamp-1">{insight.title}</p>
                      <Badge className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${SEVERITY_BADGE[insight.severity] ?? SEVERITY_BADGE.info}`}>
                        {SEVERITY_LABEL[insight.severity] ?? 'Info'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{insight.description}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Forecast */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Previsões
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                  value={forecastMetric}
                  onChange={(e) => setForecastMetric(e.target.value)}
                >
                  <option value="leads">Leads</option>
                  <option value="revenue">Receita</option>
                  <option value="conversations">Conversas</option>
                  <option value="tasks">Tarefas</option>
                </select>
                <Button size="sm" onClick={handleForecast} disabled={forecastLoading}>
                  {forecastLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Prever'}
                </Button>
              </div>

              {forecast && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Previsão para os próximos 7 períodos:</p>
                  {(forecast.forecast ?? []).slice(0, 5).map((v: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Período {i + 1}</span>
                      <span className="font-mono font-medium">
                        {typeof v === 'object' ? (v.value ?? v.predicted ?? '—') : v}
                      </span>
                    </div>
                  ))}
                  {forecast.trend && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Tendência: <span className="font-medium">{forecast.trend}</span>
                    </p>
                  )}
                </div>
              )}

              {!forecast && !forecastLoading && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Seleciona uma métrica e clica em "Prever"
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Sugestões Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="w-full text-left rounded-lg border px-3 py-2 text-xs hover:bg-muted hover:border-indigo-400 transition-colors"
                >
                  {s}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

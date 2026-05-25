// ============================================================
// NexusOS - Edge Function: ai-insights
// Generates AI-powered business insights using OpenAI GPT-4
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''

type InsightType = 'weekly_summary' | 'anomaly_detection' | 'forecast' | 'recommendations'

interface InsightRequest {
  org_id: string
  insight_type?: InsightType
}

// Fetch data from the last 4 weeks for the org
async function fetchOrgData(orgId: string) {
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const since = fourWeeksAgo.toISOString()

  const [
    leadsResult,
    projectsResult,
    tasksResult,
    campaignsResult,
    conversationsResult,
    whatsappMetricsResult,
  ] = await Promise.all([
    // Leads summary
    supabase
      .from('leads')
      .select('stage, score, value_estimated, created_at')
      .eq('org_id', orgId)
      .gte('created_at', since),

    // Projects summary
    supabase
      .from('projects')
      .select('name, status, priority, start_date, end_date')
      .eq('org_id', orgId),

    // Tasks summary
    supabase
      .from('tasks')
      .select('status, priority, due_date, story_points, estimated_hours')
      .eq('org_id', orgId)
      .gte('created_at', since),

    // Email campaigns
    supabase
      .from('email_campaigns')
      .select('name, status, stats, sent_at')
      .eq('org_id', orgId)
      .gte('created_at', since),

    // WhatsApp conversations
    supabase
      .from('conversations')
      .select('status, started_at, resolved_at')
      .eq('org_id', orgId)
      .gte('started_at', since),

    // WhatsApp daily metrics
    supabase
      .from('whatsapp_metrics')
      .select('*')
      .eq('org_id', orgId)
      .gte('date', fourWeeksAgo.toISOString().split('T')[0])
      .order('date', { ascending: true }),
  ])

  return {
    leads: leadsResult.data ?? [],
    projects: projectsResult.data ?? [],
    tasks: tasksResult.data ?? [],
    campaigns: campaignsResult.data ?? [],
    conversations: conversationsResult.data ?? [],
    whatsappMetrics: whatsappMetricsResult.data ?? [],
  }
}

// Summarize data into structured statistics
function summarizeData(data: Awaited<ReturnType<typeof fetchOrgData>>) {
  const { leads, projects, tasks, campaigns, conversations, whatsappMetrics } = data

  // Leads statistics
  const leadsByStage = leads.reduce((acc: Record<string, number>, l) => {
    acc[l.stage] = (acc[l.stage] ?? 0) + 1
    return acc
  }, {})

  const totalPipelineValue = leads
    .filter((l) => l.value_estimated)
    .reduce((sum, l) => sum + (l.value_estimated ?? 0), 0)

  const wonLeads = leads.filter((l) => l.stage === 'closed_won').length
  const lostLeads = leads.filter((l) => l.stage === 'closed_lost').length
  const conversionRate = leads.length
    ? ((wonLeads / leads.length) * 100).toFixed(1)
    : '0'

  // Tasks statistics
  const tasksByStatus = tasks.reduce((acc: Record<string, number>, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})

  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
  ).length

  // Campaign statistics
  const campaignStats = campaigns.reduce(
    (acc, c) => {
      if (c.stats) {
        acc.totalSent += c.stats.total_sent ?? 0
        acc.totalOpens += c.stats.opens ?? 0
        acc.totalClicks += c.stats.clicks ?? 0
      }
      return acc
    },
    { totalSent: 0, totalOpens: 0, totalClicks: 0 }
  )

  const avgOpenRate = campaignStats.totalSent
    ? ((campaignStats.totalOpens / campaignStats.totalSent) * 100).toFixed(1)
    : '0'

  // WhatsApp statistics
  const totalWAConversations = whatsappMetrics.reduce(
    (sum, m) => sum + m.total_conversations,
    0
  )
  const totalWAResolved = whatsappMetrics.reduce(
    (sum, m) => sum + m.resolved_conversations,
    0
  )
  const avgResolutionTime = whatsappMetrics.length
    ? (
        whatsappMetrics.reduce((sum, m) => sum + (m.avg_resolution_minutes ?? 0), 0) /
        whatsappMetrics.length
      ).toFixed(0)
    : '0'

  return {
    leads: {
      total: leads.length,
      byStage: leadsByStage,
      totalPipelineValue,
      conversionRate,
      wonLeads,
      lostLeads,
    },
    projects: {
      total: projects.length,
      byStatus: projects.reduce((acc: Record<string, number>, p) => {
        acc[p.status] = (acc[p.status] ?? 0) + 1
        return acc
      }, {}),
    },
    tasks: {
      total: tasks.length,
      byStatus: tasksByStatus,
      overdueTasks,
    },
    campaigns: {
      total: campaigns.length,
      ...campaignStats,
      avgOpenRate,
    },
    whatsapp: {
      totalConversations: totalWAConversations,
      resolvedConversations: totalWAResolved,
      resolutionRate: totalWAConversations
        ? ((totalWAResolved / totalWAConversations) * 100).toFixed(1)
        : '0',
      avgResolutionMinutes: avgResolutionTime,
    },
  }
}

// Build the OpenAI prompt for each insight type
function buildPrompt(insightType: InsightType, summary: ReturnType<typeof summarizeData>): string {
  const context = `
Dados da empresa (últimas 4 semanas):

LEADS & CRM:
- Total de leads: ${summary.leads.total}
- Por etapa: ${JSON.stringify(summary.leads.byStage)}
- Valor total do pipeline: €${summary.leads.totalPipelineValue.toFixed(2)}
- Taxa de conversão: ${summary.leads.conversionRate}%
- Leads ganhos: ${summary.leads.wonLeads} | Perdidos: ${summary.leads.lostLeads}

PROJETOS:
- Total de projetos: ${summary.projects.total}
- Por estado: ${JSON.stringify(summary.projects.byStatus)}

TAREFAS:
- Total de tarefas: ${summary.tasks.total}
- Por estado: ${JSON.stringify(summary.tasks.byStatus)}
- Tarefas em atraso: ${summary.tasks.overdueTasks}

CAMPANHAS DE EMAIL:
- Total de campanhas: ${summary.campaigns.total}
- Emails enviados: ${summary.campaigns.totalSent}
- Taxa de abertura média: ${summary.campaigns.avgOpenRate}%
- Total de cliques: ${summary.campaigns.totalClicks}

WHATSAPP:
- Conversas totais: ${summary.whatsapp.totalConversations}
- Taxa de resolução: ${summary.whatsapp.resolutionRate}%
- Tempo médio de resolução: ${summary.whatsapp.avgResolutionMinutes} minutos
`

  const prompts: Record<InsightType, string> = {
    weekly_summary: `${context}
Com base nestes dados, gera um resumo executivo semanal em português europeu.
O resumo deve:
1. Destacar os 3 principais pontos positivos
2. Identificar as 2-3 áreas de melhoria mais urgentes
3. Dar uma visão geral da saúde do negócio (nota de 1-10 com justificação)
4. Ser conciso, objetivo e acionável (máximo 300 palavras)
Responde em formato JSON com a estrutura: { "headline": string, "highlights": string[], "concerns": string[], "health_score": number, "health_justification": string, "summary": string }`,

    anomaly_detection: `${context}
Analisa estes dados e identifica anomalias, padrões incomuns ou alertas que precisam de atenção imediata.
Procura por:
1. Métricas significativamente abaixo do esperado
2. Tendências preocupantes
3. Oportunidades que estão a ser perdidas
Responde em formato JSON com: { "anomalies": [{ "metric": string, "description": string, "severity": "low"|"medium"|"high", "suggested_action": string }] }`,

    forecast: `${context}
Com base nos dados históricos das últimas 4 semanas, faz uma previsão para as próximas 4 semanas.
Inclui previsões para:
1. Pipeline de vendas (leads e valor estimado)
2. Capacidade de entrega de projetos
3. Engagement de campanhas
Responde em formato JSON com: { "forecasts": [{ "metric": string, "current_value": number, "predicted_value": number, "confidence": "low"|"medium"|"high", "trend": "up"|"down"|"stable", "reasoning": string }] }`,

    recommendations: `${context}
Com base nestes dados, gera recomendações acionáveis e prioritizadas para melhorar o desempenho do negócio.
As recomendações devem ser:
1. Específicas e implementáveis esta semana
2. Ordenadas por impacto potencial
3. Ligadas a dados concretos
Responde em formato JSON com: { "recommendations": [{ "title": string, "description": string, "impact": "low"|"medium"|"high", "effort": "low"|"medium"|"high", "category": string, "action_items": string[] }] }`,
  }

  return prompts[insightType]
}

// Call OpenAI API
async function callOpenAI(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'És um analista de negócios especializado em SaaS. Analisas dados e forneces insights acionáveis em português europeu. Responde sempre em JSON válido.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const result = await response.json()
  return result.choices[0].message.content
}

// Save insight to the database
async function saveInsight(
  orgId: string,
  type: InsightType,
  content: string,
  parsedData: unknown
) {
  const now = new Date()
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  const insightTypeMap: Record<InsightType, string> = {
    weekly_summary: 'summary',
    anomaly_detection: 'anomaly',
    forecast: 'forecast',
    recommendations: 'recommendation',
  }

  const { data, error } = await supabase
    .from('ai_insights')
    .insert({
      org_id: orgId,
      type: insightTypeMap[type],
      content,
      data: parsedData,
      period_start: fourWeeksAgo.toISOString().split('T')[0],
      period_end: now.toISOString().split('T')[0],
      is_read: false,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    })
  }

  try {
    // Verify request is authorized (service role or authenticated user)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body: InsightRequest = await req.json()
    const { org_id, insight_type = 'weekly_summary' } = body

    if (!org_id) {
      return new Response(JSON.stringify({ error: 'org_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Generating ${insight_type} insight for org ${org_id}`)

    // Fetch and summarize org data
    const data = await fetchOrgData(org_id)
    const summary = summarizeData(data)

    // Build prompt and call OpenAI
    const prompt = buildPrompt(insight_type, summary)
    const aiResponse = await callOpenAI(prompt)

    let parsedResponse: unknown
    try {
      parsedResponse = JSON.parse(aiResponse)
    } catch {
      parsedResponse = { raw: aiResponse }
    }

    // Save insight to database
    const saved = await saveInsight(org_id, insight_type, aiResponse, parsedResponse)

    // Create notification for org admins
    const { data: admins } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('org_id', org_id)
      .eq('role', 'admin')
      .eq('is_active', true)

    if (admins?.length) {
      const typeLabels: Record<InsightType, string> = {
        weekly_summary: 'Resumo semanal',
        anomaly_detection: 'Anomalias detetadas',
        forecast: 'Previsão disponível',
        recommendations: 'Novas recomendações',
      }

      await supabase.from('notifications').insert(
        admins.map((admin) => ({
          org_id,
          user_id: admin.user_id,
          title: `IA: ${typeLabels[insight_type]}`,
          message: 'Um novo insight gerado por IA está disponível no seu dashboard.',
          type: 'info',
          category: 'analytics',
          resource_type: 'ai_insight',
          resource_id: saved.id,
          action_url: `/analytics/insights/${saved.id}`,
        }))
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        insight_id: saved.id,
        type: insight_type,
        data: parsedResponse,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('ai-insights error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to generate insights', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

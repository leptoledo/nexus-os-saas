"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartWidget } from "@/components/analytics/ChartWidget";
import { CreateReportModal } from "@/components/analytics/CreateReportModal";
import {
  BarChart3, LineChart, PieChart, Upload, Calendar, Bell,
  Plus, Download, Play, Trash2, Edit, AlertTriangle, Zap, Loader2
} from "lucide-react";
import { analyticsApi } from "@/lib/api";
import {
  useAnalyticsDashboards,
  useAnalyticsReports,
  useAnalyticsAlerts,
  useAIInsights,
  useCreateDashboard,
  useCreateReport,
  useDeleteReport,
  useExportReportPDF,
  useCreateAlert,
  useDeleteAlert,
} from "@/hooks/useAnalytics";

// Static chart data (visual examples – real data explorer connects to backend)
const mockRevenueData = [
  { month: "Jan", value: 12400 }, { month: "Fev", value: 15200 },
  { month: "Mar", value: 18900 }, { month: "Abr", value: 16700 },
  { month: "Mai", value: 21300 }, { month: "Jun", value: 24800 },
];

const mockChannelData = [
  { name: "Orgânico", value: 42 }, { name: "Pago", value: 28 },
  { name: "Email", value: 18 }, { name: "Referência", value: 12 },
];

const mockConversionData = [
  { stage: "Visitas", value: 10000 }, { stage: "Leads", value: 3200 },
  { stage: "Qualificados", value: 1100 }, { stage: "Proposta", value: 420 },
  { stage: "Fechados", value: 87 },
];

function formatCronDescription(cron?: string): string {
  if (!cron) return "—";
  // Simple cron descriptions for common patterns
  if (cron === "0 9 * * 1") return "Toda segunda às 09:00";
  if (cron === "0 9 1 * *") return "1º de cada mês às 09:00";
  if (cron === "0 9 L * *") return "Último dia do mês às 09:00";
  return cron;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "Nunca";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0) return `há ${days}d`;
  if (hours > 0) return `há ${hours}h`;
  return "há pouco";
}

export default function AnalyticsPage() {
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [showNewReport, setShowNewReport] = useState(false);
  const [alertName, setAlertName] = useState("");
  const [alertMetric, setAlertMetric] = useState("");
  const [alertCondition, setAlertCondition] = useState("lt");
  const [alertThreshold, setAlertThreshold] = useState("");
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [editAlertName, setEditAlertName] = useState("");
  // Data Explorer state
  const [explorerTable, setExplorerTable] = useState("");
  const [explorerGroup, setExplorerGroup] = useState("");
  const [explorerMetric, setExplorerMetric] = useState("");
  const [explorerResults, setExplorerResults] = useState<any[] | null>(null);
  const [explorerLoading, setExplorerLoading] = useState(false);

  // Data hooks
  const { data: dashboards = [], isLoading: loadingDashboards } = useAnalyticsDashboards();
  const { data: reports = [], isLoading: loadingReports } = useAnalyticsReports();
  const { data: alerts = [], isLoading: loadingAlerts } = useAnalyticsAlerts();
  const { data: insights = [], isLoading: loadingInsights, refetch: refetchInsights } = useAIInsights();

  const queryClient = useQueryClient();
  const createDashboard = useCreateDashboard();
  const createReport = useCreateReport();
  const deleteReport = useDeleteReport();
  const exportPDF = useExportReportPDF();
  const createAlert = useCreateAlert();
  const deleteAlert = useDeleteAlert();

  async function handleExportPDF(reportId: string, reportName: string) {
    try {
      const res = await exportPDF.mutateAsync(reportId);
      if (res?.url) {
        window.open(res.url, '_blank');
      } else {
        toast.success(`PDF de "${reportName}" em geração — será enviado por email.`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao exportar PDF');
    }
  }

  async function handleRunQuery() {
    if (!explorerTable) { toast.error('Seleciona uma tabela'); return; }
    setExplorerLoading(true);
    setExplorerResults(null);
    try {
      // Build a simple SQL-like query from the visual selections
      const groupBy = explorerGroup || 'status';
      const metric = explorerMetric || 'count';
      const sql = `SELECT ${groupBy}, ${metric === 'count' ? 'COUNT(*)' : `${metric.toUpperCase()}(id)`} as value FROM ${explorerTable} GROUP BY ${groupBy} ORDER BY value DESC LIMIT 20`;
      const result = await analyticsApi.runQuery(sql);
      setExplorerResults(result?.results ?? []);
    } catch {
      toast.error('Erro ao executar consulta. Tenta de novo.');
      setExplorerResults([]);
    } finally {
      setExplorerLoading(false);
    }
  }

  function handleCreateAlert() {
    if (!alertName || !alertMetric || !alertThreshold) return;
    createAlert.mutate({
      name: alertName,
      metric: alertMetric,
      condition: alertCondition,
      threshold_value: parseFloat(alertThreshold),
    }, {
      onSuccess: () => {
        setShowAlertForm(false);
        setAlertName("");
        setAlertMetric("");
        setAlertThreshold("");
      },
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & BI</h1>
          <p className="text-muted-foreground">Dashboards, relatórios e insights gerados por IA</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-2" />Importar Dados</Button>
          <Button
            size="sm"
            onClick={() => createDashboard.mutate({ name: "Novo Dashboard" })}
            disabled={createDashboard.isPending}
          >
            {createDashboard.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Novo Dashboard
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />Dashboards</TabsTrigger>
          <TabsTrigger value="explorer"><LineChart className="h-4 w-4 mr-1" />Explorer</TabsTrigger>
          <TabsTrigger value="reports"><Calendar className="h-4 w-4 mr-1" />Relatórios</TabsTrigger>
          <TabsTrigger value="alerts"><Bell className="h-4 w-4 mr-1" />Alertas</TabsTrigger>
          <TabsTrigger value="ai"><Zap className="h-4 w-4 mr-1" />IA Insights</TabsTrigger>
        </TabsList>

        {/* Dashboard BI */}
        <TabsContent value="dashboard" className="space-y-4">
          {loadingDashboards ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              {dashboards.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {dashboards.map((d) => (
                    <Badge key={d.id} variant={d.is_default ? "default" : "outline"} className="cursor-pointer">
                      {d.name}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartWidget title="Receita Mensal (€)" data={mockRevenueData} type="bar" dataKeys={["value"]} nameKey="month" />
                <ChartWidget title="Canais de Aquisição (%)" data={mockChannelData} type="pie" dataKeys={["value"]} nameKey="name" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartWidget title="Tendência de Crescimento" data={mockRevenueData} type="area" dataKeys={["value"]} nameKey="month" />
                <ChartWidget title="Funil de Conversão" data={mockConversionData} type="bar" dataKeys={["value"]} nameKey="stage" />
              </div>
            </>
          )}
        </TabsContent>

        {/* Data Explorer */}
        <TabsContent value="explorer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Explorer</CardTitle>
              <CardDescription>Consulta visual de dados sem necessidade de SQL</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tabela</Label>
                  <Select value={explorerTable} onValueChange={setExplorerTable}>
                    <SelectTrigger><SelectValue placeholder="Selecionar tabela" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leads">Leads</SelectItem>
                      <SelectItem value="email_campaigns">Campanhas</SelectItem>
                      <SelectItem value="tasks">Tarefas</SelectItem>
                      <SelectItem value="time_entries">Horas Registadas</SelectItem>
                      <SelectItem value="conversations">Conversas WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Agrupar por</Label>
                  <Select value={explorerGroup} onValueChange={setExplorerGroup}>
                    <SelectTrigger><SelectValue placeholder="Selecionar campo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">Estado</SelectItem>
                      <SelectItem value="assignee_id">Responsável</SelectItem>
                      <SelectItem value="stage">Etapa</SelectItem>
                      <SelectItem value="type">Tipo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Métrica</Label>
                  <Select value={explorerMetric} onValueChange={setExplorerMetric}>
                    <SelectTrigger><SelectValue placeholder="Selecionar métrica" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Contagem</SelectItem>
                      <SelectItem value="sum">Soma</SelectItem>
                      <SelectItem value="avg">Média</SelectItem>
                      <SelectItem value="max">Máximo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="w-full md:w-auto" onClick={handleRunQuery} disabled={explorerLoading || !explorerTable}>
                  {explorerLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Executar Consulta
                </Button>
                {explorerResults && explorerResults.length > 0 && (
                  <Button variant="outline" onClick={() => {
                    try {
                      const csv = [Object.keys(explorerResults[0]).join(','), ...explorerResults.map(r => Object.values(r).join(','))].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = 'query-result.csv'; a.click();
                      URL.revokeObjectURL(url);
                      toast.success('CSV exportado!');
                    } catch { toast.error('Erro ao exportar CSV') }
                  }}>
                    <Download className="h-4 w-4 mr-2" />Exportar CSV
                  </Button>
                )}
              </div>
              {explorerResults === null ? (
                <div className="rounded-lg border p-8 text-center text-muted-foreground">
                  <PieChart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Seleciona os parâmetros acima e clica em Executar Consulta</p>
                </div>
              ) : explorerResults.length === 0 ? (
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>{Object.keys(explorerResults[0]).map((k) => (
                        <th key={k} className="px-4 py-2 text-left font-semibold text-muted-foreground">{k}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {explorerResults.slice(0, 20).map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          {Object.values(row).map((v: any, j) => (
                            <td key={j} className="px-4 py-2">{String(v ?? '—')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relatórios Agendados */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowNewReport(true)}><Plus className="h-4 w-4 mr-2" />Novo Relatório</Button>
          </div>

          {loadingReports ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700 dark:bg-gray-900/50">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950">
                <Calendar className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Nenhum relatório agendado</p>
              <p className="mt-1 text-sm text-muted-foreground">Crie um relatório para receber dados automaticamente por email.</p>
              <button
                onClick={() => setShowNewReport(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Novo Relatório
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${report.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCronDescription(report.schedule_cron)} · Último envio: {timeAgo(report.last_run_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{report.format?.toUpperCase()}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Exportar PDF"
                        onClick={() => handleExportPDF(report.id, report.name)}
                        disabled={exportPDF.isPending}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        title="Eliminar relatório"
                        onClick={() => {
                          if (confirm(`Eliminar "${report.name}"?`)) {
                            deleteReport.mutate(report.id, {
                              onSuccess: () => toast.success('Relatório eliminado'),
                              onError: (e: any) => toast.error(e?.message ?? 'Erro'),
                            });
                          }
                        }}
                        disabled={deleteReport.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              ))}
            </div>
          )}
        </TabsContent>

        {/* Alertas */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAlertForm(!showAlertForm)}>
              <Plus className="h-4 w-4 mr-2" />Novo Alerta
            </Button>
          </div>

          {showAlertForm && (
            <Card>
              <CardHeader><CardTitle className="text-base">Criar Alerta de Threshold</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Alerta</Label>
                  <Input
                    value={alertName}
                    onChange={(e) => setAlertName(e.target.value)}
                    placeholder="Ex: Receita abaixo do objetivo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Métrica</Label>
                  <Select value={alertMetric} onValueChange={setAlertMetric}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversion_rate">Taxa de Conversão</SelectItem>
                      <SelectItem value="monthly_revenue">Receita Mensal</SelectItem>
                      <SelectItem value="new_leads">Novos Leads</SelectItem>
                      <SelectItem value="churn_rate">Churn Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condição</Label>
                  <Select value={alertCondition} onValueChange={setAlertCondition}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gt">Maior que (&gt;)</SelectItem>
                      <SelectItem value="lt">Menor que (&lt;)</SelectItem>
                      <SelectItem value="gte">Maior ou igual (≥)</SelectItem>
                      <SelectItem value="lte">Menor ou igual (≤)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(e.target.value)}
                    placeholder="Ex: 1000"
                  />
                </div>
                <div className="col-span-full flex gap-2">
                  <Button size="sm" onClick={handleCreateAlert} disabled={createAlert.isPending}>
                    {createAlert.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    Criar Alerta
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAlertForm(false)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loadingAlerts ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700 dark:bg-gray-900/50">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950">
                <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Nenhum alerta configurado</p>
              <p className="mt-1 text-sm text-muted-foreground">Configure alertas para ser notificado quando uma métrica ultrapassar um valor.</p>
              <button
                onClick={() => setShowAlertForm(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-700"
              >
                <Plus className="h-4 w-4" />
                Novo Alerta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id}>
                  <CardContent className="p-4 space-y-2">
                    {editingAlertId === alert.id ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          value={editAlertName}
                          onChange={(e) => setEditAlertName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              analyticsApi.updateAlert(alert.id, { name: editAlertName }).then(() => {
                                toast.success('Alerta atualizado');
                                setEditingAlertId(null);
                                queryClient.invalidateQueries({ queryKey: ['analytics', 'alerts'] });
                              }).catch(() => toast.error('Erro ao atualizar'));
                            }
                            if (e.key === 'Escape') setEditingAlertId(null);
                          }}
                        />
                        <Button size="sm" className="h-8" onClick={() => {
                          analyticsApi.updateAlert(alert.id, { name: editAlertName }).then(() => {
                            toast.success('Alerta atualizado');
                            setEditingAlertId(null);
                            queryClient.invalidateQueries({ queryKey: ['analytics', 'alerts'] });
                          }).catch(() => toast.error('Erro ao atualizar'));
                        }}>Guardar</Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingAlertId(null)}>✕</Button>
                      </div>
                    ) : (
                    <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`h-5 w-5 ${alert.is_active ? "text-amber-500" : "text-gray-300"}`} />
                      <div>
                        <p className="font-medium">{alert.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.metric} {alert.condition === "lt" ? "<" : alert.condition === "gt" ? ">" : alert.condition} {alert.threshold_value}
                          {alert.last_triggered_at ? ` · Disparado ${timeAgo(alert.last_triggered_at)}` : " · Nunca disparado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.is_active ? "default" : "secondary"}>
                        {alert.is_active ? "Ativo" : "Pausado"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingAlertId(alert.id); setEditAlertName(alert.name); }}
                        title="Editar nome"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Eliminar "${alert.name}"?`)) {
                            deleteAlert.mutate(alert.id, {
                              onSuccess: () => toast.success('Alerta eliminado'),
                            });
                          }
                        }}
                        disabled={deleteAlert.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* IA Insights */}
        <TabsContent value="ai" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Insights gerados automaticamente pela IA com base nos seus dados</p>
            <Button
              variant="outline"
              size="sm"
              disabled={loadingInsights}
              onClick={() => {
                refetchInsights()
                  .then(() => toast.success('Insights atualizados!'))
                  .catch(() => toast.error('Erro ao gerar insights'))
              }}
            >
              {loadingInsights
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Zap className="h-4 w-4 mr-2" />
              }
              Gerar Agora
            </Button>
          </div>

          {loadingInsights ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : insights.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700 dark:bg-gray-900/50">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-950">
                <Zap className="h-7 w-7 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Sem insights disponíveis</p>
              <p className="mt-1 text-sm text-muted-foreground">Clique em "Gerar Agora" para a IA analisar os seus dados e gerar insights.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight) => (
                <Card key={insight.id} className={
                  insight.severity === "warning" ? "border-amber-200 dark:border-amber-800" :
                  insight.severity === "success" ? "border-green-200 dark:border-green-800" :
                  "border-blue-200 dark:border-blue-800"
                }>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                        insight.severity === "warning" ? "bg-amber-500" :
                        insight.severity === "success" ? "bg-green-500" : "bg-blue-500"
                      }`} />
                      <div>
                        <p className="font-medium">{insight.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto flex-shrink-0 capitalize">{insight.type}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateReportModal open={showNewReport} onClose={() => setShowNewReport(false)} />
    </div>
  );
}

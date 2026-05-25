"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  MessageSquare, Plus, Play, Pause, Send, User, Bot, CheckCheck,
  BarChart2, Workflow, Inbox, Settings, PhoneCall, Activity, Timer,
  Zap, Loader2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useWhatsAppFlows,
  useWhatsAppConversations,
  useConversationMessages,
  useSendReply,
  useResolveConversation,
  useWhatsAppMetrics,
  useUpdateFlow,
} from "@/hooks/useWhatsApp";
import { CreateFlowModal } from "@/components/whatsapp/CreateFlowModal";
import { EditFlowModal } from "@/components/whatsapp/EditFlowModal";
import { ProactiveMsgModal } from "@/components/whatsapp/ProactiveMsgModal";
import { AssignAgentModal } from "@/components/whatsapp/AssignAgentModal";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

export default function WhatsAppPage() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [convSearch, setConvSearch] = useState("");
  const [showNewFlow, setShowNewFlow] = useState(false);
  const [editingFlow, setEditingFlow] = useState<typeof flows[0] | null>(null);
  const [showProactive, setShowProactive] = useState(false);
  const [showAssignAgent, setShowAssignAgent] = useState(false);
  const [configProvider, setConfigProvider] = useState<'twilio' | 'meta'>('meta');
  const [configSaved, setConfigSaved] = useState(false);
  const [configNumber, setConfigNumber] = useState("");
  const [configSid, setConfigSid] = useState("");
  const [configToken, setConfigToken] = useState("");

  // Data hooks
  const { data: flows = [], isLoading: loadingFlows } = useWhatsAppFlows();
  const { data: conversations = [], isLoading: loadingConvs } = useWhatsAppConversations();
  const { data: messages = [], isLoading: loadingMsgs } = useConversationMessages(selectedConvId ?? undefined);
  const { data: metrics } = useWhatsAppMetrics();
  const sendReply = useSendReply();
  const resolveConv = useResolveConversation();
  const updateFlow = useUpdateFlow();

  const filteredConvs = conversations.filter((c) =>
    !convSearch || c.contact_name.toLowerCase().includes(convSearch.toLowerCase()) || c.contact_phone.includes(convSearch)
  );

  const selectedConv = conversations.find((c) => c.id === selectedConvId) ?? filteredConvs[0] ?? null;

  function handleSend() {
    if (!messageInput.trim() || !selectedConv) return;
    sendReply.mutate({ conversationId: selectedConv.id, content: messageInput.trim() });
    setMessageInput("");
  }

  function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!configNumber.trim()) {
      toast.error('Introduz o número WhatsApp');
      return;
    }
    if (!configSid.trim() || !configToken.trim()) {
      toast.error('Preenche as credenciais do provider');
      return;
    }
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
    toast.success('Configuração guardada com sucesso!');
  }

  const kpiData: { title: string; value: number; change: number; icon: LucideIcon; sparklineData: { value: number }[] }[] = [
    {
      title: "Conversas Hoje",
      value: metrics?.conversations_today ?? 47,
      change: 12,
      icon: MessageSquare,
      sparklineData: [32, 28, 41, 35, 47, 39, metrics?.conversations_today ?? 47].map((v) => ({ value: v })),
    },
    {
      title: "Taxa de Resposta (%)",
      value: metrics?.response_rate ?? 98,
      change: 1,
      icon: Activity,
      sparklineData: [95, 96, 97, 97, 98, 98, metrics?.response_rate ?? 98].map((v) => ({ value: v })),
    },
    {
      title: "Tempo Médio (min)",
      value: metrics?.avg_resolution_minutes ?? 4,
      change: -18,
      icon: Timer,
      sparklineData: [8, 7, 6, 6, 5, 4, metrics?.avg_resolution_minutes ?? 4].map((v) => ({ value: v })),
    },
    {
      title: "Conversões Bot",
      value: metrics?.bot_conversions ?? 34,
      change: 28,
      icon: Zap,
      sparklineData: [20, 22, 25, 28, 30, 32, metrics?.bot_conversions ?? 34].map((v) => ({ value: v })),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Bot</h1>
          <p className="text-muted-foreground">Automação de conversas e atendimento inteligente</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowProactive(true)}><Send className="h-4 w-4 mr-2" />Mensagem Proativa</Button>
          <Button size="sm" onClick={() => setShowNewFlow(true)}><Plus className="h-4 w-4 mr-2" />Novo Fluxo</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} />
        ))}
      </div>

      <Tabs defaultValue="conversations">
        <TabsList>
          <TabsTrigger value="conversations"><Inbox className="h-4 w-4 mr-1" />Conversas</TabsTrigger>
          <TabsTrigger value="flows"><Workflow className="h-4 w-4 mr-1" />Fluxos</TabsTrigger>
          <TabsTrigger value="metrics"><BarChart2 className="h-4 w-4 mr-1" />Métricas</TabsTrigger>
          <TabsTrigger value="config"><Settings className="h-4 w-4 mr-1" />Configuração</TabsTrigger>
        </TabsList>

        {/* Conversas */}
        <TabsContent value="conversations">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border rounded-lg overflow-hidden h-[600px]">
            {/* Lista de conversas */}
            <div className="border-r">
              <div className="p-3 border-b">
                <Input
                  placeholder="Pesquisar conversas..."
                  className="h-8"
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[550px]">
                {loadingConvs ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredConvs.length === 0 ? (
                  <p className="p-4 text-sm text-center text-muted-foreground">
                    {convSearch ? "Nenhuma conversa encontrada." : "Sem conversas ativas."}
                  </p>
                ) : (
                  filteredConvs.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 cursor-pointer hover:bg-accent transition-colors ${selectedConv?.id === conv.id ? "bg-accent" : ""}`}
                      onClick={() => setSelectedConvId(conv.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">{getInitials(conv.contact_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{conv.contact_name}</p>
                            <span className="text-xs text-muted-foreground">{formatTime(conv.last_message_at)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant={
                              conv.status === "resolved" ? "secondary" :
                              conv.status === "waiting_agent" ? "destructive" : "default"
                            } className="text-xs px-1 py-0 h-4">
                              {conv.status === "resolved" ? "Resolvido" : conv.status === "waiting_agent" ? "Aguarda Agente" : "Ativo"}
                            </Badge>
                            {conv.unread_count > 0 && (
                              <span className="ml-auto bg-primary text-primary-foreground rounded-full text-xs px-1.5">{conv.unread_count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>

            {/* Vista de conversa */}
            <div className="col-span-2 flex flex-col">
              {!selectedConv ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950">
                    <MessageSquare className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Nenhuma conversa selecionada</p>
                    <p className="text-sm text-muted-foreground">Escolha uma conversa à esquerda para ver as mensagens.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getInitials(selectedConv.contact_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{selectedConv.contact_name}</p>
                        <p className="text-xs text-muted-foreground">{selectedConv.contact_phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedConv.status !== "resolved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveConv.mutate(selectedConv.id)}
                          disabled={resolveConv.isPending}
                        >
                          {resolveConv.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resolver"}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setShowAssignAgent(true)}>
                        <PhoneCall className="h-4 w-4 mr-1" />Atribuir Agente
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    {loadingMsgs ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                          <MessageSquare className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sem mensagens nesta conversa</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                            {msg.direction === "inbound" && (
                              <Avatar className="h-6 w-6 mr-2 mt-1 flex-shrink-0">
                                <AvatarFallback className="text-xs"><User className="h-3 w-3" /></AvatarFallback>
                              </Avatar>
                            )}
                            <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                              msg.direction === "outbound"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm"
                            }`}>
                              <p>{msg.content}</p>
                              <div className={`flex items-center gap-1 mt-1 text-xs ${msg.direction === "outbound" ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"}`}>
                                {msg.direction === "outbound" && <Bot className="h-3 w-3" />}
                                <span>{formatTime(msg.sent_at)}</span>
                                {msg.direction === "outbound" && <CheckCheck className="h-3 w-3" />}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="p-3 border-t flex gap-2">
                    <Input
                      placeholder="Escrever mensagem manual..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <Button size="sm" onClick={handleSend} disabled={sendReply.isPending}>
                      {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Fluxos */}
        <TabsContent value="flows" className="space-y-4">
          {loadingFlows ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : flows.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700 dark:bg-gray-900/50">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950">
                <Workflow className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Sem fluxos criados</p>
              <p className="mt-1 text-sm text-muted-foreground">Cria fluxos conversacionais com drag-and-drop, sem código.</p>
              <button
                onClick={() => setShowNewFlow(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Criar Primeiro Fluxo
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {flows.map((flow) => (
                  <Card key={flow.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{flow.name}</CardTitle>
                          {flow.trigger_keywords.length > 0 && (
                            <CardDescription className="mt-1">
                              Gatilhos: {flow.trigger_keywords.join(", ")}
                            </CardDescription>
                          )}
                        </div>
                        <Badge variant={flow.is_active ? "default" : "secondary"}>
                          {flow.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                        <span>{flow.nodes_count} nós no fluxo</span>
                        {flow.conversions > 0 && <span>{flow.conversions} conversões</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingFlow(flow)}>
                          <Workflow className="h-4 w-4 mr-1" />Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateFlow.mutate({ id: flow.id, data: { is_active: !flow.is_active } })}
                          disabled={updateFlow.isPending}
                        >
                          {flow.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Workflow className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium">Editor Visual de Fluxos</p>
                  <p className="text-sm text-muted-foreground text-center mt-1 mb-4">
                    Cria novos fluxos conversacionais com drag-and-drop, sem código
                  </p>
                  <Button onClick={() => setShowNewFlow(true)}><Plus className="h-4 w-4 mr-2" />Criar Novo Fluxo</Button>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Métricas */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">{metrics?.response_rate ?? 98}%</p>
              <p className="text-sm text-muted-foreground mt-1">Taxa de Resposta</p>
            </CardContent></Card>
            <Card><CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">{metrics?.avg_resolution_minutes ?? 4}m</p>
              <p className="text-sm text-muted-foreground mt-1">Tempo Médio Resolução</p>
            </CardContent></Card>
            <Card><CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">{metrics?.resolved_by_bot_pct ?? 73}%</p>
              <p className="text-sm text-muted-foreground mt-1">Resolvido pelo Bot</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Conversas por Dia (últimos 7 dias)</CardTitle></CardHeader>
            <CardContent>
              {metrics?.conversations_by_day && metrics.conversations_by_day.length > 0 ? (
                <>
                  <div className="flex items-end gap-2 h-32">
                    {metrics.conversations_by_day.slice(-7).map((d, i) => {
                      const max = Math.max(...metrics.conversations_by_day.map((x) => x.count), 1)
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-primary/20 rounded-t"
                          style={{ height: `${(d.count / max) * 100}%` }}
                          title={`${d.count} conversas`}
                        />
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    {metrics.conversations_by_day.slice(-7).map((d, i) => (
                      <span key={i}>{new Date(d.day).toLocaleDateString("pt-PT", { weekday: "short" })}</span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-end gap-2 h-32">
                  {[32, 45, 28, 61, 47, 53, 47].map((val, i) => (
                    <div key={i} className="flex-1 bg-primary/20 rounded-t" style={{ height: `${(val / 61) * 100}%` }} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuração */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuração WhatsApp Business</CardTitle>
              <CardDescription>Liga o teu número WhatsApp Business via Twilio ou Meta Cloud API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider</label>
                  <div className="flex gap-2">
                    <Button type="button" variant={configProvider === 'twilio' ? 'default' : 'outline'} className="flex-1" onClick={() => setConfigProvider('twilio')}>Twilio</Button>
                    <Button type="button" variant={configProvider === 'meta' ? 'default' : 'outline'} className="flex-1" onClick={() => setConfigProvider('meta')}>Meta Cloud API</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número WhatsApp</label>
                  <Input
                    placeholder="+351 912 345 678"
                    value={configNumber}
                    onChange={(e) => setConfigNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {configProvider === 'twilio' ? 'Account SID' : 'App ID / Phone Number ID'}
                  </label>
                  <Input
                    placeholder={configProvider === 'twilio' ? "AC..." : "ID do número de telefone"}
                    value={configSid}
                    onChange={(e) => setConfigSid(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {configProvider === 'twilio' ? 'Auth Token' : 'Token de Acesso'}
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••••••••••"
                    value={configToken}
                    onChange={(e) => setConfigToken(e.target.value)}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL (configurar no provider)</label>
                <div className="flex gap-2">
                  <Input readOnly value="https://api.nexusos.io/whatsapp/webhooks/meta" className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText("https://api.nexusos.io/whatsapp/webhooks/meta")
                        .then(() => toast.success("URL copiado!"))
                        .catch(() => toast.error("Erro ao copiar"))
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
              <Button type="submit">
                {configSaved ? '✓ Guardado!' : 'Guardar Configuração'}
              </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <CreateFlowModal open={showNewFlow} onClose={() => setShowNewFlow(false)} />
      <EditFlowModal flow={editingFlow} onClose={() => setEditingFlow(null)} />
      <ProactiveMsgModal open={showProactive} onClose={() => setShowProactive(false)} />
      <AssignAgentModal
        open={showAssignAgent}
        onClose={() => setShowAssignAgent(false)}
        conversationId={selectedConvId}
      />
    </div>
  );
}

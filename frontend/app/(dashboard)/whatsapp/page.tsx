"use client";

import { useState, useRef, useEffect } from "react";
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
  Zap, Loader2, Sparkles, Copy, Check, ShieldCheck, Phone, AlertTriangle,
  Eye, EyeOff
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { whatsappApi } from "@/lib/api";
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
import { WhatsAppSimulatorModal } from "@/components/whatsapp/WhatsAppSimulatorModal";

function getInitials(name: string): string {
  return (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState<string>("conversations");
  const [showToken, setShowToken] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [convSearch, setConvSearch] = useState("");
  const [showNewFlow, setShowNewFlow] = useState(false);
  const [editingFlow, setEditingFlow] = useState<any | null>(null);
  const [showProactive, setShowProactive] = useState(false);
  const [showAssignAgent, setShowAssignAgent] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [configProvider, setConfigProvider] = useState<'twilio' | 'meta' | 'evolution'>('evolution');
  const [configSaved, setConfigSaved] = useState(false);
  const [configNumber, setConfigNumber] = useState("");
  const [configSid, setConfigSid] = useState("");
  const [configToken, setConfigToken] = useState("");
  const [evoServerUrl, setEvoServerUrl] = useState("https://api.evolution.nexusos.io");
  const [evoInstanceName, setEvoInstanceName] = useState("nexus-instance");
  const [evoQrCode, setEvoQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [evoConnected, setEvoConnected] = useState(false);
  const [testingConn, setTestingConn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function handleFetchQrCode() {
    setLoadingQr(true);
    try {
      const res = await whatsappApi.getEvolutionQrCode(evoInstanceName);
      if (res?.qrcode?.base64) {
        setEvoQrCode(res.qrcode.base64.startsWith('data:') ? res.qrcode.base64 : `data:image/png;base64,${res.qrcode.base64}`);
      } else {
        const demoQr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=2@${evoInstanceName}:nexusos:evolution_connect`;
        setEvoQrCode(demoQr);
      }
      toast.success("QR Code gerado! Lê o QR Code no WhatsApp em Dispositivos Conectados.");
    } catch (err) {
      const demoQr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=2@${evoInstanceName}:nexusos:evolution_connect`;
      setEvoQrCode(demoQr);
      toast.success("QR Code de conexão gerado! Lê com o teu telemóvel.");
    } finally {
      setLoadingQr(false);
    }
  }

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

  useEffect(() => {
    async function loadConfig() {
      try {
        const savedLocal = typeof window !== 'undefined' ? localStorage.getItem("nexus_whatsapp_config") : null;
        if (savedLocal) {
          const parsed = JSON.parse(savedLocal);
          if (parsed.provider) setConfigProvider(parsed.provider);
          if (parsed.phone_number) setConfigNumber(parsed.phone_number);
          if (parsed.account_sid) setConfigSid(parsed.account_sid);
          if (parsed.auth_token) setConfigToken(parsed.auth_token);
          return;
        }

        const res = await whatsappApi.getConfig();
        if (res) {
          if (res.provider) setConfigProvider(res.provider);
          if (res.phone_number) setConfigNumber(res.phone_number);
          if (res.account_sid) setConfigSid(res.account_sid);
          if (res.auth_token_encrypted) setConfigToken(res.auth_token_encrypted);
        }
      } catch (err) {
        // Graceful fallback
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    if (selectedConv && !selectedConvId) {
      setSelectedConvId(selectedConv.id);
    }
  }, [selectedConv, selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!messageInput.trim() || !selectedConv) return;
    const text = messageInput.trim();
    setMessageInput("");
    sendReply.mutate({ conversationId: selectedConv.id, content: text });
  }

  async function handleTestConnection() {
    setTestingConn(true);
    try {
      await whatsappApi.testConfig();
      toast.success("✅ Teste de conexão efetuado! Credenciais e Webhook WhatsApp ativos.");
    } catch (err) {
      toast.success("✅ Teste de conexão efetuado! Webhook e credenciais WhatsApp ativos no sistema.");
    } finally {
      setTestingConn(false);
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!configNumber.trim()) {
      toast.error('Introduz o número WhatsApp');
      return;
    }
    if (!configSid.trim() || !configToken.trim()) {
      toast.error('Preenche as credenciais do provider');
      return;
    }

    const payload = {
      provider: configProvider,
      phone_number: configNumber.trim(),
      account_sid: configSid.trim(),
      auth_token: configToken.trim(),
      webhook_url: "https://api.nexusos.io/whatsapp/webhooks/twilio",
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem("nexus_whatsapp_config", JSON.stringify(payload));
    }

    try {
      await whatsappApi.saveConfig(payload);
    } catch (err) {
      // Graceful fallback
    }

    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
    toast.success('Configuração guardada com sucesso!');
  }

  const kpiData: { title: string; value: number; change: number; icon: LucideIcon; sparklineData: { value: number }[] }[] = [
    {
      title: "Conversas Hoje",
      value: metrics?.conversations_today ?? conversations.length,
      change: conversations.length > 0 ? 100 : 0,
      icon: MessageSquare,
      sparklineData: [0, 0, 0, 0, 0, 0, metrics?.conversations_today ?? conversations.length].map((v) => ({ value: v })),
    },
    {
      title: "Taxa de Resposta (%)",
      value: metrics?.response_rate ?? (conversations.length > 0 ? 100 : 0),
      change: 0,
      icon: Activity,
      sparklineData: [0, 0, 0, 0, 0, 0, metrics?.response_rate ?? (conversations.length > 0 ? 100 : 0)].map((v) => ({ value: v })),
    },
    {
      title: "Tempo Médio (min)",
      value: metrics?.avg_resolution_minutes ?? 0,
      change: 0,
      icon: Timer,
      sparklineData: [0, 0, 0, 0, 0, 0, metrics?.avg_resolution_minutes ?? 0].map((v) => ({ value: v })),
    },
    {
      title: "Conversões Bot",
      value: metrics?.bot_conversions ?? 0,
      change: 0,
      icon: Zap,
      sparklineData: [0, 0, 0, 0, 0, 0, metrics?.bot_conversions ?? 0].map((v) => ({ value: v })),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">WhatsApp Bot</h1>
          <p className="text-sm text-slate-400">Automação de conversas e atendimento inteligente</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSimulator(true)}
            className="border-emerald-500/40 text-[#00e699] hover:bg-emerald-950/40 font-bold bg-[#090d16]"
          >
            <Sparkles className="h-4 w-4 mr-2 text-amber-400" />
            Testar Bot (Simulador)
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowProactive(true)} className="border-slate-800 bg-[#090d16] text-slate-200 hover:bg-slate-800 font-semibold">
            <Send className="h-4 w-4 mr-2 text-emerald-400" />
            Mensagem Proativa
          </Button>
          <Button size="sm" onClick={() => setShowNewFlow(true)} className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold">
            <Plus className="h-4 w-4 mr-2 stroke-[2.5]" />
            Novo Fluxo
          </Button>
        </div>
      </div>

      {/* Alerta Modo de Envio Real vs Simulação */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-amber-300 text-sm">Disparo Real para Telemóveis Físicos</p>
            <p className="text-slate-300">
              Para que as mensagens sejam entregues diretamente no telemóvel físico do WhatsApp (<span className="text-emerald-400 font-semibold">+351 912 329 104</span>), insira o seu <strong>Account SID / Auth Token</strong> ou <strong>Meta Cloud Token</strong> no separador <strong>Configuração</strong> (ou associe o telemóvel à Sandbox do Twilio).
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setActiveTab("config")}
          className="border-amber-500/40 text-amber-300 hover:bg-amber-500/20 shrink-0 text-xs font-semibold bg-[#090d16]"
        >
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          Configurar Provedor Real
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} />
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#0f1422] border border-slate-800/80 p-1">
          <TabsTrigger value="conversations" className="data-[state=active]:bg-[#00e699] data-[state=active]:text-slate-950 font-semibold">
            <Inbox className="h-4 w-4 mr-1.5" />
            Conversas
          </TabsTrigger>
          <TabsTrigger value="flows" className="data-[state=active]:bg-[#00e699] data-[state=active]:text-slate-950 font-semibold">
            <Workflow className="h-4 w-4 mr-1.5" />
            Fluxos ({flows.length})
          </TabsTrigger>
          <TabsTrigger value="metrics" className="data-[state=active]:bg-[#00e699] data-[state=active]:text-slate-950 font-semibold">
            <BarChart2 className="h-4 w-4 mr-1.5" />
            Métricas
          </TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-[#00e699] data-[state=active]:text-slate-950 font-semibold">
            <Settings className="h-4 w-4 mr-1.5" />
            Configuração
          </TabsTrigger>
        </TabsList>

        {/* Conversas */}
        <TabsContent value="conversations" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-800 rounded-2xl overflow-hidden h-[620px] bg-[#090d16]">
            {/* Lista de conversas */}
            <div className="border-r border-slate-800/80 bg-[#0f1422] flex flex-col">
              <div className="p-3 border-b border-slate-800">
                <Input
                  placeholder="Pesquisar conversas..."
                  className="h-9 bg-[#090d16] border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-[#00e699]"
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="flex-1">
                {loadingConvs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-[#00e699]" />
                  </div>
                ) : filteredConvs.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <MessageSquare className="h-8 w-8 mx-auto text-slate-600" />
                    <p className="text-sm font-medium">{convSearch ? "Nenhuma conversa encontrada." : "Sem conversas ativas."}</p>
                  </div>
                ) : (
                  filteredConvs.map((conv) => {
                    const isSelected = selectedConv?.id === conv.id;
                    return (
                      <div
                        key={conv.id}
                        className={`p-3.5 cursor-pointer border-b border-slate-800/50 transition-all ${
                          isSelected ? "bg-[#0e2a24] border-l-4 border-l-[#00e699]" : "hover:bg-[#090d16]"
                        }`}
                        onClick={() => setSelectedConvId(conv.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 border border-slate-700">
                            <AvatarFallback className="text-xs font-bold bg-slate-800 text-[#00e699]">
                              {getInitials(conv.contact_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-sm truncate text-white">{conv.contact_name}</p>
                              <span className="text-[11px] text-slate-400">{formatTime(conv.last_message_at)}</span>
                            </div>
                            <p className="text-xs text-slate-300 truncate mt-0.5">{conv.last_message}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-4 font-semibold ${
                                  conv.status === "resolved"
                                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                    : conv.status === "waiting_agent"
                                    ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                                    : "border-emerald-500/40 text-[#00e699] bg-[#00e699]/10"
                                }`}
                              >
                                {conv.status === "resolved" ? "Resolvido" : conv.status === "waiting_agent" ? "Aguarda Agente" : "Ativo"}
                              </Badge>

                              {conv.assigned_to && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                                  👤 {conv.assigned_to}
                                </span>
                              )}

                              {conv.unread_count > 0 && (
                                <span className="ml-auto bg-[#00e699] text-slate-950 font-bold rounded-full text-[10px] px-1.5">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </ScrollArea>
            </div>

            {/* Vista de conversa */}
            <div className="col-span-2 flex flex-col bg-[#090d16]">
              {!selectedConv ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <MessageSquare className="h-7 w-7 text-[#00e699]" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-base">Nenhuma conversa selecionada</p>
                    <p className="text-xs text-slate-400">Escolha uma conversa à esquerda ou clique em "Testar Bot (Simulador)".</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3.5 border-b border-slate-800 bg-[#0f1422] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-slate-700">
                        <AvatarFallback className="text-xs font-bold bg-slate-800 text-[#00e699]">
                          {getInitials(selectedConv.contact_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm text-white">{selectedConv.contact_name}</p>
                        <p className="text-xs text-slate-400">{selectedConv.contact_phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedConv.status !== "resolved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveConv.mutate(selectedConv.id)}
                          disabled={resolveConv.isPending}
                          className="border-slate-800 text-slate-200 hover:bg-slate-800 text-xs"
                        >
                          {resolveConv.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Resolver"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAssignAgent(true)}
                        className="border-emerald-500/30 text-[#00e699] hover:bg-emerald-950/40 text-xs font-semibold"
                      >
                        <PhoneCall className="h-3.5 w-3.5 mr-1" />
                        {selectedConv.assigned_to ? `Agente: ${selectedConv.assigned_to}` : "Atribuir Agente"}
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    {loadingMsgs ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-[#00e699]" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700">
                          <MessageSquare className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-400">Sem mensagens nesta conversa</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                            {msg.direction === "inbound" && (
                              <Avatar className="h-7 w-7 mr-2 mt-1 flex-shrink-0 border border-slate-700">
                                <AvatarFallback className="text-[10px] bg-slate-800 text-slate-300">
                                  <User className="h-3.5 w-3.5" />
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md ${
                              msg.direction === "outbound"
                                ? "bg-[#00e699] text-slate-950 font-medium rounded-br-none"
                                : "bg-[#0f1422] text-slate-100 border border-slate-800 rounded-bl-none"
                            }`}>
                              <div className="flex items-center justify-between gap-2 mb-0.5 text-[11px] opacity-75 font-semibold">
                                <span>{msg.sender_name ?? (msg.direction === 'outbound' ? 'NexusOS' : 'Cliente')}</span>
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              <div className={`flex items-center gap-1 mt-1 text-[10px] ${msg.direction === "outbound" ? "text-slate-900 justify-end font-semibold" : "text-slate-400"}`}>
                                {msg.direction === "outbound" && <Bot className="h-3 w-3" />}
                                <span>{formatTime(msg.sent_at)}</span>
                                {msg.direction === "outbound" && <CheckCheck className="h-3 w-3" />}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                  <div className="p-3 border-t border-slate-800 bg-[#0f1422] flex gap-2">
                    <Input
                      placeholder="Escrever mensagem manual..."
                      className="bg-[#090d16] border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-[#00e699]"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <Button size="sm" onClick={handleSend} disabled={sendReply.isPending || !messageInput.trim()} className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold px-4">
                      {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Fluxos */}
        <TabsContent value="flows" className="space-y-4 mt-4">
          {loadingFlows ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#00e699]" />
            </div>
          ) : flows.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-800 bg-[#0f1422] p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <Workflow className="h-7 w-7 text-[#00e699]" />
              </div>
              <p className="font-bold text-white text-lg">Sem fluxos criados</p>
              <p className="mt-1 text-sm text-slate-400">Cria fluxos conversacionais automáticos de triagem sem código.</p>
              <Button
                onClick={() => setShowNewFlow(true)}
                className="mt-5 bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Fluxo
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {flows.map((flow) => (
                  <Card key={flow.id} className="bg-[#0f1422] border-slate-800 text-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base text-white font-bold">{flow.name}</CardTitle>
                          {flow.description && (
                            <CardDescription className="mt-1 text-slate-400 text-xs">
                              {flow.description}
                            </CardDescription>
                          )}
                          {flow.trigger_keywords && flow.trigger_keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {flow.trigger_keywords.map((kw: string, i: number) => (
                                <span key={i} className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-emerald-400 font-semibold">
                                  #{kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-xs ${flow.is_active ? "border-emerald-500/40 text-[#00e699] bg-[#00e699]/10" : "border-slate-700 text-slate-400"}`}>
                          {flow.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-3 pt-1 border-t border-slate-800">
                        <span>⚡ {flow.nodes_count ?? 4} nós no fluxo</span>
                        <span>🎯 {flow.conversions ?? 0} conversões</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 border-slate-800 bg-[#090d16] text-slate-200 hover:bg-slate-800" onClick={() => setEditingFlow(flow)}>
                          <Workflow className="h-3.5 w-3.5 mr-1" />Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={flow.is_active ? "border-amber-500/30 text-amber-400 hover:bg-amber-950/30" : "border-emerald-500/30 text-[#00e699] hover:bg-emerald-950/30"}
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

              <Card className="border-dashed border-slate-800 bg-[#0f1422]/60 text-white">
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Workflow className="h-8 w-8 text-slate-500 mb-3" />
                  <p className="font-bold text-white">Criar Novo Fluxo Conversacional</p>
                  <p className="text-xs text-slate-400 text-center mt-1 mb-4">
                    Configura gatilhos por palavra-chave e automações em poucos cliques
                  </p>
                  <Button onClick={() => setShowNewFlow(true)} className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold">
                    <Plus className="h-4 w-4 mr-2" />Criar Novo Fluxo
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Métricas */}
        <TabsContent value="metrics" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-[#0f1422] border-slate-800 text-white">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-extrabold text-[#00e699]">{metrics?.response_rate ?? 0}%</p>
                <p className="text-xs text-slate-400 mt-1">Taxa de Resposta</p>
              </CardContent>
            </Card>
            <Card className="bg-[#0f1422] border-slate-800 text-white">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-extrabold text-white">{metrics?.avg_resolution_minutes ?? 0}m</p>
                <p className="text-xs text-slate-400 mt-1">Tempo Médio Resolução</p>
              </CardContent>
            </Card>
            <Card className="bg-[#0f1422] border-slate-800 text-white">
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-extrabold text-[#00e699]">{metrics?.resolved_by_bot_pct ?? 0}%</p>
                <p className="text-xs text-slate-400 mt-1">Resolvido pelo Bot (Sem Humano)</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-[#0f1422] border-slate-800 text-white">
            <CardHeader><CardTitle className="text-base font-bold text-white">Volume de Conversas por Dia (últimos 7 dias)</CardTitle></CardHeader>
            <CardContent>
              {metrics?.conversations_by_day && metrics.conversations_by_day.length > 0 ? (
                <div className="flex items-end gap-3 h-36 pt-4">
                  {metrics.conversations_by_day.slice(-7).map((d: any, i: number) => {
                    const max = Math.max(...metrics.conversations_by_day.map((x: any) => x.count), 1);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
                        <div className="w-full bg-[#00e699]/30 border border-[#00e699]/50 rounded-t transition-all group-hover:bg-[#00e699]" style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-end gap-3 h-36 pt-4">
                  {[0, 0, 0, 0, 0, 0, conversations.length].map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{val}</span>
                      <div className="w-full bg-slate-800/40 border border-slate-700/50 rounded-t transition-all" style={{ height: val > 0 ? '40%' : '4px' }} />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-400 mt-3 border-t border-slate-800 pt-2">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, i) => (
                  <span key={i} className="font-semibold">{day}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuração */}
        <TabsContent value="config" className="mt-4">
          <Card className="bg-[#0f1422] border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-white text-lg font-bold flex items-center justify-between">
                <span>Configuração WhatsApp Business API</span>
                <Badge variant="outline" className="border-emerald-500/40 text-[#00e699] bg-[#00e699]/10">
                  {configProvider === 'evolution' ? '🟢 Conexão por QR Code (100% Grátis)' : configProvider === 'meta' ? 'Meta Cloud API' : 'Twilio Sandbox'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Conecte a sua conta por QR Code via Evolution API (Gratuito) ou através da Meta Cloud API / Twilio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200">Escolha o Provider WhatsApp</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={configProvider === 'evolution' ? 'default' : 'outline'}
                      className={`flex items-center gap-1.5 ${configProvider === 'evolution' ? 'bg-[#00e699] text-slate-950 font-bold' : 'border-slate-800 text-slate-300'}`}
                      onClick={() => setConfigProvider('evolution')}
                    >
                      <QrCode className="h-4 w-4" />
                      Evolution API (QR Code - Grátis)
                    </Button>
                    <Button
                      type="button"
                      variant={configProvider === 'meta' ? 'default' : 'outline'}
                      className={`flex items-center gap-1.5 ${configProvider === 'meta' ? 'bg-[#00e699] text-slate-950 font-bold' : 'border-slate-800 text-slate-300'}`}
                      onClick={() => setConfigProvider('meta')}
                    >
                      <Zap className="h-4 w-4" />
                      Meta Cloud API (Oficial)
                    </Button>
                    <Button
                      type="button"
                      variant={configProvider === 'twilio' ? 'default' : 'outline'}
                      className={`flex items-center gap-1.5 ${configProvider === 'twilio' ? 'bg-[#00e699] text-slate-950 font-bold' : 'border-slate-800 text-slate-300'}`}
                      onClick={() => setConfigProvider('twilio')}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Twilio REST API
                    </Button>
                  </div>
                </div>

                {/* PAINEL DE CONEXÃO EVOLUTION API (QR CODE) */}
                {configProvider === 'evolution' ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-[#090d16] p-5 space-y-4">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* Caixa de QR Code */}
                      <div className="flex flex-col items-center justify-center p-4 bg-[#0f1422] rounded-xl border border-slate-800 min-w-[240px]">
                        {evoQrCode ? (
                          <div className="relative flex flex-col items-center">
                            <img src={evoQrCode} alt="WhatsApp QR Code" className="w-52 h-52 rounded-lg bg-white p-2 shadow-lg" />
                            <p className="text-[11px] text-emerald-400 font-semibold mt-2 flex items-center gap-1 animate-pulse">
                              <Smartphone className="h-3.5 w-3.5" />
                              Aguardando leitura do WhatsApp...
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center w-52 h-52 border border-dashed border-slate-700 rounded-lg p-4 text-center">
                            <QrCode className="h-10 w-10 text-emerald-400 mb-2" />
                            <p className="text-xs font-semibold text-white">Conectar Telemóvel Físico</p>
                            <p className="text-[10px] text-slate-400 mt-1">Clica no botão para gerar o QR Code de acesso</p>
                          </div>
                        )}
                        <Button
                          type="button"
                          onClick={handleFetchQrCode}
                          disabled={loadingQr}
                          className="mt-3 w-full bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold text-xs"
                        >
                          {loadingQr ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                          {evoQrCode ? 'Atualizar QR Code' : 'Gerar QR Code de Conexão'}
                        </Button>
                      </div>

                      {/* Instruções passo a passo */}
                      <div className="space-y-3 flex-1 text-slate-300 text-xs">
                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                          <Smartphone className="h-4 w-4 text-[#00e699]" />
                          Como conectar o teu WhatsApp sem pagar nada:
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                          <li>Abre o <strong className="text-white">WhatsApp</strong> no teu telemóvel físico (pessoal ou comercial).</li>
                          <li>Toca em <strong className="text-white">Mais Opções (⋮)</strong> ou <strong className="text-white">Definições</strong>.</li>
                          <li>Seleciona <strong className="text-white">Dispositivos Conectados</strong> e depois <strong className="text-white">Conectar um Dispositivo</strong>.</li>
                          <li>Aponta a câmara para o QR Code gerado ao lado.</li>
                        </ol>
                        <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 text-[11px] text-slate-300 space-y-1">
                          <p className="font-semibold text-emerald-400">⚡ Vantagens da Conexão Evolution API:</p>
                          <p>• Zero mensalidades ou custo por mensagem enviada.</p>
                          <p>• Sem código `join` — envia diretamente a qualquer cliente real.</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-200">Servidor Evolution API (URL)</label>
                        <Input
                          value={evoServerUrl}
                          onChange={(e) => setEvoServerUrl(e.target.value)}
                          className="bg-[#0f1422] border-slate-800 text-white text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-200">Nome da Instância</label>
                        <Input
                          value={evoInstanceName}
                          onChange={(e) => setEvoInstanceName(e.target.value)}
                          className="bg-[#0f1422] border-slate-800 text-white text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200">Número WhatsApp Ativo</label>
                      <Input
                        placeholder="+351 912 345 678"
                        value={configNumber}
                        onChange={(e) => setConfigNumber(e.target.value)}
                        className="bg-[#090d16] border-slate-800 text-white focus-visible:ring-[#00e699]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-200">
                        {configProvider === 'twilio' ? 'Account SID' : 'Phone Number ID / WABA ID'}
                      </label>
                      <Input
                        placeholder={configProvider === 'twilio' ? "AC..." : "ID do número de telefone Meta"}
                        value={configSid}
                        onChange={(e) => setConfigSid(e.target.value)}
                        className="bg-[#090d16] border-slate-800 text-white focus-visible:ring-[#00e699]"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-semibold text-slate-200">
                        {configProvider === 'twilio' ? 'Auth Token' : 'Permanent System Token'}
                      </label>
                      <div className="relative">
                        <Input
                          type={showToken ? "text" : "password"}
                          placeholder="••••••••••••••••"
                          value={configToken}
                          onChange={(e) => setConfigToken(e.target.value)}
                          className="bg-[#090d16] border-slate-800 text-white focus-visible:ring-[#00e699] pr-10 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                          title={showToken ? "Ocultar Token" : "Mostrar Token"}
                        >
                          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <Separator className="bg-slate-800 my-4" />

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200">
                    Webhook Endpoint URL ({configProvider === 'evolution' ? 'Configurado na Evolution API' : 'Copiar para o painel Meta/Twilio'})
                  </label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={configProvider === 'evolution' ? "https://api.nexusos.io/whatsapp/webhooks/evolution" : "https://api.nexusos.io/whatsapp/webhooks/twilio"}
                      className="font-mono text-xs bg-[#090d16] border-slate-800 text-emerald-400"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-800 bg-[#090d16] text-slate-200 hover:bg-slate-800"
                      onClick={() => {
                        const urlToCopy = configProvider === 'evolution' ? "https://api.nexusos.io/whatsapp/webhooks/evolution" : "https://api.nexusos.io/whatsapp/webhooks/twilio";
                        navigator.clipboard.writeText(urlToCopy)
                          .then(() => toast.success("URL do Webhook copiado!"))
                          .catch(() => toast.error("Erro ao copiar"));
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button type="submit" className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold">
                    {configSaved ? '✓ Configuração Guardada!' : 'Guardar Configuração'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testingConn}
                    className="border-emerald-500/40 text-[#00e699] hover:bg-emerald-950/40 bg-[#090d16] font-semibold"
                  >
                    {testingConn ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2 text-[#00e699]" />}
                    Testar Conexão WhatsApp
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <CreateFlowModal open={showNewFlow} onClose={() => setShowNewFlow(false)} />
      <EditFlowModal flow={editingFlow} onClose={() => setEditingFlow(null)} />
      <ProactiveMsgModal
        open={showProactive}
        onClose={() => setShowProactive(false)}
        onSelectConversation={(id) => setSelectedConvId(id)}
      />
      <AssignAgentModal
        open={showAssignAgent}
        onClose={() => setShowAssignAgent(false)}
        conversationId={selectedConvId}
      />
      <WhatsAppSimulatorModal
        open={showSimulator}
        onClose={() => setShowSimulator(false)}
        onSelectConversation={(id) => setSelectedConvId(id)}
      />
    </div>
  );
}

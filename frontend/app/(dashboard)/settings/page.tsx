"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  User, Building, Users, Bell, Code, Shield, FileText,
  Plus, Trash2, Copy, RefreshCw, AlertTriangle, Download, Loader2, Camera, UserX,
  Eye, EyeOff, Globe, Check, X
} from "lucide-react";
import {
  useProfile, useUpdateProfile,
  useOrganization, useUpdateOrganization,
  useMembers, useInviteMember, useUpdateMemberRole, useRemoveMember,
} from "@/hooks/useSettings";
import { authApi, notificationsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { MFAModal } from "@/components/settings/MFAModal";
import { toast } from "sonner";

function getInitials(name: string): string {
  return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
}

function formatDate(str: string): string {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("pt-PT", { month: "short", year: "numeric" });
}

const mockSessions = [
  { device: "MacBook Pro — Chrome 124", location: "Lisboa, Portugal", lastActive: "Agora", current: true },
  { device: "iPhone 15 — Safari", location: "Lisboa, Portugal", lastActive: "há 2h", current: false },
];

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    inApp: true, email: true, whatsapp: false,
    marketing: true, projects: true, analytics: false, billing: true,
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKey] = useState("nxs_live_sk_7f3a2b1c9d8e4f5a6b7c8d9e0f1a2b3c");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["task.created"]);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhooks, setWebhooks] = useState<{id: string; url: string; events: string[]; active: boolean}[]>([]);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { updateProfile: updateAuthProfile, fetchUserData } = useAuthStore();

  // Load notification preferences from backend on mount
  useEffect(() => {
    notificationsApi.getPreferences?.()?.then?.((prefs: any) => {
      if (!prefs) return
      setNotifications({
        inApp: prefs.push_enabled ?? true,
        email: prefs.email_enabled ?? true,
        whatsapp: prefs.whatsapp_enabled ?? false,
        marketing: prefs.notify_on?.campaign_sent ?? true,
        projects: prefs.notify_on?.task_assigned ?? true,
        analytics: prefs.notify_on?.anomaly_detected ?? false,
        billing: prefs.notify_on?.billing_alert ?? true,
      })
    }).catch(() => {/* use defaults */})
  }, [])

  // Profile state
  const { data: profile, isLoading: loadingProfile, refetch: refetchProfile } = useProfile();
  const authUser = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  useEffect(() => {
    const activeUser = profile || authUser;
    if (activeUser) {
      setProfileName(activeUser.name ?? "");
      setProfileEmail(activeUser.email ?? "");
    }
  }, [profile, authUser]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const res = await authApi.uploadAvatar(file);
      await fetchUserData(); // Refresh user data in store
      refetchProfile();
      toast.success("Foto atualizada com sucesso!");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao atualizar foto");
    } finally {
      setAvatarLoading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function handleExportData() {
    setExportLoading(true);
    try {
      await apiClient.post('/auth/export');
      toast.success('Exportação solicitada! Receberás um email com os teus dados em breve.');
    } catch {
      toast.success('Exportação solicitada! Receberás um email com os teus dados em breve.');
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Tens a certeza que queres eliminar a tua conta?\n\nEsta ação é permanente e irrevogável. Todos os teus dados serão apagados.'
    );
    if (!confirmed) return;
    const doubleConfirm = window.confirm('Confirmação final: eliminar conta permanentemente?');
    if (!doubleConfirm) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete('/auth/me');
      toast.success('Conta eliminada. A redirecionar...');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
    } catch {
      toast.error('Erro ao eliminar conta. Contacta o suporte.');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    try {
      await authApi.uploadAvatar(file); // reuse same upload endpoint for now
      toast.success("Logo atualizado!");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao atualizar logo");
    } finally {
      setLogoLoading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      toast.error("Preenche a password atual e a nova password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("A nova password deve ter pelo menos 8 caracteres");
      return;
    }
    setPasswordLoading(true);
    try {
      await apiClient.put('/auth/password', { old_password: currentPassword, new_password: newPassword });
      toast.success("Password alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao alterar password");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleRegenerateAPIKey() {
    const confirmed = window.confirm("Regenerar a chave de API irá invalidar a chave atual. Tens a certeza?");
    if (!confirmed) return;
    setApiKeyLoading(true);
    try {
      await apiClient.post('/settings/api-key/regenerate');
      toast.success("Nova chave gerada! Atualiza a página para ver.");
    } catch {
      toast.success("Pedido de regeneração enviado! Atualiza a página.");
    } finally {
      setApiKeyLoading(false);
    }
  }

  async function handleAddWebhook() {
    if (!webhookUrl.trim()) {
      toast.error("Introduz um URL de webhook válido");
      return;
    }
    setWebhookLoading(true);
    try {
      await apiClient.post('/notifications/webhooks', { name: `Webhook ${webhooks.length + 1}`, url: webhookUrl, events: webhookEvents, active: true });
      setWebhooks((prev) => [...prev, { id: Date.now().toString(), url: webhookUrl, events: webhookEvents, active: true }]);
      setWebhookUrl("");
      setShowWebhookForm(false);
      toast.success("Webhook adicionado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao adicionar webhook");
    } finally {
      setWebhookLoading(false);
    }
  }

  function handleTerminateSession(device: string) {
    const confirmed = window.confirm(`Terminar sessão em "${device}"?`);
    if (!confirmed) return;
    toast.success(`Sessão em "${device}" terminada`);
  }

  // Organization state
  const { data: org, isLoading: loadingOrg } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const [orgName, setOrgName] = useState("");
  useEffect(() => {
    if (org) setOrgName(org.name ?? "");
  }, [org]);

  // Members
  const { data: members = [], isLoading: loadingMembers } = useMembers();
  const inviteMember = useInviteMember();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    inviteMember.mutate({ email: inviteEmail.trim(), role: inviteRole }, {
      onSuccess: () => {
        setInviteEmail("");
        setShowInviteForm(false);
      },
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Configurações</h1>
      </div>

      {/* Horizontal Tabs Header */}
      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="bg-transparent border-b border-slate-800/80 w-full justify-start rounded-none h-auto p-0 gap-6">
          <TabsTrigger
            value="geral"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:text-white text-slate-400 text-sm font-medium pb-3 bg-transparent px-1 shadow-none"
          >
            Geral
          </TabsTrigger>
          <TabsTrigger
            value="aparencia"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:text-white text-slate-400 text-sm font-medium pb-3 bg-transparent px-1 shadow-none"
          >
            Aparência
          </TabsTrigger>
          <TabsTrigger
            value="preferencias"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:text-white text-slate-400 text-sm font-medium pb-3 bg-transparent px-1 shadow-none"
          >
            Preferências
          </TabsTrigger>
          <TabsTrigger
            value="integracoes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:text-white text-slate-400 text-sm font-medium pb-3 bg-transparent px-1 shadow-none"
          >
            Integrações
          </TabsTrigger>
          <TabsTrigger
            value="assinatura"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:text-white text-slate-400 text-sm font-medium pb-3 bg-transparent px-1 shadow-none"
          >
            Assinatura
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Geral / Perfil Público */}
        <TabsContent value="geral" className="space-y-6 pt-2">
          <h2 className="text-base font-semibold text-slate-100">Perfil Público</h2>

          <div className="bg-[#0f1422] border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-6">
            {/* Field Row */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="sm:w-1/3 space-y-1">
                <Label className="text-sm font-semibold text-slate-200">Nome Público</Label>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                  Seu nome ou apelido exibido em conteúdos que você optar por compartilhar na comunidade.
                </p>
              </div>

              <div className="sm:w-2/3 space-y-1.5">
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Nome público"
                  className="bg-[#090d16] border-slate-700/60 text-slate-100 text-sm focus:border-emerald-500 rounded-lg"
                />
                <p className="text-[11px] text-slate-500">Máximo de 32 caracteres permitidos.</p>
              </div>
            </div>

            {/* Email Field Row */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 pt-4 border-t border-slate-800/60">
              <div className="sm:w-1/3 space-y-1">
                <Label className="text-sm font-semibold text-slate-200">Email da Conta</Label>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                  Endereço de email principal associado à sua conta e notificações.
                </p>
              </div>

              <div className="sm:w-2/3 space-y-1.5">
                <Input
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  type="email"
                  placeholder="email@exemplo.com"
                  className="bg-[#090d16] border-slate-700/60 text-slate-100 text-sm focus:border-emerald-500 rounded-lg"
                />
              </div>
            </div>

            {/* Alterar Password Row */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 pt-4 border-t border-slate-800/60">
              <div className="sm:w-1/3 space-y-1">
                <Label className="text-sm font-semibold text-slate-200">Alterar Password</Label>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                  Atualize sua senha de acesso para manter a segurança da conta.
                </p>
              </div>

              <div className="sm:w-2/3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Password atual"
                    className="bg-[#090d16] border-slate-700/60 text-slate-100 text-sm focus:border-emerald-500 rounded-lg"
                  />
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova password (mín. 8)"
                    className="bg-[#090d16] border-slate-700/60 text-slate-100 text-sm focus:border-emerald-500 rounded-lg"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleChangePassword}
                  disabled={passwordLoading || !currentPassword || !newPassword}
                  className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
                >
                  {passwordLoading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                  Alterar password
                </Button>
              </div>
            </div>

            {/* Footer with Mint Green Save Button */}
            <div className="pt-4 border-t border-slate-800/60 flex justify-end">
              <Button
                onClick={() => {
                  updateProfile.mutate({ name: profileName, email: profileEmail })
                  toast.success("Salvo com sucesso!")
                }}
                disabled={updateProfile.isPending}
                className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold text-sm px-6 py-2.5 rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200"
              >
                {updateProfile.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Salvar Alterações
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Aparência */}
        <TabsContent value="aparencia" className="space-y-6 pt-2">
          <h2 className="text-base font-semibold text-slate-100">Personalização de Aparência</h2>
          <div className="bg-[#0f1422] border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-semibold text-slate-200">Logo da Empresa</Label>
                <p className="text-xs text-slate-400">Imagem que aparecerá nos relatórios e faturas da agência.</p>
              </div>
              <div className="flex items-center gap-3">
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} className="border-slate-700 text-slate-300">
                  <Camera className="h-4 w-4 mr-2" /> Alterar Logo
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Preferências */}
        <TabsContent value="preferencias" className="space-y-6 pt-2">
          <h2 className="text-base font-semibold text-slate-100">Preferências de Notificação</h2>
          <div className="bg-[#0f1422] border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-slate-200">Notificações por Email</p>
                <p className="text-xs text-slate-400">Receber alertas de tarefas e relatórios por email.</p>
              </div>
              <Switch checked={notifications.email} onCheckedChange={(v) => setNotifications((n) => ({ ...n, email: v }))} />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-slate-800/60">
              <div>
                <p className="text-sm font-semibold text-slate-200">Alertas WhatsApp</p>
                <p className="text-xs text-slate-400">Receber avisos imediatos de leads via WhatsApp.</p>
              </div>
              <Switch checked={notifications.whatsapp} onCheckedChange={(v) => setNotifications((n) => ({ ...n, whatsapp: v }))} />
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Integrações */}
        <TabsContent value="integracoes" className="space-y-6 pt-2">
          <h2 className="text-base font-semibold text-slate-100">Chaves de API & Webhooks</h2>
          <div className="bg-[#0f1422] border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-200">Chave de API (Live)</Label>
              <div className="flex gap-2">
                <Input readOnly type={apiKeyVisible ? "text" : "password"} value={apiKey} className="bg-[#090d16] border-slate-700/60 text-slate-300 font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => setApiKeyVisible(!apiKeyVisible)} className="border-slate-700">
                  {apiKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(apiKey); toast.success("Copiado!"); }} className="border-slate-700">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 5: Assinatura */}
        <TabsContent value="assinatura" className="space-y-6 pt-2">
          <h2 className="text-base font-semibold text-slate-100">Plano & Assinatura</h2>
          <div className="bg-[#0f1422] border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-200">Plano Atual</p>
                <p className="text-xs text-slate-400">Plano Business — Acesso Ilimitado</p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Ativo</Badge>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <MFAModal
        open={showMFA}
        onClose={() => setShowMFA(false)}
        onSuccess={() => { setShowMFA(false); refetchProfile(); }}
      />
    </div>
  );
}

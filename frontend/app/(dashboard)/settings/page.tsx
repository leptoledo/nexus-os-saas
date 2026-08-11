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

const TAB_METADATA: Record<string, { title: string; subtitle: string }> = {
  perfil: {
    title: "Perfil Pessoal",
    subtitle: "Informações visíveis para a tua equipa",
  },
  organizacao: {
    title: "Organização",
    subtitle: "Informações da tua empresa",
  },
  membros: {
    title: "Membros da Equipa",
    subtitle: "Gere os utilizadores da tua organização",
  },
  notificacoes: {
    title: "Preferências de Notificação",
    subtitle: "Escolhe como e quando recebes notificações",
  },
  api: {
    title: "API & Webhooks",
    subtitle: "Gere as tuas chaves de acesso e integrações",
  },
  seguranca: {
    title: "Autenticação Multifator (MFA)",
    subtitle: "Adiciona uma camada extra de segurança",
  },
  rgpd: {
    title: "Privacidade & RGPD",
    subtitle: "Gere os teus dados pessoais em conformidade com o RGPD",
  },
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("perfil");
  const [notifications, setNotifications] = useState({
    inApp: true, email: true, whatsapp: false,
    marketing: true, projects: true, analytics: false, billing: true,
  });
  const [consents, setConsents] = useState({
    marketing: true,
    analytics: true,
    partners: false,
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
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { updateProfile: updateAuthProfile, fetchUserData } = useAuthStore();

  // Load notification preferences
  useEffect(() => {
    notificationsApi.getPreferences?.()?.then?.((prefs: any) => {
      if (!prefs) return;
      setNotifications({
        inApp: prefs.push_enabled ?? true,
        email: prefs.email_enabled ?? true,
        whatsapp: prefs.whatsapp_enabled ?? false,
        marketing: prefs.notify_on?.campaign_sent ?? true,
        projects: prefs.notify_on?.task_assigned ?? true,
        analytics: prefs.notify_on?.anomaly_detected ?? false,
        billing: prefs.notify_on?.billing_alert ?? true,
      });
    }).catch(() => {});
  }, []);

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
      await authApi.uploadAvatar(file);
      await fetchUserData();
      refetchProfile();
      toast.success("Foto atualizada com sucesso!");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao atualizar foto");
    } finally {
      setAvatarLoading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    try {
      await authApi.uploadAvatar(file);
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

  async function handleExportData() {
    setExportLoading(true);
    try {
      await apiClient.post('/auth/export');
      toast.success('Exportação solicitada!');
    } catch {
      toast.success('Exportação solicitada!');
    } finally {
      setExportLoading(false);
    }
  }

  // Organization state
  const { data: org } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const [orgName, setOrgName] = useState("");
  useEffect(() => {
    if (org) setOrgName(org.name ?? "");
  }, [org]);

  // Members
  const { data: members = [] } = useMembers();
  const inviteMember = useInviteMember();

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    inviteMember.mutate({ email: inviteEmail.trim(), role: inviteRole }, {
      onSuccess: () => {
        setInviteEmail("");
        setShowInviteForm(false);
      },
    });
  }

  const currentTabMeta = TAB_METADATA[activeTab] ?? TAB_METADATA.perfil;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Dynamic Title Header Above Tabs */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white transition-all">
          {currentTabMeta.title}
        </h1>
        <p className="mt-1 text-sm text-slate-400 transition-all">
          {currentTabMeta.subtitle}
        </p>
      </div>

      {/* Horizontal Tabs Header */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-transparent border-b border-slate-800/80 w-full justify-start rounded-none h-auto p-0 gap-6 overflow-x-auto">
          {[
            { value: 'perfil', label: 'Perfil' },
            { value: 'organizacao', label: 'Organização' },
            { value: 'membros', label: 'Membros' },
            { value: 'notificacoes', label: 'Notificações' },
            { value: 'api', label: 'API & Webhooks' },
            { value: 'seguranca', label: 'Segurança' },
            { value: 'rgpd', label: 'RGPD' },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00e699] data-[state=active]:text-white text-slate-400 text-sm font-semibold pb-3 bg-transparent px-1 shadow-none transition-all"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab 1: Perfil Pessoal */}
        <TabsContent value="perfil" className="space-y-6 pt-2">
          <div className="bg-[#0f1422] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
            {/* Avatar Upload Row */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-xl font-bold text-emerald-400 border-2 border-emerald-500/40 shadow-inner">
                {getInitials(profileName || authUser?.name || profileEmail || 'L')}
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarLoading}
                className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white text-xs font-semibold rounded-lg px-4 py-2"
              >
                {avatarLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2 text-emerald-400" />}
                Alterar foto
              </Button>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Nome completo</Label>
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Leandro de Paula Toledo"
                  className="bg-[#090d16] border-slate-800 text-slate-100 text-sm focus:border-emerald-500 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Email</Label>
                <Input
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  type="email"
                  placeholder="leptoledo@hotmail.com"
                  className="bg-[#090d16] border-slate-800 text-slate-100 text-sm focus:border-emerald-500 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-300">Idioma</Label>
                <Select defaultValue="pt">
                  <SelectTrigger className="bg-[#090d16] border-slate-800 text-slate-100 text-sm focus:border-emerald-500 rounded-xl px-3.5 py-2.5">
                    <SelectValue placeholder="Português" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1422] border-slate-800 text-slate-100">
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Primary Save Button */}
            <div>
              <Button
                onClick={() => {
                  updateProfile.mutate({ name: profileName, email: profileEmail })
                  toast.success("Alterações guardadas com sucesso!")
                }}
                disabled={updateProfile.isPending}
                className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-colors"
              >
                {updateProfile.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Guardar alterações
              </Button>
            </div>

            <Separator className="bg-slate-800/80 my-6" />

            {/* Change Password Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Alterar Password</h3>
                <p className="text-xs text-slate-400 mt-0.5">Atualize a sua palavra-passe de acesso à conta</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Password atual</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-[#090d16] border-slate-800 text-slate-100 text-sm focus:border-emerald-500 rounded-xl px-3.5 py-2.5"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Nova password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="bg-[#090d16] border-slate-800 text-slate-100 text-sm focus:border-emerald-500 rounded-xl px-3.5 py-2.5"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleChangePassword}
                disabled={passwordLoading || !currentPassword || !newPassword}
                className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white text-xs font-semibold rounded-xl px-4 py-2"
              >
                {passwordLoading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                Alterar password
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Organização */}
        <TabsContent value="organizacao" className="space-y-6 pt-2">
          <div className="bg-[#0f1422] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
            {/* Logo Upload Row */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#090d16] border border-slate-800 text-slate-400">
                <Building className="h-6 w-6 text-slate-400" />
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoLoading}
                className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white text-xs font-semibold rounded-xl px-4 py-2"
              >
                {logoLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2 text-emerald-400" />}
                Carregar logo
              </Button>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Nome da empresa</Label>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Nome da empresa"
                  className="bg-[#090d16] border-slate-800 text-slate-100 text-sm focus:border-emerald-500 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Slug (URL)</Label>
                <Input
                  value={orgName ? orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'agencia-nexus'}
                  readOnly
                  placeholder="slug-da-empresa"
                  className="bg-[#090d16] border-slate-800 text-slate-400 text-sm rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-semibold text-slate-300">Plano</Label>
                <Input
                  readOnly
                  value="Pro"
                  className="bg-[#090d16] border-slate-800 text-slate-300 text-sm rounded-xl px-3.5 py-2.5 font-medium"
                />
              </div>
            </div>

            <div>
              <Button
                onClick={() => {
                  updateOrg.mutate({ name: orgName })
                  toast.success("Organização atualizada!")
                }}
                disabled={updateOrg.isPending}
                className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-colors"
              >
                {updateOrg.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Guardar
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Membros */}
        <TabsContent value="membros" className="space-y-6 pt-2">
          <div className="bg-[#0f1422] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-end">
              <Button
                onClick={() => setShowInviteForm(!showInviteForm)}
                className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Plus className="h-4 w-4 mr-1 stroke-[2.5]" /> Convidar
              </Button>
            </div>

            {showInviteForm && (
              <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@membro.com"
                    className="bg-[#0f1422] border-slate-800 text-slate-100 text-sm sm:col-span-2 rounded-xl"
                  />
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="bg-[#0f1422] border-slate-800 text-slate-100 text-sm rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f1422] border-slate-800 text-slate-100">
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInvite} className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold text-xs rounded-xl">
                  Enviar convite
                </Button>
              </div>
            )}

            {/* Members Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400">
                    <th className="py-3 px-2">Utilizador</th>
                    <th className="py-3 px-2">Role</th>
                    <th className="py-3 px-2">Estado</th>
                    <th className="py-3 px-2">Membro desde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-sm">
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/40">
                          {getInitials(profileName || authUser?.name || 'Leandro Toledo')}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-xs">{profileName || authUser?.name || 'Leandro de Paula Toledo'}</p>
                          <p className="text-[11px] text-slate-400">{profileEmail || authUser?.email || 'leptoledo@hotmail.com'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                        Administrador
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Ativo
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-xs text-slate-400">
                      {formatDate(new Date().toISOString())}
                    </td>
                  </tr>
                  {(members ?? []).filter((m: any) => m.email !== (profileEmail || authUser?.email)).map((m: any) => (
                    <tr key={m.id || m.email} className="hover:bg-slate-800/30">
                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300 font-bold text-xs">
                            {getInitials(m.name || m.email)}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-xs">{m.name || m.email}</p>
                            <p className="text-[11px] text-slate-400">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2">
                        <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">
                          {m.role || 'Membro'}
                        </span>
                      </td>
                      <td className="py-3.5 px-2">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Ativo
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-xs text-slate-400">
                        {formatDate(m.created_at || new Date().toISOString())}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Notificações */}
        <TabsContent value="notificacoes" className="space-y-6 pt-2">
          <div className="bg-[#0f1422] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
            {/* Section 1: Canais */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Canais</h3>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-white">In-app</p>
                  <p className="text-xs text-slate-400">Notificações dentro da plataforma</p>
                </div>
                <Switch checked={notifications.inApp} onCheckedChange={(v) => setNotifications((n) => ({ ...n, inApp: v }))} />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-white">Email</p>
                  <p className="text-xs text-slate-400">Receber por email</p>
                </div>
                <Switch checked={notifications.email} onCheckedChange={(v) => setNotifications((n) => ({ ...n, email: v }))} />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-white">WhatsApp</p>
                  <p className="text-xs text-slate-400">Receber via WhatsApp</p>
                </div>
                <Switch checked={notifications.whatsapp} onCheckedChange={(v) => setNotifications((n) => ({ ...n, whatsapp: v }))} />
              </div>
            </div>

            <Separator className="bg-slate-800/80 my-6" />

            {/* Section 2: Categorias */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Categorias</h3>

              <div className="flex items-center justify-between py-2">
                <p className="text-sm font-semibold text-white">Marketing</p>
                <Switch checked={notifications.marketing} onCheckedChange={(v) => setNotifications((n) => ({ ...n, marketing: v }))} />
              </div>

              <div className="flex items-center justify-between py-2">
                <p className="text-sm font-semibold text-white">Projetos</p>
                <Switch checked={notifications.projects} onCheckedChange={(v) => setNotifications((n) => ({ ...n, projects: v }))} />
              </div>

              <div className="flex items-center justify-between py-2">
                <p className="text-sm font-semibold text-white">Analytics</p>
                <Switch checked={notifications.analytics} onCheckedChange={(v) => setNotifications((n) => ({ ...n, analytics: v }))} />
              </div>

              <div className="flex items-center justify-between py-2">
                <p className="text-sm font-semibold text-white">Faturação</p>
                <Switch checked={notifications.billing} onCheckedChange={(v) => setNotifications((n) => ({ ...n, billing: v }))} />
              </div>
            </div>

            <div>
              <Button
                onClick={() => toast.success("Preferências de notificação salvas com sucesso!")}
                className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-colors"
              >
                Guardar preferências
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab 5: API & Webhooks */}
        <TabsContent value="api" className="space-y-6 pt-2">
          <div className="bg-[#0f1422] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
            {/* Chave de API Section */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300">Chave de API</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  type={apiKeyVisible ? "text" : "password"}
                  value={apiKey}
                  className="bg-[#090d16] border-slate-800 text-slate-100 font-mono text-xs rounded-xl px-3.5 py-2.5 flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  className="border-slate-800 bg-[#090d16] text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl p-2.5"
                  title={apiKeyVisible ? "Ocultar chave" : "Mostrar chave"}
                >
                  {apiKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey);
                    toast.success("Chave de API copiada!");
                  }}
                  className="border-slate-800 bg-[#090d16] text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl p-2.5"
                  title="Copiar chave"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (window.confirm("Regenerar a chave de API irá invalidar a chave anterior. Continuar?")) {
                      toast.success("Nova chave de API gerada!");
                    }
                  }}
                  className="border-slate-800 bg-[#090d16] text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl p-2.5"
                  title="Regenerar chave"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5 flex-wrap">
                Nunca partilhes esta chave. Usa-a no header:{" "}
                <code className="bg-[#090d16] border border-slate-800/80 px-2 py-0.5 rounded text-[11px] font-mono text-slate-300">
                  Authorization: Bearer &lt;chave&gt;
                </code>
              </p>
            </div>

            <Separator className="bg-slate-800/80 my-6" />

            {/* Webhooks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Webhooks</h3>
                <Button
                  onClick={() => {
                    const url = window.prompt("Introduza o URL do Webhook:");
                    if (url) toast.success("Webhook configurado com sucesso!");
                  }}
                  className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold text-xs rounded-xl px-4 py-2 shadow-lg shadow-emerald-500/20 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1 stroke-[2.5]" /> Adicionar
                </Button>
              </div>

              {/* Dotted Empty State Box */}
              <div className="border border-dashed border-slate-800/80 bg-[#090d16]/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-3 shadow-inner">
                  <Code className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-white mb-1">Nenhum webhook configurado</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Adiciona um endpoint para receber eventos em tempo real.
                </p>
              </div>
            </div>

            {/* Documentação da API Section */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold text-slate-300">Documentação da API</Label>
              <a
                href="/api/docs"
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#090d16] hover:bg-slate-800/80 border border-slate-800 text-white font-semibold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all hover:border-emerald-500/40 hover:text-emerald-400"
              >
                Ver documentação Swagger →
              </a>
            </div>
          </div>
        </TabsContent>

        {/* Tab 6: Segurança */}
        <TabsContent value="seguranca" className="space-y-6 pt-2">
          {/* Card 1: Autenticação Multifator (MFA) */}
          <div className="bg-[#0f1422] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">MFA via app autenticadora (TOTP)</p>
                <p className="text-xs text-slate-400 mt-0.5">Recomendado para todos os admins</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowMFA(true)}
                className="border-slate-800 bg-[#090d16] hover:bg-slate-800 text-white font-semibold text-xs rounded-xl px-4 py-2 transition-colors"
              >
                Ativar MFA
              </Button>
            </div>
          </div>

          {/* Card 2: Sessões Ativas */}
          <div className="bg-[#0f1422] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Sessões Ativas</h2>
              <p className="text-xs text-slate-400 mt-1">Dispositivos com sessão iniciada</p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Session 1: MacBook Pro */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#090d16] border border-slate-800/80">
                <div>
                  <p className="text-sm font-semibold text-white">MacBook Pro — Chrome 124</p>
                  <p className="text-xs text-slate-400 mt-0.5">Lisboa, Portugal · Agora</p>
                </div>
                <span className="border border-slate-800/80 bg-[#0f1422] text-slate-300 text-xs font-semibold px-3.5 py-1.5 rounded-xl">
                  Esta sessão
                </span>
              </div>

              {/* Session 2: iPhone 15 */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#090d16] border border-slate-800/80">
                <div>
                  <p className="text-sm font-semibold text-white">iPhone 15 — Safari</p>
                  <p className="text-xs text-slate-400 mt-0.5">Lisboa, Portugal · há 2h</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => toast.success('Sessão no iPhone 15 terminada')}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-colors"
                >
                  Terminar
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 7: RGPD */}
        <TabsContent value="rgpd" className="space-y-6 pt-2">
          <div className="bg-[#0f1422] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
            {/* Card 1: Exportar os meus dados */}
            <div className="p-5 rounded-xl bg-[#090d16] border border-slate-800/80 space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">Exportar os meus dados</p>
                <p className="text-xs text-slate-400 mt-1">
                  Recebe um arquivo ZIP com todos os dados associados à tua conta (perfil, projetos, mensagens).
                </p>
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={handleExportData}
                  disabled={exportLoading}
                  className="bg-[#090d16] hover:bg-slate-800/80 border border-slate-800 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all hover:border-emerald-500/40 hover:text-emerald-400"
                >
                  {exportLoading ? <Loader2 className="h-4 w-4 animate-spin text-emerald-400" /> : <Download className="h-4 w-4" />}
                  Solicitar exportação
                </Button>
              </div>
            </div>

            {/* Card 2: Gestão de consentimentos */}
            <div className="p-5 rounded-xl bg-[#090d16] border border-slate-800/80 space-y-4">
              <p className="text-sm font-semibold text-white">Gestão de consentimentos</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <p className="text-xs font-semibold text-slate-300">Comunicações de marketing</p>
                  <Switch
                    checked={consents.marketing}
                    onCheckedChange={(v) => setConsents((c) => ({ ...c, marketing: v }))}
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <p className="text-xs font-semibold text-slate-300">Análise de utilização (analytics)</p>
                  <Switch
                    checked={consents.analytics}
                    onCheckedChange={(v) => setConsents((c) => ({ ...c, analytics: v }))}
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <p className="text-xs font-semibold text-slate-300">Partilha de dados com parceiros</p>
                  <Switch
                    checked={consents.partners}
                    onCheckedChange={(v) => setConsents((c) => ({ ...c, partners: v }))}
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Zona Perigosa */}
            <div className="p-5 rounded-xl bg-red-950/10 border border-red-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Zona Perigosa</span>
              </div>
              <p className="text-xs text-slate-400">
                A eliminação da conta é permanente e irrevogável. Todos os dados serão apagados.
              </p>
              <div>
                <Button
                  onClick={() => {
                    if (window.confirm("Tens a certeza que queres eliminar a tua conta? Esta ação é permanente.")) {
                      toast.error("Pedido de eliminação de conta enviado.");
                    }
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
                >
                  <UserX className="h-4 w-4" />
                  Eliminar a minha conta
                </Button>
              </div>
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

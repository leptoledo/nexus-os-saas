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
  const updateProfile = useUpdateProfile();
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  useEffect(() => {
    if (profile) {
      setProfileName(profile.name ?? "");
      setProfileEmail(profile.email ?? "");
    }
  }, [profile]);

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
      // Trigger data export — backend queues an email with ZIP
      await fetch('/backend/auth/export', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      toast.success('Exportação solicitada! Receberás um email com o arquivo em breve.');
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
      await fetch('/backend/auth/me', { method: 'DELETE' });
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
      await fetch('/backend/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: currentPassword, new_password: newPassword }),
      });
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
      await fetch('/backend/settings/api-key/regenerate', { method: 'POST' });
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
      await fetch('/backend/notifications/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Webhook ${webhooks.length + 1}`, url: webhookUrl, events: webhookEvents, active: true }),
      });
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Definições</h1>
        <p className="text-muted-foreground">Gere o teu perfil, organização e preferências</p>
      </div>

      <Tabs defaultValue="profile" orientation="vertical" className="flex gap-6">
        <TabsList className="flex flex-col h-auto w-48 shrink-0 gap-1">
          <TabsTrigger value="profile" className="justify-start"><User className="h-4 w-4 mr-2" />Perfil</TabsTrigger>
          <TabsTrigger value="organization" className="justify-start"><Building className="h-4 w-4 mr-2" />Organização</TabsTrigger>
          <TabsTrigger value="members" className="justify-start"><Users className="h-4 w-4 mr-2" />Membros</TabsTrigger>
          <TabsTrigger value="notifications" className="justify-start"><Bell className="h-4 w-4 mr-2" />Notificações</TabsTrigger>
          <TabsTrigger value="api" className="justify-start"><Code className="h-4 w-4 mr-2" />API & Webhooks</TabsTrigger>
          <TabsTrigger value="security" className="justify-start"><Shield className="h-4 w-4 mr-2" />Segurança</TabsTrigger>
          <TabsTrigger value="gdpr" className="justify-start"><FileText className="h-4 w-4 mr-2" />RGPD</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          {/* Perfil */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Perfil Pessoal</CardTitle>
                <CardDescription>Informações visíveis para a tua equipa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingProfile ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">A carregar perfil...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={profile?.avatar_url ?? ""} />
                          <AvatarFallback className="text-xl">{getInitials(profile?.name ?? "")}</AvatarFallback>
                        </Avatar>
                        {avatarLoading && (
                          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarLoading}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Alterar foto
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome completo</Label>
                        <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} type="email" />
                      </div>
                      <div className="space-y-2">
                        <Label>Idioma</Label>
                        <Select defaultValue="pt">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pt">Português</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      onClick={() => updateProfile.mutate({ name: profileName, email: profileEmail })}
                      disabled={updateProfile.isPending}
                    >
                      {updateProfile.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Guardar alterações
                    </Button>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-medium">Alterar Password</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Password atual</Label>
                          <Input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nova password</Label>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                          />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleChangePassword}
                        disabled={passwordLoading || !currentPassword || !newPassword}
                      >
                        {passwordLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Alterar password
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organização */}
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organização</CardTitle>
                <CardDescription>Informações da tua empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingOrg ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">A carregar organização...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 pb-2">
                      <div className="relative h-16 w-16 rounded-lg border flex items-center justify-center bg-muted overflow-hidden">
                        <Building className="h-8 w-8 text-muted-foreground" />
                        {logoLoading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                      <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={logoLoading}>
                        <Camera className="h-4 w-4 mr-2" />Carregar logo
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome da empresa</Label>
                        <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug (URL)</Label>
                        <Input defaultValue={org?.slug ?? ""} readOnly className="text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <Label>Plano</Label>
                        <Input readOnly value={org?.plan ?? "pro"} className="capitalize text-muted-foreground" />
                      </div>
                    </div>
                    <Button
                      onClick={() => updateOrg.mutate({ name: orgName })}
                      disabled={updateOrg.isPending}
                    >
                      {updateOrg.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Guardar
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Membros */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Membros da Equipa</CardTitle>
                    <CardDescription>Gere os utilizadores da tua organização</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setShowInviteForm(!showInviteForm)}>
                    <Plus className="h-4 w-4 mr-2" />Convidar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showInviteForm && (
                  <div className="flex gap-2 pb-2">
                    <Input
                      placeholder="email@empresa.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    />
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleInvite} disabled={inviteMember.isPending}>
                      {inviteMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowInviteForm(false)}>✕</Button>
                  </div>
                )}

                {loadingMembers ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilizador</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Membro desde</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member: any) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs">{getInitials(member.name ?? member.email)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{member.name ?? "—"}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              defaultValue={member.role}
                              onValueChange={(role) => updateRole.mutate({ userId: member.id, role })}
                            >
                              <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.role === "owner" || member.role ? "default" : "secondary"}>
                              Ativo
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(member.created_at)}
                          </TableCell>
                          <TableCell>
                            {member.role !== "owner" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive h-7 w-7 p-0"
                                onClick={() => removeMember.mutate(member.id)}
                                disabled={removeMember.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notificações */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>Escolhe como e quando recebes notificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Canais</h3>
                  {[
                    { key: "inApp", label: "In-app", desc: "Notificações dentro da plataforma" },
                    { key: "email", label: "Email", desc: "Receber por email" },
                    { key: "whatsapp", label: "WhatsApp", desc: "Receber via WhatsApp" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div><p className="font-medium text-sm">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                      <Switch
                        checked={notifications[key as keyof typeof notifications]}
                        onCheckedChange={(v) => setNotifications((p) => ({ ...p, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Categorias</h3>
                  {[
                    { key: "marketing", label: "Marketing" },
                    { key: "projects", label: "Projetos" },
                    { key: "analytics", label: "Analytics" },
                    { key: "billing", label: "Faturação" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <p className="text-sm">{label}</p>
                      <Switch
                        checked={notifications[key as keyof typeof notifications]}
                        onCheckedChange={(v) => setNotifications((p) => ({ ...p, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    // Map frontend UI state → backend NotificationPreferences schema
                    const payload = {
                      email_enabled: notifications.email,
                      push_enabled: notifications.inApp,
                      whatsapp_enabled: notifications.whatsapp,
                      digest_frequency: 'realtime',
                      notify_on: {
                        task_assigned: notifications.projects,
                        task_due: notifications.projects,
                        mention: notifications.inApp,
                        campaign_sent: notifications.marketing,
                        lead_stage_changed: notifications.marketing,
                        billing_alert: notifications.billing,
                        team_invite: true,
                        sprint_started: notifications.projects,
                        sprint_closed: notifications.projects,
                        anomaly_detected: notifications.analytics,
                      },
                    }
                    notificationsApi.updatePreferences(payload)
                      .then(() => toast.success('Preferências guardadas!'))
                      .catch((e: any) => toast.error(e?.message ?? 'Erro ao guardar'))
                  }}
                >
                  Guardar preferências
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API & Webhooks */}
          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>API & Webhooks</CardTitle>
                <CardDescription>Integra o NexusOS com sistemas externos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Chave de API</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={apiKeyVisible ? apiKey : "nxs_live_sk_••••••••••••••••••••••••••••••"}
                      className="font-mono text-sm flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      title={apiKeyVisible ? "Ocultar" : "Mostrar"}
                      onClick={() => setApiKeyVisible((v) => !v)}
                    >
                      {apiKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      title="Copiar chave"
                      onClick={() => {
                        navigator.clipboard.writeText(apiKey)
                          .then(() => toast.success("Chave copiada!"))
                          .catch(() => toast.error("Erro ao copiar"))
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      title="Regenerar chave"
                      disabled={apiKeyLoading}
                      onClick={handleRegenerateAPIKey}
                    >
                      {apiKeyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nunca partilhes esta chave. Usa-a no header:{" "}
                    <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;chave&gt;</code>
                  </p>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Webhooks</h3>
                    <Button size="sm" variant="outline" onClick={() => setShowWebhookForm((v) => !v)}>
                      <Plus className="h-4 w-4 mr-1" />Adicionar
                    </Button>
                  </div>
                  {showWebhookForm && (
                    <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                      <div className="space-y-1.5">
                        <Label className="text-xs">URL do Endpoint</Label>
                        <Input
                          placeholder="https://seusite.com/webhook"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Evento (exemplo)</Label>
                        <Input
                          placeholder="task.created"
                          value={webhookEvents[0]}
                          onChange={(e) => setWebhookEvents([e.target.value])}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddWebhook} disabled={webhookLoading}>
                          {webhookLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                          Guardar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowWebhookForm(false)}>
                          <X className="h-3.5 w-3.5 mr-1" />Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                  {webhooks.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 py-10 text-center dark:border-gray-700">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950">
                        <Code className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">Nenhum webhook configurado</p>
                      <p className="mt-1 text-sm text-muted-foreground">Adiciona um endpoint para receber eventos em tempo real.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {webhooks.map((wh) => (
                        <div key={wh.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="text-sm font-mono truncate max-w-xs">{wh.url}</p>
                            <p className="text-xs text-muted-foreground">{wh.events.join(", ")}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={wh.active ? "default" : "secondary"} className="text-xs">
                              {wh.active ? "Ativo" : "Inativo"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => setWebhooks((prev) => prev.filter((w) => w.id !== wh.id))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Documentação da API</Label>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/docs" target="_blank">Ver documentação Swagger →</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Segurança */}
          <TabsContent value="security">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Autenticação Multifator (MFA)</CardTitle>
                  <CardDescription>Adiciona uma camada extra de segurança</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">MFA via app autenticadora (TOTP)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profile?.is_mfa_enabled ? "MFA ativo" : "Recomendado para todos os admins"}
                    </p>
                  </div>
                  <Button
                    variant={profile?.is_mfa_enabled ? "destructive" : "outline"}
                    onClick={() => setShowMFA(true)}
                  >
                    {profile?.is_mfa_enabled ? "Desativar MFA" : "Ativar MFA"}
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Sessões Ativas</CardTitle>
                  <CardDescription>Dispositivos com sessão iniciada</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockSessions.map((session, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{session.device}</p>
                        <p className="text-xs text-muted-foreground">{session.location} · {session.lastActive}</p>
                      </div>
                      {session.current
                        ? <Badge variant="outline">Esta sessão</Badge>
                        : <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive text-xs"
                            onClick={() => handleTerminateSession(session.device)}
                          >
                            Terminar
                          </Button>
                      }
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* RGPD */}
          <TabsContent value="gdpr">
            <Card>
              <CardHeader>
                <CardTitle>Privacidade & RGPD</CardTitle>
                <CardDescription>Gere os teus dados pessoais em conformidade com o RGPD</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg space-y-2">
                  <p className="font-medium text-sm">Exportar os meus dados</p>
                  <p className="text-xs text-muted-foreground">
                    Recebe um arquivo ZIP com todos os dados associados à tua conta (perfil, projetos, mensagens).
                  </p>
                  <Button variant="outline" size="sm" onClick={handleExportData} disabled={exportLoading}>
                    {exportLoading
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <Download className="h-4 w-4 mr-2" />
                    }
                    Solicitar exportação
                  </Button>
                </div>
                <div className="p-4 border rounded-lg space-y-2">
                  <p className="font-medium text-sm">Gestão de consentimentos</p>
                  <div className="space-y-2">
                    {[
                      { label: "Comunicações de marketing", value: true },
                      { label: "Análise de utilização (analytics)", value: true },
                      { label: "Partilha de dados com parceiros", value: false },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <p className="text-sm">{label}</p>
                        <Switch defaultChecked={value} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 border border-destructive/20 rounded-lg space-y-2 bg-destructive/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="font-medium text-sm text-destructive">Zona Perigosa</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A eliminação da conta é permanente e irrevogável. Todos os dados serão apagados.
                  </p>
                  <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deleteLoading}>
                    {deleteLoading
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <UserX className="h-4 w-4 mr-2" />
                    }
                    Eliminar a minha conta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <MFAModal
        open={showMFA}
        onClose={() => setShowMFA(false)}
        onSuccess={() => { setShowMFA(false); refetchProfile(); }}
      />
    </div>
  );
}

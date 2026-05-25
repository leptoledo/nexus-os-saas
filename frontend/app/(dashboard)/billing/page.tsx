"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, CreditCard, Download, ExternalLink, Zap, Loader2 } from "lucide-react";
import { useSubscription, useInvoices, useCreatePortalSession, useCreateCheckoutSession } from "@/hooks/useBilling";

// Stripe price IDs (from env config)
const PRICE_IDS = {
  starter: 'price_1TZVpDJ8mCnZPJ5MG7D1N69X',
  pro: 'price_1TZVpDJ8mCnZPJ5MKzx48NiH',
  business: 'price_1TZVpEJ8mCnZPJ5MA6y7r1c9',
}

const plans = [
  {
    name: "Starter",
    priceId: PRICE_IDS.starter,
    price: 29,
    description: "Para freelancers e microempresas",
    planKey: "starter",
    features: [
      "Até 3 utilizadores",
      "Marketing CRM (básico)",
      "Projetos Kanban",
      "Analytics básico",
      "1.000 mensagens WhatsApp/mês",
      "Suporte por email",
    ],
  },
  {
    name: "Pro",
    priceId: PRICE_IDS.pro,
    price: 79,
    description: "Para equipas em crescimento",
    planKey: "pro",
    features: [
      "Até 15 utilizadores",
      "Marketing completo (campanhas, SEO)",
      "Projetos com Gantt e Sprints",
      "Analytics BI + relatórios",
      "OKRs e time tracking",
      "10.000 mensagens WhatsApp/mês",
      "Fluxos WhatsApp automatizados",
      "API access",
      "Suporte prioritário",
    ],
  },
  {
    name: "Business",
    priceId: PRICE_IDS.business,
    price: 199,
    description: "Para empresas com necessidades avançadas",
    planKey: "business",
    features: [
      "Utilizadores ilimitados",
      "Todos os módulos completos",
      "IA Insights avançados + previsões",
      "Relatórios agendados ilimitados",
      "WhatsApp ilimitado",
      "Webhooks e integrações",
      "SSO / SAML",
      "White-label",
      "SLA garantido",
      "Gestor de conta dedicado",
    ],
  },
]

function formatDate(str: string): string {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
}

function formatAmount(amount?: number, currency?: string): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: currency ?? "EUR" }).format(amount / 100);
}

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  trialing: "Trial",
  past_due: "Em atraso",
  canceled: "Cancelado",
  incomplete: "Incompleto",
}

export default function BillingPage() {
  const { data: subscription, isLoading: loadingSub } = useSubscription();
  const { data: invoices, isLoading: loadingInvoices } = useInvoices();
  const portalSession = useCreatePortalSession();
  const checkoutSession = useCreateCheckoutSession();

  const currentPlan = subscription?.plan ?? "pro";
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Faturação</h1>
        <p className="text-muted-foreground">Gere a tua subscrição e histórico de pagamentos</p>
      </div>

      {/* Current subscription summary */}
      {loadingSub ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">A carregar subscrição...</span>
        </div>
      ) : (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Plano {PLAN_LABEL[currentPlan] ?? currentPlan}</h2>
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {STATUS_LABEL[subscription?.status ?? ""] ?? subscription?.status ?? "Ativo"}
                  </Badge>
                  {subscription?.cancel_at_period_end && (
                    <Badge variant="destructive">Cancela no fim do período</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {subscription?.current_period_end
                    ? `Renova em ${formatDate(subscription.current_period_end)}`
                    : "Subscrição ativa"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => portalSession.mutate()}
                disabled={portalSession.isPending}
              >
                {portalSession.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Gerir no Stripe
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment method placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Método de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-14 rounded border bg-muted flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Gerido via Stripe</p>
              <p className="text-xs text-muted-foreground">Clica em "Gerir no Stripe" para atualizar</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => portalSession.mutate()}
            disabled={portalSession.isPending}
          >
            Atualizar
          </Button>
        </CardContent>
      </Card>

      {/* Plans comparison */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Planos Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.planKey === currentPlan;
            return (
              <Card key={plan.name} className={isCurrent ? "border-primary shadow-sm" : ""}>
                {isCurrent && (
                  <div className="bg-primary text-primary-foreground text-xs text-center py-1 font-medium rounded-t-lg">
                    Plano Atual
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="flex items-baseline gap-1 pt-2">
                    <span className="text-3xl font-bold">€{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    variant={isCurrent ? "default" : "outline"}
                    className="w-full"
                    disabled={isCurrent || checkoutSession.isPending}
                    onClick={() => {
                      if (isCurrent) return;
                      const currentPrice = plans.find((p) => p.planKey === currentPlan)?.price ?? 0;
                      if (plan.price < currentPrice) {
                        const ok = window.confirm(
                          `Fazer downgrade para o plano ${plan.name} irá remover acesso a algumas funcionalidades. Continuar?`
                        );
                        if (!ok) return;
                      }
                      checkoutSession.mutate(plan.priceId);
                    }}
                  >
                    {checkoutSession.isPending && !isCurrent ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {isCurrent ? "Plano Atual" : plan.price > (plans.find((p) => p.planKey === currentPlan)?.price ?? 0) ? "Upgrade" : "Downgrade"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Invoice history */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Histórico de Faturas</h2>
        <Card>
          {loadingInvoices ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-14 text-center dark:border-gray-700">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950">
                <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Sem faturas disponíveis</p>
              <p className="mt-1 text-sm text-muted-foreground">As faturas aparecerão aqui após a primeira cobrança.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fatura</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">{invoice.id?.slice(0, 12) ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate(invoice.created ?? invoice.date)}</TableCell>
                    <TableCell><Badge variant="outline">{PLAN_LABEL[invoice.plan ?? currentPlan] ?? "Pro"}</Badge></TableCell>
                    <TableCell className="font-medium">
                      {invoice.amount_paid != null
                        ? formatAmount(invoice.amount_paid, invoice.currency)
                        : invoice.amount ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300">
                        {invoice.status === "paid" ? "Pago" : invoice.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.invoice_pdf && (
                        <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

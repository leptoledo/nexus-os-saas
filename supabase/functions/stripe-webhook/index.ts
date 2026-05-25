// ============================================================
// NexusOS - Edge Function: stripe-webhook
// Handles Stripe webhook events for subscription management
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Map Stripe price IDs to NexusOS plan names
const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get('STRIPE_PRICE_STARTER') ?? 'price_starter']: 'starter',
  [Deno.env.get('STRIPE_PRICE_PRO') ?? 'price_pro']: 'pro',
  [Deno.env.get('STRIPE_PRICE_BUSINESS') ?? 'price_business']: 'business',
}

function getPlanFromSubscription(subscription: Stripe.Subscription): string {
  const priceId = subscription.items.data[0]?.price?.id ?? ''
  return PRICE_TO_PLAN[priceId] ?? 'starter'
}

async function createNotification(
  orgId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error'
) {
  // Notify all admins of the org
  const { data: admins } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('role', 'admin')
    .eq('is_active', true)

  if (!admins?.length) return

  const notifications = admins.map((admin) => ({
    org_id: orgId,
    user_id: admin.user_id,
    title,
    message,
    type,
    category: 'billing',
  }))

  await supabase.from('notifications').insert(notifications)
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.org_id
  if (!orgId) {
    console.error('checkout.session.completed: missing org_id in metadata')
    return
  }

  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  if (!subscriptionId) {
    console.error('checkout.session.completed: missing subscription id')
    return
  }

  // Fetch full subscription to get plan details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const plan = getPlanFromSubscription(subscription)

  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)

  if (error) {
    console.error('Error updating organization after checkout:', error)
    throw error
  }

  // Log audit event
  await supabase.from('audit_logs').insert({
    org_id: orgId,
    action: 'subscription.created',
    resource_type: 'subscription',
    resource_id: subscriptionId,
    details: { plan, status: subscription.status, customer_id: customerId },
  })

  await createNotification(
    orgId,
    'Subscrição ativada',
    `O plano ${plan.charAt(0).toUpperCase() + plan.slice(1)} foi ativado com sucesso. Bem-vindo ao NexusOS!`,
    'success'
  )

  console.log(`Org ${orgId} upgraded to plan ${plan}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!org) {
    console.warn(`No org found for subscription ${subscription.id}`)
    return
  }

  const plan = getPlanFromSubscription(subscription)

  const { error } = await supabase
    .from('organizations')
    .update({
      plan,
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id)

  if (error) {
    console.error('Error updating organization subscription:', error)
    throw error
  }

  await supabase.from('audit_logs').insert({
    org_id: org.id,
    action: 'subscription.updated',
    resource_type: 'subscription',
    resource_id: subscription.id,
    details: { plan, status: subscription.status },
  })

  console.log(`Org ${org.id} subscription updated: plan=${plan}, status=${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!org) {
    console.warn(`No org found for subscription ${subscription.id}`)
    return
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      plan: 'starter',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id)

  if (error) {
    console.error('Error downgrading org after subscription deletion:', error)
    throw error
  }

  await supabase.from('audit_logs').insert({
    org_id: org.id,
    action: 'subscription.canceled',
    resource_type: 'subscription',
    resource_id: subscription.id,
    details: { previous_plan: getPlanFromSubscription(subscription) },
  })

  await createNotification(
    org.id,
    'Subscrição cancelada',
    'A sua subscrição foi cancelada. A conta foi revertida para o plano Starter.',
    'warning'
  )

  console.log(`Org ${org.id} downgraded to starter after subscription deletion`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!org) {
    console.warn(`No org found for customer ${customerId}`)
    return
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id)

  if (error) {
    console.error('Error updating org to past_due:', error)
    throw error
  }

  await supabase.from('audit_logs').insert({
    org_id: org.id,
    action: 'payment.failed',
    resource_type: 'invoice',
    resource_id: invoice.id,
    details: {
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      attempt_count: invoice.attempt_count,
    },
  })

  await createNotification(
    org.id,
    'Pagamento falhado',
    `O pagamento da fatura de ${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()} falhou. Por favor, atualize o seu método de pagamento para evitar a interrupção do serviço.`,
    'error'
  )

  console.log(`Payment failed for org ${org.id}`)
}

serve(async (req: Request) => {
  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 })
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    const body = await req.text()

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Invalid signature', { status: 400 })
    }

    console.log(`Processing Stripe event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

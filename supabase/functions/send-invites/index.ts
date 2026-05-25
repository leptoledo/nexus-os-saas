// ============================================================
// NexusOS - Edge Function: send-invites
// Sends team member invitation emails via Resend API
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.nexusos.pt'
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'equipa@nexusos.pt'

interface SendInviteRequest {
  invitation_id: string
}

// Fetch invitation with org and inviter details
async function fetchInvitationDetails(invitationId: string) {
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      id,
      email,
      role,
      token,
      expires_at,
      accepted_at,
      org_id,
      invited_by,
      organizations (
        name,
        slug,
        logo_url
      )
    `)
    .eq('id', invitationId)
    .is('accepted_at', null)
    .single()

  if (error) throw new Error(`Invitation not found: ${error.message}`)
  if (!data) throw new Error('Invitation not found or already accepted')

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    throw new Error('Invitation has expired')
  }

  // Fetch inviter profile
  const { data: inviterProfile } = await supabase
    .from('user_profiles')
    .select('full_name, email')
    .eq('id', data.invited_by)
    .single()

  return {
    ...data,
    inviter: inviterProfile,
    org: Array.isArray(data.organizations) ? data.organizations[0] : data.organizations,
  }
}

// Role labels in Portuguese
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  viewer: 'Visualizador',
}

// Generate the HTML email template
function buildEmailHtml(params: {
  inviterName: string
  orgName: string
  orgLogoUrl?: string | null
  role: string
  inviteUrl: string
  expiresAt: string
  recipientEmail: string
}): string {
  const { inviterName, orgName, orgLogoUrl, role, inviteUrl, expiresAt, recipientEmail } = params
  const roleLabel = ROLE_LABELS[role] ?? role
  const expiryDate = new Date(expiresAt).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const logoHtml = orgLogoUrl
    ? `<img src="${orgLogoUrl}" alt="${orgName}" style="max-height:48px;max-width:200px;margin-bottom:16px;" />`
    : `<div style="font-size:24px;font-weight:700;color:#1a1a2e;margin-bottom:16px;">NexusOS</div>`

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Convite para ${orgName} - NexusOS</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
          style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:40px 48px;text-align:center;">
              ${logoHtml}
              <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0;letter-spacing:-0.3px;">
                Foi convidado para ${orgName}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 48px 40px;">
              <p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;">
                Olá,
              </p>
              <p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;">
                <strong>${inviterName}</strong> convidou-o para juntar-se ao espaço de trabalho
                <strong>${orgName}</strong> no NexusOS com o papel de
                <strong>${roleLabel}</strong>.
              </p>

              <!-- Role badge -->
              <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:8px;padding:16px 20px;margin:0 0 32px;">
                <p style="margin:0;font-size:14px;color:#4338ca;font-weight:600;">
                  O seu papel: ${roleLabel}
                </p>
                <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">
                  ${
                    role === 'admin'
                      ? 'Acesso total: gestão de membros, configurações e todos os módulos.'
                      : role === 'manager'
                      ? 'Pode criar e editar projetos, leads e conteúdo da organização.'
                      : 'Acesso de leitura a todos os módulos da organização.'
                  }
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;margin:0 0 32px;">
                <a href="${inviteUrl}"
                  style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:8px;letter-spacing:0.2px;">
                  Aceitar convite
                </a>
              </div>

              <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0 0 8px;">
                Ou copie e cole este link no seu browser:
              </p>
              <p style="font-size:12px;color:#6b7280;text-align:center;word-break:break-all;margin:0 0 32px;background:#f9fafb;padding:12px;border-radius:6px;">
                ${inviteUrl}
              </p>

              <div style="border-top:1px solid #e5e7eb;padding-top:24px;">
                <p style="font-size:13px;color:#9ca3af;margin:0;">
                  Este convite foi enviado para <strong>${recipientEmail}</strong>
                  e expira em <strong>${expiryDate}</strong>.
                </p>
                <p style="font-size:13px;color:#9ca3af;margin:8px 0 0;">
                  Se não esperava este convite, pode ignorar este email com segurança.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 48px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="font-size:12px;color:#9ca3af;margin:0;">
                © ${new Date().getFullYear()} NexusOS · Plataforma de Gestão Empresarial
              </p>
              <p style="font-size:12px;color:#9ca3af;margin:4px 0 0;">
                <a href="${APP_URL}" style="color:#6366f1;text-decoration:none;">nexusos.pt</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// Build plain text fallback
function buildEmailText(params: {
  inviterName: string
  orgName: string
  role: string
  inviteUrl: string
  expiresAt: string
  recipientEmail: string
}): string {
  const { inviterName, orgName, role, inviteUrl, expiresAt, recipientEmail } = params
  const roleLabel = ROLE_LABELS[role] ?? role
  const expiryDate = new Date(expiresAt).toLocaleDateString('pt-PT')

  return `
Foi convidado para ${orgName} - NexusOS

${inviterName} convidou-o para juntar-se ao espaço de trabalho "${orgName}" no NexusOS com o papel de ${roleLabel}.

Para aceitar o convite, aceda ao link abaixo:
${inviteUrl}

Este convite foi enviado para ${recipientEmail} e expira em ${expiryDate}.

Se não esperava este convite, pode ignorar este email.

---
NexusOS · Plataforma de Gestão Empresarial
${APP_URL}
`.trim()
}

// Send email via Resend API
async function sendEmail(params: {
  to: string
  subject: string
  html: string
  text: string
}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `NexusOS <${FROM_EMAIL}>`,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend API error: ${response.status} - ${error}`)
  }

  return response.json()
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body: SendInviteRequest = await req.json()
    const { invitation_id } = body

    if (!invitation_id) {
      return new Response(JSON.stringify({ error: 'invitation_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Resend API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Sending invite for invitation ${invitation_id}`)

    // Fetch invitation details
    const invitation = await fetchInvitationDetails(invitation_id)

    const inviteUrl = `${APP_URL}/invite?token=${invitation.token}`
    const inviterName = invitation.inviter?.full_name ?? invitation.inviter?.email ?? 'Alguém'
    const orgName = invitation.org?.name ?? 'a organização'

    // Build email content
    const emailParams = {
      inviterName,
      orgName,
      orgLogoUrl: invitation.org?.logo_url,
      role: invitation.role,
      inviteUrl,
      expiresAt: invitation.expires_at,
      recipientEmail: invitation.email,
    }

    const html = buildEmailHtml(emailParams)
    const text = buildEmailText(emailParams)

    // Send email
    const emailResult = await sendEmail({
      to: invitation.email,
      subject: `${inviterName} convidou-o para ${orgName} no NexusOS`,
      html,
      text,
    })

    console.log(`Invite sent successfully to ${invitation.email}:`, emailResult)

    // Log the action
    await supabase.from('audit_logs').insert({
      org_id: invitation.org_id,
      user_id: invitation.invited_by,
      action: 'invitation.sent',
      resource_type: 'invitation',
      resource_id: invitation_id,
      details: {
        email: invitation.email,
        role: invitation.role,
        resend_message_id: emailResult.id,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Convite enviado para ${invitation.email}`,
        email_id: emailResult.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('send-invites error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to send invitation', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

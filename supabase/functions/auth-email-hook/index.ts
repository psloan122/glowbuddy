// Supabase Auth Hook: intercepts auth emails (signup, recovery, magic link)
// and sends them via Resend API instead of Supabase's built-in SMTP.
//
// Setup:
//   1. Deploy: supabase functions deploy auth-email-hook --project-ref bykrkrhsworzdtvsdkec
//   2. Set secret: supabase secrets set RESEND_API_KEY=re_xxxxx --project-ref bykrkrhsworzdtvsdkec
//   3. Supabase Dashboard → Authentication → Hooks → Add "Send Email" hook → select this function
//
// Supabase sends: { user: { email }, email_data: { token_hash, redirect_to, email_action_type, site_url } }
// We must return: { error: null } on success, or { error: { message: "..." } } on failure.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

// ─── Design tokens (matches send-email) ──────────────────────────────────────
const BG = '#FDFBF9'
const CARD_BG = '#FFFFFF'
const ACCENT = '#C94F78'
const TEXT_PRIMARY = '#1A1A2E'
const TEXT_SECONDARY = '#6B7280'
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const BASE_URL = 'https://knowbeforeyouglow.com'

function logo(): string {
  return `<span style="font-size:24px;font-weight:700;color:${ACCENT};font-family:${FONT};">Know Before You Glow</span>`
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0;">
    <tr>
      <td style="background-color:${ACCENT};border-radius:999px;padding:14px 32px;">
        <a href="${url}" style="color:#ffffff;font-family:${FONT};font-size:16px;font-weight:600;text-decoration:none;display:inline-block;">${text}</a>
      </td>
    </tr>
  </table>`
}

function emailWrapper(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Know Before You Glow</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              ${logo()}
            </td>
          </tr>
          <tr>
            <td style="background-color:${CARD_BG};border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
              ${content}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">
                <a href="${BASE_URL}" style="color:${TEXT_SECONDARY};text-decoration:underline;">knowbeforeyouglow.com</a>
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:${TEXT_SECONDARY};font-family:${FONT};font-style:italic;">
                Know before you glow.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Build confirmation URL ──────────────────────────────────────────────────
// Supabase PKCE flow: site_url/auth/confirm?token_hash=xxx&type=yyy&redirect_to=zzz
function buildConfirmUrl(emailData: {
  token_hash: string
  email_action_type: string
  site_url: string
  redirect_to?: string
}): string {
  const base = `${emailData.site_url}/auth/confirm`
  const params = new URLSearchParams({
    token_hash: emailData.token_hash,
    type: emailData.email_action_type,
  })
  if (emailData.redirect_to) {
    params.set('redirect_to', emailData.redirect_to)
  }
  return `${base}?${params.toString()}`
}

// ─── Email templates ─────────────────────────────────────────────────────────

interface AuthEmail {
  subject: string
  html: string
}

function buildRecoveryEmail(confirmUrl: string): AuthEmail {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      Reset your password
    </h1>
    <p style="margin:0 0 24px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Click the button below to set a new password. This link expires in 1 hour.
    </p>
    ${ctaButton('Reset Password', confirmUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      If you didn't request this, you can safely ignore this email.
    </p>`

  return {
    subject: 'Reset your Know Before You Glow password',
    html: emailWrapper(content, 'Reset your Know Before You Glow password'),
  }
}

function buildSignupEmail(confirmUrl: string): AuthEmail {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      Welcome to Know Before You Glow
    </h1>
    <p style="margin:0 0 24px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Click below to confirm your email address and start exploring.
    </p>
    ${ctaButton('Confirm Email', confirmUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      If you didn't create a Know Before You Glow account, you can ignore this email.
    </p>`

  return {
    subject: 'Confirm your Know Before You Glow account',
    html: emailWrapper(content, 'Confirm your email to get started with Know Before You Glow'),
  }
}

function buildMagicLinkEmail(confirmUrl: string): AuthEmail {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      Your login link
    </h1>
    <p style="margin:0 0 24px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Click below to sign in to Know Before You Glow. This link expires in 1 hour.
    </p>
    ${ctaButton('Sign In', confirmUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      If you didn't request this, you can safely ignore this email.
    </p>`

  return {
    subject: 'Your Know Before You Glow login link',
    html: emailWrapper(content, 'Sign in to Know Before You Glow with one click'),
  }
}

function buildEmailChangeEmail(confirmUrl: string): AuthEmail {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      Confirm email change
    </h1>
    <p style="margin:0 0 24px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Click below to confirm your new email address.
    </p>
    ${ctaButton('Confirm Email Change', confirmUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      If you didn't request this change, please contact support immediately.
    </p>`

  return {
    subject: 'Confirm your new email address',
    html: emailWrapper(content, 'Confirm your Know Before You Glow email change'),
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const { user, email_data: emailData } = payload

    if (!user?.email || !emailData?.email_action_type) {
      console.error('Invalid hook payload — missing user.email or email_action_type')
      return Response.json({ error: null })
    }

    const confirmUrl = buildConfirmUrl(emailData)
    const actionType = emailData.email_action_type

    let email: AuthEmail | null = null

    if (actionType === 'recovery') {
      email = buildRecoveryEmail(confirmUrl)
    } else if (actionType === 'signup') {
      email = buildSignupEmail(confirmUrl)
    } else if (actionType === 'magic_link' || actionType === 'magiclink') {
      email = buildMagicLinkEmail(confirmUrl)
    } else if (actionType === 'email_change') {
      email = buildEmailChangeEmail(confirmUrl)
    } else {
      // Unknown type — let Supabase handle it (return success so it doesn't retry)
      console.log(`auth-email-hook: unhandled action type "${actionType}", skipping`)
      return Response.json({ error: null })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Know Before You Glow <hello@knowbeforeyouglow.com>',
        to: user.email,
        subject: email.subject,
        html: email.html,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('Resend API error:', JSON.stringify(result))
      return Response.json({
        error: { message: `Resend API error: ${result.message || res.status}` },
      })
    }

    console.log(`auth-email-hook: sent ${actionType} email to ${user.email.slice(0, 3)}***@*** via Resend (id: ${result.id})`)
    return Response.json({ error: null })
  } catch (err) {
    console.error('auth-email-hook error:', err)
    return Response.json({
      error: { message: `Hook error: ${(err as Error).message}` },
    })
  }
})

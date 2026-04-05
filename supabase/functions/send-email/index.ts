// Supabase Edge Function: Central email sender with branded HTML templates
// Deploy: supabase functions deploy send-email
// Secrets needed: RESEND_API_KEY

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Design tokens ───
const BG = '#FDFBF9'
const CARD_BG = '#FFFFFF'
const ACCENT = '#C94F78'
const TEXT_PRIMARY = '#1A1A2E'
const TEXT_SECONDARY = '#6B7280'
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const BASE_URL = 'https://glowbuddy.com'

// ─── Shared helpers ───

function logo(): string {
  return `<span style="font-size:24px;font-weight:700;color:${ACCENT};font-family:${FONT};">Glow<span style="font-weight:400;">Buddy</span></span>`
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
  <title>GlowBuddy</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <!-- Preview text -->
  <div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              ${logo()}
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:${CARD_BG};border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">
                <a href="${BASE_URL}" style="color:${TEXT_SECONDARY};text-decoration:underline;">glowbuddy.com</a>
                &nbsp;&middot;&nbsp;
                <a href="${BASE_URL}/settings" style="color:${TEXT_SECONDARY};text-decoration:underline;">Manage email preferences</a>
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:${TEXT_SECONDARY};font-family:${FONT};">
                GlowBuddy &middot; New Orleans, LA
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

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&middot;/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/ \n/g, '\n')
    .trim()
}

// ─── Template builders ───

function buildWelcomeUser(): { html: string; text: string } {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      Welcome to GlowBuddy!
    </h1>
    <p style="margin:0 0 32px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      See what real people pay for med spa treatments near you.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:12px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:40px;vertical-align:top;font-size:20px;">&#128176;</td>
              <td style="font-family:${FONT};">
                <p style="margin:0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">Browse real prices</p>
                <p style="margin:4px 0 0;font-size:14px;color:${TEXT_SECONDARY};">See what others actually pay for Botox, fillers, and more.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:40px;vertical-align:top;font-size:20px;">&#128203;</td>
              <td style="font-family:${FONT};">
                <p style="margin:0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">Log your treatments</p>
                <p style="margin:4px 0 0;font-size:14px;color:${TEXT_SECONDARY};">Share anonymously and help others make informed decisions.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:40px;vertical-align:top;font-size:20px;">&#127873;</td>
              <td style="font-family:${FONT};">
                <p style="margin:0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">Win monthly giveaways</p>
                <p style="margin:4px 0 0;font-size:14px;color:${TEXT_SECONDARY};">Every submission earns you entries into our monthly drawing.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton('Browse Prices', BASE_URL)}`

  const html = emailWrapper(content, 'See what real people pay for med spa treatments near you.')
  return { html, text: htmlToText(html) }
}

function buildProviderWelcome(data: {
  providerName: string
  slug: string
  menuCount: number
  tier: string
}): { html: string; text: string } {
  const dashboardUrl = `${BASE_URL}/business/dashboard`
  const listingUrl = `${BASE_URL}/provider/${data.slug}`
  const tierLabel = data.tier === 'pro_trial' ? 'Pro Trial' : 'Free'

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      ${data.providerName} is live!
    </h1>
    <p style="margin:0 0 32px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Your practice is now listed on GlowBuddy. Here's what to do next.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:12px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:40px;vertical-align:top;font-size:18px;font-weight:700;color:${ACCENT};font-family:${FONT};">1.</td>
              <td style="font-family:${FONT};">
                <p style="margin:0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">Complete your profile</p>
                <p style="margin:4px 0 0;font-size:14px;color:${TEXT_SECONDARY};">Add photos and a tagline to stand out to potential clients.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:40px;vertical-align:top;font-size:18px;font-weight:700;color:${ACCENT};font-family:${FONT};">2.</td>
              <td style="font-family:${FONT};">
                <p style="margin:0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">Create a special offer</p>
                <p style="margin:4px 0 0;font-size:14px;color:${TEXT_SECONDARY};">Featured specials get up to 10x more visibility.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:40px;vertical-align:top;font-size:18px;font-weight:700;color:${ACCENT};font-family:${FONT};">3.</td>
              <td style="font-family:${FONT};">
                <p style="margin:0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">Share your listing</p>
                <p style="margin:4px 0 0;font-size:14px;color:${TEXT_SECONDARY};">Send your GlowBuddy profile link to existing clients.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #E5E7EB;padding-top:16px;">
      <tr>
        <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};">Plan</td>
        <td align="right" style="font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">${tierLabel}</td>
      </tr>
      <tr>
        <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};padding-top:8px;">Menu items</td>
        <td align="right" style="font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};padding-top:8px;">${data.menuCount}</td>
      </tr>
      <tr>
        <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};padding-top:8px;">Listing URL</td>
        <td align="right" style="padding-top:8px;">
          <a href="${listingUrl}" style="font-family:${FONT};font-size:14px;color:${ACCENT};text-decoration:underline;">${listingUrl.replace('https://', '')}</a>
        </td>
      </tr>
    </table>

    ${ctaButton('Go to Dashboard', dashboardUrl)}`

  const html = emailWrapper(content, `${data.providerName} is now live on GlowBuddy`)
  return { html, text: htmlToText(html) }
}

function buildSpecialOfferReceipt(data: {
  providerName: string
  treatmentName: string
  promoPrice: string
  priceUnit: string
  tier: string
  weeks: number
  totalPaid: string
  expiryDate: string
  dashboardUrl?: string
}): { html: string; text: string } {
  const dashboardUrl = data.dashboardUrl || `${BASE_URL}/business/dashboard`
  const tierLabel = data.tier === 'featured' ? 'Featured' : data.tier === 'premium' ? 'Premium' : 'Standard'

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      Your placement is live!
    </h1>
    <p style="margin:0 0 32px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Your special offer is now showing to patients in your area.
    </p>

    <!-- Receipt table -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB;border-radius:12px;padding:20px;">
      <tr>
        <td style="padding:12px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};padding:6px 0;">Provider</td>
              <td align="right" style="font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};padding:6px 0;">${data.providerName}</td>
            </tr>
            <tr>
              <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};padding:6px 0;">Treatment</td>
              <td align="right" style="font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};padding:6px 0;">${data.treatmentName}</td>
            </tr>
            <tr>
              <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};padding:6px 0;">Promo price</td>
              <td align="right" style="font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};padding:6px 0;">${data.promoPrice} ${data.priceUnit}</td>
            </tr>
            <tr>
              <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};padding:6px 0;">Placement tier</td>
              <td align="right" style="font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};padding:6px 0;">${tierLabel}</td>
            </tr>
            <tr>
              <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};padding:6px 0;">Duration</td>
              <td align="right" style="font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};padding:6px 0;">${data.weeks} week${data.weeks !== 1 ? 's' : ''}</td>
            </tr>
            <tr>
              <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};padding:6px 0;">Expires</td>
              <td align="right" style="font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};padding:6px 0;">${data.expiryDate}</td>
            </tr>
            <tr>
              <td colspan="2" style="border-top:1px solid #E5E7EB;padding-top:12px;margin-top:8px;"></td>
            </tr>
            <tr>
              <td style="font-family:${FONT};font-size:16px;font-weight:700;color:${TEXT_PRIMARY};padding:6px 0;">Total paid</td>
              <td align="right" style="font-family:${FONT};font-size:16px;font-weight:700;color:${TEXT_PRIMARY};padding:6px 0;">${data.totalPaid}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton('View Performance', dashboardUrl)}`

  const html = emailWrapper(content, `Your GlowBuddy placement for ${data.treatmentName} is now live!`)
  return { html, text: htmlToText(html) }
}

function buildSpecialOfferExpiring(data: {
  providerName: string
  treatmentName: string
  expiryDate: string
  impressions?: number
  clicks?: number
  renewUrl?: string
}): { html: string; text: string } {
  const renewUrl = data.renewUrl || `${BASE_URL}/business/dashboard`

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      Your special expires soon
    </h1>
    <p style="margin:0 0 32px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Your <strong>${data.treatmentName}</strong> special expires on ${data.expiryDate}.
    </p>

    ${data.impressions !== undefined || data.clicks !== undefined ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        ${data.impressions !== undefined ? `
        <td align="center" style="background-color:#F9FAFB;border-radius:12px;padding:20px;width:50%;">
          <p style="margin:0;font-size:28px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">${data.impressions.toLocaleString()}</p>
          <p style="margin:4px 0 0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">Impressions</p>
        </td>` : ''}
        <td style="width:12px;"></td>
        ${data.clicks !== undefined ? `
        <td align="center" style="background-color:#F9FAFB;border-radius:12px;padding:20px;width:50%;">
          <p style="margin:0;font-size:28px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">${data.clicks.toLocaleString()}</p>
          <p style="margin:4px 0 0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">Clicks</p>
        </td>` : ''}
      </tr>
    </table>` : ''}

    <p style="margin:0;font-size:15px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Renew your placement to keep showing up in search results and procedure pages.
    </p>

    ${ctaButton('Renew Special', renewUrl)}`

  const html = emailWrapper(content, `Your ${data.treatmentName} special expires in 48 hours`)
  return { html, text: htmlToText(html) }
}

function buildWeeklyDigest(data: {
  providerName: string
  impressions: number
  clicks: number
  calls?: number
  topProcedure?: string
  analyticsUrl?: string
}): { html: string; text: string } {
  const analyticsUrl = data.analyticsUrl || `${BASE_URL}/business/dashboard`

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      This week: ${data.providerName}
    </h1>
    <p style="margin:0 0 32px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Here's how your listing performed over the last 7 days.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="background-color:#F9FAFB;border-radius:12px;padding:20px;width:33%;">
          <p style="margin:0;font-size:28px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">${data.impressions.toLocaleString()}</p>
          <p style="margin:4px 0 0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">Impressions</p>
        </td>
        <td style="width:8px;"></td>
        <td align="center" style="background-color:#F9FAFB;border-radius:12px;padding:20px;width:33%;">
          <p style="margin:0;font-size:28px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">${data.clicks.toLocaleString()}</p>
          <p style="margin:4px 0 0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">Clicks</p>
        </td>
        <td style="width:8px;"></td>
        <td align="center" style="background-color:#F9FAFB;border-radius:12px;padding:20px;width:33%;">
          <p style="margin:0;font-size:28px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">${(data.calls ?? 0).toLocaleString()}</p>
          <p style="margin:4px 0 0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">Calls</p>
        </td>
      </tr>
    </table>

    ${data.topProcedure ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #E5E7EB;padding-top:16px;">
      <tr>
        <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};">Top procedure nearby</td>
        <td align="right" style="font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">${data.topProcedure}</td>
      </tr>
    </table>` : ''}

    ${ctaButton('View Analytics', analyticsUrl)}`

  const html = emailWrapper(content, `${data.providerName}: ${data.impressions} impressions, ${data.clicks} clicks this week`)
  return { html, text: htmlToText(html) }
}

function buildPriceAlert(data: {
  treatment: string
  price: string
  providerName: string
  neighborhood?: string
  providerUrl: string
}): { html: string; text: string } {
  const location = data.neighborhood ? ` in ${data.neighborhood}` : ''

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      Price drop alert
    </h1>
    <p style="margin:0 0 32px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      <strong>${data.treatment}</strong> just dropped to <strong>$${data.price}</strong>${location}.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB;border-radius:12px;padding:20px;">
      <tr>
        <td style="padding:12px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};padding:6px 0;">Treatment</td>
              <td align="right" style="font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};padding:6px 0;">${data.treatment}</td>
            </tr>
            <tr>
              <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};padding:6px 0;">Price</td>
              <td align="right" style="font-family:${FONT};font-size:16px;font-weight:700;color:${ACCENT};padding:6px 0;">$${data.price}</td>
            </tr>
            <tr>
              <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};padding:6px 0;">Provider</td>
              <td align="right" style="font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};padding:6px 0;">${data.providerName}</td>
            </tr>
            ${data.neighborhood ? `
            <tr>
              <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};padding:6px 0;">Neighborhood</td>
              <td align="right" style="font-family:${FONT};font-size:14px;font-weight:600;color:${TEXT_PRIMARY};padding:6px 0;">${data.neighborhood}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton('View Provider', data.providerUrl)}`

  const html = emailWrapper(content, `${data.treatment} dropped to $${data.price} near you`)
  return { html, text: htmlToText(html) }
}

function buildFreshnessNudge(data: {
  userName?: string
  staleCount: number
  procedures: Array<{ procedure_type: string; provider_name: string; city: string; state: string; procedure_id: string }>
}): { html: string; text: string } {
  const greeting = data.userName ? `Hi ${data.userName},` : 'Hi there,'
  const procRows = data.procedures.slice(0, 5).map((p) => {
    const confirmUrl = `${BASE_URL}/confirm-freshness?id=${p.procedure_id}`
    const updateUrl = `${BASE_URL}/log?procedure=${encodeURIComponent(p.procedure_type)}&provider=${encodeURIComponent(p.provider_name)}&city=${encodeURIComponent(p.city)}&state=${encodeURIComponent(p.state)}`
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #E5E7EB;">
          <p style="margin:0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};font-family:${FONT};">
            ${p.procedure_type}
          </p>
          <p style="margin:2px 0 8px;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">
            ${p.provider_name} &middot; ${p.city}, ${p.state}
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:8px;">
                <a href="${confirmUrl}" style="display:inline-block;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:600;color:#059669;background-color:#ECFDF5;text-decoration:none;font-family:${FONT};">
                  &#10003; Still Accurate
                </a>
              </td>
              <td>
                <a href="${updateUrl}" style="display:inline-block;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:600;color:${ACCENT};background-color:#FBE8EF;text-decoration:none;font-family:${FONT};">
                  Update Price
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
  }).join('')

  const content = `
    <p style="margin:0 0 8px;font-size:16px;color:${TEXT_PRIMARY};font-family:${FONT};">
      ${greeting}
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:${TEXT_SECONDARY};font-family:${FONT};">
      You have ${data.staleCount} price${data.staleCount === 1 ? '' : 's'} on GlowBuddy that
      ${data.staleCount === 1 ? "hasn't" : "haven't"} been updated in over 6 months.
      A quick confirmation helps others know these prices are still accurate.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${procRows}
    </table>

    ${data.staleCount > 5 ? `
    <p style="margin:16px 0 0;font-size:14px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      + ${data.staleCount - 5} more
    </p>` : ''}

    ${ctaButton('View All My Submissions', `${BASE_URL}/my-treatments`)}

    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Confirming earns you 50 Glow Credits per price!
    </p>`

  const html = emailWrapper(content, `${data.staleCount} of your prices may need updating`)
  return { html, text: htmlToText(html) }
}

// ─── Template router ───

type TemplateData = Record<string, unknown>

function buildEmail(template: string, data: TemplateData): { html: string; text: string; subject: string } {
  switch (template) {
    case 'welcome_user':
      return { ...buildWelcomeUser(), subject: 'Welcome to GlowBuddy!' }

    case 'provider_welcome':
      return {
        ...buildProviderWelcome(data as Parameters<typeof buildProviderWelcome>[0]),
        subject: `${data.providerName} is live on GlowBuddy`,
      }

    case 'special_offer_receipt':
      return {
        ...buildSpecialOfferReceipt(data as Parameters<typeof buildSpecialOfferReceipt>[0]),
        subject: 'Your GlowBuddy placement is live!',
      }

    case 'special_offer_expiring':
      return {
        ...buildSpecialOfferExpiring(data as Parameters<typeof buildSpecialOfferExpiring>[0]),
        subject: 'Your special expires in 48 hours',
      }

    case 'weekly_digest':
      return {
        ...buildWeeklyDigest(data as Parameters<typeof buildWeeklyDigest>[0]),
        subject: `This week: ${data.providerName}`,
      }

    case 'price_alert':
      return {
        ...buildPriceAlert(data as Parameters<typeof buildPriceAlert>[0]),
        subject: `${data.treatment} dropped to $${data.price} near you`,
      }

    case 'freshness_nudge':
      return {
        ...buildFreshnessNudge(data as Parameters<typeof buildFreshnessNudge>[0]),
        subject: `${data.staleCount} of your prices may need updating`,
      }

    default:
      throw new Error(`Unknown email template: ${template}`)
  }
}

// ─── Handler ───

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { template, to, subject: subjectOverride, data } = await req.json()

    if (!template || !to) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: template, to' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const email = buildEmail(template, data || {})
    const subject = subjectOverride || email.subject

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GlowBuddy <hello@glowbuddy.com>',
        reply_to: 'support@glowbuddy.com',
        to: Array.isArray(to) ? to : [to],
        subject,
        html: email.html,
        text: email.text,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('Resend error:', result)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: result }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('send-email error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})

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
const BASE_URL = 'https://knowbeforeyouglow.com'

// ─── Shared helpers ───

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
                <a href="${BASE_URL}" style="color:${TEXT_SECONDARY};text-decoration:underline;">knowbeforeyouglow.com</a>
                &nbsp;&middot;&nbsp;
                <a href="${BASE_URL}/settings" style="color:${TEXT_SECONDARY};text-decoration:underline;">Manage email preferences</a>
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:${TEXT_SECONDARY};font-family:${FONT};font-style:italic;">
                Know before you glow.
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:${TEXT_SECONDARY};font-family:${FONT};">
                Know Before You Glow &middot; New Orleans, LA
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
      Welcome to Know Before You Glow!
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
                <p style="margin:0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">Share your prices</p>
                <p style="margin:4px 0 0;font-size:14px;color:${TEXT_SECONDARY};">Share what you paid and help others know what to expect.</p>
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
      Your practice is now listed on Know Before You Glow. Here's what to do next.
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
                <p style="margin:4px 0 0;font-size:14px;color:${TEXT_SECONDARY};">Send your Know Before You Glow profile link to existing clients.</p>
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

  const html = emailWrapper(content, `${data.providerName} is now live on Know Before You Glow`)
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

  const html = emailWrapper(content, `Your Know Before You Glow placement for ${data.treatmentName} is now live!`)
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
      You have ${data.staleCount} price${data.staleCount === 1 ? '' : 's'} on Know Before You Glow that
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

function buildDisputeNotification(data: {
  procedureType: string
  providerName: string
  price: string | number
  city: string
  state: string
  procedureId: string
}): { html: string; text: string } {
  const confirmUrl = `${BASE_URL}/resolve-dispute?id=${data.procedureId}&action=confirmed`
  const updateUrl = `${BASE_URL}/log?procedure=${encodeURIComponent(data.procedureType)}&provider=${encodeURIComponent(data.providerName)}&city=${encodeURIComponent(data.city)}&state=${encodeURIComponent(data.state)}`
  const removeUrl = `${BASE_URL}/resolve-dispute?id=${data.procedureId}&action=removed`

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      Someone questioned your price
    </h1>
    <p style="margin:0 0 24px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      You reported <strong>${data.procedureType}</strong> at <strong>${data.providerName}</strong> for <strong>$${Number(data.price).toLocaleString()}</strong>.
      3 people have flagged this as potentially inaccurate.
    </p>

    <p style="margin:0 0 24px;font-size:15px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Was your reported price accurate?
    </p>

    <!-- Three CTA buttons stacked -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
      <tr>
        <td style="padding-bottom:12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
            <tr>
              <td style="background-color:#059669;border-radius:999px;padding:14px 32px;">
                <a href="${confirmUrl}" style="color:#ffffff;font-family:${FONT};font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Yes, it was accurate</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
            <tr>
              <td style="background-color:${ACCENT};border-radius:999px;padding:14px 32px;">
                <a href="${updateUrl}" style="color:#ffffff;font-family:${FONT};font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Update the price</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
            <tr>
              <td style="background-color:#6B7280;border-radius:999px;padding:14px 32px;">
                <a href="${removeUrl}" style="color:#ffffff;font-family:${FONT};font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Remove my submission</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      If your price is confirmed as accurate, you'll earn 200 Glow Credits + 2 bonus giveaway entries.
    </p>`

  const html = emailWrapper(content, `Someone questioned your ${data.procedureType} price at ${data.providerName}`)
  return { html, text: htmlToText(html) }
}

function buildGlowReport(data: {
  userName?: string
  city: string
  state: string
  month: string // e.g. 'April 2026'
  // Price trend
  trendProcedure?: string
  trendCurrentAvg?: number
  trendChangePercent?: number // negative = dropped
  trendDirection?: 'down' | 'up' | 'flat'
  trendSampleSize?: number
  // Savings
  lifetimeSavings?: number
  // Specials
  specials?: Array<{ providerName: string; headline: string; price: string; daysLeft: number; specialId: string }>
  // New providers
  newProviderCount?: number
  // Pioneer
  pioneerOpportunities?: number
  // Giveaway
  totalEntries?: number
}): { html: string; text: string } {
  const sections: string[] = []

  // 1. Header
  sections.push(`
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      Your ${data.city} Glow Report
    </h1>
    <p style="margin:0 0 32px;font-size:14px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      ${data.month}
    </p>`)

  // 2. Price trend
  if (data.trendProcedure && data.trendCurrentAvg != null) {
    const arrow = data.trendDirection === 'down' ? '&#8595;' : data.trendDirection === 'up' ? '&#8593;' : '&#8594;'
    const arrowColor = data.trendDirection === 'down' ? '#059669' : data.trendDirection === 'up' ? '#DC2626' : TEXT_SECONDARY
    const changeText = data.trendChangePercent != null && data.trendChangePercent !== 0
      ? `<span style="color:${arrowColor};font-weight:600;">${arrow} ${Math.abs(data.trendChangePercent)}% from last month</span>`
      : `<span style="color:${TEXT_SECONDARY};">${arrow} Unchanged</span>`

    sections.push(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr>
        <td style="padding:12px 20px;">
          <p style="margin:0 0 4px;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">
            ${data.trendProcedure} prices in ${data.city}
          </p>
          <p style="margin:0 0 8px;font-size:32px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">
            $${data.trendCurrentAvg.toLocaleString()}
          </p>
          <p style="margin:0 0 8px;font-size:14px;font-family:${FONT};">
            ${changeText}
          </p>
          ${data.trendSampleSize ? `<p style="margin:0;font-size:12px;color:${TEXT_SECONDARY};font-family:${FONT};">Based on ${data.trendSampleSize} patient submissions this month</p>` : ''}
        </td>
      </tr>
    </table>`)
  }

  // 3. Savings
  if (data.lifetimeSavings && data.lifetimeSavings > 0) {
    sections.push(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ECFDF5;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr>
        <td style="padding:12px 20px;">
          <p style="margin:0 0 4px;font-size:13px;color:#059669;font-family:${FONT};font-weight:600;">
            Your estimated savings
          </p>
          <p style="margin:0 0 8px;font-size:28px;font-weight:700;color:#059669;font-family:${FONT};">
            $${data.lifetimeSavings.toLocaleString()}
          </p>
          <p style="margin:0;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">
            Since joining Know Before You Glow, you&rsquo;ve saved an estimated $${data.lifetimeSavings.toLocaleString()} vs average pricing.
          </p>
        </td>
      </tr>
    </table>`)
  }

  // 4. Specials
  if (data.specials && data.specials.length > 0) {
    const specialRows = data.specials.slice(0, 3).map((s) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #E5E7EB;">
          <p style="margin:0;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};font-family:${FONT};">
            ${s.headline}
          </p>
          <p style="margin:2px 0 4px;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">
            ${s.providerName} &middot; ${s.price}
          </p>
          <p style="margin:0;font-size:12px;color:${ACCENT};font-family:${FONT};font-weight:600;">
            Ends in ${s.daysLeft} day${s.daysLeft !== 1 ? 's' : ''}
          </p>
        </td>
      </tr>`).join('')

    sections.push(`
    <div style="margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">
        New specials near you
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${specialRows}
      </table>
      ${ctaButton('View All Specials', `${BASE_URL}/specials`)}
    </div>`)
  }

  // 5. New providers
  if (data.newProviderCount && data.newProviderCount > 0) {
    sections.push(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr>
        <td style="padding:12px 20px;text-align:center;">
          <p style="margin:0 0 4px;font-size:28px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">
            ${data.newProviderCount}
          </p>
          <p style="margin:0 0 12px;font-size:14px;color:${TEXT_SECONDARY};font-family:${FONT};">
            new practice${data.newProviderCount !== 1 ? 's' : ''} added in ${data.city} this month
          </p>
          <a href="${BASE_URL}/map" style="display:inline-block;padding:8px 20px;border-radius:999px;font-size:13px;font-weight:600;color:${ACCENT};background-color:#FBE8EF;text-decoration:none;font-family:${FONT};">
            Explore New Providers &rarr;
          </a>
        </td>
      </tr>
    </table>`)
  }

  // 6. Pioneer opportunities
  if (data.pioneerOpportunities && data.pioneerOpportunities > 0) {
    sections.push(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFFBEB;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid rgba(251,191,36,0.3);">
      <tr>
        <td style="padding:12px 20px;">
          <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};font-family:${FONT};">
            &#127941; ${data.pioneerOpportunities} provider${data.pioneerOpportunities !== 1 ? 's' : ''} near you ${data.pioneerOpportunities !== 1 ? 'have' : 'has'} no verified prices yet.
          </p>
          <p style="margin:0 0 12px;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">
            Be the first to submit and earn Pioneer status + bonus giveaway entries.
          </p>
          <a href="${BASE_URL}/map" style="display:inline-block;padding:8px 20px;border-radius:999px;font-size:13px;font-weight:600;color:#B45309;background-color:#FEF3C7;text-decoration:none;font-family:${FONT};">
            See Unclaimed Providers &rarr;
          </a>
        </td>
      </tr>
    </table>`)
  }

  // 7. Giveaway reminder
  if (data.totalEntries != null && data.totalEntries > 0) {
    sections.push(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FBE8EF;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr>
        <td style="padding:12px 20px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:${ACCENT};font-family:${FONT};font-weight:600;">
            Monthly Giveaway
          </p>
          <p style="margin:0 0 8px;font-size:28px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">
            ${data.totalEntries} entries
          </p>
          <p style="margin:0 0 12px;font-size:13px;color:${TEXT_SECONDARY};font-family:${FONT};">
            Drawing on the last day of the month.
          </p>
          <a href="${BASE_URL}/rewards" style="display:inline-block;padding:8px 20px;border-radius:999px;font-size:13px;font-weight:600;color:${ACCENT};background-color:#FFFFFF;text-decoration:none;font-family:${FONT};border:1px solid ${ACCENT};">
            View Giveaway Status &rarr;
          </a>
        </td>
      </tr>
    </table>`)
  }

  const content = sections.join('')
  const previewText = data.trendProcedure && data.trendDirection === 'down' && data.trendChangePercent
    ? `${data.trendProcedure} dropped ${Math.abs(data.trendChangePercent)}% in ${data.city} this month`
    : data.specials && data.specials.length > 0
      ? `${data.specials.length} new special${data.specials.length !== 1 ? 's' : ''} near you — ${data.month} Glow Report`
      : `Your ${data.city} Glow Report — ${data.month}`

  const html = emailWrapper(content, previewText)
  return { html, text: htmlToText(html) }
}

function buildProviderActivity(data: {
  providerName: string
  providerSlug: string
  pageViews: number
  submissionsWeek: number
  submissionsTotal: number
  avgPrice: number | null
  competitorCount: number
  competitorName: string | null
  competitorCity: string | null
  claimUrl: string
  pageUrl: string
  optoutUrl: string
}): { html: string; text: string } {
  // Stats card rows
  const statsRows: string[] = []

  statsRows.push(`
    <tr>
      <td style="padding:10px 16px;font-family:${FONT};">
        <span style="font-size:20px;">&#128065;</span>
        <span style="font-size:15px;color:${TEXT_PRIMARY};font-weight:600;margin-left:8px;">${data.pageViews} people viewed your page</span>
      </td>
    </tr>`)

  if (data.submissionsWeek > 0) {
    statsRows.push(`
    <tr>
      <td style="padding:10px 16px;font-family:${FONT};">
        <span style="font-size:20px;">&#128176;</span>
        <span style="font-size:15px;color:${TEXT_PRIMARY};font-weight:600;margin-left:8px;">${data.submissionsWeek} patient${data.submissionsWeek !== 1 ? 's' : ''} submitted prices</span>
      </td>
    </tr>`)
  }

  if (data.avgPrice) {
    statsRows.push(`
    <tr>
      <td style="padding:10px 16px;font-family:${FONT};">
        <span style="font-size:20px;">&#128202;</span>
        <span style="font-size:15px;color:${TEXT_PRIMARY};font-weight:600;margin-left:8px;">Average reported: $${data.avgPrice}/unit</span>
      </td>
    </tr>`)
  }

  if (data.competitorCount > 0) {
    statsRows.push(`
    <tr>
      <td style="padding:10px 16px;font-family:${FONT};">
        <span style="font-size:20px;">&#9888;&#65039;</span>
        <span style="font-size:15px;color:#DC2626;font-weight:600;margin-left:8px;">${data.competitorCount} competitor${data.competitorCount !== 1 ? 's' : ''} advertising here</span>
      </td>
    </tr>`)
  }

  // Competitor callout section
  let competitorSection = ''
  if (data.competitorCount > 0 && data.competitorName) {
    competitorSection = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;background-color:#FEF2F2;border-radius:12px;">
      <tr>
        <td style="padding:20px;font-family:${FONT};">
          <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#DC2626;">&#9888;&#65039; Competitor Alert</p>
          <p style="margin:0;font-size:14px;color:${TEXT_PRIMARY};line-height:1.5;">
            <strong>${data.competitorName}</strong> in ${data.competitorCity || 'your area'} is currently appearing as a suggested alternative on your unclaimed page.
            Claiming your listing removes competitor ads from your page — for free.
          </p>
        </td>
      </tr>
    </table>`
  }

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">
      Hi ${data.providerName} team,
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${TEXT_SECONDARY};font-family:${FONT};line-height:1.5;">
      Your practice appeared on Know Before You Glow this week. Here&rsquo;s what happened:
    </p>

    <!-- Stats Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB;border-radius:12px;margin-bottom:24px;">
      ${statsRows.join('')}
    </table>

    ${competitorSection}

    <!-- Claim Benefits -->
    <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};">
      Claim your free listing to:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:6px 0;font-size:14px;color:${TEXT_PRIMARY};font-family:${FONT};">&#10003;&nbsp; Remove competitor ads from your page</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:${TEXT_PRIMARY};font-family:${FONT};">&#10003;&nbsp; Add your official price menu</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:${TEXT_PRIMARY};font-family:${FONT};">&#10003;&nbsp; Respond to patient submissions</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:${TEXT_PRIMARY};font-family:${FONT};">&#10003;&nbsp; Post specials and promotions</td></tr>
    </table>

    ${ctaButton('Claim Your Free Listing', data.claimUrl)}

    <!-- Footer note -->
    <p style="margin:32px 0 0;font-size:12px;color:${TEXT_SECONDARY};font-family:${FONT};line-height:1.6;border-top:1px solid #E5E7EB;padding-top:20px;">
      You&rsquo;re receiving this because your practice appears on Know Before You Glow. We never fabricate data &mdash; these are real patient reports.<br><br>
      <a href="${data.optoutUrl}" style="color:${TEXT_SECONDARY};text-decoration:underline;">Opt out of these updates</a>
      &nbsp;&middot;&nbsp;
      <a href="${data.pageUrl}" style="color:${TEXT_SECONDARY};text-decoration:underline;">View your page</a>
    </p>`

  const previewText = data.competitorCount > 0
    ? `A competitor is advertising on your Know Before You Glow page`
    : `${data.pageViews} people viewed ${data.providerName} on Know Before You Glow this week`

  const html = emailWrapper(content, previewText)
  return { html, text: htmlToText(html) }
}

function buildWrappedReady(data: {
  year: number | string
  displayName?: string
  treatmentsLogged?: number
  totalSavings?: number
}): { html: string; text: string } {
  const wrappedUrl = `${BASE_URL}/my/wrapped/${data.year}`
  const greeting = data.displayName ? `Hi ${data.displayName},` : 'Hi there,'
  const highlight = data.totalSavings && data.totalSavings > 100
    ? `You saved an estimated <strong>$${data.totalSavings.toLocaleString()}</strong> this year.`
    : data.treatmentsLogged
      ? `You logged <strong>${data.treatmentsLogged} treatment${data.treatmentsLogged !== 1 ? 's' : ''}</strong> this year.`
      : 'See your personalized year in review.'

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      Your ${data.year} Wrapped is here &#10024;
    </h1>
    <p style="margin:0 0 24px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};">
      ${greeting}
    </p>
    <p style="margin:0 0 8px;font-size:16px;color:${TEXT_PRIMARY};font-family:${FONT};line-height:1.6;">
      ${highlight}
    </p>
    <p style="margin:0 0 32px;font-size:15px;color:${TEXT_SECONDARY};font-family:${FONT};line-height:1.6;">
      Your personalized Know Before You Glow Wrapped is ready &mdash; see your top procedures, savings,
      city rankings, and more in an interactive year-in-review you can share with friends.
    </p>
    ${ctaButton('See My Wrapped', wrappedUrl)}`

  const html = emailWrapper(content, `Your ${data.year} Know Before You Glow Wrapped is ready`)
  return { html, text: htmlToText(html) }
}

function buildProviderListingApproved(data: {
  providerName: string
  slug: string
}): { html: string; text: string } {
  const listingUrl = `${BASE_URL}/provider/${data.slug}`
  const dashboardUrl = `${BASE_URL}/business/dashboard`

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      Your listing is live!
    </h1>
    <p style="margin:0 0 32px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Your listing for <strong>${data.providerName}</strong> is now live on Know Before You Glow.
      Add your prices to start getting discovered by patients.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;border-top:1px solid #E5E7EB;padding-top:16px;">
      <tr>
        <td style="font-family:${FONT};font-size:14px;color:${TEXT_SECONDARY};">Listing URL</td>
        <td align="right" style="padding-top:0;">
          <a href="${listingUrl}" style="font-family:${FONT};font-size:14px;color:${ACCENT};text-decoration:underline;">${listingUrl.replace('https://', '')}</a>
        </td>
      </tr>
    </table>

    ${ctaButton('View Your Listing', listingUrl)}

    <p style="margin:24px 0 0;font-size:14px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Ready to add your price menu?
      <a href="${dashboardUrl}" style="color:${ACCENT};text-decoration:underline;">Go to your dashboard</a>
    </p>`

  const html = emailWrapper(content, `Your listing for ${data.providerName} is now live on Know Before You Glow`)
  return { html, text: htmlToText(html) }
}

function buildUserSubmittedProviderApproved(data: {
  providerName: string
  slug: string
}): { html: string; text: string } {
  const listingUrl = `${BASE_URL}/provider/${data.slug}`

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};font-family:${FONT};text-align:center;">
      ${data.providerName} is now on Know Before You Glow!
    </h1>
    <p style="margin:0 0 32px;font-size:16px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Great news &mdash; <strong>${data.providerName}</strong> has been reviewed and added to Know Before You Glow.
      Your price submission is now live and helping others research costs.
    </p>

    ${ctaButton('See the Listing', listingUrl)}

    <p style="margin:24px 0 0;font-size:14px;color:${TEXT_SECONDARY};font-family:${FONT};text-align:center;">
      Thanks for contributing to price transparency!
    </p>`

  const html = emailWrapper(content, `${data.providerName} is now on Know Before You Glow`)
  return { html, text: htmlToText(html) }
}

// ─── Template router ───

type TemplateData = Record<string, unknown>

function buildEmail(template: string, data: TemplateData): { html: string; text: string; subject: string } {
  switch (template) {
    case 'welcome_user':
      return { ...buildWelcomeUser(), subject: 'Welcome to Know Before You Glow!' }

    case 'provider_welcome':
      return {
        ...buildProviderWelcome(data as Parameters<typeof buildProviderWelcome>[0]),
        subject: `${data.providerName} is live on Know Before You Glow`,
      }

    case 'special_offer_receipt':
      return {
        ...buildSpecialOfferReceipt(data as Parameters<typeof buildSpecialOfferReceipt>[0]),
        subject: 'Your Know Before You Glow placement is live!',
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

    case 'dispute_notification':
      return {
        ...buildDisputeNotification(data as Parameters<typeof buildDisputeNotification>[0]),
        subject: `Someone questioned your ${data.procedureType} price at ${data.providerName}`,
      }

    case 'glow_report': {
      const reportData = data as Parameters<typeof buildGlowReport>[0]
      // Dynamic subject line
      let subject: string
      if (reportData.trendProcedure && reportData.trendDirection === 'down' && reportData.trendChangePercent) {
        subject = `${reportData.trendProcedure} dropped ${Math.abs(reportData.trendChangePercent)}% in ${reportData.city} this month`
      } else if (reportData.specials && reportData.specials.length > 0) {
        subject = `${reportData.specials.length} new special${reportData.specials.length !== 1 ? 's' : ''} near you — ${reportData.month} Glow Report`
      } else {
        subject = `Your ${reportData.city} Glow Report — ${reportData.month}`
      }
      return { ...buildGlowReport(reportData), subject }
    }

    case 'wrapped_ready':
      return {
        ...buildWrappedReady(data as Parameters<typeof buildWrappedReady>[0]),
        subject: `Your ${data.year} Know Before You Glow Wrapped is ready`,
      }

    case 'provider_activity':
      return {
        ...buildProviderActivity(data as Parameters<typeof buildProviderActivity>[0]),
        subject: data.competitorCount && (data.competitorCount as number) > 0
          ? 'A competitor is advertising on your Know Before You Glow page'
          : `${data.pageViews} people viewed ${data.providerName} on Know Before You Glow this week`,
      }

    case 'provider_listing_approved':
      return {
        ...buildProviderListingApproved(data as Parameters<typeof buildProviderListingApproved>[0]),
        subject: 'Your Know Before You Glow listing is live!',
      }

    case 'user_submitted_provider_approved':
      return {
        ...buildUserSubmittedProviderApproved(data as Parameters<typeof buildUserSubmittedProviderApproved>[0]),
        subject: `${data.providerName} is now on Know Before You Glow!`,
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

    // Provider activity emails use hello@ as reply-to (not support@)
    const replyTo = template === 'provider_activity' ? 'hello@knowbeforeyouglow.com' : 'support@knowbeforeyouglow.com'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Know Before You Glow <hello@knowbeforeyouglow.com>',
        reply_to: replyTo,
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
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})

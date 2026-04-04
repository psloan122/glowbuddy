// Supabase Edge Function: Process Forwarded Verification Emails
// Deploy: supabase functions deploy process-verification-email
// Secrets needed: RESEND_API_KEY
//
// Resend Inbound Setup:
// 1. Configure Resend inbound domain (e.g. verify.glowbuddy.com)
// 2. Set webhook URL to this function's endpoint
// 3. Users forward booking confirmations to verify@glowbuddy.com

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const VERIFY_FROM_EMAIL = Deno.env.get('VERIFY_FROM_EMAIL') || 'verify@glowbuddy.com'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Booking platform patterns (inlined for Deno edge function) ---
const BOOKING_PLATFORMS = [
  {
    name: 'vagaro',
    patterns: [/vagaro\.com/i, /appointment.*confirmed/i],
    providerRegex: /at\s+([A-Z][^<\n]+?)(?:\s+on|\s+for)/,
    dateRegex: /(\w+ \d+,?\s*\d{4})/,
    amountRegex: /\$[\d,]+\.?\d*/,
  },
  {
    name: 'boulevard',
    patterns: [/boulevard/i, /blvd\.io/i],
    providerRegex: /appointment at\s+([^<\n]+)/i,
    dateRegex: /on\s+(\w+,\s+\w+ \d+)/i,
    amountRegex: /total[:\s]+\$?([\d.]+)/i,
  },
  {
    name: 'mindbody',
    patterns: [/mindbodyonline/i],
    providerRegex: /at\s+([^<\n,]+?)(?:,|\s+on)/i,
    dateRegex: /(\d{1,2}\/\d{1,2}\/\d{4})/,
    amountRegex: /\$[\d.]+/,
  },
  {
    name: 'square',
    patterns: [/squareup\.com/i, /square appointment/i],
    providerRegex: /appointment.*?with\s+([^<\n]+)/i,
    dateRegex: /(\w+ \d+,\s+\d{4})/,
    amountRegex: /\$[\d.]+/,
  },
  {
    name: 'acuity',
    patterns: [/acuityscheduling/i],
    providerRegex: /with\s+([^<\n]+?)(?:\s+on|\s+at)/i,
    dateRegex: /on\s+(\w+,\s+\w+ \d+,\s+\d{4})/i,
    amountRegex: /\$[\d.]+/,
  },
  {
    name: 'jane',
    patterns: [/jane\.app/i, /janeapp\.com/i],
    providerRegex: /appointment.*?at\s+([^<\n]+)/i,
    dateRegex: /(\w+ \d+,\s+\d{4})/,
    amountRegex: /\$[\d.]+/,
  },
  {
    name: 'glossgenius',
    patterns: [/glossgenius/i],
    providerRegex: /with\s+([^<\n]+?)(?:\s+on|\s+at)/i,
    dateRegex: /(\w+ \d+,?\s+\d{4})/,
    amountRegex: /\$[\d.]+/,
  },
]

function parseBookingConfirmation(emailContent: string) {
  if (!emailContent) return { confidence: 0 }

  for (const platform of BOOKING_PLATFORMS) {
    const matches = platform.patterns.some(p => p.test(emailContent))
    if (!matches) continue

    const provider = emailContent.match(platform.providerRegex)?.[1]?.trim()
    const date = emailContent.match(platform.dateRegex)?.[1]
    const amount = emailContent.match(platform.amountRegex)?.[0]

    const confidence =
      (matches ? 0.4 : 0) +
      (provider ? 0.3 : 0) +
      (date ? 0.2 : 0) +
      (amount ? 0.1 : 0)

    return {
      platform: platform.name,
      provider_name: provider || null,
      date: date || null,
      amount: amount || null,
      confidence,
    }
  }

  return { confidence: 0 }
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

async function sendReply(to: string, subject: string, message: string) {
  if (!RESEND_API_KEY) {
    console.log(`[sendReply] No RESEND_API_KEY, skipping email to ${to}: ${subject}`)
    return
  }
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: VERIFY_FROM_EMAIL,
        to,
        subject: `GlowBuddy: ${subject}`,
        text: message,
      }),
    })
  } catch (err) {
    console.error('sendReply error:', err)
  }
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Resend inbound email payload
    const senderEmail = (payload.from || '').toLowerCase().trim()
    const emailBody = payload.html
      ? htmlToText(payload.html)
      : (payload.text || '')
    const subject = payload.subject || ''

    if (!senderEmail) {
      return jsonResponse({ error: 'No sender email' }, 400)
    }

    // 1. Find GlowBuddy account by sender email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    const matchedUser = !userError
      ? users?.find((u: { email?: string }) => u.email?.toLowerCase() === senderEmail)
      : null

    if (!matchedUser) {
      await sendReply(
        senderEmail,
        'Email not recognized',
        'Make sure you forward from the same email you used to sign up for GlowBuddy.'
      )
      return jsonResponse({ status: 'unknown_user' })
    }

    const userId = matchedUser.id

    // 2. Parse the booking confirmation with regex
    const fullContent = `${subject} ${emailBody}`
    const parsed = parseBookingConfirmation(fullContent)

    if (parsed.confidence < 0.4) {
      await sendReply(
        senderEmail,
        'Could not read your confirmation',
        "We couldn't parse your appointment confirmation. Try uploading a receipt screenshot instead from your GlowBuddy profile."
      )
      return jsonResponse({ status: 'parse_failed', confidence: parsed.confidence })
    }

    // 3. Find matching recent procedure submission from this user
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    let query = supabase
      .from('procedures')
      .select('id, provider_name, trust_tier, trust_weight')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })

    if (parsed.provider_name) {
      const firstWord = parsed.provider_name.split(' ')[0]
      if (firstWord && firstWord.length >= 3) {
        query = query.ilike('provider_name', `%${firstWord}%`)
      }
    }

    const { data: procedures } = await query.limit(5)

    if (!procedures || procedures.length === 0) {
      await sendReply(
        senderEmail,
        'No recent submission found',
        'Log your treatment on GlowBuddy first, then forward the confirmation email within 7 days.'
      )
      return jsonResponse({ status: 'no_match' })
    }

    // Take the most recent match
    const procedure = procedures[0]

    // 4. Check for duplicate verification (same procedure)
    const { data: existingSub } = await supabase
      .from('verification_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('verification_type', 'appointment_confirmed')
      .limit(1)
      // Filter by evidence_data containing this procedure_id
      .contains('evidence_data', { procedure_id: procedure.id })

    if (existingSub && existingSub.length > 0) {
      return jsonResponse({ status: 'duplicate', existing_id: existingSub[0].id })
    }

    // 5. Store verification submission
    const isAutoApproved = parsed.confidence > 0.7

    const { data: submission, error: insertError } = await supabase
      .from('verification_submissions')
      .insert({
        user_id: userId,
        verification_type: 'appointment_confirmed',
        status: isAutoApproved ? 'approved' : 'pending',
        evidence_data: {
          source: 'email_forward',
          procedure_id: procedure.id,
          email_subject: subject,
          platform: parsed.platform || null,
          parsed_provider: parsed.provider_name,
          parsed_date: parsed.date,
          parsed_amount: parsed.amount,
          confidence: parsed.confidence,
          received_at: new Date().toISOString(),
        },
        verified_at: isAutoApproved ? new Date().toISOString() : null,
        reviewer_notes: isAutoApproved ? 'Auto-approved: high parser confidence' : null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to create verification submission:', insertError)
      return jsonResponse({ error: insertError.message }, 500)
    }

    // 6. Auto-approve if high confidence
    if (isAutoApproved) {
      // Update the procedure's trust tier
      await supabase
        .from('procedures')
        .update({
          trust_tier: 'appointment_confirmed',
          trust_weight: 0.85,
        })
        .eq('id', procedure.id)

      // Upsert user_verification tier (only upgrade, never downgrade)
      const tierRank: Record<string, number> = {
        self_reported: 0,
        appointment_confirmed: 1,
        receipt_verified: 2,
      }

      const { data: existing } = await supabase
        .from('user_verification')
        .select('verification_tier')
        .eq('user_id', userId)
        .maybeSingle()

      const currentRank = existing ? (tierRank[existing.verification_tier] ?? 0) : -1

      if (tierRank.appointment_confirmed > currentRank) {
        await supabase
          .from('user_verification')
          .upsert({
            user_id: userId,
            verification_tier: 'appointment_confirmed',
            updated_at: new Date().toISOString(),
          })
      }

      // Add giveaway entry bonus
      const month = new Date().toISOString().slice(0, 7)
      await supabase
        .from('giveaway_entries')
        .insert({
          user_id: userId,
          procedure_id: procedure.id,
          entries: 1,
          month,
          reason: 'appointment_verified',
        })

      await sendReply(
        senderEmail,
        'Appointment verified!',
        `Your submission for ${procedure.provider_name} has been verified and now shows an "Appointment Confirmed" badge. You also earned 1 bonus giveaway entry.`
      )
    } else {
      // Queue for manual review
      await sendReply(
        senderEmail,
        'Under review',
        'We received your confirmation but need to verify it manually. This usually takes less than 24 hours.'
      )
    }

    return jsonResponse({
      status: 'processed',
      submission_id: submission.id,
      auto_approved: isAutoApproved,
      procedure_id: procedure.id,
      parsed: {
        platform: parsed.platform,
        provider_name: parsed.provider_name,
        date: parsed.date,
        amount: parsed.amount,
        confidence: parsed.confidence,
      },
    })
  } catch (err) {
    console.error('process-verification-email error:', err)
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})

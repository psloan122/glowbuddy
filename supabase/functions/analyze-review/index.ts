// Supabase Edge Function: Claude Sentiment Analysis for Reviews
// Deploy: supabase functions deploy analyze-review
// Secrets needed: ANTHROPIC_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Anthropic API not configured' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const { review_id } = await req.json()
    if (!review_id) {
      return new Response(
        JSON.stringify({ error: 'review_id required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the review
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('id, rating, title, body, provider_id, user_id, created_at')
      .eq('id', review_id)
      .single()

    if (fetchError || !review) {
      return new Response(
        JSON.stringify({ error: 'Review not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Skip if no body text to analyze
    if (!review.body || review.body.trim().length < 20) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Review body too short for analysis' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch other recent reviews from the same user for context
    const { data: userReviews } = await supabase
      .from('reviews')
      .select('rating, body, provider_id')
      .eq('user_id', review.user_id)
      .neq('id', review_id)
      .order('created_at', { ascending: false })
      .limit(5)

    const userContext = userReviews && userReviews.length > 0
      ? `\nUser's other recent reviews (${userReviews.length}):\n${userReviews.map(r =>
          `- Rating: ${r.rating}/5, Body: "${(r.body || '').slice(0, 100)}"`
        ).join('\n')}`
      : '\nNo other reviews from this user.'

    // Call Claude API
    const prompt = `You are a fraud detection system for a medical spa review platform called GlowBuddy.

Analyze this review and determine if it appears to be fake, manipulated, or suspicious.

Review to analyze:
- Rating: ${review.rating}/5
- Title: "${review.title || '(no title)'}"
- Body: "${review.body}"
${userContext}

Respond with ONLY a JSON object (no markdown, no explanation outside the JSON):
{
  "is_suspicious": boolean,
  "confidence": number between 0 and 1,
  "category": "genuine" | "fake_positive" | "fake_negative" | "competitor_attack" | "incentivized" | "bot_generated",
  "reasoning": "one sentence explanation"
}`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('Claude API error:', errText)
      return new Response(
        JSON.stringify({ error: 'Claude API call failed' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text || ''

    // Parse Claude's JSON response
    let analysis
    try {
      analysis = JSON.parse(responseText)
    } catch {
      // Try extracting JSON from response if wrapped in text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        console.error('Failed to parse Claude response:', responseText)
        return new Response(
          JSON.stringify({ error: 'Failed to parse analysis' }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Compute risk score: high when suspicious, low when genuine
    const riskScore = analysis.is_suspicious
      ? Math.round(analysis.confidence * 100)
      : Math.round((1 - analysis.confidence) * 10)

    const aiFlags = [analysis.category].filter((f: string) => f && f !== 'genuine')

    // Always write AI results to the review row
    const updatePayload: Record<string, unknown> = {
      ai_risk_score: riskScore,
      ai_flags: aiFlags.length > 0 ? aiFlags : null,
    }

    // If suspicious with high confidence, also flag the review
    if (analysis.is_suspicious && analysis.confidence >= 0.7) {
      updatePayload.status = 'flagged'
      updatePayload.flagged_reason = `ai_flagged:${analysis.category} (${Math.round(analysis.confidence * 100)}% confidence) — ${analysis.reasoning}`
    }

    await supabase
      .from('reviews')
      .update(updatePayload)
      .eq('id', review_id)

    return new Response(
      JSON.stringify({
        review_id,
        is_suspicious: analysis.is_suspicious,
        confidence: analysis.confidence,
        category: analysis.category,
        reasoning: analysis.reasoning,
        ai_risk_score: riskScore,
        ai_flags: aiFlags,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('analyze-review error:', err)
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})

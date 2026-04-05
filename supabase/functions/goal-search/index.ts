// Supabase Edge Function: AI-powered goal-to-outcome search
// Deploy: supabase functions deploy goal-search
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

    const { query } = await req.json()
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'query must be at least 3 characters' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all outcomes for matching
    const { data: outcomes } = await supabase
      .from('outcomes')
      .select('id, slug, label, description')
      .order('sort_order')

    if (!outcomes || outcomes.length === 0) {
      return new Response(
        JSON.stringify({ matches: [] }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Step 1: Try keyword matching first (fast, no API cost)
    const q = query.trim().toLowerCase()
    const keywordMatches = outcomes.filter((o) => {
      const text = `${o.label} ${o.description}`.toLowerCase()
      return q.split(/\s+/).some((word) => word.length >= 3 && text.includes(word))
    })

    if (keywordMatches.length > 0) {
      return new Response(
        JSON.stringify({ matches: keywordMatches.slice(0, 5).map((o) => o.slug), source: 'keyword' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Fall back to Claude for natural language understanding
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ matches: [], source: 'none' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const outcomeList = outcomes.map((o) => `- ${o.slug}: ${o.label} — ${o.description}`).join('\n')

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 128,
        messages: [{
          role: 'user',
          content: `You are a cosmetic treatment outcome matcher. Given a user's search query, return the most relevant outcome slugs from the list below.

Available outcomes:
${outcomeList}

User query: "${query.trim()}"

Return ONLY a JSON array of 1-5 matching slugs, most relevant first. Example: ["look-less-tired","brighten-dull-skin"]
If nothing matches, return [].`,
        }],
      }),
    })

    if (!claudeRes.ok) {
      return new Response(
        JSON.stringify({ matches: [], source: 'error' }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const claudeData = await claudeRes.json()
    const responseText = claudeData.content?.[0]?.text || '[]'

    let slugs: string[] = []
    try {
      const parsed = JSON.parse(responseText)
      if (Array.isArray(parsed)) {
        slugs = parsed.filter((s: unknown) => typeof s === 'string')
      }
    } catch {
      const match = responseText.match(/\[[\s\S]*?\]/)
      if (match) {
        try {
          slugs = JSON.parse(match[0])
        } catch {
          // ignore
        }
      }
    }

    // Validate slugs against actual outcomes
    const validSlugs = new Set(outcomes.map((o) => o.slug))
    const filtered = slugs.filter((s) => validSlugs.has(s)).slice(0, 5)

    return new Response(
      JSON.stringify({ matches: filtered, source: 'ai' }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('goal-search error:', err)
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})

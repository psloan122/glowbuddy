import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { currentTreatments, consideredTreatments, stackingData, localPrices, city } = await req.json()

    if (!currentTreatments || currentTreatments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No current treatments provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are a medical aesthetics advisor for Know Before You Glow.
Advise on building a safe treatment routine.
Only reference combinations with published clinical evidence.
All timing guidance must align with peer-reviewed intervals.
Never make medical claims. Always recommend consulting a provider.
Use "typically" and "may" language throughout.

Compatibility data (with sources): ${JSON.stringify(stackingData)}
Local pricing in ${city || 'their area'}: ${JSON.stringify(localPrices)}

Respond ONLY in JSON:
{
  "recommendation": "2-3 sentence advice using may/typically language",
  "suggested_additions": ["treatment1"],
  "timing_guidance": "specific interval with source basis",
  "cautions": ["watch-outs with source basis"],
  "estimated_monthly_cost": { "low": number, "high": number },
  "sources": [{ "label": "source name", "url": "source url" }]
}`,
        messages: [
          {
            role: 'user',
            content: `I currently get: ${currentTreatments.join(', ')}. I'm considering adding: ${consideredTreatments.join(', ')}. What's safe to combine, what should I space apart, and what's the best routine?`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Anthropic API error:', response.status, errorBody)
      return new Response(
        JSON.stringify({ error: 'Failed to generate stack advice.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicData = await response.json()
    const textContent = anthropicData.content?.find(
      (block: { type: string }) => block.type === 'text'
    )

    if (!textContent?.text) {
      return new Response(
        JSON.stringify({ error: 'Unexpected AI response.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const parsed = JSON.parse(textContent.text)

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('stack-advisor error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

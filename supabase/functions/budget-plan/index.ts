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

    // Parse the request body
    const { budget, history, overdue, localPrices, cadenceData, city } = await req.json()

    // If no history provided, suggest logging treatments first
    if (!history || history.length === 0) {
      return new Response(
        JSON.stringify({
          recommendations: [],
          total_estimated_low: 0,
          total_estimated_high: 0,
          leftover_suggestion: '',
          summary:
            'You haven\'t logged any treatments yet. Start by adding your treatment history in Know Before You Glow so we can give you personalized budget recommendations based on your unique routine and timing.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        system: `You are a medical aesthetics advisor for Know Before You Glow. Recommend how to best spend the user's budget based on their treatment history, what's overdue, and local prices. Base all timing recommendations on FDA-approved retreatment intervals from the cadence data provided. Use "may" and "typically" language — never guarantee outcomes. Prioritize: overdue treatments → best value per month → complementary treatments. Respond ONLY in JSON: { "recommendations": [{ "treatment": string, "reason": string, "estimated_cost_low": number, "estimated_cost_high": number, "priority": "high" | "medium" | "low", "value_note": string }], "total_estimated_low": number, "total_estimated_high": number, "leftover_suggestion": string, "summary": string }`,
        messages: [
          {
            role: 'user',
            content: `Budget: $${budget}. City: ${city || 'unknown'}. Treatment history: ${JSON.stringify(history)}. Overdue treatments: ${JSON.stringify(overdue)}. Local average prices: ${JSON.stringify(localPrices)}. Cadence data: ${JSON.stringify(cadenceData)}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Anthropic API error:', response.status, errorBody)
      return new Response(
        JSON.stringify({ error: 'Failed to generate budget plan. Please try again later.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicData = await response.json()

    // Extract text content from Claude response
    const textContent = anthropicData.content?.find(
      (block: { type: string }) => block.type === 'text'
    )

    if (!textContent?.text) {
      console.error('Unexpected Anthropic response shape:', JSON.stringify(anthropicData))
      return new Response(
        JSON.stringify({ error: 'Received an unexpected response from the AI. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the JSON from Claude's text response
    const parsedPlan = JSON.parse(textContent.text)

    return new Response(JSON.stringify(parsedPlan), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('budget-plan error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error generating budget plan.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

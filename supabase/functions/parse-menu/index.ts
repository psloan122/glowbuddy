import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_PROCEDURES = [
  'Botox', 'Dysport', 'Xeomin', 'Jeuveau', 'Daxxify',
  'Lip Filler', 'Cheek Filler', 'Jawline Filler', 'Under Eye Filler',
  'Dermal Filler', 'Juvederm', 'Restylane', 'Sculptra', 'Radiesse', 'Kybella',
  'Microneedling', 'Morpheus8', 'HydraFacial', 'Chemical Peel',
  'IPL', 'BBL', 'Laser Hair Removal', 'CoolSculpting', 'Emsculpt NEO',
  'Semaglutide', 'Tirzepatide', 'IV Therapy', 'PRF', 'PRP', 'Facial', 'Other',
]

const PARSE_PROMPT = `You are parsing a med spa price menu. Extract every procedure and price.

Return ONLY a JSON array, no markdown, no explanation:
[
  {
    "raw_text": "original line from menu",
    "procedure_type": "standardized procedure name",
    "price": 12.50,
    "price_label": "per_unit|per_session|per_syringe|per_vial|per_area|flat_package",
    "confidence": 0.95,
    "notes": "any relevant context"
  }
]

Rules:
- procedure_type must be one of: ${VALID_PROCEDURES.join(', ')}
- price_label: neurotoxins → per_unit if price < 30, otherwise flat_package or per_area
- confidence: 1.0 = explicit price, 0.7 = inferred, 0.5 = unclear
- Skip non-pricing lines (descriptions, disclaimers, contact info)
- Skip booking deposits and consultation fees

Menu text:
`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { menu_id, provider_id, file_url, raw_text } = await req.json()

    if (!menu_id || !provider_id) {
      return new Response(
        JSON.stringify({ error: 'menu_id and provider_id required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    let textToParse = raw_text || ''

    // If file URL provided and no raw text, extract text via Claude vision
    if (file_url && !raw_text) {
      try {
        const fileRes = await fetch(file_url)
        const buffer = await fileRes.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        const isPdf = file_url.toLowerCase().endsWith('.pdf')
        const mimeType = isPdf ? 'application/pdf' : 'image/jpeg'

        const visionRes = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              {
                type: isPdf ? 'document' : 'image',
                source: { type: 'base64', media_type: mimeType, data: base64 },
              } as any,
              {
                type: 'text',
                text: 'Extract all the text from this med spa price menu. Return just the raw text, preserving structure.',
              },
            ],
          }],
        })

        textToParse = visionRes.content[0].type === 'text'
          ? visionRes.content[0].text
          : ''

        // Save raw text back to menu record
        await supabase
          .from('provider_menus')
          .update({ raw_text: textToParse })
          .eq('id', menu_id)
      } catch (visionErr) {
        console.error('Vision extraction failed:', visionErr)
        return new Response(
          JSON.stringify({ error: 'Could not extract text from file' }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        )
      }
    }

    if (!textToParse.trim()) {
      return new Response(
        JSON.stringify({ error: 'No text to parse' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // Parse text into structured pricing
    const parseRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: PARSE_PROMPT + textToParse,
      }],
    })

    let parsed: any[] = []
    try {
      const content = parseRes.content[0].type === 'text'
        ? parseRes.content[0].text
        : '[]'
      parsed = JSON.parse(content.replace(/```json|```/g, '').trim())
    } catch {
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // Validate and insert into staging
    const stagingRows = parsed
      .filter((item: any) => item.price > 0 && item.procedure_type)
      .map((item: any) => ({
        menu_id,
        provider_id,
        raw_text: item.raw_text || '',
        procedure_type: item.procedure_type,
        price: item.price,
        price_label: item.price_label || 'per_session',
        confidence: item.confidence ?? 0.5,
        is_confirmed: (item.confidence ?? 0) >= 0.9,
        notes: item.notes || null,
      }))

    if (stagingRows.length > 0) {
      const { error: insertErr } = await supabase
        .from('menu_items_staging')
        .insert(stagingRows)

      if (insertErr) {
        console.error('Staging insert failed:', insertErr)
      }
    }

    // Mark menu as parsed
    await supabase
      .from('provider_menus')
      .update({ parsed_at: new Date().toISOString() })
      .eq('id', menu_id)

    return new Response(
      JSON.stringify({ parsed: stagingRows.length, items: stagingRows }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('parse-menu error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})

import Anthropic from '@anthropic-ai/sdk';
import { PROCEDURE_TYPES, PRICE_LABEL_OPTIONS } from '../src/lib/constants.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileBase64, mimeType } = req.body;
  if (!fileBase64 || !mimeType) {
    return res.status(400).json({ error: 'fileBase64 and mimeType are required' });
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const isPdf = mimeType === 'application/pdf';

    const mediaContent = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: mimeType, data: fileBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: mimeType, data: fileBase64 } };

    const promptText = `You are analyzing a med spa / aesthetics practice price menu. Extract every procedure and its price.

For each item, return a JSON object with:
- "menu_name": the procedure name exactly as shown on the menu
- "procedure_type": map to the closest match from this list: ${JSON.stringify(PROCEDURE_TYPES)}. If no close match exists, use the menu name as-is.
- "treatment_area": body area if specified (e.g. "Forehead", "Lips", "Full Face"), otherwise ""
- "price": numeric price (no $ sign). For ranges like "$200-$400", use the lower number.
- "price_label": one of ${JSON.stringify(PRICE_LABEL_OPTIONS)}. Default to "per session" if unclear. Use "per unit" for neurotoxins priced per unit.
- "is_consultation": true if this is a consultation fee, deposit, membership fee, or non-procedure charge; false otherwise

Return ONLY a JSON array, no markdown fences or explanation. Example:
[{"menu_name":"Botox","procedure_type":"Botox / Dysport / Xeomin","treatment_area":"","price":12,"price_label":"per unit","is_consultation":false}]

If this is not a price menu or no prices can be extracted, return: []`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [mediaContent, { type: 'text', text: promptText }],
        },
      ],
    });

    const text = response.content[0]?.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.json({ items: [] });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.json({ items: Array.isArray(parsed) ? parsed : [] });
  } catch (err) {
    console.error('Menu parsing error:', err);
    return res.status(500).json({ error: 'Failed to parse menu', items: [] });
  }
}

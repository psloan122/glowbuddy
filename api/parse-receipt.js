import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { storagePath } = req.body;
  if (!storagePath) {
    return res.status(400).json({ error: 'storagePath is required' });
  }

  try {
    // Use service role key to generate a signed URL for the receipt
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('receipts')
      .createSignedUrl(storagePath, 300);

    if (urlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', urlError);
      return res.json({ valid: false });
    }

    const fileUrl = signedUrlData.signedUrl;
    const isPdf = storagePath.toLowerCase().endsWith('.pdf');

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const promptText = `Extract the following from this medical spa or cosmetic procedure receipt. Return JSON only:
{
  "procedure_name": string or null,
  "price_paid": number or null,
  "provider_name": string or null,
  "date": string (YYYY-MM-DD) or null,
  "units": string or null,
  "confidence": "high" | "medium" | "low"
}
If this does not appear to be a cosmetic procedure receipt return: {"valid": false}`;

    const imageContent = isPdf
      ? { type: 'document', source: { type: 'url', url: fileUrl } }
      : { type: 'image', source: { type: 'url', url: fileUrl } };

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [imageContent, { type: 'text', text: promptText }],
        },
      ],
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.json({ valid: false });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.json(parsed);
  } catch (err) {
    console.error('Receipt parsing error:', err);
    return res.json({ valid: false });
  }
}

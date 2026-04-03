import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { providerId, photos } = req.body;

  if (!providerId || !Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: 'providerId and photos[] are required' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const toImport = photos.slice(0, 5);

    const results = await Promise.allSettled(
      toImport.map(async (photo, i) => {
        // Fetch image from Google CDN server-side (avoids CORS)
        const response = await fetch(photo.displayUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const buffer = Buffer.from(await response.arrayBuffer());

        const storagePath = `${providerId}/${Date.now()}-${i}.${ext}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('provider-photos')
          .upload(storagePath, buffer, {
            contentType,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('provider-photos')
          .getPublicUrl(storagePath);

        // Insert row in provider_photos table
        const { error: insertError } = await supabase
          .from('provider_photos')
          .insert({
            provider_id: providerId,
            storage_path: storagePath,
            public_url: urlData.publicUrl,
            source: 'google',
            google_attribution: photo.attribution || null,
            display_order: photo.index ?? i,
          });

        if (insertError) throw insertError;

        return { storagePath, publicUrl: urlData.publicUrl };
      })
    );

    const imported = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    return res.json({
      success: true,
      imported: imported.length,
      failed: failed.length,
      photos: imported.map((r) => r.value),
    });
  } catch (err) {
    console.error('Import Google photos error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'path is required' });
  }

  // Require auth — verify JWT from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify the JWT token
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(path, 300);

    if (error) {
      return res.status(500).json({ error: 'Failed to generate URL' });
    }

    return res.json({ url: data.signedUrl });
  } catch (err) {
    console.error('Receipt URL error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

import { createClient } from '@supabase/supabase-js';

const STATIC_ROUTES = [
  { loc: '/', priority: '1.0' },
  { loc: '/guides/botox-dysport-xeomin', priority: '0.8' },
  { loc: '/guides/lip-filler', priority: '0.8' },
  { loc: '/guides/cheek-filler', priority: '0.8' },
  { loc: '/guides/microneedling', priority: '0.8' },
  { loc: '/guides/chemical-peel', priority: '0.8' },
  { loc: '/guides/hydrafacial', priority: '0.8' },
  { loc: '/guides/kybella', priority: '0.8' },
  { loc: '/guides/rf-microneedling', priority: '0.8' },
  { loc: '/guides/sculptra', priority: '0.8' },
  { loc: '/goals/look-less-tired', priority: '0.7' },
  { loc: '/goals/smooth-forehead-lines', priority: '0.7' },
  { loc: '/goals/get-rid-of-11-lines', priority: '0.7' },
  { loc: '/goals/plumper-lips', priority: '0.7' },
  { loc: '/goals/lift-sagging-cheeks', priority: '0.7' },
  { loc: '/goals/shrink-pores', priority: '0.7' },
  { loc: '/goals/fix-acne-scars', priority: '0.7' },
  { loc: '/goals/brighten-dull-skin', priority: '0.7' },
  { loc: '/goals/reduce-double-chin', priority: '0.7' },
  { loc: '/goals/prevent-aging', priority: '0.7' },
  { loc: '/goals/remove-sun-damage', priority: '0.7' },
  { loc: '/goals/smooth-crows-feet', priority: '0.7' },
  { loc: '/goals/slim-jawline', priority: '0.7' },
  { loc: '/prices', priority: '0.9' },
];

const MIN_SUBMISSIONS = 5;

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );

  // Fetch distinct city/state combos
  const { data: rows } = await supabase
    .from('procedures')
    .select('city, state')
    .eq('status', 'active')
    .not('city', 'is', null)
    .not('state', 'is', null);

  const counts = {};
  if (rows) {
    for (const r of rows) {
      const key = `${r.city}|${r.state}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  const cityRoutes = Object.entries(counts)
    .filter(([, count]) => count >= MIN_SUBMISSIONS)
    .map(([key]) => {
      const [city, state] = key.split('|');
      return { loc: `/prices/${slugify(city)}-${state.toLowerCase()}`, priority: '0.8' };
    });

  const allRoutes = [...STATIC_ROUTES, ...cityRoutes];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map((r) => `  <url>
    <loc>https://knowbeforeyouglow.com${r.loc}</loc>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  return res.status(200).send(xml);
}

/**
 * classify-medspa.js
 *
 * Procedure-aware med spa classifier.
 *
 * Two-stage pipeline:
 *   Stage 1: Fast rule-based filter (zero API cost)
 *   Stage 2: Claude Haiku for uncertain cases (opt-in via --with-claude)
 *
 * After classification, fills procedure_tags based on name signals.
 *
 * Only operates on rows where is_medical_aesthetic IS NULL — never
 * touches already-classified or manually curated data.
 *
 * Run:
 *   npm run classify                 Stage 1 only (rules, free)
 *   npm run classify:with-claude     Stage 1 + Stage 2 (Haiku, ~$0.25/10k)
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY (only required with --with-claude)
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const argv = process.argv.slice(2);
const WITH_CLAUDE = argv.includes('--with-claude');
const LIMIT = (() => {
  const i = argv.indexOf('--limit');
  return i >= 0 && i + 1 < argv.length ? parseInt(argv[i + 1], 10) : null;
})();

const anthropic = WITH_CLAUDE
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

if (WITH_CLAUDE && !process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in .env (required for --with-claude)');
  process.exit(1);
}

// ─── Stage 1: Rule-based keyword lists ────────────────────────────────────

const DEFINITE_MEDSPA = [
  // Procedure-specific — only done at medical aesthetic practices
  'botox', 'dysport', 'xeomin', 'jeuveau', 'daxxify', 'neurotoxin',
  'neuromodulator',
  'juvederm', 'restylane', 'sculptra', 'radiesse', 'belotero', 'versa', 'rha',
  'kybella', 'coolsculpting', 'emsculpt', 'morpheus', 'morpheus8',
  'ultherapy', 'ulthera', 'thermage',
  'hydrafacial', 'hydra facial',
  'microneedling', 'micro-needling', 'rf microneedling', 'prp facial',
  'vampire facial', 'sculptsure', 'sculpsure',
  'semaglutide', 'tirzepatide', 'wegovy', 'ozempic', 'mounjaro', 'zepbound',
  'iv therapy', 'iv drip', 'myers cocktail', 'b12 shot', 'nad+', 'nad therapy',
  'lip filler', 'lip augmentation', 'cheek filler', 'under eye filler',
  'tear trough', 'dermal filler', 'thread lift', 'pdo thread',
  'laser hair removal', 'ipl photofacial', 'co2 laser', 'fraxel', 'halo laser',
  'photofacial', 'photo facial', 'chemical peel', 'vi peel',
  'body contouring', 'body sculpting', 'fat freezing', 'fat reduction',
  'skin tightening', 'skin rejuvenation',
  'anti-aging', 'anti aging', 'antiaging',

  // Business type names
  'med spa', 'medspa', 'medi spa', 'medispa',
  'medical spa', 'medical aesthetics',
  'aesthetic clinic', 'aesthetics clinic',
  'aesthetic center', 'aesthetics center',
  'cosmetic clinic', 'cosmetic center',
  'cosmetic surgery center', 'plastic surgery center',
  'dermatology and aesthetics',
  'skin and laser', 'laser and skin', 'laser aesthetics', 'laser clinic',
  'injectable', 'injectables',
  'aesthetic medicine', 'aesthetic wellness',
  'skin rejuvenation center', 'cosmetic dermatology',
];

const DEFINITE_NOT_MEDSPA = [
  // Personal care — never med spas
  'nail salon', 'nail bar', 'nail studio', 'nail spa', 'the nail',
  'nails by', 'nail lounge', 'nail art',
  'hair salon', 'hair studio', 'hair bar', 'hair lounge', 'hair boutique',
  'salon & spa', 'salon and spa',
  'barber', 'barbershop', 'barber shop',
  'hair color', 'blow dry', 'blowout',
  'lash bar', 'lash studio', 'lash lounge', 'lash extension',
  'brow bar', 'brow studio', 'eyebrow threading', 'threading salon',
  'waxing salon', 'wax center', 'european wax', 'sugaring',
  'tanning salon', 'spray tan',
  'tattoo', 'tattoo parlor', 'piercing studio', 'body piercing',

  // Wellness that is NOT aesthetics
  'massage therapy', 'massage studio', 'massage envy', 'day spa',
  'float spa', 'float tank', 'cryotherapy',
  'infrared sauna', 'salt cave', 'salt therapy',
  'acupuncture', 'acupuncturist',
  'chiropractor', 'chiropractic',
  'physical therapy', 'physiotherapy', 'occupational therapy',
  'speech therapy', 'speech language',
  'mental health', 'behavioral health',
  'counseling', 'therapist', 'psychiatry', 'psychiatrist',
  'psychology', 'psychologist',

  // Medical — not aesthetic
  'urgent care', 'emergency room', 'hospital', 'medical center',
  'primary care', 'family practice',
  'pediatrics', 'pediatric',
  'obstetrics', 'gynecology', 'ob gyn',
  'cardiology', 'cardiologist', 'orthopedic', 'orthopaedic',
  'podiatry', 'podiatrist', 'audiology', 'audiologist',
  'optometry', 'optometrist', 'ophthalmology', 'eye care', 'eye clinic',
  'dental', 'dentist', 'orthodontics', 'oral surgery', 'endodontics',
  'pharmacy', 'drug store', 'cvs', 'walgreens',
  'veterinary', 'veterinarian', 'pet clinic', 'animal hospital',

  // Businesses — never med spas
  'restaurant', 'cafe', 'coffee', 'nightclub',
  'hotel', 'resort',
  'gym', 'fitness center', 'crossfit', 'yoga studio', 'pilates',
  'real estate', 'insurance', 'law office', 'attorney',
  'school', 'academy', 'university',
  'daycare', 'preschool', 'kindergarten',
  'church', 'mosque', 'synagogue',
  'funeral', 'mortuary',
];

const STAGE1_EXCLUDE_TYPES = new Set([
  'hair_care', 'nail_salon', 'dentist', 'pharmacy', 'veterinary_care',
  'hospital', 'school', 'restaurant', 'bar', 'lodging',
  'gym', 'store', 'car_dealer', 'bank',
  'atm', 'post_office', 'place_of_worship',
  'funeral_home', 'cemetery',
]);

const STAGE1_INCLUDE_TYPES = new Set([
  'beauty_salon', 'spa', 'health', 'doctor',
  'physiotherapist', 'medical_health_service',
]);

const AESTHETIC_PATTERNS = [
  /\bglow\b/, /\bskin\b/, /\bbeauty\b/, /\bwellness\b/,
  /\baestheti/, /\bcosmeti/, /\brejuven/, /\brefresh/,
  /\brenew\b/, /\brevive\b/, /\brestore\b/,
  /\bderma/, /\bplastic\b/, /\bsculpt\b/, /\blaser\b/,
  /\bmedical\b/, /\bclinic\b/, /\bcenter\b/, /\binstitute\b/,
];

function stage1Classify(name, types) {
  const nameLower = (name || '').toLowerCase().trim();

  // 1. Hard excludes by name
  for (const kw of DEFINITE_NOT_MEDSPA) {
    if (nameLower.includes(kw)) {
      return { decision: 'exclude', reason: `name contains "${kw}"` };
    }
  }

  // 2. Hard excludes by Google type
  for (const t of types || []) {
    if (STAGE1_EXCLUDE_TYPES.has(t)) {
      return { decision: 'exclude', reason: `google type: ${t}` };
    }
  }

  // 3. Hard includes by name
  for (const kw of DEFINITE_MEDSPA) {
    if (nameLower.includes(kw)) {
      return { decision: 'include', reason: `name contains "${kw}"` };
    }
  }

  // 4. Type + pattern heuristic for uncertain cases
  const typeMatch = (types || []).some((t) => STAGE1_INCLUDE_TYPES.has(t));
  const patternMatches = AESTHETIC_PATTERNS.filter((p) => p.test(nameLower)).length;

  if (patternMatches >= 2 && typeMatch) {
    return { decision: 'uncertain', reason: 'multiple aesthetic signals' };
  }
  if (typeMatch && patternMatches >= 1) {
    return { decision: 'uncertain', reason: 'possible aesthetic clinic' };
  }

  return { decision: 'exclude', reason: 'no aesthetic indicators' };
}

// ─── Stage 2: Claude Haiku batch classify ─────────────────────────────────

async function stage2ClaudeClassify(batch) {
  if (batch.length === 0) return {};

  const items = batch
    .map(
      (p) =>
        `ID: ${p.id}\nName: ${p.name}\nAddress: ${p.address || ''}\nTypes: ${(p.place_types || []).join(', ')}`,
    )
    .join('\n\n');

  const prompt = `You are classifying businesses to determine if they are legitimate medical aesthetic practices (med spas) that offer treatments like Botox, fillers, laser treatments, microneedling, body contouring, GLP-1 injections, or other medical aesthetic procedures.

Classify each business as one of:
  YES - definitely a medical aesthetic practice
  NO  - definitely not a medical aesthetic practice
  MAYBE - could be but unclear

Businesses to classify:

${items}

Rules:
- Regular day spas, massage studios, nail salons, hair salons are always NO
- Plastic surgery centers, dermatology practices, and cosmetic clinics are always YES
- "Wellness centers" are MAYBE unless they mention specific aesthetic procedures
- Hormone therapy clinics are YES (GLP-1 overlap)
- IV therapy clinics are YES
- Any business with "aesthetics" in the name is YES unless it's clearly something else (e.g. "auto aesthetics")

Respond in JSON only:
{"results": [{"id": "...", "classification": "YES|NO|MAYBE", "reason": "brief reason"}]}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text;
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(clean);

    const results = {};
    for (const item of data.results || []) {
      results[String(item.id)] = {
        classification: item.classification,
        reason: item.reason || '',
      };
    }
    return results;
  } catch (err) {
    console.error(`  Claude error: ${err.message}`);
    return {};
  }
}

// ─── Stage 3: Procedure detection ─────────────────────────────────────────

const PROCEDURE_SIGNALS = {
  neurotoxin: [
    'botox', 'dysport', 'xeomin', 'jeuveau', 'daxxify',
    'neurotoxin', 'neuromodulator', 'wrinkle', 'frown line',
    'forehead line', 'crow',
  ],
  filler: [
    'filler', 'juvederm', 'restylane', 'sculptra', 'radiesse',
    'lip augment', 'cheek', 'volume', 'hyaluronic',
  ],
  laser: [
    'laser', 'ipl', 'photofacial', 'broadband', 'bbl',
    'resurfacing', 'hair removal', 'pigment', 'vascular',
  ],
  microneedling: [
    'microneedling', 'micro-needling', 'morpheus', 'vivace',
    'rf needle', 'collagen induction',
  ],
  body: [
    'coolsculpting', 'emsculpt', 'sculpsure', 'body contour',
    'fat reduction', 'fat freezing', 'kybella', 'lipo',
  ],
  skin: [
    'chemical peel', 'vi peel', 'tca peel', 'glycolic', 'peel',
    'hydrafacial', 'hydra facial', 'hydradermabrasion',
  ],
  'weight-loss': [
    'semaglutide', 'tirzepatide', 'wegovy', 'ozempic', 'mounjaro',
    'glp', 'weight loss', 'weight management', 'medical weight',
  ],
  'iv-wellness': [
    'iv therapy', 'iv drip', 'iv infusion', 'myers cocktail',
    'vitamin drip', 'nad', 'iv vitamin',
  ],
  specialty: [
    'prp', 'platelet', 'vampire facial', 'prf', 'platelet rich',
  ],
  'rf-tightening': [
    'ultherapy', 'thermage', 'sofwave', 'skin tightening',
    'rf lift', 'ultrasound lift', 'forma',
  ],
};

function detectProcedures(name) {
  const text = (name || '').toLowerCase();
  const detected = [];
  for (const [procedure, signals] of Object.entries(PROCEDURE_SIGNALS)) {
    if (signals.some((s) => text.includes(s))) {
      detected.push(procedure);
    }
  }
  return detected;
}

// ─── Bulk update helpers ──────────────────────────────────────────────────

async function updateBatch(ids, payload) {
  if (ids.length === 0) return;
  // Supabase has a URL length limit for .in() queries; chunk at 100
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { error } = await supabase
      .from('providers')
      .update(payload)
      .in('id', chunk);
    if (error) {
      console.error(`  Update error (${chunk.length} rows): ${error.message}`);
    }
  }
}

async function fetchUnclassified() {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let query = supabase
      .from('providers')
      .select('id, name, address, place_types, procedure_tags')
      .is('is_medical_aesthetic', null)
      .range(from, from + pageSize - 1);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (LIMIT && rows.length >= LIMIT) {
      return rows.slice(0, LIMIT);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   GlowBuddy Med Spa Classifier              ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`Stage 2 (Claude): ${WITH_CLAUDE ? 'ENABLED' : 'disabled (use --with-claude)'}`);
  if (LIMIT) console.log(`Limit: ${LIMIT} rows`);

  console.log('\nFetching unclassified providers...');
  const providers = await fetchUnclassified();
  console.log(`Found ${providers.length} rows with is_medical_aesthetic IS NULL`);

  if (providers.length === 0) {
    console.log('Nothing to classify. Done.');
    return;
  }

  // Stage 1: rule-based
  const definiteInclude = [];
  const definiteExclude = [];
  const uncertain = [];

  for (const p of providers) {
    const result = stage1Classify(p.name, p.place_types || []);
    if (result.decision === 'include') {
      definiteInclude.push({ provider: p, reason: result.reason });
    } else if (result.decision === 'exclude') {
      definiteExclude.push({ provider: p, reason: result.reason });
    } else {
      uncertain.push(p);
    }
  }

  console.log(`\nStage 1 (rule-based) results:`);
  console.log(`  definite include: ${definiteInclude.length}`);
  console.log(`  definite exclude: ${definiteExclude.length}`);
  console.log(`  uncertain:        ${uncertain.length}${WITH_CLAUDE ? ' → Claude' : ' → skipped (left as NULL)'}`);

  const now = new Date().toISOString();

  // Write Stage 1 includes
  if (definiteInclude.length > 0) {
    console.log(`\nPromoting ${definiteInclude.length} rule-confirmed med spas...`);
    // Group by reason to preserve per-row classification_reason via separate batches
    // (simpler: do one reason per batch if same, else use most common)
    // We'll do per-row update for reason accuracy, but bulk the booleans.
    const allIds = definiteInclude.map((x) => x.provider.id);
    await updateBatch(allIds, {
      is_medical_aesthetic: true,
      is_active: true,
      classification_source: 'rule_based',
      classified_at: now,
    });

    // Procedure tags — per-row
    let procTagged = 0;
    for (const { provider } of definiteInclude) {
      const detected = detectProcedures(provider.name);
      if (detected.length > 0) {
        const existing = provider.procedure_tags || [];
        const merged = Array.from(new Set([...existing, ...detected]));
        if (merged.length !== existing.length) {
          const { error } = await supabase
            .from('providers')
            .update({ procedure_tags: merged })
            .eq('id', provider.id);
          if (!error) procTagged++;
        }
      }
    }
    console.log(`  procedure_tags updated on ${procTagged} rows`);
  }

  // Write Stage 1 excludes
  if (definiteExclude.length > 0) {
    console.log(`\nMarking ${definiteExclude.length} non-med-spas...`);
    const allIds = definiteExclude.map((x) => x.provider.id);
    await updateBatch(allIds, {
      is_medical_aesthetic: false,
      is_active: false,
      classification_source: 'rule_based',
      classified_at: now,
    });
  }

  // Stage 2: Claude (only if enabled)
  if (WITH_CLAUDE && uncertain.length > 0) {
    console.log(`\nRunning Claude Haiku on ${uncertain.length} uncertain providers...`);

    const claudeInclude = [];
    const claudeExclude = [];

    const batchSize = 20;
    for (let i = 0; i < uncertain.length; i += batchSize) {
      const batch = uncertain.slice(i, i + batchSize);
      const results = await stage2ClaudeClassify(batch);

      for (const p of batch) {
        const r = results[String(p.id)] || { classification: 'NO' };
        if (r.classification === 'YES') {
          claudeInclude.push(p);
        } else if (r.classification === 'MAYBE') {
          // Conservative: only include if name has aesthetic signals
          const nameLower = (p.name || '').toLowerCase();
          const hasSignal = [
            'skin', 'aesthetic', 'glow', 'beauty', 'cosmetic',
            'wellness', 'medical', 'health', 'clinic',
          ].some((kw) => nameLower.includes(kw));
          if (hasSignal) claudeInclude.push(p);
          else claudeExclude.push(p);
        } else {
          claudeExclude.push(p);
        }
      }

      process.stdout.write(`  batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uncertain.length / batchSize)}\r`);
    }
    console.log('');

    if (claudeInclude.length > 0) {
      const ids = claudeInclude.map((p) => p.id);
      await updateBatch(ids, {
        is_medical_aesthetic: true,
        is_active: true,
        classification_source: 'claude_haiku',
        classified_at: now,
      });
      let procTagged = 0;
      for (const provider of claudeInclude) {
        const detected = detectProcedures(provider.name);
        if (detected.length > 0) {
          const existing = provider.procedure_tags || [];
          const merged = Array.from(new Set([...existing, ...detected]));
          if (merged.length !== existing.length) {
            const { error } = await supabase
              .from('providers')
              .update({ procedure_tags: merged })
              .eq('id', provider.id);
            if (!error) procTagged++;
          }
        }
      }
      console.log(`  procedure_tags updated on ${procTagged} Claude-included rows`);
    }

    if (claudeExclude.length > 0) {
      const ids = claudeExclude.map((p) => p.id);
      await updateBatch(ids, {
        is_medical_aesthetic: false,
        is_active: false,
        classification_source: 'claude_haiku',
        classified_at: now,
      });
    }

    console.log(`\nStage 2 (Claude) results:`);
    console.log(`  included: ${claudeInclude.length}`);
    console.log(`  excluded: ${claudeExclude.length}`);
  }

  // Summary
  const { count: totalActive } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('is_medical_aesthetic', true);

  const { count: remainingNull } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .is('is_medical_aesthetic', null);

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   CLASSIFICATION COMPLETE                   ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`Total active confirmed med spas: ${totalActive}`);
  console.log(`Remaining unclassified (NULL):   ${remainingNull}`);
  if (remainingNull > 0 && !WITH_CLAUDE) {
    console.log(`\nRe-run with --with-claude to resolve the remaining ${remainingNull} uncertain rows.`);
  }
}

main().catch((err) => {
  console.error('Classifier failed:', err);
  process.exit(1);
});

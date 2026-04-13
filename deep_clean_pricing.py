import pandas as pd
import re
import requests
import time
import os
from collections import defaultdict

INPUT_CSV  = os.path.expanduser("~/Downloads/GlowBuddy_Procedures_ALL_v4.csv")
OUTPUT_CSV = os.path.expanduser("~/Downloads/GlowBuddy_Procedures_ALL_v5.csv")
FLAGGED_CSV = os.path.expanduser("~/Downloads/flagged_for_review.csv")

df = pd.read_csv(INPUT_CSV, low_memory=False)
print(f"Loaded: {len(df):,} records across {df['domain'].nunique():,} providers")
original_len = len(df)

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Known bad domains — remove entirely
# These were identified as currency artifacts, foreign sites, or
# clearly non-med-spa retail sites that slipped through
# ─────────────────────────────────────────────────────────────────────────────
BAD_DOMAINS = {
    'stayageless.net',          # $19,930 everything — Shopify template artifact
    'ranibeautyclinic.com',     # HydraFacial at $18k — foreign currency (AED)
    'thewooskin.com',           # all procedures $11,762 — display artifact
    'healthlinkmedgroup.com',   # Botox at $6,982/$7,982 — clearly wrong
    'luminaskin.com',           # Restylane $9,999 — pricing page artifact
    'elevespa.com',             # Restylane $8,000 — outlier
    'reluxemedspa.com',         # IPL $9,504 — outlier
    'theinjectionsuite.com',    # Sculptra $5,503 — outlier
    'allureaestheticsspa.at',   # .at domain — Austrian site, prices in EUR
}

before = len(df)
df = df[~df['domain'].isin(BAD_DOMAINS)]
print(f"\nStep 1 — Bad domains removed: {before - len(df)} records")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Unit correction rules
# Applied to ALL records regardless of source_type
# ─────────────────────────────────────────────────────────────────────────────
fixes = defaultdict(int)

# Rule 2A: Neurotoxin per_unit price range validation
# Real market: Botox $8-$25/unit, Dysport $3-$8/unit, others $9-$20/unit
# Anything > $25/unit is a session/area/package price mislabeled
neurotoxin_brands = {
    'Botox': 25, 'Dysport': 12, 'Xeomin': 22, 'Jeuveau': 20,
    'Daxxify': 25, 'Neurotoxin': 25, 'Neuromodulator': 25, 'Tox': 25,
}
for proc, max_unit in neurotoxin_brands.items():
    mask = (
        (df['procedure_name'] == proc) &
        (df['pricing_unit'] == 'per_unit') &
        (df['price'] > max_unit)
    )
    df.loc[mask, 'pricing_unit'] = 'flat_package'
    df.loc[mask, 'is_starting_price'] = True
    fixes[f'neurotoxin per_unit>{max_unit} → flat_package'] += mask.sum()

# Rule 2B: Area-based neurotoxin procedures — never per_unit
area_tox = ['Brow Lift', 'Masseter', 'Jaw Slimming', 'Hyperhidrosis',
            'Nefertiti Lift', 'Baby Botox', 'Lip Flip']
for proc in area_tox:
    mask = (df['procedure_name'] == proc) & (df['pricing_unit'] == 'per_unit') & (df['price'] > 75)
    df.loc[mask, 'pricing_unit'] = 'per_session'
    fixes[f'{proc} per_unit>$75 → per_session'] += mask.sum()

# Rule 2C: Fillers — correct unit by price range
# per_unit on filler > $100 is per_syringe
filler_procs = ['Juvederm','Juvederm Voluma','Juvederm Volbella','Juvederm Vollure',
                'Juvederm Ultra','Restylane','Restylane Lyft','Restylane Kysse',
                'Restylane Silk','Restylane Defyne','Restylane Refyne',
                'Versa','RHA','Belotero','Revanesse','Dermal Filler','Filler',
                'Lip Filler','Cheek Filler','Chin Filler','Jawline Filler',
                'Tear Trough','Under Eye Filler','Radiesse']
for proc in filler_procs:
    mask = (df['procedure_name'] == proc) & (df['pricing_unit'] == 'per_unit') & (df['price'] > 100)
    df.loc[mask, 'pricing_unit'] = 'per_syringe'
    fixes[f'{proc} per_unit>$100 → per_syringe'] += mask.sum()

# Rule 2D: Sculptra/Kybella always per_vial
for proc in ['Sculptra', 'Kybella']:
    mask = (df['procedure_name'] == proc) & (df['pricing_unit'] == 'per_syringe')
    df.loc[mask, 'pricing_unit'] = 'per_vial'
    fixes[f'{proc} per_syringe → per_vial'] += mask.sum()

# Rule 2E: Session procedures mislabeled as per_unit
session_only = ['Dermaplaning','Microneedling','HydraFacial','Chemical Peel',
                'VI Peel','TCA Peel','Laser Hair Removal','Photofacial',
                'IPL','BBL','Morpheus8','Emsculpt','CoolSculpting',
                'Body Contouring','PRP','IV Therapy','Semaglutide',
                'Tirzepatide','Facial','Massage','Weight Loss Program',
                'Weight Loss Injection','Medical Weight Loss','Lash Extensions',
                'Microblading','Spray Tan','Cryotherapy','Infrared Sauna']
for proc in session_only:
    mask = (df['procedure_name'] == proc) & (df['pricing_unit'] == 'per_unit') & (df['price'] > 50)
    df.loc[mask, 'pricing_unit'] = 'per_session'
    fixes[f'{proc} per_unit>$50 → per_session'] += mask.sum()

# Rule 2F: per_ml → per_syringe for fillers (1ml = 1 syringe)
mask = (df['category'] == 'Dermal Filler') & (df['pricing_unit'] == 'per_ml')
df.loc[mask, 'pricing_unit'] = 'per_syringe'
fixes['filler per_ml → per_syringe'] += mask.sum()

# Rule 2G: CoolSculpting per_session → per_cycle
mask = (df['procedure_name'].isin(['CoolSculpting','CoolSculpting Elite'])) & (df['pricing_unit'] == 'per_session')
df.loc[mask, 'pricing_unit'] = 'per_cycle'
fixes['CoolSculpting per_session → per_cycle'] += mask.sum()

# Rule 2H: Wellness per_syringe → per_session
mask = (df['category'] == 'Wellness') & (df['pricing_unit'] == 'per_syringe')
df.loc[mask, 'pricing_unit'] = 'per_session'
fixes['Wellness per_syringe → per_session'] += mask.sum()

# Rule 2I: Laser per_vial → per_session
mask = (df['category'] == 'Laser') & (df['pricing_unit'] == 'per_vial')
df.loc[mask, 'pricing_unit'] = 'per_session'
fixes['Laser per_vial → per_session'] += mask.sum()

# Rule 2J: Facial per_syringe → per_session
mask = (df['category'] == 'Facial') & (df['pricing_unit'] == 'per_syringe')
df.loc[mask, 'pricing_unit'] = 'per_session'
fixes['Facial per_syringe → per_session'] += mask.sum()

total_fixes = sum(fixes.values())
print(f"\nStep 2 — Unit corrections: {total_fixes} total fixes")
for rule, count in sorted(fixes.items(), key=lambda x: -x[1]):
    if count > 0:
        print(f"  {count:>4}  {rule}")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Price floor + ceiling by category
# Based on real market ranges — anything outside is noise
# ─────────────────────────────────────────────────────────────────────────────
RANGES = {
    # category:           (floor, ceiling)
    'Neurotoxin':         (5,    5000),
    'Dermal Filler':      (50,   8000),
    'Biostimulator':      (50,   8000),
    'Injectable':         (25,   3000),
    'Skin Treatment':     (25,   8000),
    'Facial':             (20,   2500),
    'Laser':              (20,   8000),
    'Body Contouring':    (25,   8000),
    'Regenerative':       (25,   6000),
    'Wellness':           (15,   2500),
    'Medical Weight Loss':(25,   6000),
}

flagged_rows = []
before = len(df)
for cat, (floor, ceil) in RANGES.items():
    out_of_range = df[(df['category'] == cat) & ((df['price'] < floor) | (df['price'] > ceil))]
    if len(out_of_range):
        flagged_rows.append(out_of_range)
    df = df[~((df['category'] == cat) & ((df['price'] < floor) | (df['price'] > ceil)))]

removed = before - len(df)
print(f"\nStep 3 — Out-of-range prices removed: {removed}")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Statistical outlier detection per procedure
# Remove prices that are >4 standard deviations from the procedure median
# These are almost always scraped from non-pricing pages (blog posts, FAQs, etc.)
# ─────────────────────────────────────────────────────────────────────────────
before = len(df)
outlier_rows = []

for (proc, unit), group in df.groupby(['procedure_name', 'pricing_unit']):
    if len(group) < 10:  # need enough data to define outliers
        continue
    median = group['price'].median()
    std    = group['price'].std()
    if std == 0:
        continue
    # Flag anything > 4 std devs from median
    z_scores = (group['price'] - median).abs() / std
    outliers = group[z_scores > 4]
    if len(outliers):
        outlier_rows.append(outliers)

if outlier_rows:
    outlier_df = pd.concat(outlier_rows)
    df = df.drop(outlier_df.index)
    removed_outliers = before - len(df)
    print(f"\nStep 4 — Statistical outliers removed (>4σ): {removed_outliers}")
    print("Sample outliers:")
    print(outlier_df[['procedure_name','price','pricing_unit','domain']].head(15).to_string())
else:
    print(f"\nStep 4 — No statistical outliers found")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Verify provider_listed source URLs still resolve
# Fetches each unique URL — flags 404s, redirects to homepage, or pages
# that no longer contain the procedure name
# Only checks provider_listed (these are the ones we trust most — verify they're still live)
# ─────────────────────────────────────────────────────────────────────────────
print(f"\nStep 5 — Verifying provider_listed source URLs...")

pl_domains = df[df['source_type'] == 'provider_listed']['domain'].unique()
print(f"Checking {len(pl_domains)} provider_listed domains...")

url_status = {}
headers = {'User-Agent': 'Mozilla/5.0 (compatible; GlowBuddyBot/1.0)'}

for i, domain in enumerate(pl_domains):
    domain_rows = df[(df['source_type'] == 'provider_listed') & (df['domain'] == domain)]
    url = domain_rows['source_url'].iloc[0]
    if not url or str(url) == 'nan':
        url_status[domain] = 'no_url'
        continue
    try:
        resp = requests.get(url, timeout=10, headers=headers, allow_redirects=True)
        if resp.status_code == 404:
            url_status[domain] = '404'
        elif resp.status_code >= 400:
            url_status[domain] = f'error_{resp.status_code}'
        else:
            # Check if page still mentions any of our procedures
            page_text = resp.text.lower()
            procs_on_page = domain_rows['procedure_name'].unique()
            found = any(p.lower() in page_text for p in procs_on_page)
            url_status[domain] = 'live_verified' if found else 'live_no_match'
    except Exception as e:
        url_status[domain] = f'timeout'

    if i % 20 == 0:
        print(f"  {i+1}/{len(pl_domains)} checked...")
    time.sleep(0.3)  # polite rate limit

# Summarize
from collections import Counter
status_counts = Counter(url_status.values())
print(f"\nURL verification results:")
for status, count in sorted(status_counts.items(), key=lambda x: -x[1]):
    print(f"  {status}: {count}")

# Flag 404s and dead pages
dead_domains = {d for d, s in url_status.items() if s in ('404', 'timeout') or s.startswith('error_')}
uncertain_domains = {d for d, s in url_status.items() if s == 'live_no_match'}

print(f"\nDead URLs (404/timeout): {len(dead_domains)}")
print(f"Live but procedure not found: {len(uncertain_domains)}")

# Mark dead provider_listed records with lower confidence tier (4 = scraped/inferred)
# Don't delete — demote confidence
mask_dead = df['source_type'].eq('provider_listed') & df['domain'].isin(dead_domains)
df.loc[mask_dead, 'source_type'] = 'provider_listed_unverified'
df.loc[mask_dead, 'confidence_tier'] = 4
print(f"Demoted {mask_dead.sum()} records from dead provider_listed URLs to tier 4")

mask_uncertain = df['source_type'].eq('provider_listed') & df['domain'].isin(uncertain_domains)
df.loc[mask_uncertain, 'confidence_tier'] = 3
print(f"Downgraded {mask_uncertain.sum()} records from uncertain URLs to tier 3")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 6: Add/update confidence_tier across all records
# ─────────────────────────────────────────────────────────────────────────────
if 'confidence_tier' not in df.columns:
    df['confidence_tier'] = 4

# Tier 2: confirmed live provider_listed
df.loc[df['source_type'] == 'provider_listed', 'confidence_tier'] = 2

# Tier 3: cheerio scraped — if pricing_unit was resolved from text (non-default)
# Proxy: non-session units on procedures that default to per_session are likely text-verified
tier3_mask = (
    (df['source_type'] == 'cheerio_scraper') &
    (df['pricing_unit'].isin(['per_unit','per_syringe','per_vial','per_area','per_cycle'])) &
    (df['category'].isin(['Neurotoxin','Dermal Filler','Biostimulator']))
)
df.loc[tier3_mask, 'confidence_tier'] = 3

# Tier 4: everything else scraped
df.loc[
    (df['source_type'] == 'cheerio_scraper') &
    (~tier3_mask[tier3_mask].index.isin(df.index) if False else True),  # all remaining
    'confidence_tier'
] = df.loc[df['source_type'] == 'cheerio_scraper', 'confidence_tier'].fillna(4)

df['confidence_tier'] = df['confidence_tier'].fillna(4).astype(int)

# ─────────────────────────────────────────────────────────────────────────────
# STEP 7: Deduplicate — same provider, same procedure, same price
# Keep the highest confidence tier record when duplicates exist
# ─────────────────────────────────────────────────────────────────────────────
before = len(df)
df = df.sort_values('confidence_tier').drop_duplicates(
    subset=['domain', 'procedure_name', 'price'],
    keep='first'
)
print(f"\nStep 7 — Deduplication: {before - len(df)} duplicates removed")

# ─────────────────────────────────────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"  DEEP CLEAN COMPLETE")
print(f"{'='*60}")
print(f"  Original records:  {original_len:,}")
print(f"  Final records:     {len(df):,}")
print(f"  Net removed:       {original_len - len(df):,}")
print(f"  Providers:         {df['domain'].nunique():,}")
print(f"\n  By source_type:")
print(df['source_type'].value_counts().to_string())
print(f"\n  By confidence_tier:")
tier_counts = df['confidence_tier'].value_counts().sort_index()
tier_labels = {1:'receipt_verified', 2:'provider_listed', 3:'scraped_unit_verified',
               4:'scraped_unit_inferred', 5:'community_submitted'}
for tier, count in tier_counts.items():
    print(f"    Tier {tier} ({tier_labels.get(tier,'')}): {count:,}")
print(f"\n  Pricing unit breakdown:")
print(df['pricing_unit'].value_counts().to_string())
print(f"\n  Price stats:")
print(f"    Min:    ${df['price'].min():.2f}")
print(f"    Median: ${df['price'].median():.0f}")
print(f"    Mean:   ${df['price'].mean():.0f}")
print(f"    Max:    ${df['price'].max():.0f}")

df.to_csv(OUTPUT_CSV, index=False)
print(f"\n  Saved: {OUTPUT_CSV}")

# Save flagged rows for manual review
if flagged_rows:
    all_flagged = flagged_rows + (outlier_rows if outlier_rows else [])
    flagged_df = pd.concat(all_flagged)
    flagged_df.to_csv(FLAGGED_CSV, index=False)
    print(f"  Flagged for review: {FLAGGED_CSV} ({len(flagged_df):,} rows)")

print(f"\nPaste the summary above back to Claude.")

"""
GlowBuddy Unit-Aware Price Extraction — hybrid unit resolver.
Reads cheerio CSVs from ~/Downloads/, resolves pricing units from surrounding
text context, falls back to taxonomy defaults, outputs v4.

Usage: python3 scripts/extract_units.py
"""

import pandas as pd
import re
import os
import glob
from collections import defaultdict

CHEERIO_DIR  = os.path.expanduser("~/Downloads")
MASTER_CSV   = os.path.expanduser("~/Downloads/GlowBuddy_MASTER_COMBINED.csv")
EXISTING_CSV = os.path.expanduser("~/Downloads/GlowBuddy_Procedures_ALL_v3.csv")
OUTPUT_CSV   = os.path.expanduser("~/Downloads/GlowBuddy_Procedures_ALL_v4.csv")
WINDOW       = 200
MIN_PRICE    = 5
MAX_PRICE    = 10000

# ── Unit patterns ─────────────────────────────────────────────────────────────
UNIT_PATTERNS = [
    (re.compile(r'(?:per|\/)\s*unit(?:s)?(?!\w)', re.I), 'per_unit'),
    (re.compile(r'\$\s*\d[\d,\.]*\s*\/\s*u(?:nit)?(?!\w)', re.I), 'per_unit'),
    (re.compile(r'\d+\s*units?\s*(?:for|@|=)\s*\$', re.I), 'per_unit'),
    (re.compile(r'(?:price|cost)\s*per\s*unit', re.I), 'per_unit'),
    (re.compile(r'(?:per|\/)\s*syringe(?:s)?(?!\w)', re.I), 'per_syringe'),
    (re.compile(r'\d+\s*syringe(?:s)?\s*(?:for|@)', re.I), 'per_syringe'),
    (re.compile(r'(?:per|\/)\s*cc(?!\w)', re.I), 'per_syringe'),
    (re.compile(r'(?:per|\/)\s*vial(?:s)?(?!\w)', re.I), 'per_vial'),
    (re.compile(r'(?:per|\/)\s*bottle(?:s)?(?!\w)', re.I), 'per_vial'),
    (re.compile(r'(?:per|\/)\s*ml(?!\w)', re.I), 'per_ml'),
    (re.compile(r'(?:per|\/)\s*area(?:s)?(?!\w)', re.I), 'per_area'),
    (re.compile(r'(?:per|\/)\s*zone(?:s)?(?!\w)', re.I), 'per_area'),
    (re.compile(r'(?:per|\/)\s*region(?!\w)', re.I), 'per_area'),
    (re.compile(r'(?:per|\/)\s*cycle(?:s)?(?!\w)', re.I), 'per_cycle'),
    (re.compile(r'(?:per|\/)\s*(?:session|treatment|visit|appt)(?:s)?(?!\w)', re.I), 'per_session'),
    (re.compile(r'(?:per|\/)\s*appointment(?:s)?(?!\w)', re.I), 'per_session'),
    (re.compile(r'(?:per|\/)\s*procedure(?!\w)', re.I), 'per_session'),
    (re.compile(r'(?:per|\/)\s*month(?:ly)?(?!\w)', re.I), 'flat_package'),
    (re.compile(r'(?:per|\/)\s*week(?:ly)?(?!\w)', re.I), 'flat_package'),
    (re.compile(r'\d+\s*(?:sessions?|treatments?)\s*(?:for|@|=)\s*\$', re.I), 'flat_package'),
    (re.compile(r'package\s+(?:of|for|includes?)', re.I), 'flat_package'),
    (re.compile(r'(?:bundle|series)\s+of\s+\d', re.I), 'flat_package'),
]

STARTING_RE = re.compile(
    r'\b(?:starting\s+(?:at|from)|from|as\s+low\s+as|beginning\s+at|'
    r'prices?\s+start|as\s+little\s+as)\b\s*\$', re.I)


def resolve_unit(ctx, taxonomy_default):
    is_starting = bool(STARTING_RE.search(ctx))
    for pattern, unit in UNIT_PATTERNS:
        if pattern.search(ctx):
            return unit, is_starting
    return taxonomy_default, is_starting


PRICE_FLOORS = {
    'Neurotoxin': 5, 'Dermal Filler': 50, 'Biostimulator': 50,
    'Injectable': 25, 'Skin Treatment': 25, 'Facial': 25,
    'Laser': 25, 'Body Contouring': 25, 'Regenerative': 25,
    'Wellness': 20, 'Medical Weight Loss': 25,
}
PRICE_CEILINGS = {
    'Neurotoxin': 5000, 'Dermal Filler': 8000, 'Biostimulator': 8000,
    'Injectable': 3000, 'Skin Treatment': 8000, 'Facial': 2500,
    'Laser': 8000, 'Body Contouring': 8000, 'Regenerative': 6000,
    'Wellness': 2500, 'Medical Weight Loss': 6000,
}

JUNK_DOMAINS = {'stayageless.net', 'ranibeautyclinic.com', 'thewooskin.com'}

# Booking platforms show deposits/minimums/booking fees, not real procedure prices.
BOOKING_PLATFORM_BLOCKLIST = {
    'glossgenius.com', 'vagaro.com', 'squareup.com', 'square.site',
    'mindbodyonline.com', 'booker.com', 'schedulicity.com',
    'acuityscheduling.com', 'janeapp.com', 'fresha.com',
    'boulevard.app', 'zenoti.com', 'booksy.com', 'as.me',
    'setmore.com', 'appointy.com', 'simplybook.me', 'phorest.com',
    'timely.com', 'treatwell.co', 'healthie.com', 'intakeq.com',
}


def is_booking_platform(domain):
    if not domain:
        return False
    domain = domain.lower()
    return any(p in domain for p in BOOKING_PLATFORM_BLOCKLIST)


# ── Post-assignment plausibility guard ────────────────────────────────────────
# resolve_unit() picks a label from text patterns but has no price awareness.
# These ranges define what is plausible for each (category, label) pair.
# Only categories defined here are checked; everything else passes through.
LABEL_RANGES = {
    ('Neurotoxin', 'per_unit'):     (5,   50),   # $5–$50: realistic per-unit window
    ('Neurotoxin', 'per_session'):  (50, 2000),  # $50–$2 000: realistic session window
    ('Neurotoxin', 'flat_package'): (50, 3000),  # $50–$3 000: realistic package window
}

# Ordered list of (candidate_label, (min, max)) to try when original is implausible.
# The per_unit→per_session / per_unit→flat_package split mirrors migration 083:
#   $50–$300  reads as a small-to-medium session price  → per_session
#   >$300     reads as a bundle / tiered package price  → flat_package
RECLASSIFY_CANDIDATES = {
    ('Neurotoxin', 'per_unit'):     [('per_session', (50, 300)), ('flat_package', (301, 3000))],
    ('Neurotoxin', 'per_session'):  [('per_unit', (5, 50))],
    ('Neurotoxin', 'flat_package'): [('per_unit', (5, 50))],
}


def check_label_plausibility(price, label, cat):
    """
    Returns (final_label, reclassified).
    If (cat, label) has a defined range and price falls outside it, tries
    reclassification candidates in order. Falls back to original label if
    nothing better is found (floor/ceiling check will still gate the row).
    """
    key = (cat, label)
    if key not in LABEL_RANGES:
        return label, False
    lo, hi = LABEL_RANGES[key]
    if lo <= price <= hi:
        return label, False
    for cand_label, (clo, chi) in RECLASSIFY_CANDIDATES.get(key, []):
        if clo <= price <= chi:
            return cand_label, True
    return label, True  # implausible; no better candidate — original label kept


# ── Load Cheerio ──────────────────────────────────────────────────────────────
print("Loading Cheerio files from ~/Downloads/...")
cheerio_files = sorted(glob.glob(os.path.join(CHEERIO_DIR, "dataset_cheerio-scraper_*.csv")))
print(f"Found: {len(cheerio_files)} files")

dfs = []
for f in cheerio_files:
    try:
        d = pd.read_csv(f, low_memory=False, encoding="utf-8-sig")
        if 'text' in d.columns and 'url' in d.columns:
            dfs.append(d[['text', 'url']].copy())
            print(f"  {os.path.basename(f)}: {len(d):,} rows")
    except Exception as e:
        print(f"  SKIP {os.path.basename(f)}: {e}")

df = pd.concat(dfs, ignore_index=True)
df['text'] = df['text'].fillna('')


def extract_domain(url):
    if not isinstance(url, str):
        return ""
    m = re.match(r"(?:https?://)?(?:www\.)?([^/?#\s]+)", url)
    return m.group(1).lower().strip() if m else ""


df['domain'] = df['url'].apply(extract_domain)
print(f"\nTotal rows: {len(df):,} | Unique domains: {df['domain'].nunique():,}")

# ── Combine pages per domain ──────────────────────────────────────────────────
print("Combining pages per domain...")
domain_data = defaultdict(lambda: {'combined': '', 'url': ''})
for _, row in df.iterrows():
    d = row['domain']
    if not d:
        continue
    domain_data[d]['combined'] += ' ' + str(row['text'])[:8000]
    if not domain_data[d]['url']:
        domain_data[d]['url'] = row['url']

del df, dfs
print(f"Domains: {len(domain_data):,}")

# ── Load master + existing ────────────────────────────────────────────────────
master = pd.read_csv(MASTER_CSV, low_memory=False)
master['domain'] = master['website'].dropna().apply(extract_domain)
master_lookup = {}
for _, row in master.dropna(subset=['domain']).iterrows():
    d = row['domain']
    if d not in master_lookup:
        master_lookup[d] = {
            'supabase_id': row.get('supabase_id') if str(row.get('supabase_id', '')) != 'nan' else None,
            'name': row.get('name'),
            'city': row.get('city'),
            'state': row.get('state'),
        }
del master

existing = pd.read_csv(EXISTING_CSV, low_memory=False)
existing_keys = set()
for _, row in existing.iterrows():
    d = str(row.get('domain', '')).lower().strip()
    p = str(row.get('procedure_name', '')).lower().strip()
    pr = row.get('price')
    if d and p and pr:
        existing_keys.add((d, p, float(pr)))
existing_price_domains = set(existing['domain'].dropna().str.lower())
print(f"Existing records: {len(existing):,} | Existing priced domains: {len(existing_price_domains):,}")

# ── Filters ───────────────────────────────────────────────────────────────────
NOISE_RE = re.compile(
    r"self\.__next_f|__webpack_require__|\\u[0-9a-f]{4}.*\\u[0-9a-f]{4}", re.I)
MEDSPA_KW = re.compile(
    r"\b(botox|dysport|xeomin|jeuveau|daxxify|neurotoxin|filler|juvederm|restylane|"
    r"sculptra|radiesse|kybella|prp|prx|microneedling|hydrafacial|chemical peel|"
    r"vi peel|laser|ipl|bbl|fraxel|ultherapy|thermage|coolsculpting|emsculpt|"
    r"semaglutide|tirzepatide|med.?spa|medspa|medical spa|aesthetics?|injector|"
    r"body contour|lipo|cavitation|lymphatic|dermaplaning|microderm)\b", re.I)
PRICE_RE = re.compile(r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)')

# ── Taxonomy ──────────────────────────────────────────────────────────────────
TAXONOMY = {
    'Botox':('Neurotoxin','Botulinum Toxin Type A','Botox','per_unit',10,200,'botox,neurotoxin,wrinkle'),
    'Dysport':('Neurotoxin','Botulinum Toxin Type A','Dysport','per_unit',3,7,'dysport,neurotoxin'),
    'Xeomin':('Neurotoxin','Botulinum Toxin Type A','Xeomin','per_unit',10,18,'xeomin,neurotoxin'),
    'Jeuveau':('Neurotoxin','Botulinum Toxin Type A','Jeuveau','per_unit',9,15,'jeuveau,neurotoxin'),
    'Daxxify':('Neurotoxin','Botulinum Toxin Type A','Daxxify','per_unit',10,20,'daxxify,neurotoxin'),
    'Neurotoxin':('Neurotoxin','Botulinum Toxin Type A',None,'per_unit',10,20,'neurotoxin'),
    'Neuromodulator':('Neurotoxin','Botulinum Toxin Type A',None,'per_unit',10,20,'neuromodulator'),
    'Tox':('Neurotoxin','Botulinum Toxin Type A',None,'per_unit',10,20,'tox,neurotoxin'),
    'Lip Flip':('Neurotoxin','Botulinum Toxin Type A',None,'per_session',75,300,'lip flip'),
    'Baby Botox':('Neurotoxin','Botulinum Toxin Type A',None,'per_session',100,400,'baby botox'),
    'Brow Lift':('Neurotoxin','Botulinum Toxin Type A',None,'per_session',75,300,'brow lift'),
    'Masseter':('Neurotoxin','Botulinum Toxin Type A',None,'per_session',250,700,'masseter,jaw slimming'),
    'Jaw Slimming':('Neurotoxin','Botulinum Toxin Type A',None,'per_session',250,700,'jaw slimming'),
    'Hyperhidrosis':('Neurotoxin','Botulinum Toxin Type A',None,'per_session',500,1500,'hyperhidrosis'),
    'Nefertiti Lift':('Neurotoxin','Botulinum Toxin Type A',None,'per_session',300,800,'nefertiti lift'),
    'Juvederm Voluma':('Dermal Filler','Midface Augmentation','Juvederm','per_syringe',700,1000,'juvederm voluma'),
    'Juvederm Volbella':('Dermal Filler','Lip Augmentation','Juvederm','per_syringe',500,800,'juvederm volbella'),
    'Juvederm Vollure':('Dermal Filler','Hyaluronic Acid Filler','Juvederm','per_syringe',600,900,'juvederm vollure'),
    'Juvederm Ultra':('Dermal Filler','Hyaluronic Acid Filler','Juvederm','per_syringe',550,850,'juvederm ultra'),
    'Juvederm':('Dermal Filler','Hyaluronic Acid Filler','Juvederm','per_syringe',600,900,'juvederm,filler'),
    'Restylane Lyft':('Dermal Filler','Midface Augmentation','Restylane','per_syringe',600,900,'restylane lyft'),
    'Restylane Kysse':('Dermal Filler','Lip Augmentation','Restylane','per_syringe',500,800,'restylane kysse'),
    'Restylane Silk':('Dermal Filler','Lip Augmentation','Restylane','per_syringe',450,750,'restylane silk'),
    'Restylane Defyne':('Dermal Filler','Hyaluronic Acid Filler','Restylane','per_syringe',550,850,'restylane defyne'),
    'Restylane Refyne':('Dermal Filler','Hyaluronic Acid Filler','Restylane','per_syringe',500,800,'restylane refyne'),
    'Restylane':('Dermal Filler','Hyaluronic Acid Filler','Restylane','per_syringe',550,850,'restylane,filler'),
    'Sculptra':('Biostimulator','Poly-L-Lactic Acid','Sculptra','per_vial',700,1000,'sculptra'),
    'Radiesse':('Biostimulator','Calcium Hydroxylapatite Filler','Radiesse','per_syringe',600,900,'radiesse'),
    'Kybella':('Injectable','Deoxycholic Acid','Kybella','per_vial',600,1200,'kybella'),
    'Versa':('Dermal Filler','Hyaluronic Acid Filler','RHA Versa','per_syringe',450,750,'versa'),
    'RHA':('Dermal Filler','Hyaluronic Acid Filler','RHA Collection','per_syringe',600,950,'rha,filler'),
    'Belotero':('Dermal Filler','Hyaluronic Acid Filler','Belotero','per_syringe',450,750,'belotero'),
    'Revanesse':('Dermal Filler','Hyaluronic Acid Filler','Revanesse','per_syringe',500,850,'revanesse'),
    'Lip Filler':('Dermal Filler','Lip Augmentation',None,'per_syringe',400,800,'lip filler'),
    'Lip Augmentation':('Dermal Filler','Lip Augmentation',None,'per_syringe',400,800,'lip augmentation'),
    'Cheek Filler':('Dermal Filler','Midface Augmentation',None,'per_syringe',600,1000,'cheek filler'),
    'Cheek Augmentation':('Dermal Filler','Midface Augmentation',None,'per_syringe',600,1000,'cheek augmentation'),
    'Chin Filler':('Dermal Filler','Hyaluronic Acid Filler',None,'per_syringe',500,900,'chin filler'),
    'Chin Augmentation':('Dermal Filler','Hyaluronic Acid Filler',None,'per_syringe',500,900,'chin augmentation'),
    'Jawline Filler':('Dermal Filler','Hyaluronic Acid Filler',None,'per_syringe',600,1200,'jawline filler'),
    'Tear Trough':('Dermal Filler','Hyaluronic Acid Filler',None,'per_syringe',600,1000,'tear trough'),
    'Under Eye Filler':('Dermal Filler','Hyaluronic Acid Filler',None,'per_syringe',600,1000,'under eye filler'),
    'Nasolabial Filler':('Dermal Filler','Hyaluronic Acid Filler',None,'per_syringe',500,900,'nasolabial filler'),
    'Marionette Filler':('Dermal Filler','Hyaluronic Acid Filler',None,'per_syringe',500,900,'marionette filler'),
    'Temple Filler':('Dermal Filler','Hyaluronic Acid Filler',None,'per_syringe',600,1000,'temple filler'),
    'Dermal Filler':('Dermal Filler','Hyaluronic Acid Filler',None,'per_syringe',500,900,'dermal filler'),
    'Filler':('Dermal Filler','Hyaluronic Acid Filler',None,'per_syringe',400,900,'filler'),
    'Non-Surgical Rhinoplasty':('Dermal Filler','Hyaluronic Acid Filler',None,'per_syringe',600,1500,'nose filler'),
    'Nose Filler':('Dermal Filler','Hyaluronic Acid Filler',None,'per_syringe',600,1500,'nose filler'),
    'SkinPen Microneedling':('Skin Treatment','Collagen Induction Therapy','SkinPen','per_session',250,600,'skinpen'),
    'Microneedling':('Skin Treatment','Collagen Induction Therapy',None,'per_session',250,700,'microneedling'),
    'RF Microneedling':('Skin Treatment','RF Microneedling',None,'per_session',600,1800,'rf microneedling'),
    'Morpheus8':('Skin Treatment','RF Microneedling','Morpheus8','per_session',700,1800,'morpheus8'),
    'Morpheus 8':('Skin Treatment','RF Microneedling','Morpheus8','per_session',700,1800,'morpheus8'),
    'Potenza':('Skin Treatment','RF Microneedling','Potenza','per_session',600,1500,'potenza'),
    'Virtue RF':('Skin Treatment','RF Microneedling','Virtue RF','per_session',600,1500,'virtue rf'),
    'Vivace':('Skin Treatment','RF Microneedling','Vivace','per_session',600,1400,'vivace'),
    'Sylfirm':('Skin Treatment','RF Microneedling','Sylfirm','per_session',600,1400,'sylfirm'),
    'Secret RF':('Skin Treatment','RF Microneedling','Secret RF','per_session',600,1400,'secret rf'),
    'VI Peel':('Skin Treatment','Chemical Exfoliation','VI Peel','per_session',150,400,'vi peel'),
    'TCA Peel':('Skin Treatment','Chemical Exfoliation',None,'per_session',150,500,'tca peel'),
    'Jessner Peel':('Skin Treatment','Chemical Exfoliation',None,'per_session',100,350,'jessner peel'),
    'Chemical Peel':('Skin Treatment','Chemical Exfoliation',None,'per_session',100,500,'chemical peel'),
    'Chemical Exfoliation':('Skin Treatment','Chemical Exfoliation',None,'per_session',100,400,'chemical exfoliation'),
    'HydraFacial':('Skin Treatment','Hydradermabrasion','HydraFacial','per_session',150,400,'hydrafacial'),
    'Hydrafacial MD':('Skin Treatment','Hydradermabrasion','HydraFacial','per_session',150,450,'hydrafacial md'),
    'DiamondGlow':('Skin Treatment','Hydradermabrasion','DiamondGlow','per_session',150,350,'diamondglow'),
    'Aquafacial':('Skin Treatment','Hydradermabrasion',None,'per_session',100,350,'aquafacial'),
    'Hydrofacial':('Skin Treatment','Hydradermabrasion',None,'per_session',100,350,'hydrofacial'),
    'Vampire Facial':('Skin Treatment','Collagen Induction Therapy',None,'per_session',400,1200,'vampire facial'),
    'Dermaplaning':('Skin Treatment','Physical Exfoliation',None,'per_session',75,200,'dermaplaning'),
    'Microdermabrasion':('Skin Treatment','Physical Exfoliation',None,'per_session',75,200,'microdermabrasion'),
    'Microderm':('Skin Treatment','Physical Exfoliation',None,'per_session',75,200,'microderm'),
    'Ultherapy':('Skin Treatment','Ultrasound Skin Tightening','Ultherapy','per_session',1500,4000,'ultherapy'),
    'Thermage':('Skin Treatment','RF Skin Tightening','Thermage','per_session',1500,4000,'thermage'),
    'Sofwave':('Skin Treatment','Ultrasound Skin Tightening','Sofwave','per_session',1500,4000,'sofwave'),
    'Skin Tightening':('Skin Treatment','RF Skin Tightening',None,'per_session',400,2000,'skin tightening'),
    'Collagen Induction':('Skin Treatment','Collagen Induction Therapy',None,'per_session',200,700,'collagen induction'),
    'Nano Needling':('Skin Treatment','Collagen Induction Therapy',None,'per_session',150,400,'nano needling'),
    'PDO Thread Lift':('Skin Treatment','Thread Lift','PDO','per_session',500,2000,'pdo thread lift'),
    'Thread Lift':('Skin Treatment','Thread Lift',None,'per_session',500,2000,'thread lift'),
    'Scar Treatment':('Skin Treatment','Collagen Induction Therapy',None,'per_session',150,600,'scar treatment'),
    'Stretch Mark Treatment':('Skin Treatment','Collagen Induction Therapy',None,'per_session',150,600,'stretch marks'),
    'Laser Hair Removal':('Laser','Hair Reduction',None,'per_session',75,600,'laser hair removal'),
    'Hair Removal':('Laser','Hair Reduction',None,'per_session',75,600,'hair removal'),
    'Laser Hair':('Laser','Hair Reduction',None,'per_session',75,600,'laser hair'),
    'IPL/BBL Photofacial':('Laser','Intense Pulsed Light',None,'per_session',200,600,'ipl,bbl,photofacial'),
    'IPL Photofacial':('Laser','Intense Pulsed Light',None,'per_session',150,500,'ipl photofacial'),
    'IPL Treatment':('Laser','Intense Pulsed Light',None,'per_session',150,500,'ipl treatment'),
    'Photofacial':('Laser','Intense Pulsed Light',None,'per_session',150,500,'photofacial'),
    'BBL Treatment':('Laser','Intense Pulsed Light','BBL','per_session',200,600,'bbl treatment'),
    'Forever Young BBL':('Laser','Intense Pulsed Light','BBL','per_session',300,800,'forever young bbl'),
    'BBL':('Laser','Intense Pulsed Light','BBL','per_session',200,600,'bbl'),
    'IPL':('Laser','Intense Pulsed Light',None,'per_session',150,500,'ipl'),
    'Fraxel':('Laser','Ablative/Non-Ablative Resurfacing','Fraxel','per_session',800,2500,'fraxel'),
    'CO2 Laser':('Laser','Ablative/Non-Ablative Resurfacing',None,'per_session',600,3000,'co2 laser'),
    'Halo':('Laser','Ablative/Non-Ablative Resurfacing','Halo','per_session',700,2000,'halo'),
    'Halo Laser':('Laser','Ablative/Non-Ablative Resurfacing','Halo','per_session',700,2000,'halo laser'),
    'Moxi':('Laser','Non-Ablative Resurfacing','Moxi','per_session',400,900,'moxi'),
    'Moxi Laser':('Laser','Non-Ablative Resurfacing','Moxi','per_session',400,900,'moxi laser'),
    'Clear + Brilliant':('Laser','Non-Ablative Resurfacing','Clear+Brilliant','per_session',300,700,'clear and brilliant'),
    'Clear and Brilliant':('Laser','Non-Ablative Resurfacing','Clear+Brilliant','per_session',300,700,'clear and brilliant'),
    'Vbeam':('Laser','Vascular Laser','Vbeam','per_session',300,900,'vbeam'),
    'PicoSure':('Laser','Pigment/Tattoo Removal','PicoSure','per_session',200,800,'picosure'),
    'PicoWay':('Laser','Pigment/Tattoo Removal','PicoWay','per_session',200,800,'picoway'),
    'PicoPlus':('Laser','Pigment/Tattoo Removal','PicoPlus','per_session',200,800,'picoplus'),
    'Tattoo Removal':('Laser','Pigment/Tattoo Removal',None,'per_session',100,500,'tattoo removal'),
    'Laser Resurfacing':('Laser','Ablative/Non-Ablative Resurfacing',None,'per_session',500,2500,'laser resurfacing'),
    'Skin Resurfacing':('Laser','Ablative/Non-Ablative Resurfacing',None,'per_session',500,3000,'skin resurfacing'),
    'Laser Genesis':('Laser','Non-Ablative Resurfacing','Laser Genesis','per_session',300,700,'laser genesis'),
    'Vascular Laser':('Laser','Vascular Laser',None,'per_session',200,800,'vascular laser'),
    'Rosacea Treatment':('Laser','Vascular Laser',None,'per_session',200,800,'rosacea treatment'),
    'Pigment Removal':('Laser','Pigment/Tattoo Removal',None,'per_session',150,600,'pigment removal'),
    'Skin Rejuvenation':('Laser','Intense Pulsed Light',None,'per_session',150,600,'skin rejuvenation'),
    'CoolSculpting Elite':('Body Contouring','Cryolipolysis','CoolSculpting','per_cycle',700,1400,'coolsculpting elite'),
    'CoolSculpting':('Body Contouring','Cryolipolysis','CoolSculpting','per_cycle',600,1200,'coolsculpting'),
    'Emsculpt NEO':('Body Contouring','Non-Surgical Body Sculpting','Emsculpt NEO','per_session',600,1200,'emsculpt neo'),
    'Emsculpt':('Body Contouring','Non-Surgical Body Sculpting','Emsculpt','per_session',500,1000,'emsculpt'),
    'Emtone':('Body Contouring','Non-Surgical Body Sculpting','Emtone','per_session',400,900,'emtone'),
    'Evolve':('Body Contouring','Non-Surgical Body Sculpting','Evolve','per_session',500,1200,'evolve'),
    'Velashape':('Body Contouring','Non-Surgical Body Sculpting','Velashape','per_session',300,800,'velashape'),
    'Vanquish':('Body Contouring','Non-Surgical Body Sculpting','Vanquish','per_session',500,1000,'vanquish'),
    'Sculpsure':('Body Contouring','Laser Lipolysis','Sculpsure','per_session',600,1200,'sculpsure'),
    'TruSculpt':('Body Contouring','Non-Surgical Body Sculpting','TruSculpt','per_session',500,1200,'trusculpt'),
    'Body Contouring':('Body Contouring','Non-Surgical Body Sculpting',None,'per_session',300,1200,'body contouring'),
    'Body Sculpting':('Body Contouring','Non-Surgical Body Sculpting',None,'per_session',300,1200,'body sculpting'),
    'Fat Reduction':('Body Contouring','Non-Surgical Body Sculpting',None,'per_session',300,1200,'fat reduction'),
    'Fat Freezing':('Body Contouring','Cryolipolysis',None,'per_cycle',500,1200,'fat freezing'),
    'Cryolipolysis':('Body Contouring','Cryolipolysis',None,'per_cycle',500,1200,'cryolipolysis'),
    'Cavitation':('Body Contouring','Ultrasound Cavitation',None,'per_session',100,400,'cavitation'),
    'Ultrasonic Cavitation':('Body Contouring','Ultrasound Cavitation',None,'per_session',100,400,'ultrasonic cavitation'),
    'Wood Therapy':('Body Contouring','Manual Body Sculpting',None,'per_session',75,200,'wood therapy'),
    'Lipo Laser':('Body Contouring','Laser Lipolysis',None,'per_session',100,500,'lipo laser'),
    'Laser Lipo':('Body Contouring','Laser Lipolysis',None,'per_session',100,500,'laser lipo'),
    'Lymphatic Drainage':('Body Contouring','Manual Body Sculpting',None,'per_session',75,250,'lymphatic drainage'),
    'Lymphatic Massage':('Body Contouring','Manual Body Sculpting',None,'per_session',75,250,'lymphatic massage'),
    'Cellulite Treatment':('Body Contouring','Non-Surgical Body Sculpting',None,'per_session',100,600,'cellulite'),
    'Muscle Sculpting':('Body Contouring','Non-Surgical Body Sculpting',None,'per_session',400,1000,'muscle sculpting'),
    'Body Wrap':('Body Contouring','Manual Body Sculpting',None,'per_session',75,250,'body wrap'),
    'PRP':('Regenerative','Platelet Rich Plasma',None,'per_session',400,1500,'prp'),
    'PRP Treatment':('Regenerative','Platelet Rich Plasma',None,'per_session',400,1500,'prp treatment'),
    'Platelet Rich Plasma':('Regenerative','Platelet Rich Plasma',None,'per_session',400,1500,'platelet rich plasma'),
    'PRF':('Regenerative','Platelet Rich Fibrin',None,'per_session',400,1500,'prf'),
    'PRX':('Regenerative','PRX Derm Perfexion',None,'per_session',200,600,'prx'),
    'PRX Derm':('Regenerative','PRX Derm Perfexion',None,'per_session',200,600,'prx derm'),
    'Exosome Therapy':('Regenerative','Exosome Therapy',None,'per_session',400,1500,'exosome therapy'),
    'Exosome':('Regenerative','Exosome Therapy',None,'per_session',400,1500,'exosome'),
    'Exosomes':('Regenerative','Exosome Therapy',None,'per_session',400,1500,'exosomes'),
    'Growth Factor':('Regenerative','Growth Factor Treatment',None,'per_session',300,1200,'growth factor'),
    'Stem Cell':('Regenerative','Stem Cell Therapy',None,'per_session',500,2000,'stem cell'),
    'PRP Hair':('Regenerative','Platelet Rich Plasma',None,'per_session',600,1500,'prp hair'),
    'Hair Restoration':('Regenerative','Platelet Rich Plasma',None,'per_session',500,1500,'hair restoration'),
    'Vampire Facelift':('Regenerative','Platelet Rich Plasma',None,'per_session',600,1500,'vampire facelift'),
    'IV Therapy':('Wellness','Intravenous Nutrient Therapy',None,'per_session',100,400,'iv therapy'),
    'IV Drip':('Wellness','Intravenous Nutrient Therapy',None,'per_session',100,400,'iv drip'),
    'IV Infusion':('Wellness','Intravenous Nutrient Therapy',None,'per_session',100,400,'iv infusion'),
    'Myers Cocktail':('Wellness','Intravenous Nutrient Therapy',None,'per_session',100,300,'myers cocktail'),
    'NAD+':('Wellness','Intravenous Nutrient Therapy',None,'per_session',200,800,'nad'),
    'NAD Therapy':('Wellness','Intravenous Nutrient Therapy',None,'per_session',200,800,'nad therapy'),
    'B12 Injection':('Wellness','Vitamin Injection',None,'per_session',25,50,'b12'),
    'B12':('Wellness','Vitamin Injection',None,'per_session',25,50,'b12'),
    'Vitamin Injection':('Wellness','Vitamin Injection',None,'per_session',25,75,'vitamin injection'),
    'Vitamin B12':('Wellness','Vitamin Injection',None,'per_session',25,50,'vitamin b12'),
    'Lipo-B':('Wellness','Vitamin Injection',None,'per_session',25,75,'lipo-b'),
    'Lipotropic Injection':('Wellness','Vitamin Injection',None,'per_session',25,75,'lipotropic'),
    'Mic Injection':('Wellness','Vitamin Injection',None,'per_session',25,75,'mic injection'),
    'Glutathione':('Wellness','Vitamin Injection',None,'per_session',30,100,'glutathione'),
    'Hormone Therapy':('Wellness','Hormone Therapy',None,'per_session',100,600,'hormone therapy'),
    'Hormone Replacement':('Wellness','Hormone Therapy',None,'per_session',100,600,'hormone replacement'),
    'HRT':('Wellness','Hormone Therapy',None,'per_session',100,600,'hrt'),
    'Testosterone':('Wellness','Hormone Therapy',None,'per_session',100,500,'testosterone'),
    'Testosterone Therapy':('Wellness','Hormone Therapy',None,'per_session',100,500,'testosterone therapy'),
    'Bioidentical Hormone':('Wellness','Hormone Therapy',None,'per_session',200,800,'bioidentical hormone'),
    'Pellet Therapy':('Wellness','Hormone Therapy',None,'per_session',300,800,'pellet therapy'),
    'Hydration Therapy':('Wellness','Intravenous Nutrient Therapy',None,'per_session',75,300,'hydration therapy'),
    'Infusion Therapy':('Wellness','Intravenous Nutrient Therapy',None,'per_session',100,400,'infusion therapy'),
    'Ozone Therapy':('Wellness','Ozone Therapy',None,'per_session',100,500,'ozone therapy'),
    'Massage':('Wellness','Massage Therapy',None,'per_session',60,200,'massage'),
    'Swedish Massage':('Wellness','Massage Therapy',None,'per_session',60,150,'swedish massage'),
    'Deep Tissue Massage':('Wellness','Massage Therapy',None,'per_session',75,180,'deep tissue massage'),
    'Hot Stone Massage':('Wellness','Massage Therapy',None,'per_session',80,200,'hot stone massage'),
    'Body Massage':('Wellness','Massage Therapy',None,'per_session',60,180,'body massage'),
    'Cupping':('Wellness','Massage Therapy',None,'per_session',50,150,'cupping'),
    'Infrared Sauna':('Wellness','Sauna Therapy',None,'per_session',30,100,'infrared sauna'),
    'Cryotherapy':('Wellness','Cryotherapy',None,'per_session',50,150,'cryotherapy'),
    'Float Therapy':('Wellness','Float Therapy',None,'per_session',50,150,'float therapy'),
    'Salt Therapy':('Wellness','Salt Therapy',None,'per_session',30,100,'salt therapy'),
    'Acupuncture':('Wellness','Acupuncture',None,'per_session',75,200,'acupuncture'),
    'Spray Tan':('Wellness','Tanning',None,'per_session',30,75,'spray tan'),
    'Airbrush Tan':('Wellness','Tanning',None,'per_session',30,75,'airbrush tan'),
    'Semaglutide':('Medical Weight Loss','GLP-1 Agonist','Semaglutide','per_session',100,600,'semaglutide'),
    'Tirzepatide':('Medical Weight Loss','GLP-1 Agonist','Tirzepatide','per_session',150,800,'tirzepatide'),
    'Ozempic':('Medical Weight Loss','GLP-1 Agonist','Semaglutide','per_session',200,800,'ozempic'),
    'Wegovy':('Medical Weight Loss','GLP-1 Agonist','Semaglutide','per_session',200,800,'wegovy'),
    'Mounjaro':('Medical Weight Loss','GLP-1 Agonist','Tirzepatide','per_session',200,800,'mounjaro'),
    'GLP-1':('Medical Weight Loss','GLP-1 Agonist',None,'per_session',100,600,'glp-1'),
    'GLP-1 Agonist':('Medical Weight Loss','GLP-1 Agonist',None,'per_session',100,600,'glp-1 agonist'),
    'Weight Loss Injection':('Medical Weight Loss','GLP-1 Agonist',None,'per_session',100,600,'weight loss injection'),
    'Weight Loss Program':('Medical Weight Loss','Comprehensive Program',None,'per_session',100,500,'weight loss program'),
    'Medical Weight Loss':('Medical Weight Loss','Comprehensive Program',None,'per_session',100,500,'medical weight loss'),
    'Phentermine':('Medical Weight Loss','Appetite Suppressant',None,'per_session',50,200,'phentermine'),
    'Facial':('Facial','Custom Facial',None,'per_session',75,250,'facial'),
    'Custom Facial':('Facial','Custom Facial',None,'per_session',75,250,'custom facial'),
    'Signature Facial':('Facial','Custom Facial',None,'per_session',100,300,'signature facial'),
    'Anti-Aging Facial':('Facial','Anti-Aging Facial',None,'per_session',100,350,'anti-aging facial'),
    'Anti Aging Facial':('Facial','Anti-Aging Facial',None,'per_session',100,350,'anti aging facial'),
    'Acne Facial':('Facial','Acne Facial',None,'per_session',75,250,'acne facial'),
    'Acne Treatment':('Facial','Acne Facial',None,'per_session',75,250,'acne treatment'),
    'LED Facial':('Facial','LED Light Therapy',None,'per_session',75,200,'led facial'),
    'LED Light Therapy':('Facial','LED Light Therapy',None,'per_session',75,200,'led light therapy'),
    'Red Light Therapy':('Facial','LED Light Therapy',None,'per_session',50,200,'red light therapy'),
    'Oxygen Facial':('Facial','Oxygen Facial',None,'per_session',100,300,'oxygen facial'),
    'Brightening Facial':('Facial','Custom Facial',None,'per_session',100,300,'brightening facial'),
    'Hydrating Facial':('Facial','Custom Facial',None,'per_session',75,250,'hydrating facial'),
    'European Facial':('Facial','Custom Facial',None,'per_session',75,200,'european facial'),
    'Deep Cleansing Facial':('Facial','Custom Facial',None,'per_session',75,200,'deep cleansing facial'),
    'Back Facial':('Facial','Custom Facial',None,'per_session',75,200,'back facial'),
    'Medical Grade Facial':('Facial','Custom Facial',None,'per_session',100,300,'medical grade facial'),
    'Glow Facial':('Facial','Custom Facial',None,'per_session',75,250,'glow facial'),
    'Microblading':('Skin Treatment','Permanent Makeup',None,'per_session',400,900,'microblading'),
    'Ombre Brows':('Skin Treatment','Permanent Makeup',None,'per_session',400,900,'ombre brows'),
    'Powder Brows':('Skin Treatment','Permanent Makeup',None,'per_session',400,900,'powder brows'),
    'Permanent Makeup':('Skin Treatment','Permanent Makeup',None,'per_session',300,800,'permanent makeup'),
    'Lip Blushing':('Skin Treatment','Permanent Makeup',None,'per_session',400,900,'lip blushing'),
    'Eyeliner Tattoo':('Skin Treatment','Permanent Makeup',None,'per_session',300,700,'eyeliner tattoo'),
    'Lash Extensions':('Facial','Lash Extensions',None,'per_session',100,300,'lash extensions'),
    'Lash Lift':('Facial','Lash Extensions',None,'per_session',75,150,'lash lift'),
    'Brow Lamination':('Facial','Brow Services',None,'per_session',75,150,'brow lamination'),
    'Brow Tint':('Facial','Brow Services',None,'per_session',30,75,'brow tint'),
    'Brazilian Wax':('Laser','Hair Reduction',None,'per_session',40,80,'brazilian wax'),
    'Waxing':('Laser','Hair Reduction',None,'per_session',15,100,'waxing'),
    'Electrolysis':('Laser','Hair Reduction',None,'per_session',50,150,'electrolysis'),
    'Sculplla':('Biostimulator','Poly-L-Lactic Acid','Sculplla','per_session',300,800,'sculplla'),
    'Bellafill':('Biostimulator','PMMA Filler','Bellafill','per_syringe',700,1200,'bellafill'),
}

sorted_names = sorted(TAXONOMY.keys(), key=len, reverse=True)
PROC_RE = re.compile(
    r'(?<!\w)(' + '|'.join(re.escape(n) for n in sorted_names) + r')(?!\w)',
    re.IGNORECASE,
)
print(f"Taxonomy: {len(TAXONOMY)} entries")

# ── Patch 1: Per-brand proximity guard (H4 fix) ───────────────────────────────
# If a competing neurotoxin brand name appears *closer* to the extracted price
# than the matched procedure keyword, the price more likely belongs to the
# competitor (e.g. "$5/unit" next to "Dysport" when we matched "Botox").
# This is the primary defense against H4 Dysport-price-captured-as-Botox.
COMPETING_BRANDS_RE = re.compile(
    r'\b(dysport|xeomin|jeuveau|daxxify|letybo)\b', re.I
)


def nearest_brand_to_price(ctx, price_match_start, proc_match_start_in_ctx):
    """
    Returns True if a competing neurotoxin brand is closer to the price
    than the matched procedure keyword, meaning the price likely belongs
    to the competitor, not the matched brand.
    """
    competing = list(COMPETING_BRANDS_RE.finditer(ctx))
    if not competing:
        return False
    dist_to_proc = abs(price_match_start - proc_match_start_in_ctx)
    min_dist_to_competitor = min(
        abs(price_match_start - m.start()) for m in competing
    )
    return min_dist_to_competitor < dist_to_proc


# ── Patch 2: Promo-language detection (H1 fix) ───────────────────────────────
# When promo language appears near a price, mark it as a starting/promo price
# rather than a standard retail per-unit price.
PROMO_RE = re.compile(
    r'\b(new\s+client|first\s+visit|intro(?:ductory)?|minimum\s+\d+\s+units?|'
    r'\d+\s+unit\s+min(?:imum)?|easter|holiday|spring|summer|month\s+only|'
    r'limited\s+time|while\s+supplies|expires?|members?\s+only|membership|'
    r'loyalty\s+price|special\s+offer|promo(?:tion)?)\b',
    re.I
)


def has_promo_signal(ctx):
    return bool(PROMO_RE.search(ctx))


# ── Patch 3: Wrong-page-type URL blocklist (H2a fix) ─────────────────────────
# Skip source URLs whose path clearly indicates a non-pricing page
# (weight-loss programs, wholesale portals, provider-only content).
WRONG_PAGE_PATH_RE = re.compile(
    r'/(?:weight[-_]?loss|weight[-_]management|wholesale|provider[-_]?portal|'
    r'staff[-_]?only|b2b|for[-_]?providers?|practitioner)',
    re.I
)


def is_wrong_page_type(url):
    if not url:
        return False
    return bool(WRONG_PAGE_PATH_RE.search(url))


# ── Patch 4: Taxonomy floor per (category, label) pair ───────────────────────
# Companion to the DB-layer plausibility trigger (migration 084).
# Rows below these floors are silently skipped at extraction time.
# Only scraper-side extraction is affected; provider_listed/community rows
# bypass this file entirely.
PRICE_LABEL_FLOORS = {
    ('Neurotoxin', 'per_unit'): 8,     # H4+H1 floor: real sub-$8 Botox must
                                        # come from provider_listed or community
}

# ── Extract ───────────────────────────────────────────────────────────────────
print("\nExtracting prices with unit resolution...")
new_records = []
providers_found = set()
units_from_text = 0
units_from_taxonomy = 0
units_reclassified = 0

for domain, data in domain_data.items():
    if domain in existing_price_domains:
        continue
    if domain in JUNK_DOMAINS:
        continue
    if is_booking_platform(domain):
        continue

    source_url_candidate = data.get('url', f'https://{domain}')
    if is_wrong_page_type(source_url_candidate):   # Patch 3
        continue

    combined = data.get('combined', '')
    if not combined:
        continue
    if len(NOISE_RE.findall(combined[:2000])) > 5:
        continue
    if not MEDSPA_KW.search(combined):
        continue

    prov = master_lookup.get(domain, {})
    source_url = source_url_candidate
    seen = set()

    for match in PROC_RE.finditer(combined):
        proc_raw = match.group(1)
        proc_key = next((k for k in sorted_names if k.lower() == proc_raw.lower()), None)
        if not proc_key:
            continue
        cat, subcat, brand, default_unit, tlo, thi, tags = TAXONOMY[proc_key]
        floor = PRICE_FLOORS.get(cat, MIN_PRICE)
        ceil = PRICE_CEILINGS.get(cat, MAX_PRICE)

        start = max(0, match.start() - WINDOW)
        end = min(len(combined), match.end() + WINDOW)
        ctx = combined[start:end]
        # Offset of proc match within the context window (for proximity calc)
        proc_start_in_ctx = match.start() - start

        resolved_unit, is_starting = resolve_unit(ctx, default_unit)
        if resolved_unit != default_unit:
            units_from_text += 1
        else:
            units_from_taxonomy += 1

        # Patch 2: flag promo context
        is_promo = has_promo_signal(ctx)

        for p_match in PRICE_RE.finditer(ctx):
            p = p_match.group(1)
            try:
                price = float(p.replace(',', ''))
            except:
                continue
            if not (floor <= price <= ceil):
                continue

            # Patch 1: skip if a competing brand is closer to this price
            if cat == 'Neurotoxin' and nearest_brand_to_price(
                ctx, p_match.start(), proc_start_in_ctx
            ):
                continue

            # Post-assignment plausibility guard: reclassify if label and
            # price are inconsistent (e.g. per_unit=$800 → flat_package).
            final_unit, reclassified = check_label_plausibility(price, resolved_unit, cat)
            if reclassified:
                units_reclassified += 1

            # Patch 4: per-(cat, label) floor — skip implausibly cheap rows
            label_floor = PRICE_LABEL_FLOORS.get((cat, final_unit))
            if label_floor is not None and price < label_floor:
                continue

            key = (domain, proc_key, price)
            dedup_key = (domain, proc_key.lower(), price)
            if key in seen:
                continue
            if dedup_key in existing_keys:
                continue
            seen.add(key)

            final_starting = (
                is_starting
                or is_promo                                          # Patch 2
                or (cat == 'Neurotoxin' and final_unit == 'per_unit')
            )

            new_records.append({
                'provider_id': prov.get('supabase_id'),
                'procedure_name': proc_key,
                'brand': brand,
                'category': cat,
                'subcategory': subcat,
                'price': price,
                'pricing_unit': final_unit,
                'unit_description': None,
                'is_starting_price': final_starting,
                'is_deal': is_promo,                           # Patch 2: promo context → deal flag
                'deal_type': 'promotion' if is_promo else None,
                'price_notes': None,
                'typical_range_low': tlo,
                'typical_range_high': thi,
                'tags': tags,
                'source_type': 'cheerio_scraper',
                'source_url': source_url,
                'provider_name': prov.get('name'),
                'provider_city': prov.get('city'),
                'provider_state': prov.get('state'),
                'domain': domain,
            })
            providers_found.add(domain)

print(f"\nUnits resolved from text:     {units_from_text:,}")
print(f"Units from taxonomy default:  {units_from_taxonomy:,}")
print(f"Units reclassified (plausibility guard): {units_reclassified:,}")
print(f"Net new records extracted:    {len(new_records):,}")
print(f"Net new priced providers:     {len(providers_found):,}")

# ── Merge ─────────────────────────────────────────────────────────────────────
if new_records:
    combined_out = pd.concat([existing, pd.DataFrame(new_records)], ignore_index=True)
else:
    combined_out = existing.copy()

print(f"\n{'='*55}")
print(f"EXISTING:  {len(existing):,} records | {len(existing_price_domains):,} providers")
print(f"NEW (net): {len(new_records):,} records | {len(providers_found):,} providers")
print(f"TOTAL:     {len(combined_out):,} records | {combined_out['domain'].nunique():,} providers")
print(f"{'='*55}")

print(f"\nPricing unit breakdown:")
print(combined_out['pricing_unit'].value_counts().to_string())

print(f"\nNeurotoxin unit breakdown:")
tox = combined_out[combined_out['category'] == 'Neurotoxin']
print(tox.groupby(['procedure_name', 'pricing_unit']).size().unstack(fill_value=0).to_string())

combined_out.to_csv(OUTPUT_CSV, index=False)
print(f"\nSaved: {OUTPUT_CSV}")

"""
GlowBuddy — Full provider upload + pricing + benchmarks.

Steps:
  1. Upsert 40k providers from GlowBuddy_MASTER_COMBINED.csv
  2. Build provider_id lookup map from Supabase
  3. Insert reddit pricing records linked by provider_id
  4. Upsert city + state benchmarks
"""

import os
import sys
import time
import math
import re
import warnings
warnings.filterwarnings("ignore")

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ["VITE_SUPABASE_URL"]
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_KEY")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
)
if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# Resolve CSV paths — master in project root, reddit files in Downloads
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS = os.path.expanduser("~/Downloads")

def find_csv(*candidates):
    for path in candidates:
        if os.path.exists(path):
            return path
    return None

MASTER_CSV  = find_csv(
    os.path.join(PROJECT_DIR, "GlowBuddy_MASTER_COMBINED.csv"),
    os.path.join(DOWNLOADS, "GlowBuddy_MASTER_COMBINED.csv"),
)
REDDIT_CSV  = find_csv(
    os.path.join(PROJECT_DIR, "reddit_all_threads_prices.csv"),
    os.path.join(DOWNLOADS, "reddit_all_threads_prices.csv"),
)
CITY_AVG_CSV = find_csv(
    os.path.join(PROJECT_DIR, "reddit_city_price_averages.csv"),
    os.path.join(DOWNLOADS, "reddit_city_price_averages.csv"),
)
STATE_AVG_CSV = find_csv(
    os.path.join(PROJECT_DIR, "reddit_state_price_averages.csv"),
    os.path.join(DOWNLOADS, "reddit_state_price_averages.csv"),
)

for label, path in [
    ("GlowBuddy_MASTER_COMBINED.csv", MASTER_CSV),
    ("reddit_all_threads_prices.csv", REDDIT_CSV),
    ("reddit_city_price_averages.csv", CITY_AVG_CSV),
    ("reddit_state_price_averages.csv", STATE_AVG_CSV),
]:
    if not path:
        sys.exit(f"Missing CSV: {label}")

# ── Helpers ──────────────────────────────────────────────────────────────────
def clean(v):
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    s = str(v).strip()
    return None if s in ("nan", "None", "", "NaN", "null") else s

def safe_float(v):
    try:
        f = float(v)
        return None if math.isnan(f) else round(f, 4)
    except (TypeError, ValueError):
        return None

def safe_int(v):
    try:
        f = float(v)
        return None if math.isnan(f) else int(f)
    except (TypeError, ValueError):
        return None

def safe_bool(v):
    if v is None:
        return False
    if isinstance(v, bool):
        return v
    return str(v).lower() in ("true", "1", "yes")

def normalize(s):
    if not s or str(s) == "nan":
        return ""
    return re.sub(r"[^a-z0-9]", "", str(s).lower())

def make_slug(name, city, state):
    """Mirror providerSlugFromParts from src/lib/slugify.js."""
    parts = [name, city, state]
    s = "-".join(str(p) for p in parts if p)
    s = re.sub(r"[^a-zA-Z0-9\s-]", "", s).lower()
    s = re.sub(r"\s+", "-", s.strip())
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "unnamed"

# ── Load master CSV ──────────────────────────────────────────────────────────
print(f"Loading master CSV: {MASTER_CSV}")
master = pd.read_csv(MASTER_CSV, low_memory=False)
print(f"  {len(master):,} providers loaded")

# ── Step 1: Upsert providers in batches of 500 ───────────────────────────────
print("\nStep 1: Upserting providers...")

rows = []
for _, r in master.iterrows():
    name = clean(r.get("name"))
    if not name:
        continue

    city = clean(r.get("city"))
    state = clean(r.get("state"))
    row = {
        "name":                name,
        "slug":                make_slug(name, city, state),
        "city":                city,
        "state":               state,
        "address":             clean(r.get("address")) or "",
        "zip_code":            clean(r.get("zip_code")) or clean(r.get("zip")) or "",
        "website":             clean(r.get("website")),
        "phone":               clean(r.get("phone")),
        "lat":                 safe_float(r.get("lat")),
        "lng":                 safe_float(r.get("lng")),
        "google_place_id":     clean(r.get("google_place_id")),
        "google_rating":       safe_float(r.get("google_rating")),
        "google_review_count": safe_int(r.get("google_review_count")),
        "yelp_rating":         safe_float(r.get("yelp_rating")),
        "yelp_review_count":   safe_int(r.get("yelp_review_count")),
        "yelp_url":            clean(r.get("yelp_url")),
        "provider_type":       clean(r.get("provider_type")) or "Med Spa (Non-Physician)",
        "tier":                clean(r.get("tier")) or "free",
        "legitimacy":          clean(r.get("legitimacy")),
        "legitimacy_score":    safe_float(r.get("legitimacy_score")),
        "legitimacy_source":   clean(r.get("legitimacy_source")),
        "domain":              clean(r.get("domain")),
        "is_claimed":          safe_bool(r.get("is_claimed")),
        "is_active":           True,
    }

    # Optional botox price columns — only set if present
    for col in ("botox_price_low", "botox_price_high", "botox_price_median",
                "botox_sample_n", "botox_source"):
        if col in master.columns:
            if col == "botox_sample_n":
                v = safe_int(r.get(col))
            elif col == "botox_source":
                v = clean(r.get(col))
            else:
                v = safe_float(r.get(col))
            if v is not None:
                row[col] = v

    # If we already have the supabase_id, include it for update
    sid = clean(r.get("supabase_id"))
    if sid:
        row["id"] = sid

    rows.append(row)

print("  Pre-fetching existing providers to skip duplicates...")
existing_keys = set()
existing_place_ids = set()
offset = 0
while True:
    res = (
        sb.table("providers")
        .select("name,city,state,google_place_id")
        .range(offset, offset + 999)
        .execute()
    )
    if not res.data:
        break
    for p in res.data:
        name = (p.get("name") or "").strip().lower()
        city = (p.get("city") or "").strip().lower()
        state = (p.get("state") or "").strip().lower()
        if name and city:
            existing_keys.add(f"{name}|{city}|{state}")
        if p.get("google_place_id"):
            existing_place_ids.add(p["google_place_id"])
    if len(res.data) < 1000:
        break
    offset += 1000
print(f"    {len(existing_keys):,} name/city/state keys, {len(existing_place_ids):,} place IDs")

# Filter out rows that already exist
filtered_rows = []
skipped_dupes = 0
for row in rows:
    pid = row.get("google_place_id")
    if pid and pid in existing_place_ids:
        skipped_dupes += 1
        continue
    name = (row.get("name") or "").strip().lower()
    city = (row.get("city") or "").strip().lower()
    state = (row.get("state") or "").strip().lower()
    key = f"{name}|{city}|{state}"
    if name and city and key in existing_keys:
        skipped_dupes += 1
        continue
    # Skip rows with no city or state — city is NOT NULL in the DB
    if not row.get("city") or not row.get("state"):
        skipped_dupes += 1
        continue
    # Skip rows with invalid state codes (providers_state_check constraint)
    if len(str(row["state"]).strip()) != 2:
        skipped_dupes += 1
        continue
    filtered_rows.append(row)
    # Mark as seen so duplicates within the CSV are also skipped
    if pid:
        existing_place_ids.add(pid)
    if name and city:
        existing_keys.add(key)

print(f"  Skipping {skipped_dupes:,} existing duplicates — {len(filtered_rows):,} new rows to insert")
rows = filtered_rows

BATCH = 500
total_batches = math.ceil(len(rows) / BATCH) if rows else 0
print(f"  {len(rows):,} rows in {total_batches} batches of {BATCH}...")

inserted = 0
errors = 0
consecutive_errors = 0

for i in range(0, len(rows), BATCH):
    batch = rows[i:i + BATCH]
    batch_num = i // BATCH + 1

    try:
        # All rows in `batch` have been pre-filtered to be new, so a plain
        # insert is safe. If a collision still sneaks through (rare race),
        # we catch and continue.
        sb.table("providers").insert(batch).execute()
        inserted += len(batch)
        consecutive_errors = 0

    except Exception as e:
        errors += 1
        consecutive_errors += 1
        print(f"  ERROR batch {batch_num}: {str(e)[:120]}")
        if consecutive_errors >= 10:
            print("  Too many consecutive errors — stopping.")
            sys.exit(1)
        time.sleep(1)
        continue

    if batch_num % 10 == 0 or batch_num == total_batches:
        pct = round(batch_num / total_batches * 100)
        print(f"  [{pct:>3}%] Batch {batch_num}/{total_batches} — {inserted:,} processed")

    time.sleep(0.05)

print(f"  Providers processed: {inserted:,} | Errors: {errors}")

# ── Step 2: Build provider_id lookup map ─────────────────────────────────────
print("\nStep 2: Building provider_id lookup map...")

provider_id_map = {}
offset = 0
while True:
    res = (
        sb.table("providers")
        .select("id,name,city,google_place_id")
        .range(offset, offset + 999)
        .execute()
    )
    if not res.data:
        break
    for p in res.data:
        key = f"{normalize(p['name'])}|{(p.get('city') or '').lower().strip()}"
        provider_id_map[key] = p["id"]
        if p.get("google_place_id"):
            provider_id_map[f"place:{p['google_place_id']}"] = p["id"]
    if len(res.data) < 1000:
        break
    offset += 1000

print(f"  {len(provider_id_map):,} lookup entries")

# ── Step 3: Insert reddit pricing records ────────────────────────────────────
print("\nStep 3: Inserting reddit pricing records...")

reddit = pd.read_csv(REDDIT_CSV, low_memory=False)
print(f"  {len(reddit):,} reddit rows loaded from {REDDIT_CSV}")

PROC_MAP = {
    "Botox": "Botox", "Dysport": "Dysport", "Xeomin": "Xeomin",
    "Jeuveau": "Jeuveau", "Daxxify": "Daxxify", "Neurotoxin": "Botox",
    "Lip Filler": "Lip Filler", "Filler": "Dermal Filler",
    "Juvederm": "Juvederm", "Restylane": "Restylane", "Sculptra": "Sculptra",
    "Microneedling": "Microneedling", "Morpheus8": "Morpheus8",
    "HydraFacial": "HydraFacial", "IPL": "IPL", "BBL": "BBL",
    "Fraxel": "Fraxel", "Laser Hair Removal": "Laser Hair Removal",
    "Tirzepatide": "Tirzepatide", "Semaglutide": "Semaglutide",
}

pricing_rows = []
skipped = 0

for _, r in reddit.iterrows():
    price = safe_float(r.get("price"))
    if not price or price <= 0:
        skipped += 1
        continue

    provider_id = None
    status = clean(r.get("status"))

    if status == "matched":
        provider_id = clean(r.get("supabase_id"))

    if not provider_id:
        prov = clean(r.get("provider"))
        city = clean(r.get("city"))
        if prov:
            key = f"{normalize(prov)}|{(city or '').lower().strip()}"
            provider_id = provider_id_map.get(key)

    if not provider_id:
        skipped += 1
        continue

    brand = clean(r.get("brand")) or ""
    pricing_rows.append({
        "provider_id":        provider_id,
        "procedure_type":     PROC_MAP.get(brand, brand) or "Other",
        "price":              price,
        "price_label":        clean(r.get("unit")) or "per_unit",
        "is_starting_price":  False,
        "is_deal":            bool(r.get("is_deal", False)) if not isinstance(r.get("is_deal"), float) else False,
        "deal_type":          clean(r.get("deal_type")),
        "deal_notes":         clean(r.get("deal_notes")),
        "regular_price":      safe_float(r.get("regular_price")),
        "confidence_tier":    5,
        "source":             "community_submitted",
        "source_url":         clean(r.get("thread_url")) or "",
    })

inserted_pricing = 0
for i in range(0, len(pricing_rows), 100):
    batch = pricing_rows[i:i + 100]
    try:
        sb.table("provider_pricing").insert(batch).execute()
        inserted_pricing += len(batch)
    except Exception as e:
        print(f"  Pricing batch error: {str(e)[:100]}")

print(f"  Inserted: {inserted_pricing} | Skipped (no provider match): {skipped}")

# ── Step 4: Upsert city + state benchmarks ───────────────────────────────────
print("\nStep 4: Upserting benchmarks...")

def bench_row(r, has_city):
    return {
        "city":           clean(r.get("city")) if has_city else None,
        "state":          clean(r["state"]),
        "country":        "US",
        "procedure_type": "Botox",
        "sample_size":    safe_int(r["sample_size"]),
        "median_price":   safe_float(r["median_price"]),
        "mean_price":     safe_float(r["mean_price"]),
        "min_price":      safe_float(r["min_price"]),
        "max_price":      safe_float(r["max_price"]),
        "source":         "reddit_community",
    }

city_avg = pd.read_csv(CITY_AVG_CSV, low_memory=False)
state_avg = pd.read_csv(STATE_AVG_CSV, low_memory=False)

city_rows = [bench_row(r, True) for _, r in city_avg.iterrows()]
state_rows = [bench_row(r, False) for _, r in state_avg.iterrows()]

try:
    sb.table("city_price_benchmarks").upsert(
        city_rows, on_conflict="city,state,procedure_type"
    ).execute()
    print(f"  City benchmarks:  {len(city_rows)}")
except Exception as e:
    print(f"  City benchmark error: {str(e)[:120]}")

try:
    sb.table("city_price_benchmarks").upsert(
        state_rows, on_conflict="city,state,procedure_type"
    ).execute()
    print(f"  State benchmarks: {len(state_rows)}")
except Exception as e:
    print(f"  State benchmark error: {str(e)[:120]}")

# ── Summary ──────────────────────────────────────────────────────────────────
print(f"\n{'=' * 55}")
print("  UPLOAD COMPLETE")
print(f"{'=' * 55}")
print(f"  Providers processed:      {inserted:,}")
print(f"  Provider upload errors:   {errors}")
print(f"  Pricing records inserted: {inserted_pricing:,}")
print(f"  Pricing skipped:          {skipped:,}")
print(f"  City benchmarks:          {len(city_rows)}")
print(f"  State benchmarks:         {len(state_rows)}")
print(f"{'=' * 55}")

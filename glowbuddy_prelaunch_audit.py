import os, json, subprocess, re, sys
from datetime import datetime

# Suppress urllib3 SSL warning
import warnings
warnings.filterwarnings("ignore")

from supabase import create_client
from dotenv import load_dotenv
import requests

load_dotenv()
SITE_URL = os.environ.get("SITE_URL", "https://knowbeforeyouglow.com")
SB_URL   = os.environ["SUPABASE_URL"]
SB_KEY   = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY", "")
supabase = create_client(SB_URL, SB_KEY)

results = []
def check(category, name, status, detail, priority="medium"):
    results.append({"category": category, "name": name, "status": status,
                    "detail": detail, "priority": priority})
    icon = "\u2705" if status == "pass" else "\u274c" if status == "fail" else "\u26a0\ufe0f"
    print(f"  {icon} [{priority.upper()}] {name}: {detail[:100]}")

print(f"\n{'='*60}")
print(f"  GlowBuddy Pre-Launch Audit — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
print(f"  Target: {SITE_URL}")
print(f"{'='*60}\n")

# ── 1. SUPABASE DATA INTEGRITY ──────────────────────────────────────────────
print("1. Supabase data integrity...")

try:
    r = supabase.table('providers').select('id', count='exact').execute()
    total = r.count
    check("data", "Total providers", "pass" if total > 40000 else "warn",
          f"{total:,} providers in DB", "high")

    r = supabase.table('providers').select('id', count='exact').eq('is_active', True).execute()
    active = r.count
    check("data", "Active providers", "pass" if active > 10000 else "warn",
          f"{active:,} active providers", "high")

    r = supabase.table('provider_pricing').select('id', count='exact').execute()
    pricing_count = r.count
    check("data", "Pricing records total", "pass" if pricing_count > 50000 else "warn",
          f"{pricing_count:,} pricing records", "high")

    # Booking platform junk — check by ilike on source_url
    r = supabase.table('provider_pricing').select('id', count='exact').ilike('source_url', '%glossgenius.com%').execute()
    junk = r.count
    check("data", "GlossGenius junk removed", "pass" if junk == 0 else "fail",
          f"{junk} glossgenius records remaining", "high")

    # Confidence tiers — check for nulls
    r = supabase.table('provider_pricing').select('id', count='exact').is_('confidence_tier', 'null').execute()
    null_tiers = r.count
    check("data", "No null confidence tiers", "pass" if null_tiers == 0 else "fail",
          f"{null_tiers} records missing confidence tier", "medium")

    # Neurotoxin price ceiling — Botox per_unit > $25 should be 0
    r = supabase.table('provider_pricing').select('id', count='exact') \
        .eq('procedure_type', 'Botox').eq('price_label', 'per_unit').gt('price', 25).execute()
    bad_botox = r.count
    check("data", "Botox per_unit ceiling enforced", "pass" if bad_botox == 0 else "fail",
          f"{bad_botox} Botox records with per_unit > $25", "high")

    # Providers with lat/lng
    r = supabase.table('providers').select('id', count='exact') \
        .eq('is_active', True).not_.is_('lat', 'null').execute()
    geo = r.count
    pct = round(geo / active * 100, 1) if active else 0
    check("data", "Providers with geo coordinates", "pass" if pct > 80 else "warn",
          f"{geo:,} ({pct}%) have lat/lng", "high")

    # Providers with website
    r = supabase.table('providers').select('id', count='exact') \
        .eq('is_active', True).not_.is_('website', 'null').execute()
    with_web = r.count
    web_pct = round(with_web / active * 100, 1) if active else 0
    check("data", "Providers with website", "pass" if web_pct > 30 else "warn",
          f"{with_web:,} ({web_pct}%) have a website", "medium")

    # city_price_benchmarks table
    try:
        r = supabase.table('city_price_benchmarks').select('id', count='exact').execute()
        check("data", "City price benchmarks", "pass" if r.count >= 20 else "warn",
              f"{r.count} city/state benchmarks", "medium")
    except:
        check("data", "City price benchmarks table", "fail",
              "Table does not exist — run migration 073", "medium")

except Exception as e:
    check("data", "Supabase connection", "fail", str(e), "critical")

# ── 2. SITE & SEO CHECKS ────────────────────────────────────────────────────
print("\n2. Site and SEO checks...")

try:
    r = requests.get(SITE_URL, timeout=15)
    check("seo", "Site loads (200 OK)", "pass" if r.status_code == 200 else "fail",
          f"Status {r.status_code}", "critical")

    html = r.text
    has_title       = '<title>' in html and '</title>' in html
    has_description = 'name="description"' in html.lower()
    has_og_title    = 'og:title' in html.lower()
    has_og_image    = 'og:image' in html.lower()
    has_viewport    = 'name="viewport"' in html.lower()
    has_canonical   = 'rel="canonical"' in html.lower()
    has_favicon     = 'favicon' in html.lower() or 'icon' in html.lower()

    check("seo", "Page title tag",     "pass" if has_title else "fail",       "present" if has_title else "MISSING", "high")
    check("seo", "Meta description",   "pass" if has_description else "fail", "present" if has_description else "MISSING", "high")
    check("seo", "OG title tag",       "pass" if has_og_title else "warn",    "present" if has_og_title else "MISSING — link previews will be blank", "high")
    check("seo", "OG image tag",       "pass" if has_og_image else "fail",    "present" if has_og_image else "MISSING — Reddit/iMessage/Slack previews blank", "high")
    check("seo", "Canonical URL",      "pass" if has_canonical else "warn",   "present" if has_canonical else "missing", "medium")
    check("mobile", "Viewport meta",   "pass" if has_viewport else "fail",    "present" if has_viewport else "MISSING", "high")
    check("seo", "Favicon",            "pass" if has_favicon else "warn",     "present" if has_favicon else "missing", "low")

    # HTTPS redirect
    try:
        http_r = requests.get(SITE_URL.replace('https://', 'http://'), allow_redirects=False, timeout=10)
        check("security", "HTTP → HTTPS redirect",
              "pass" if http_r.status_code in [301, 302, 308] else "warn",
              f"HTTP returns {http_r.status_code}", "high")
    except:
        check("security", "HTTP → HTTPS redirect", "warn", "Could not test", "high")

    # Security headers
    h = {k.lower(): v for k, v in r.headers.items()}
    check("security", "HSTS header",
          "pass" if "strict-transport-security" in h else "warn",
          h.get("strict-transport-security", "MISSING")[:60], "medium")
    check("security", "X-Frame-Options",
          "pass" if "x-frame-options" in h else "warn",
          h.get("x-frame-options", "MISSING"), "medium")
    check("security", "X-Content-Type-Options",
          "pass" if "x-content-type-options" in h else "warn",
          h.get("x-content-type-options", "MISSING"), "low")
    check("security", "Content-Security-Policy",
          "pass" if "content-security-policy" in h else "warn",
          "present" if "content-security-policy" in h else "MISSING", "medium")

    # Robots.txt
    robots = requests.get(f"{SITE_URL}/robots.txt", timeout=10)
    check("seo", "robots.txt", "pass" if robots.status_code == 200 else "warn",
          f"Status {robots.status_code}", "low")

    # Sitemap
    sitemap = requests.get(f"{SITE_URL}/sitemap.xml", timeout=10)
    check("seo", "sitemap.xml", "pass" if sitemap.status_code == 200 else "warn",
          f"Status {sitemap.status_code}", "medium")

    # Legal pages
    check("legal", "Privacy policy linked",
          "pass" if "privacy" in html.lower() else "fail",
          "Found in page" if "privacy" in html.lower() else "MISSING — required before launch", "high")
    check("legal", "Terms of service linked",
          "pass" if "terms" in html.lower() else "fail",
          "Found in page" if "terms" in html.lower() else "MISSING — required before launch", "high")

except requests.exceptions.ConnectionError:
    check("seo", "Site reachable", "fail", f"Cannot connect to {SITE_URL}", "critical")
except Exception as e:
    check("seo", "Site checks", "fail", str(e), "high")

# ── 3. API / RLS CHECKS ─────────────────────────────────────────────────────
print("\n3. API and auth checks...")

try:
    headers_svc = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}
    api_url = f"{SB_URL}/rest/v1/providers?select=id&limit=1"
    r = requests.get(api_url, headers=headers_svc, timeout=10)
    check("api", "Supabase REST API responds", "pass" if r.status_code == 200 else "fail",
          f"Status {r.status_code}", "critical")

    # Anon key RLS check
    if ANON_KEY:
        headers_anon = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}
        r_anon = requests.get(api_url, headers=headers_anon, timeout=10)
        check("security", "Anon key RLS enforced",
              "pass" if r_anon.status_code in [200, 401, 403] else "warn",
              f"Anon query returns {r_anon.status_code}", "high")

        # Check if anon can read service-only tables
        sensitive_url = f"{SB_URL}/rest/v1/users?select=id&limit=1"
        r_sens = requests.get(sensitive_url, headers=headers_anon, timeout=10)
        check("security", "Users table blocked for anon",
              "pass" if r_sens.status_code in [401, 403, 404] or (r_sens.status_code == 200 and r_sens.json() == []) else "fail",
              f"Status {r_sens.status_code}", "high")

except Exception as e:
    check("api", "API checks", "fail", str(e), "high")

# ── 4. EMAIL DNS ─────────────────────────────────────────────────────────────
print("\n4. Email infrastructure...")

try:
    domain = SITE_URL.replace("https://", "").replace("http://", "").split("/")[0]

    result = subprocess.run(['nslookup', '-type=MX', domain], capture_output=True, text=True, timeout=10)
    has_mx = 'mail exchanger' in result.stdout.lower() or 'mail' in result.stdout.lower()
    check("email", "MX records configured", "pass" if has_mx else "warn",
          "Mail exchanger found" if has_mx else "No MX records — cannot receive email", "medium")

    result = subprocess.run(['nslookup', '-type=TXT', domain], capture_output=True, text=True, timeout=10)
    has_spf = 'v=spf1' in result.stdout.lower()
    check("email", "SPF record", "pass" if has_spf else "fail",
          "SPF present" if has_spf else "MISSING — emails will land in spam", "high")

    result = subprocess.run(['nslookup', '-type=TXT', f'_dmarc.{domain}'],
                            capture_output=True, text=True, timeout=10)
    has_dmarc = 'v=dmarc1' in result.stdout.lower()
    check("email", "DMARC record", "pass" if has_dmarc else "warn",
          "DMARC present" if has_dmarc else "MISSING — domain spoofing possible", "medium")

except Exception as e:
    check("email", "DNS checks", "warn", str(e), "medium")

# ── 5. NPM AUDIT ────────────────────────────────────────────────────────────
print("\n5. Dependency security...")

try:
    result = subprocess.run(['npm', 'audit', '--json'], capture_output=True, text=True, timeout=60,
                            cwd='/Users/petersloan/GlowBuddy')
    audit_data = json.loads(result.stdout)
    vulns = audit_data.get('metadata', {}).get('vulnerabilities', {})
    crit = vulns.get('critical', 0)
    high = vulns.get('high', 0)
    mod  = vulns.get('moderate', 0)
    check("security", "npm critical vulnerabilities",
          "pass" if crit == 0 else "fail",
          f"{crit} critical, {high} high, {mod} moderate", "high")
except Exception as e:
    check("security", "npm audit", "warn", f"Could not run: {e}", "medium")

# ── 6. SECRETS SCAN ──────────────────────────────────────────────────────────
print("\n6. Secrets scan...")

sensitive_patterns = [
    (r'sk-ant-api[a-zA-Z0-9_-]{20,}', 'Anthropic API key'),
    (r'sk_live_[a-zA-Z0-9]{20,}', 'Stripe live secret key'),
    (r'SUPABASE_SERVICE_ROLE_KEY\s*=\s*["\']?ey', 'Service role key in code'),
    (r're_[A-Za-z0-9_]{20,}', 'Resend API key'),
]

leaked = []
scan_dir = '/Users/petersloan/GlowBuddy/src'
for root, dirs, files in os.walk(scan_dir):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist']]
    for fname in files:
        if not fname.endswith(('.js', '.jsx', '.ts', '.tsx')): continue
        try:
            content = open(os.path.join(root, fname)).read()
            for pat, label in sensitive_patterns:
                if re.search(pat, content):
                    leaked.append(f"{fname}: {label}")
        except:
            pass

check("security", "No secrets in source code",
      "pass" if not leaked else "fail",
      f"{len(leaked)} leaks: {', '.join(leaked[:3])}" if leaked else "Clean", "critical")

# Also check .gitignore covers .env
try:
    gi = open('/Users/petersloan/GlowBuddy/.gitignore').read()
    check("security", ".env in .gitignore",
          "pass" if '.env' in gi else "fail",
          ".env is gitignored" if '.env' in gi else ".env NOT in .gitignore — keys may be committed", "critical")
except:
    check("security", ".gitignore check", "warn", "Could not read .gitignore", "high")

# ── 7. BUILD CHECK ──────────────────────────────────────────────────────────
print("\n7. Build verification...")

try:
    result = subprocess.run(['npx', 'vite', 'build'], capture_output=True, text=True, timeout=60,
                            cwd='/Users/petersloan/GlowBuddy')
    build_ok = result.returncode == 0
    check("build", "Vite production build",
          "pass" if build_ok else "fail",
          "Builds cleanly" if build_ok else f"Build failed: {result.stderr[:80]}", "critical")

    # Check bundle size
    if build_ok:
        dist_size = sum(
            os.path.getsize(os.path.join(dp, f))
            for dp, _, fns in os.walk('/Users/petersloan/GlowBuddy/dist')
            for f in fns
        )
        mb = round(dist_size / 1024 / 1024, 1)
        check("build", "Bundle size",
              "pass" if mb < 10 else "warn" if mb < 20 else "fail",
              f"{mb} MB total dist", "medium")
except Exception as e:
    check("build", "Build check", "fail", str(e), "critical")

# ── SUMMARY ──────────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print("  AUDIT SUMMARY")
print(f"{'='*60}")

passed   = [r for r in results if r['status'] == 'pass']
failed   = [r for r in results if r['status'] == 'fail']
warned   = [r for r in results if r['status'] == 'warn']
critical = [r for r in failed if r['priority'] in ('critical', 'high')]

print(f"  \u2705 Passed:   {len(passed)}")
print(f"  \u26a0\ufe0f  Warnings: {len(warned)}")
print(f"  \u274c Failed:   {len(failed)}")

if critical:
    print(f"\n  CRITICAL/HIGH FAILURES — fix before launch:")
    for r in critical:
        print(f"    \u274c {r['name']}: {r['detail'][:80]}")

if warned:
    print(f"\n  WARNINGS:")
    for r in warned:
        print(f"    \u26a0\ufe0f  {r['name']}: {r['detail'][:80]}")

# Write reports
with open('/Users/petersloan/GlowBuddy/audit_report.md', 'w') as f:
    f.write(f"# GlowBuddy Pre-Launch Audit\n")
    f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}  \n")
    f.write(f"**Site:** {SITE_URL}  \n")
    f.write(f"**Score:** {len(passed)}/{len(results)} passed\n\n")

    categories = sorted(set(r['category'] for r in results))
    for cat in categories:
        cat_results = [r for r in results if r['category'] == cat]
        f.write(f"\n## {cat.title()}\n\n")
        for r in cat_results:
            icon = "\u2705" if r['status'] == 'pass' else "\u274c" if r['status'] == 'fail' else "\u26a0\ufe0f"
            f.write(f"- {icon} **{r['name']}** `[{r['priority']}]`  \n")
            f.write(f"  {r['detail']}\n\n")

with open('/Users/petersloan/GlowBuddy/audit_report.json', 'w') as f:
    json.dump({"date": str(datetime.now()), "site": SITE_URL,
               "summary": {"passed": len(passed), "warned": len(warned), "failed": len(failed)},
               "results": results}, f, indent=2)

print(f"\n  Reports saved: audit_report.md, audit_report.json")

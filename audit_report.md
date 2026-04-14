# GlowBuddy Pre-Launch Audit
**Date:** 2026-04-13 17:49  
**Site:** https://knowbeforeyouglow.com  
**Score:** 30/37 passed


## Api

- ✅ **Supabase REST API responds** `[critical]`  
  Status 200


## Build

- ✅ **Vite production build** `[critical]`  
  Builds cleanly

- ✅ **Bundle size** `[medium]`  
  2.5 MB total dist


## Data

- ✅ **Total providers** `[high]`  
  43,484 providers in DB

- ✅ **Active providers** `[high]`  
  43,277 active providers

- ✅ **Pricing records total** `[high]`  
  79,303 pricing records

- ✅ **GlossGenius junk removed** `[high]`  
  0 glossgenius records remaining

- ✅ **No null confidence tiers** `[medium]`  
  0 records missing confidence tier

- ❌ **Botox per_unit ceiling enforced** `[high]`  
  195 Botox records with per_unit > $25

- ⚠️ **Providers with geo coordinates** `[high]`  
  27,421 (63.4%) have lat/lng

- ✅ **Providers with website** `[medium]`  
  15,456 (35.7%) have a website

- ❌ **City price benchmarks table** `[medium]`  
  Table does not exist — run migration 073


## Email

- ✅ **MX records configured** `[medium]`  
  Mail exchanger found

- ❌ **SPF record** `[high]`  
  MISSING — emails will land in spam

- ✅ **DMARC record** `[medium]`  
  DMARC present


## Legal

- ❌ **Privacy policy linked** `[high]`  
  MISSING — required before launch

- ❌ **Terms of service linked** `[high]`  
  MISSING — required before launch


## Mobile

- ✅ **Viewport meta** `[high]`  
  present


## Security

- ✅ **HTTP → HTTPS redirect** `[high]`  
  HTTP returns 308

- ✅ **HSTS header** `[medium]`  
  max-age=63072000; includeSubDomains; preload

- ✅ **X-Frame-Options** `[medium]`  
  DENY

- ✅ **X-Content-Type-Options** `[low]`  
  nosniff

- ✅ **Content-Security-Policy** `[medium]`  
  present

- ✅ **Anon key RLS enforced** `[high]`  
  Anon query returns 200

- ✅ **Users table blocked for anon** `[high]`  
  Status 404

- ✅ **npm critical vulnerabilities** `[high]`  
  0 critical, 1 high, 0 moderate

- ✅ **No secrets in source code** `[critical]`  
  Clean

- ✅ **.env in .gitignore** `[critical]`  
  .env is gitignored


## Seo

- ✅ **Site loads (200 OK)** `[critical]`  
  Status 200

- ✅ **Page title tag** `[high]`  
  present

- ✅ **Meta description** `[high]`  
  present

- ✅ **OG title tag** `[high]`  
  present

- ✅ **OG image tag** `[high]`  
  present

- ⚠️ **Canonical URL** `[medium]`  
  missing

- ✅ **Favicon** `[low]`  
  present

- ✅ **robots.txt** `[low]`  
  Status 200

- ✅ **sitemap.xml** `[medium]`  
  Status 200


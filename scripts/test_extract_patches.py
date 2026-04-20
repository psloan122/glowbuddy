#!/usr/bin/env python3
"""
Unit tests for the four scraper patches in extract_units.py.
Exercises each patch function in isolation with representative inputs.
extract_units.py executes at import time (CSV loads), so the relevant
functions are re-declared here verbatim — any change to the originals
must be mirrored in this file.

Run: python3 scripts/test_extract_patches.py
All assertions must pass before the patches are merged to main.

References:
  docs/botox-low-price-investigation.md §6.3, Patches 1–4
  docs/data-quality-decisions.md §9
"""

import re
import sys

# ── Re-declare patch symbols (verbatim from extract_units.py) ─────────────────

# Patch 1 — docs/botox-low-price-investigation.md §6.3 Patch 1
COMPETING_BRANDS_RE = re.compile(
    r'\b(dysport|xeomin|jeuveau|daxxify|letybo)\b', re.I
)

def nearest_brand_to_price(ctx, price_match_start, proc_match_start_in_ctx):
    """True → competing brand is closer to price than matched keyword → skip."""
    competing = list(COMPETING_BRANDS_RE.finditer(ctx))
    if not competing:
        return False
    dist_to_proc = abs(price_match_start - proc_match_start_in_ctx)
    min_dist_to_competitor = min(
        abs(price_match_start - m.start()) for m in competing
    )
    return min_dist_to_competitor < dist_to_proc

# Patch 2 — docs/botox-low-price-investigation.md §6.3 Patch 2
PROMO_RE = re.compile(
    r'\b(new\s+client|first\s+visit|intro(?:ductory)?|minimum\s+\d+\s+units?|'
    r'\d+\s+unit\s+min(?:imum)?|easter|holiday|spring|summer|month\s+only|'
    r'limited\s+time|while\s+supplies|expires?|members?\s+only|membership|'
    r'loyalty\s+price|special\s+offer|promo(?:tion)?)\b',
    re.I
)

def has_promo_signal(ctx):
    return bool(PROMO_RE.search(ctx))

# Patch 3 — docs/botox-low-price-investigation.md §6.3 Patch 3
WRONG_PAGE_PATH_RE = re.compile(
    r'/(?:weight[-_]?loss|weight[-_]management|wholesale|provider[-_]?portal|'
    r'staff[-_]?only|b2b|for[-_]?providers?|practitioner)',
    re.I
)

def is_wrong_page_type(url):
    if not url:
        return False
    return bool(WRONG_PAGE_PATH_RE.search(url))

# Patch 4 — docs/botox-low-price-investigation.md §6.3 Patch 4
PRICE_LABEL_FLOORS = {
    ('Neurotoxin', 'per_unit'): 8,
}

# ── Tests ──────────────────────────────────────────────────────────────────────

# --- Patch 1 ---

def test_patch1_dysport_price_skipped_for_botox_match():
    """
    5.1 Multi-brand menu: PROC_RE matched "Botox" but "$5" is adjacent to
    "Dysport", not to "Botox". nearest_brand_to_price() → True → skip.
    Models: UPKEEP, Besos Aesthetics, AEVR Wellness.
    """
    ctx = "Botox $15 per unit   Dysport $5 per unit   Xeomin $12 per unit"
    price_m = list(re.finditer(r'\$5', ctx))
    assert price_m, "Test setup: $5 not found in ctx"
    price_start = price_m[0].start()
    proc_start  = ctx.index('Botox')
    assert nearest_brand_to_price(ctx, price_start, proc_start) is True, (
        "FAIL: expected True (Dysport closer to $5) — Dysport price not skipped for Botox match"
    )

def test_patch1_botox_price_not_skipped():
    """
    5.4 When Botox is the closest keyword to its own price, do not skip.
    """
    ctx = "Botox $15 per unit   Dysport $5 per unit"
    price_m = list(re.finditer(r'\$15', ctx))
    assert price_m, "Test setup: $15 not found"
    price_start = price_m[0].start()
    proc_start  = ctx.index('Botox')
    assert nearest_brand_to_price(ctx, price_start, proc_start) is False, (
        "FAIL: got True for Botox's own $15 — legitimate price would be wrongly skipped"
    )

def test_patch1_no_competing_brand_never_skips():
    """
    5.4 No competing brand in context at all → always False (no over-filtering).
    """
    ctx = "Botox only pricing: $13/unit, forehead lines, 20 units"
    price_m = re.search(r'\$13', ctx)
    proc_start = ctx.index('Botox')
    assert nearest_brand_to_price(ctx, price_m.start(), proc_start) is False, (
        "FAIL: True returned with no competing brand in context"
    )

def test_patch1_daxxify_letybo_covered():
    """
    COMPETING_BRANDS_RE covers Daxxify and Letybo (newer brands added in H4 scope).
    """
    for brand in ('daxxify', 'letybo', 'Daxxify', 'Letybo'):
        assert COMPETING_BRANDS_RE.search(brand), f"FAIL: {brand} not in COMPETING_BRANDS_RE"

# --- Patch 2 ---

def test_patch2_new_client_promo():
    """
    5.2 Simply Tox / new-client specials trigger promo detection.
    """
    assert has_promo_signal("New clients get Tox for $7.99/unit this Easter") is True

def test_patch2_membership_pricing():
    """
    5.2 dermani-style membership pricing triggers promo detection.
    """
    assert has_promo_signal("Members only pricing: $9/unit (membership required, $45/month)") is True

def test_patch2_minimum_units():
    """
    5.2 'minimum 40 units' is a new-client deal signal.
    """
    assert has_promo_signal("BOTOX SPECIAL — new clients only, minimum 40 units, $7/unit") is True

def test_patch2_retail_not_flagged():
    """
    5.4 Plain multi-brand retail menu must not trigger promo detection.
    """
    ctx = "Botox $13 per unit | Dysport $5 per unit | Xeomin $12 per unit"
    assert has_promo_signal(ctx) is False, (
        "FAIL: standard retail multi-brand menu flagged as promo — over-filtering"
    )

def test_patch2_limited_time_offer():
    """
    Patch 2 covers time-limited offers that scraper previously silently ingested.
    """
    assert has_promo_signal("Limited time offer: $8/unit while supplies last") is True

# --- Patch 3 ---

def test_patch3_laseraway_weight_loss():
    """
    5.3 The exact URL from Part 4 of the investigation must be blocked.
    """
    assert is_wrong_page_type("https://laseraway.com/weight-loss") is True

def test_patch3_blocked_paths():
    """
    All documented wrong-page-type path patterns are blocked.
    """
    blocked = [
        "https://example.com/wholesale/botox-ordering",
        "https://clinic.com/provider-portal/pricing",
        "https://site.com/staff-only/treatments",
        "https://example.com/b2b/order",
        "https://medspa.com/for-providers/discounts",
        "https://medspa.com/weight_loss/semaglutide",
        "https://example.com/weight-management/programs",
    ]
    for url in blocked:
        assert is_wrong_page_type(url) is True, f"FAIL: {url} was not blocked"

def test_patch3_normal_pages_pass():
    """
    5.4 Normal pricing and service pages must not be blocked.
    """
    allowed = [
        "https://upkeepmeds.com/botox",
        "https://dermani.com/services/botox",
        "https://headlines-tox-bar.com/services",
        "https://simplytox.com/pricing",
        "https://besos-aesthetics.com/neurotoxin",
        "https://laseraway.com/services/botox",      # same domain, different path
    ]
    for url in allowed:
        assert is_wrong_page_type(url) is False, f"FAIL: {url} was incorrectly blocked"

def test_patch3_none_and_empty_safe():
    """
    Edge cases: None and empty string must not raise.
    """
    assert is_wrong_page_type(None)  is False
    assert is_wrong_page_type("")    is False

# --- Patch 4 ---

def test_patch4_floor_is_8():
    """
    PRICE_LABEL_FLOORS[('Neurotoxin','per_unit')] must be exactly 8.
    """
    floor = PRICE_LABEL_FLOORS.get(('Neurotoxin', 'per_unit'))
    assert floor == 8, f"FAIL: expected 8, got {floor}"

def test_patch4_prices_below_floor_skipped():
    """
    Prices $5.00, $6.00, $7.99 for (Neurotoxin, per_unit) must be skipped.
    """
    floor = PRICE_LABEL_FLOORS[('Neurotoxin', 'per_unit')]
    for price in (5.0, 5.50, 6.0, 7.0, 7.50, 7.99):
        assert price < floor, f"FAIL: ${price} should be below floor {floor}"

def test_patch4_headlines_tox_bar_passes():
    """
    5.4 Real retail sub-$10 Botox at $9.50 (Headlines Tox Bar, Phoenix AZ) must pass.
    """
    floor = PRICE_LABEL_FLOORS[('Neurotoxin', 'per_unit')]
    for price in (8.0, 8.50, 9.0, 9.50):
        assert price >= floor, (
            f"FAIL: ${price}/unit (Headlines Tox Bar) would be blocked by floor {floor}"
        )

def test_patch4_floor_only_for_neurotoxin_per_unit():
    """
    5.4 Floor must NOT apply to other (category, label) pairs —
    no accidental over-filtering of fillers or session-priced neurotoxins.
    """
    uncovered = [
        ('Neurotoxin',    'per_session'),
        ('Neurotoxin',    'flat_package'),
        ('Dermal Filler', 'per_unit'),
        ('Dermal Filler', 'per_syringe'),
        ('Laser',         'per_session'),
    ]
    for key in uncovered:
        val = PRICE_LABEL_FLOORS.get(key)
        assert val is None, (
            f"FAIL: unexpected floor {val} found for {key} — over-filtering risk"
        )

# ── Runner ────────────────────────────────────────────────────────────────────

TESTS = [
    # Patch 1
    test_patch1_dysport_price_skipped_for_botox_match,
    test_patch1_botox_price_not_skipped,
    test_patch1_no_competing_brand_never_skips,
    test_patch1_daxxify_letybo_covered,
    # Patch 2
    test_patch2_new_client_promo,
    test_patch2_membership_pricing,
    test_patch2_minimum_units,
    test_patch2_retail_not_flagged,
    test_patch2_limited_time_offer,
    # Patch 3
    test_patch3_laseraway_weight_loss,
    test_patch3_blocked_paths,
    test_patch3_normal_pages_pass,
    test_patch3_none_and_empty_safe,
    # Patch 4
    test_patch4_floor_is_8,
    test_patch4_prices_below_floor_skipped,
    test_patch4_headlines_tox_bar_passes,
    test_patch4_floor_only_for_neurotoxin_per_unit,
]

if __name__ == '__main__':
    print(f"\nRunning {len(TESTS)} scraper patch tests...\n")
    failures = 0
    for t in TESTS:
        label = t.__name__.replace('test_', '').replace('_', ' ')
        try:
            t()
            print(f"  PASS  {label}")
        except AssertionError as e:
            print(f"  FAIL  {label}: {e}")
            failures += 1
        except Exception as e:
            print(f" ERROR  {label}: {type(e).__name__}: {e}")
            failures += 1

    print(f"\n{'='*55}")
    if failures == 0:
        print(f"All {len(TESTS)} tests passed.  GATE: patches verified.")
    else:
        print(f"{failures} / {len(TESTS)} tests FAILED.")
        print("Do not merge to main until all tests pass.")
    print('='*55)
    sys.exit(0 if failures == 0 else 1)

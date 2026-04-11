"""GlowBuddy legitimacy classifier.

Reads Cheerio scraper output, classifies each scraped domain as med-spa
vs. not-spa / error-page, joins the labels onto the provider master, and
writes clean / full / removals CSVs.
"""

from __future__ import annotations

import glob
import os
import re
import sys
from collections import Counter
from urllib.parse import urlparse

import pandas as pd


DOWNLOADS = os.path.expanduser("~/Downloads")
DATA_DIR = os.path.expanduser("~/GlowBuddy/data")

MASTER_IN = os.path.join(DOWNLOADS, "GlowBuddy_MASTER_ALL.csv")
CHEERIO_GLOB = os.path.join(DOWNLOADS, "dataset_cheerio-scraper_*.csv")

MASTER_FULL_OUT = os.path.join(DATA_DIR, "GlowBuddy_MASTER_WITH_PRICES.csv")
MASTER_CLEAN_OUT = os.path.join(DATA_DIR, "GlowBuddy_MASTER_CLEAN.csv")
REMOVALS_OUT = os.path.join(DATA_DIR, "GlowBuddy_Removals_Flagged.csv")


STRONG_POSITIVE = [
    "botox", "dysport", "xeomin", "jeuveau", "daxxify", "juvederm",
    "restylane", "sculptra", "radiesse", "kybella", "neurotoxin",
    "neuromodulator", "dermal filler", "lip filler", "microneedling",
    "hydrafacial", "chemical peel", "vi peel", "laser hair removal",
    "ipl", "bbl", "photofacial", "coolsculpting", "morpheus8", "med spa",
    "medspa", "medical spa", "aesthetic clinic", "nurse practitioner",
    "np-c", "fnp-c", "aprn", "physician assistant", "pa-c",
    "board-certified", "medical director", "licensed injector",
    "semaglutide", "tirzepatide", "glp-1", "weight loss inject",
    "prp", "platelet rich", "iv therapy", "iv drip", "b12 inject",
    "book appointment",
]

NEGATIVE = [
    "hair salon", "hair cut", "barber", "nail salon", "manicure",
    "pedicure", "acrylic", "dentist", "dental", "orthodon", "dds", "dmd",
    "veterinar", "animal hospital", "pet clinic", "grocery", "supermarket",
    "restaurant", "cafe", "pizza", "auto repair", "car wash", "tattoo",
    "piercing", "tanning bed", "physical therapy", "chiropract", "law firm",
    "attorney", "real estate", "gym", "fitness center", "yoga studio",
    "pilates", "crossfit", "plumber", "electrician", "hvac", "roofing",
    "walmart", "cvs", "walgreens",
]

STRONG_NEGATIVE = [
    "404", "page not found", "this page does not exist", "access denied",
    "domain for sale", "buy this domain", "coming soon", "under construction",
    "parked domain", "account suspended",
]


def _compile(terms: list[str]) -> list[re.Pattern]:
    """Word-boundary regex for each term (handles hyphens / spaces)."""
    pats = []
    for t in terms:
        esc = re.escape(t)
        pats.append(re.compile(rf"(?<![a-z0-9]){esc}(?![a-z0-9])", re.I))
    return pats


POS_PATS = _compile(STRONG_POSITIVE)
NEG_PATS = _compile(NEGATIVE)
STRONG_NEG_PATS = _compile(STRONG_NEGATIVE)


def normalize_domain(url: str) -> str:
    if not url or not isinstance(url, str):
        return ""
    u = url.strip()
    if not u:
        return ""
    if "://" not in u:
        u = "http://" + u
    try:
        host = urlparse(u).hostname or ""
    except Exception:
        return ""
    host = host.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def count_hits(patterns: list[re.Pattern], text: str) -> int:
    return sum(1 for p in patterns if p.search(text))


def classify(text: str) -> tuple[str, int]:
    strong_neg = count_hits(STRONG_NEG_PATS, text)
    pos = count_hits(POS_PATS, text)
    neg = count_hits(NEG_PATS, text)
    # Spec says strong_neg -> error_page immediately, but text is pooled
    # across every scraped page on a domain, so a single 404 sub-page can
    # poison a real med-spa domain. Only treat as error_page when there is
    # no positive med-spa signal anywhere on the domain.
    if strong_neg and pos == 0:
        return "error_page", -100
    score = pos * 3 - neg * 5
    if pos >= 3:
        label = "confirmed_med_spa"
    elif pos >= 1 and neg == 0:
        label = "likely_med_spa"
    elif pos >= 1 and neg >= 1:
        label = "mixed"
    elif neg >= 2:
        label = "not_spa"
    elif neg == 1:
        label = "possible_not_spa"
    else:
        label = "unclassified"
    return label, score


def load_scrape_text_by_domain() -> tuple[dict[str, str], int, int]:
    files = sorted(glob.glob(CHEERIO_GLOB))
    if not files:
        print(f"ERROR: no cheerio files matching {CHEERIO_GLOB}", file=sys.stderr)
        sys.exit(1)

    chunks: dict[str, list[str]] = {}
    pages = 0
    for f in files:
        df = pd.read_csv(f, encoding="utf-8-sig", low_memory=False)
        df = df.fillna("")
        for _, row in df.iterrows():
            dom = normalize_domain(row.get("url", ""))
            if not dom:
                continue
            parts = [str(row.get("title", "")), str(row.get("text", ""))]
            chunks.setdefault(dom, []).append(" ".join(parts))
            pages += 1

    combined = {d: " ".join(ps).lower() for d, ps in chunks.items()}
    return combined, len(combined), pages


def main() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)

    print(f"Reading scraper data from {CHEERIO_GLOB}")
    domain_text, n_domains, n_pages = load_scrape_text_by_domain()
    print(f"  domains: {n_domains}  pages: {n_pages}")

    domain_label: dict[str, str] = {}
    domain_score: dict[str, int] = {}
    for dom, text in domain_text.items():
        label, score = classify(text)
        domain_label[dom] = label
        domain_score[dom] = score

    print(f"Reading master {MASTER_IN}")
    master = pd.read_csv(MASTER_IN, low_memory=False)
    print(f"  rows: {len(master)}")

    def row_label(row) -> tuple[str, int, str]:
        src = str(row.get("source", "") or "").strip().lower()
        if src == "supabase":
            return "confirmed_med_spa", 999, "supabase_google_maps"
        website = str(row.get("website", "") or "").strip()
        if not website:
            return "no_website", 0, ""
        dom = normalize_domain(website)
        if not dom:
            return "no_website", 0, ""
        if dom in domain_label:
            return domain_label[dom], domain_score[dom], "scraped_website"
        return "not_scraped_yet", 0, ""

    labels, scores, sources = [], [], []
    for _, r in master.iterrows():
        lbl, sc, src = row_label(r)
        labels.append(lbl)
        scores.append(sc)
        sources.append(src)

    master["legitimacy"] = labels
    master["legitimacy_score"] = scores
    master["legitimacy_source"] = sources

    remove_mask = master["legitimacy"].isin(["not_spa", "error_page"])
    clean = master[~remove_mask].copy()
    removals = master[remove_mask].copy()

    master.to_csv(MASTER_FULL_OUT, index=False)
    clean.to_csv(MASTER_CLEAN_OUT, index=False)
    removals.to_csv(REMOVALS_OUT, index=False)

    counts = Counter(master["legitimacy"])
    order = [
        "confirmed_med_spa", "likely_med_spa", "mixed", "not_scraped_yet",
        "no_website", "unclassified", "possible_not_spa", "not_spa",
        "error_page",
    ]

    print()
    print("=== LEGITIMACY CLASSIFICATION REPORT ===")
    print()
    print(f"Domains classified from scrape data: {n_domains}")
    print(f"Pages processed: {n_pages}")
    print()
    print("Classification breakdown:")
    for lbl in order:
        marker = ""
        if lbl in ("not_spa", "error_page"):
            marker = "  <- FLAGGED FOR REMOVAL"
        print(f"  {lbl:<20} {counts.get(lbl, 0):>7,}{marker}")
    for lbl, n in counts.items():
        if lbl not in order:
            print(f"  {lbl:<20} {n:>7,}")

    total_flagged = int(remove_mask.sum())
    print()
    print(f"Total flagged for removal: {total_flagged:,}")
    print(f"Clean records saved: {len(clean):,}")
    print()
    print("Sample removals:")
    for _, r in removals.head(10).iterrows():
        print(
            f"  [{r['legitimacy']}] {r.get('name', '')} | "
            f"{r.get('city', '')} {r.get('state', '')}"
        )

    print()
    print("Wrote:")
    print(f"  {MASTER_FULL_OUT}")
    print(f"  {MASTER_CLEAN_OUT}")
    print(f"  {REMOVALS_OUT}")


if __name__ == "__main__":
    main()

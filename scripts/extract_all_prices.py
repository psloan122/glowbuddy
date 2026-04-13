"""
GlowBuddy Full Price Extraction — expanded taxonomy across all Cheerio files.
Reads cheerio CSVs from ~/Downloads/, cross-refs against MASTER_COMBINED,
deduplicates against existing Procedures_ALL_v2, outputs v3.

Usage: python3 scripts/extract_all_prices.py
"""

import pandas as pd
import re
import os
import glob
from collections import defaultdict

CHEERIO_DIR   = os.path.expanduser("~/Downloads")
MASTER_CSV    = os.path.expanduser("~/Downloads/GlowBuddy_MASTER_COMBINED.csv")
EXISTING_CSV  = os.path.expanduser("~/Downloads/GlowBuddy_Procedures_ALL_v2.csv")
OUTPUT_CSV    = os.path.expanduser("~/Downloads/GlowBuddy_Procedures_ALL_v3.csv")
WINDOW        = 150
MIN_PRICE     = 25
MAX_PRICE     = 15000

# ── Load all Cheerio files ────────────────────────────────────────────────────
print("Loading Cheerio files from ~/Downloads/...")
cheerio_files = sorted(glob.glob(os.path.join(CHEERIO_DIR, "dataset_cheerio-scraper_*.csv")))
print(f"Found {len(cheerio_files)} files")

dfs = []
for f in cheerio_files:
    try:
        d = pd.read_csv(f, low_memory=False, encoding="utf-8-sig")
        if "text" in d.columns and "url" in d.columns:
            dfs.append(d[["text", "url"]].copy())
            print(f"  {os.path.basename(f)}: {len(d)} rows")
    except Exception as e:
        print(f"  SKIP {os.path.basename(f)}: {e}")

df = pd.concat(dfs, ignore_index=True)
df["text"] = df["text"].fillna("")

def extract_domain(url):
    if not isinstance(url, str):
        return ""
    m = re.match(r"(?:https?://)?(?:www\.)?([^/?#\s]+)", url)
    return m.group(1).lower().strip() if m else ""

df["domain"] = df["url"].apply(extract_domain)
print(f"\nTotal rows: {len(df):,} | Unique domains: {df['domain'].nunique():,}")

# ── Combine pages per domain ──────────────────────────────────────────────────
domain_data = defaultdict(lambda: {"combined": "", "url": ""})
for _, row in df.iterrows():
    d = row["domain"]
    if not d:
        continue
    domain_data[d]["combined"] += " " + str(row["text"])[:8000]
    if not domain_data[d]["url"]:
        domain_data[d]["url"] = row["url"]

del df, dfs  # free memory
print(f"Domains after combining pages: {len(domain_data):,}")

# ── Load master + existing prices ────────────────────────────────────────────
master = pd.read_csv(MASTER_CSV, low_memory=False)
master["domain"] = master["website"].dropna().apply(extract_domain)
master_lookup = {}
for _, row in master.dropna(subset=["domain"]).iterrows():
    d = row["domain"]
    if d not in master_lookup:
        master_lookup[d] = {
            "supabase_id": row.get("supabase_id") if str(row.get("supabase_id", "")) != "nan" else None,
            "name": row.get("name"),
            "city": row.get("city"),
            "state": row.get("state"),
        }
del master

existing = pd.read_csv(EXISTING_CSV, low_memory=False)
existing_keys = set()
for _, row in existing.iterrows():
    d = str(row.get("domain", "")).lower().strip()
    p = str(row.get("procedure_name", "")).lower().strip()
    pr = row.get("price")
    if d and p and pr:
        existing_keys.add((d, p, float(pr)))
existing_price_domains = set(existing["domain"].dropna().str.lower())
print(f"Existing records: {len(existing):,} | Existing priced domains: {len(existing_price_domains):,}")

# ── Filters ───────────────────────────────────────────────────────────────────
NOISE_RE = re.compile(
    r"self\.__next_f|__webpack_require__|\\u[0-9a-f]{4}.*\\u[0-9a-f]{4}",
    re.IGNORECASE,
)
MEDSPA_KW = re.compile(
    r"\b(botox|dysport|xeomin|jeuveau|daxxify|neurotoxin|filler|juvederm|restylane|"
    r"sculptra|radiesse|kybella|prp|prx|microneedling|hydrafacial|chemical peel|"
    r"vi peel|laser|ipl|bbl|fraxel|ultherapy|thermage|coolsculpting|emsculpt|"
    r"semaglutide|tirzepatide|weight loss injection|lip filler|cheek filler|"
    r"tear trough|jawline|chin filler|under.?eye|rf micro|morpheus|potenza|"
    r"virtue rf|exosome|iv (therapy|drip)|med.?spa|medspa|medical spa|aesthetics?|"
    r"injector|body contour|fat reduc|lipo|cavitation|lymphatic|dermaplaning|"
    r"microderm|collagen induct)\b",
    re.IGNORECASE,
)
PRICE_RE = re.compile(r"\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)")

# ── EXPANDED TAXONOMY ─────────────────────────────────────────────────────────
# (procedure_name) -> (category, subcategory, brand, pricing_unit, low, high, tags)
TAXONOMY = {
    "Botox":("Neurotoxin","Botulinum Toxin Type A","Botox","per_unit",10,20,"botox,neurotoxin,wrinkle"),
    "Dysport":("Neurotoxin","Botulinum Toxin Type A","Dysport","per_unit",3,7,"dysport,neurotoxin"),
    "Xeomin":("Neurotoxin","Botulinum Toxin Type A","Xeomin","per_unit",10,18,"xeomin,neurotoxin"),
    "Jeuveau":("Neurotoxin","Botulinum Toxin Type A","Jeuveau","per_unit",9,15,"jeuveau,neurotoxin"),
    "Daxxify":("Neurotoxin","Botulinum Toxin Type A","Daxxify","per_unit",10,20,"daxxify,neurotoxin"),
    "Neurotoxin":("Neurotoxin","Botulinum Toxin Type A",None,"per_unit",10,20,"neurotoxin,wrinkle"),
    "Neuromodulator":("Neurotoxin","Botulinum Toxin Type A",None,"per_unit",10,20,"neuromodulator,neurotoxin"),
    "Tox":("Neurotoxin","Botulinum Toxin Type A",None,"per_unit",10,20,"tox,neurotoxin,botox"),
    "Lip Flip":("Neurotoxin","Botulinum Toxin Type A",None,"per_session",75,200,"lip flip,neurotoxin"),
    "Baby Botox":("Neurotoxin","Botulinum Toxin Type A",None,"per_session",100,300,"baby botox,neurotoxin"),
    "Brow Lift":("Neurotoxin","Botulinum Toxin Type A",None,"per_session",75,250,"brow lift,neurotoxin"),
    "Masseter":("Neurotoxin","Botulinum Toxin Type A",None,"per_session",250,700,"masseter,jaw slimming,neurotoxin"),
    "Jaw Slimming":("Neurotoxin","Botulinum Toxin Type A",None,"per_session",250,700,"jaw slimming,masseter,neurotoxin"),
    "Hyperhidrosis":("Neurotoxin","Botulinum Toxin Type A",None,"per_session",500,1500,"hyperhidrosis,sweating,neurotoxin"),
    "Nefertiti Lift":("Neurotoxin","Botulinum Toxin Type A",None,"per_session",300,800,"nefertiti lift,neck,neurotoxin"),
    "Juvederm Voluma":("Dermal Filler","Midface Augmentation","Juvederm","per_syringe",700,1000,"juvederm voluma,cheek filler"),
    "Juvederm Volbella":("Dermal Filler","Lip Augmentation","Juvederm","per_syringe",500,800,"juvederm volbella,lip filler"),
    "Juvederm Vollure":("Dermal Filler","Hyaluronic Acid Filler","Juvederm","per_syringe",600,900,"juvederm vollure"),
    "Juvederm Ultra":("Dermal Filler","Hyaluronic Acid Filler","Juvederm","per_syringe",550,850,"juvederm ultra"),
    "Juvederm":("Dermal Filler","Hyaluronic Acid Filler","Juvederm","per_syringe",600,900,"juvederm,filler"),
    "Restylane Lyft":("Dermal Filler","Midface Augmentation","Restylane","per_syringe",600,900,"restylane lyft"),
    "Restylane Kysse":("Dermal Filler","Lip Augmentation","Restylane","per_syringe",500,800,"restylane kysse,lip filler"),
    "Restylane Silk":("Dermal Filler","Lip Augmentation","Restylane","per_syringe",450,750,"restylane silk"),
    "Restylane Defyne":("Dermal Filler","Hyaluronic Acid Filler","Restylane","per_syringe",550,850,"restylane defyne"),
    "Restylane Refyne":("Dermal Filler","Hyaluronic Acid Filler","Restylane","per_syringe",500,800,"restylane refyne"),
    "Restylane":("Dermal Filler","Hyaluronic Acid Filler","Restylane","per_syringe",550,850,"restylane,filler"),
    "Sculptra":("Biostimulator","Poly-L-Lactic Acid","Sculptra","per_vial",700,1000,"sculptra,biostimulator"),
    "Radiesse":("Biostimulator","Calcium Hydroxylapatite Filler","Radiesse","per_syringe",600,900,"radiesse"),
    "Kybella":("Injectable","Deoxycholic Acid","Kybella","per_session",600,1200,"kybella,double chin"),
    "Versa":("Dermal Filler","Hyaluronic Acid Filler","RHA Versa","per_syringe",450,750,"versa,filler"),
    "RHA":("Dermal Filler","Hyaluronic Acid Filler","RHA Collection","per_syringe",600,950,"rha,filler"),
    "Belotero":("Dermal Filler","Hyaluronic Acid Filler","Belotero","per_syringe",450,750,"belotero,filler"),
    "Revanesse":("Dermal Filler","Hyaluronic Acid Filler","Revanesse","per_syringe",500,850,"revanesse,filler"),
    "Lip Filler":("Dermal Filler","Lip Augmentation",None,"per_syringe",400,800,"lip filler,lips"),
    "Lip Augmentation":("Dermal Filler","Lip Augmentation",None,"per_syringe",400,800,"lip augmentation,lips"),
    "Cheek Filler":("Dermal Filler","Midface Augmentation",None,"per_syringe",600,1000,"cheek filler"),
    "Cheek Augmentation":("Dermal Filler","Midface Augmentation",None,"per_syringe",600,1000,"cheek augmentation,midface"),
    "Chin Filler":("Dermal Filler","Hyaluronic Acid Filler",None,"per_syringe",500,900,"chin filler"),
    "Chin Augmentation":("Dermal Filler","Hyaluronic Acid Filler",None,"per_syringe",500,900,"chin augmentation"),
    "Jawline Filler":("Dermal Filler","Hyaluronic Acid Filler",None,"per_syringe",600,1200,"jawline filler"),
    "Tear Trough":("Dermal Filler","Hyaluronic Acid Filler",None,"per_syringe",600,1000,"tear trough,under eye"),
    "Under Eye Filler":("Dermal Filler","Hyaluronic Acid Filler",None,"per_syringe",600,1000,"under eye filler,tear trough"),
    "Nasolabial Filler":("Dermal Filler","Hyaluronic Acid Filler",None,"per_syringe",500,900,"nasolabial filler,smile lines"),
    "Marionette Filler":("Dermal Filler","Hyaluronic Acid Filler",None,"per_syringe",500,900,"marionette filler"),
    "Temple Filler":("Dermal Filler","Hyaluronic Acid Filler",None,"per_syringe",600,1000,"temple filler"),
    "Dermal Filler":("Dermal Filler","Hyaluronic Acid Filler",None,"per_syringe",500,900,"dermal filler"),
    "Filler":("Dermal Filler","Hyaluronic Acid Filler",None,"per_syringe",500,900,"filler"),
    "SkinPen Microneedling":("Skin Treatment","Collagen Induction Therapy","SkinPen","per_session",250,600,"skinpen,microneedling"),
    "Microneedling":("Skin Treatment","Collagen Induction Therapy",None,"per_session",250,700,"microneedling,collagen"),
    "RF Microneedling":("Skin Treatment","RF Microneedling",None,"per_session",600,1800,"rf microneedling,skin tightening"),
    "Morpheus8":("Skin Treatment","RF Microneedling","Morpheus8","per_session",700,1800,"morpheus8,rf microneedling"),
    "Morpheus 8":("Skin Treatment","RF Microneedling","Morpheus8","per_session",700,1800,"morpheus8,rf microneedling"),
    "Potenza":("Skin Treatment","RF Microneedling","Potenza","per_session",600,1500,"potenza,rf microneedling"),
    "Virtue RF":("Skin Treatment","RF Microneedling","Virtue RF","per_session",600,1500,"virtue rf,rf microneedling"),
    "Vivace":("Skin Treatment","RF Microneedling","Vivace","per_session",600,1400,"vivace,rf microneedling"),
    "Sylfirm":("Skin Treatment","RF Microneedling","Sylfirm","per_session",600,1400,"sylfirm,rf microneedling"),
    "Secret RF":("Skin Treatment","RF Microneedling","Secret RF","per_session",600,1400,"secret rf,rf microneedling"),
    "VI Peel":("Skin Treatment","Chemical Exfoliation","VI Peel","per_session",150,400,"vi peel,chemical peel"),
    "TCA Peel":("Skin Treatment","Chemical Exfoliation",None,"per_session",150,500,"tca peel,chemical peel"),
    "Jessner Peel":("Skin Treatment","Chemical Exfoliation",None,"per_session",100,350,"jessner peel,chemical peel"),
    "Chemical Peel":("Skin Treatment","Chemical Exfoliation",None,"per_session",100,500,"chemical peel,peel"),
    "Chemical Exfoliation":("Skin Treatment","Chemical Exfoliation",None,"per_session",100,400,"chemical exfoliation,peel"),
    "HydraFacial":("Skin Treatment","Hydradermabrasion","HydraFacial","per_session",150,400,"hydrafacial"),
    "Hydrafacial MD":("Skin Treatment","Hydradermabrasion","HydraFacial","per_session",150,450,"hydrafacial md"),
    "DiamondGlow":("Skin Treatment","Hydradermabrasion","DiamondGlow","per_session",150,350,"diamondglow"),
    "Aquafacial":("Skin Treatment","Hydradermabrasion",None,"per_session",100,350,"aquafacial,hydradermabrasion"),
    "Hydrofacial":("Skin Treatment","Hydradermabrasion",None,"per_session",100,350,"hydrofacial"),
    "Vampire Facial":("Skin Treatment","Collagen Induction Therapy",None,"per_session",400,1200,"vampire facial,prp"),
    "Dermaplaning":("Skin Treatment","Physical Exfoliation",None,"per_session",75,200,"dermaplaning"),
    "Microdermabrasion":("Skin Treatment","Physical Exfoliation",None,"per_session",75,200,"microdermabrasion"),
    "Microderm":("Skin Treatment","Physical Exfoliation",None,"per_session",75,200,"microderm,microdermabrasion"),
    "Ultherapy":("Skin Treatment","Ultrasound Skin Tightening","Ultherapy","per_session",1500,4000,"ultherapy"),
    "Thermage":("Skin Treatment","RF Skin Tightening","Thermage","per_session",1500,4000,"thermage"),
    "Sofwave":("Skin Treatment","Ultrasound Skin Tightening","Sofwave","per_session",1500,4000,"sofwave"),
    "Skin Tightening":("Skin Treatment","RF Skin Tightening",None,"per_session",400,2000,"skin tightening"),
    "Collagen Induction":("Skin Treatment","Collagen Induction Therapy",None,"per_session",200,700,"collagen induction"),
    "Nano Needling":("Skin Treatment","Collagen Induction Therapy",None,"per_session",150,400,"nano needling"),
    "PRX Derm":("Regenerative","PRX Derm Perfexion",None,"per_session",200,600,"prx derm"),
    "Biorevitalization":("Regenerative","PRX Derm Perfexion",None,"per_session",200,600,"biorevitalization"),
    "Skin Resurfacing":("Laser","Ablative/Non-Ablative Resurfacing",None,"per_session",500,3000,"skin resurfacing,laser"),
    "Pixel Laser":("Laser","Ablative/Non-Ablative Resurfacing",None,"per_session",400,1500,"pixel laser"),
    "IPL/BBL Photofacial":("Laser","Intense Pulsed Light",None,"per_session",200,600,"ipl,bbl,photofacial"),
    "Laser Hair Removal":("Laser","Hair Reduction",None,"per_session",75,600,"laser hair removal"),
    "Hair Removal":("Laser","Hair Reduction",None,"per_session",75,600,"hair removal,laser"),
    "Laser Hair":("Laser","Hair Reduction",None,"per_session",75,600,"laser hair,hair removal"),
    "Photofacial":("Laser","Intense Pulsed Light",None,"per_session",150,500,"photofacial,ipl"),
    "IPL Photofacial":("Laser","Intense Pulsed Light",None,"per_session",150,500,"ipl photofacial"),
    "IPL Treatment":("Laser","Intense Pulsed Light",None,"per_session",150,500,"ipl treatment"),
    "BBL Treatment":("Laser","Intense Pulsed Light","BBL","per_session",200,600,"bbl treatment"),
    "Laser Resurfacing":("Laser","Ablative/Non-Ablative Resurfacing",None,"per_session",500,2500,"laser resurfacing"),
    "Tattoo Removal":("Laser","Pigment/Tattoo Removal",None,"per_session",100,500,"tattoo removal"),
    "Pigment Removal":("Laser","Pigment/Tattoo Removal",None,"per_session",150,600,"pigment removal,laser"),
    "Clear + Brilliant":("Laser","Non-Ablative Resurfacing","Clear+Brilliant","per_session",300,700,"clear and brilliant"),
    "Clear and Brilliant":("Laser","Non-Ablative Resurfacing","Clear+Brilliant","per_session",300,700,"clear and brilliant"),
    "Fraxel":("Laser","Ablative/Non-Ablative Resurfacing","Fraxel","per_session",800,2500,"fraxel"),
    "CO2 Laser":("Laser","Ablative/Non-Ablative Resurfacing",None,"per_session",600,3000,"co2 laser"),
    "Halo":("Laser","Ablative/Non-Ablative Resurfacing","Halo","per_session",700,2000,"halo laser"),
    "Halo Laser":("Laser","Ablative/Non-Ablative Resurfacing","Halo","per_session",700,2000,"halo laser"),
    "Moxi":("Laser","Non-Ablative Resurfacing","Moxi","per_session",400,900,"moxi laser"),
    "Moxi Laser":("Laser","Non-Ablative Resurfacing","Moxi","per_session",400,900,"moxi laser"),
    "Vbeam":("Laser","Vascular Laser","Vbeam","per_session",300,900,"vbeam,rosacea"),
    "PicoSure":("Laser","Pigment/Tattoo Removal","PicoSure","per_session",200,800,"picosure,tattoo"),
    "PicoWay":("Laser","Pigment/Tattoo Removal","PicoWay","per_session",200,800,"picoway,tattoo"),
    "PicoPlus":("Laser","Pigment/Tattoo Removal","PicoPlus","per_session",200,800,"picoplus,picosecond"),
    "BBL":("Laser","Intense Pulsed Light","BBL","per_session",200,600,"bbl,broadband light"),
    "IPL":("Laser","Intense Pulsed Light",None,"per_session",150,500,"ipl,photofacial"),
    "Forever Young BBL":("Laser","Intense Pulsed Light","BBL","per_session",300,800,"forever young bbl"),
    "Vascular Laser":("Laser","Vascular Laser",None,"per_session",200,800,"vascular laser,redness"),
    "Rosacea Treatment":("Laser","Vascular Laser",None,"per_session",200,800,"rosacea treatment,laser"),
    "Spot Treatment":("Laser","Pigment/Tattoo Removal",None,"per_session",100,400,"spot treatment,pigment"),
    "Skin Rejuvenation":("Laser","Intense Pulsed Light",None,"per_session",150,600,"skin rejuvenation,laser"),
    "Laser Genesis":("Laser","Non-Ablative Resurfacing","Laser Genesis","per_session",300,700,"laser genesis"),
    "CoolSculpting":("Body Contouring","Cryolipolysis","CoolSculpting","per_cycle",600,1200,"coolsculpting"),
    "CoolSculpting Elite":("Body Contouring","Cryolipolysis","CoolSculpting","per_cycle",700,1400,"coolsculpting elite"),
    "Emsculpt NEO":("Body Contouring","Non-Surgical Body Sculpting","Emsculpt NEO","per_session",600,1200,"emsculpt neo"),
    "Emsculpt":("Body Contouring","Non-Surgical Body Sculpting","Emsculpt","per_session",500,1000,"emsculpt"),
    "Emtone":("Body Contouring","Non-Surgical Body Sculpting","Emtone","per_session",400,900,"emtone,cellulite"),
    "Evolve":("Body Contouring","Non-Surgical Body Sculpting","Evolve","per_session",500,1200,"evolve,body contouring"),
    "Velashape":("Body Contouring","Non-Surgical Body Sculpting","Velashape","per_session",300,800,"velashape,cellulite"),
    "Vanquish":("Body Contouring","Non-Surgical Body Sculpting","Vanquish","per_session",500,1000,"vanquish,fat reduction"),
    "Sculpsure":("Body Contouring","Laser Lipolysis","Sculpsure","per_session",600,1200,"sculpsure,laser lipolysis"),
    "TruSculpt":("Body Contouring","Non-Surgical Body Sculpting","TruSculpt","per_session",500,1200,"trusculpt,body contouring"),
    "Body Contouring":("Body Contouring","Non-Surgical Body Sculpting",None,"per_session",300,1200,"body contouring"),
    "Body Sculpting":("Body Contouring","Non-Surgical Body Sculpting",None,"per_session",300,1200,"body sculpting"),
    "Fat Reduction":("Body Contouring","Non-Surgical Body Sculpting",None,"per_session",300,1200,"fat reduction,body contouring"),
    "Fat Freezing":("Body Contouring","Cryolipolysis",None,"per_cycle",500,1200,"fat freezing,cryolipolysis"),
    "Cryolipolysis":("Body Contouring","Cryolipolysis",None,"per_cycle",500,1200,"cryolipolysis,fat freezing"),
    "Cavitation":("Body Contouring","Ultrasound Cavitation",None,"per_session",100,400,"cavitation"),
    "Ultrasonic Cavitation":("Body Contouring","Ultrasound Cavitation",None,"per_session",100,400,"ultrasonic cavitation"),
    "Wood Therapy":("Body Contouring","Manual Body Sculpting",None,"per_session",75,200,"wood therapy"),
    "Lipo Laser":("Body Contouring","Laser Lipolysis",None,"per_session",100,500,"lipo laser"),
    "Laser Lipo":("Body Contouring","Laser Lipolysis",None,"per_session",100,500,"laser lipo"),
    "Lymphatic Drainage":("Body Contouring","Manual Body Sculpting",None,"per_session",75,250,"lymphatic drainage"),
    "Lymphatic Massage":("Body Contouring","Manual Body Sculpting",None,"per_session",75,250,"lymphatic massage"),
    "Cellulite Treatment":("Body Contouring","Non-Surgical Body Sculpting",None,"per_session",100,600,"cellulite treatment"),
    "Muscle Sculpting":("Body Contouring","Non-Surgical Body Sculpting",None,"per_session",400,1000,"muscle sculpting"),
    "Body Wrap":("Body Contouring","Manual Body Sculpting",None,"per_session",75,250,"body wrap"),
    "PRP":("Regenerative","Platelet Rich Plasma",None,"per_session",400,1500,"prp"),
    "PRP Treatment":("Regenerative","Platelet Rich Plasma",None,"per_session",400,1500,"prp treatment"),
    "Platelet Rich Plasma":("Regenerative","Platelet Rich Plasma",None,"per_session",400,1500,"platelet rich plasma,prp"),
    "PRF":("Regenerative","Platelet Rich Fibrin",None,"per_session",400,1500,"prf"),
    "PRX":("Regenerative","PRX Derm Perfexion",None,"per_session",200,600,"prx"),
    "Exosome Therapy":("Regenerative","Exosome Therapy",None,"per_session",400,1500,"exosome therapy"),
    "Exosome":("Regenerative","Exosome Therapy",None,"per_session",400,1500,"exosome"),
    "Exosomes":("Regenerative","Exosome Therapy",None,"per_session",400,1500,"exosomes"),
    "Growth Factor":("Regenerative","Growth Factor Treatment",None,"per_session",300,1200,"growth factor"),
    "Stem Cell":("Regenerative","Stem Cell Therapy",None,"per_session",500,2000,"stem cell"),
    "PRP Hair":("Regenerative","Platelet Rich Plasma",None,"per_session",600,1500,"prp hair,hair loss,prp"),
    "Hair Restoration":("Regenerative","Platelet Rich Plasma",None,"per_session",500,1500,"hair restoration,prp"),
    "IV Therapy":("Wellness","Intravenous Nutrient Therapy",None,"per_session",100,400,"iv therapy,iv drip"),
    "IV Drip":("Wellness","Intravenous Nutrient Therapy",None,"per_session",100,400,"iv drip"),
    "IV Infusion":("Wellness","Intravenous Nutrient Therapy",None,"per_session",100,400,"iv infusion"),
    "Myers Cocktail":("Wellness","Intravenous Nutrient Therapy",None,"per_session",100,300,"myers cocktail"),
    "NAD+":("Wellness","Intravenous Nutrient Therapy",None,"per_session",200,800,"nad,iv therapy"),
    "NAD Therapy":("Wellness","Intravenous Nutrient Therapy",None,"per_session",200,800,"nad therapy"),
    "B12 Injection":("Wellness","Vitamin Injection",None,"per_session",25,50,"b12,vitamin injection"),
    "B12":("Wellness","Vitamin Injection",None,"per_session",25,50,"b12,vitamin injection"),
    "Vitamin Injection":("Wellness","Vitamin Injection",None,"per_session",25,75,"vitamin injection"),
    "Vitamin B12":("Wellness","Vitamin Injection",None,"per_session",25,50,"vitamin b12,b12"),
    "Lipo-B":("Wellness","Vitamin Injection",None,"per_session",25,75,"lipo-b,lipotropic"),
    "Lipotropic Injection":("Wellness","Vitamin Injection",None,"per_session",25,75,"lipotropic injection"),
    "Mic Injection":("Wellness","Vitamin Injection",None,"per_session",25,75,"mic injection,lipotropic"),
    "Glutathione":("Wellness","Vitamin Injection",None,"per_session",30,100,"glutathione,antioxidant"),
    "Hormone Therapy":("Wellness","Hormone Therapy",None,"per_session",100,600,"hormone therapy"),
    "Hormone Replacement":("Wellness","Hormone Therapy",None,"per_session",100,600,"hormone replacement"),
    "HRT":("Wellness","Hormone Therapy",None,"per_session",100,600,"hrt,hormone replacement"),
    "Testosterone":("Wellness","Hormone Therapy",None,"per_session",100,500,"testosterone"),
    "Testosterone Therapy":("Wellness","Hormone Therapy",None,"per_session",100,500,"testosterone therapy"),
    "Bioidentical Hormone":("Wellness","Hormone Therapy",None,"per_session",200,800,"bioidentical hormone"),
    "Pellet Therapy":("Wellness","Hormone Therapy",None,"per_session",300,800,"pellet therapy,hormone"),
    "Hydration Therapy":("Wellness","Intravenous Nutrient Therapy",None,"per_session",75,300,"hydration therapy"),
    "Infusion Therapy":("Wellness","Intravenous Nutrient Therapy",None,"per_session",100,400,"infusion therapy"),
    "Ozone Therapy":("Wellness","Ozone Therapy",None,"per_session",100,500,"ozone therapy"),
    "Semaglutide":("Medical Weight Loss","GLP-1 Agonist","Semaglutide","per_session",100,600,"semaglutide,glp-1"),
    "Tirzepatide":("Medical Weight Loss","GLP-1 Agonist","Tirzepatide","per_session",150,800,"tirzepatide,glp-1"),
    "Ozempic":("Medical Weight Loss","GLP-1 Agonist","Semaglutide","per_session",200,800,"ozempic,semaglutide"),
    "Wegovy":("Medical Weight Loss","GLP-1 Agonist","Semaglutide","per_session",200,800,"wegovy,semaglutide"),
    "Mounjaro":("Medical Weight Loss","GLP-1 Agonist","Tirzepatide","per_session",200,800,"mounjaro,tirzepatide"),
    "GLP-1":("Medical Weight Loss","GLP-1 Agonist",None,"per_session",100,600,"glp-1,weight loss"),
    "GLP-1 Agonist":("Medical Weight Loss","GLP-1 Agonist",None,"per_session",100,600,"glp-1 agonist,weight loss"),
    "Weight Loss Injection":("Medical Weight Loss","GLP-1 Agonist",None,"per_session",100,600,"weight loss injection"),
    "Weight Loss Program":("Medical Weight Loss","Comprehensive Program",None,"per_session",100,500,"weight loss program"),
    "Medical Weight Loss":("Medical Weight Loss","Comprehensive Program",None,"per_session",100,500,"medical weight loss"),
    "Phentermine":("Medical Weight Loss","Appetite Suppressant",None,"per_session",50,200,"phentermine,weight loss"),
    "Liraglutide":("Medical Weight Loss","GLP-1 Agonist","Liraglutide","per_session",150,700,"liraglutide,glp-1"),
    "Facial":("Facial","Custom Facial",None,"per_session",75,250,"facial,skincare"),
    "Custom Facial":("Facial","Custom Facial",None,"per_session",75,250,"custom facial,skincare"),
    "Signature Facial":("Facial","Custom Facial",None,"per_session",100,300,"signature facial"),
    "Anti-Aging Facial":("Facial","Anti-Aging Facial",None,"per_session",100,350,"anti-aging facial"),
    "Anti Aging Facial":("Facial","Anti-Aging Facial",None,"per_session",100,350,"anti aging facial"),
    "Acne Facial":("Facial","Acne Facial",None,"per_session",75,250,"acne facial"),
    "Acne Treatment":("Facial","Acne Facial",None,"per_session",75,250,"acne treatment"),
    "LED Facial":("Facial","LED Light Therapy",None,"per_session",75,200,"led facial"),
    "LED Light Therapy":("Facial","LED Light Therapy",None,"per_session",75,200,"led light therapy"),
    "Red Light Therapy":("Facial","LED Light Therapy",None,"per_session",50,200,"red light therapy"),
    "Oxygen Facial":("Facial","Oxygen Facial",None,"per_session",100,300,"oxygen facial"),
    "Brightening Facial":("Facial","Custom Facial",None,"per_session",100,300,"brightening facial"),
    "Hydrating Facial":("Facial","Custom Facial",None,"per_session",75,250,"hydrating facial"),
    "European Facial":("Facial","Custom Facial",None,"per_session",75,200,"european facial"),
    "Deep Cleansing Facial":("Facial","Custom Facial",None,"per_session",75,200,"deep cleansing facial"),
    "Back Facial":("Facial","Custom Facial",None,"per_session",75,200,"back facial"),
    "Medical Grade Facial":("Facial","Custom Facial",None,"per_session",100,300,"medical grade facial"),
    "Glow Facial":("Facial","Custom Facial",None,"per_session",75,250,"glow facial"),
    "Microblading":("Skin Treatment","Permanent Makeup",None,"per_session",400,900,"microblading,brows"),
    "Ombre Brows":("Skin Treatment","Permanent Makeup",None,"per_session",400,900,"ombre brows,permanent makeup"),
    "Powder Brows":("Skin Treatment","Permanent Makeup",None,"per_session",400,900,"powder brows,permanent makeup"),
    "Permanent Makeup":("Skin Treatment","Permanent Makeup",None,"per_session",300,800,"permanent makeup"),
    "Lip Blushing":("Skin Treatment","Permanent Makeup",None,"per_session",400,900,"lip blushing,permanent makeup"),
    "Eyeliner Tattoo":("Skin Treatment","Permanent Makeup",None,"per_session",300,700,"eyeliner tattoo,permanent makeup"),
    "Brazilian Wax":("Laser","Hair Reduction",None,"per_session",40,80,"brazilian wax,waxing"),
    "Waxing":("Laser","Hair Reduction",None,"per_session",15,100,"waxing,hair removal"),
    "Electrolysis":("Laser","Hair Reduction",None,"per_session",50,150,"electrolysis,hair removal"),
    "Threading":("Laser","Hair Reduction",None,"per_session",10,50,"threading,hair removal"),
    "Massage":("Wellness","Massage Therapy",None,"per_session",60,200,"massage"),
    "Swedish Massage":("Wellness","Massage Therapy",None,"per_session",60,150,"swedish massage"),
    "Deep Tissue Massage":("Wellness","Massage Therapy",None,"per_session",75,180,"deep tissue massage"),
    "Hot Stone Massage":("Wellness","Massage Therapy",None,"per_session",80,200,"hot stone massage"),
    "Body Massage":("Wellness","Massage Therapy",None,"per_session",60,180,"body massage"),
    "Cupping":("Wellness","Massage Therapy",None,"per_session",50,150,"cupping"),
    "Lash Extensions":("Facial","Lash Extensions",None,"per_session",100,300,"lash extensions"),
    "Lash Lift":("Facial","Lash Extensions",None,"per_session",75,150,"lash lift"),
    "Brow Lamination":("Facial","Brow Services",None,"per_session",75,150,"brow lamination"),
    "Brow Tint":("Facial","Brow Services",None,"per_session",30,75,"brow tint"),
    "Lash Tint":("Facial","Lash Extensions",None,"per_session",30,75,"lash tint"),
    "Spray Tan":("Wellness","Tanning",None,"per_session",30,75,"spray tan"),
    "Airbrush Tan":("Wellness","Tanning",None,"per_session",30,75,"airbrush tan"),
    "UV Tanning":("Wellness","Tanning",None,"per_session",10,50,"uv tanning"),
    "Vampire Facelift":("Regenerative","Platelet Rich Plasma",None,"per_session",600,1500,"vampire facelift,prp"),
    "PDO Thread Lift":("Skin Treatment","Thread Lift","PDO","per_session",500,2000,"pdo thread lift"),
    "Thread Lift":("Skin Treatment","Thread Lift",None,"per_session",500,2000,"thread lift"),
    "Sculplla":("Biostimulator","Poly-L-Lactic Acid","Sculplla","per_session",300,800,"sculplla,plla"),
    "Bellafill":("Biostimulator","PMMA Filler","Bellafill","per_syringe",700,1200,"bellafill,pmma"),
    "Non-Surgical Rhinoplasty":("Dermal Filler","Hyaluronic Acid Filler",None,"per_session",600,1500,"non surgical rhinoplasty,nose filler"),
    "Nose Filler":("Dermal Filler","Hyaluronic Acid Filler",None,"per_session",600,1500,"nose filler,rhinoplasty"),
    "Sculptra Aesthetic":("Biostimulator","Poly-L-Lactic Acid","Sculptra","per_vial",700,1000,"sculptra aesthetic"),
    "Scar Treatment":("Skin Treatment","Collagen Induction Therapy",None,"per_session",150,600,"scar treatment"),
    "Stretch Mark Treatment":("Skin Treatment","Collagen Induction Therapy",None,"per_session",150,600,"stretch mark treatment"),
    "Infrared Sauna":("Wellness","Sauna Therapy",None,"per_session",30,100,"infrared sauna"),
    "Cryotherapy":("Wellness","Cryotherapy",None,"per_session",50,150,"cryotherapy"),
    "Float Therapy":("Wellness","Float Therapy",None,"per_session",50,150,"float therapy"),
    "Salt Therapy":("Wellness","Salt Therapy",None,"per_session",30,100,"salt therapy,halotherapy"),
    "Acupuncture":("Wellness","Acupuncture",None,"per_session",75,200,"acupuncture"),
}

# ── Build regex ───────────────────────────────────────────────────────────────
sorted_names = sorted(TAXONOMY.keys(), key=len, reverse=True)
PROC_RE = re.compile(
    r"(?<!\w)(" + "|".join(re.escape(n) for n in sorted_names) + r")(?!\w)",
    re.IGNORECASE,
)
print(f"\nTaxonomy entries: {len(TAXONOMY)}")

# ── Extract prices ────────────────────────────────────────────────────────────
print("\nExtracting prices...")
new_records = []
providers_found = set()

for domain, data in domain_data.items():
    combined = data.get("combined", "")
    if not combined:
        continue
    if len(NOISE_RE.findall(combined[:2000])) > 5:
        continue
    if not MEDSPA_KW.search(combined):
        continue

    prov = master_lookup.get(domain, {})
    source_url = data.get("url", f"https://{domain}")
    seen = set()

    for match in PROC_RE.finditer(combined):
        proc_raw = match.group(1)
        proc_key = next((k for k in sorted_names if k.lower() == proc_raw.lower()), None)
        if not proc_key:
            continue
        cat, subcat, brand, unit, tlo, thi, tags = TAXONOMY[proc_key]
        start = max(0, match.start() - WINDOW)
        end = min(len(combined), match.end() + WINDOW)
        ctx = combined[start:end]

        for p in PRICE_RE.findall(ctx):
            try:
                price = float(p.replace(",", ""))
            except:
                continue
            if not (MIN_PRICE <= price <= MAX_PRICE):
                continue
            key = (domain, proc_key, price)
            dedup_key = (domain, proc_key.lower(), price)
            if key in seen:
                continue
            if dedup_key in existing_keys:
                continue
            seen.add(key)
            new_records.append({
                "provider_id": prov.get("supabase_id"),
                "procedure_name": proc_key,
                "brand": brand,
                "category": cat,
                "subcategory": subcat,
                "price": price,
                "pricing_unit": unit,
                "unit_description": None,
                "is_starting_price": True,
                "price_notes": None,
                "typical_range_low": tlo,
                "typical_range_high": thi,
                "tags": tags,
                "source_type": "cheerio_scraper",
                "source_url": source_url,
                "provider_name": prov.get("name"),
                "provider_city": prov.get("city"),
                "provider_state": prov.get("state"),
                "domain": domain,
            })
            providers_found.add(domain)

print(f"\nNet new records extracted:  {len(new_records):,}")
print(f"Net new priced providers:   {len(providers_found):,}")

# ── Merge and save ────────────────────────────────────────────────────────────
if new_records:
    combined_out = pd.concat(
        [existing, pd.DataFrame(new_records)], ignore_index=True
    )
else:
    combined_out = existing

print(f"\n{'='*55}")
print(f"FINAL TOTAL records:   {len(combined_out):,}")
print(f"FINAL TOTAL providers: {combined_out['domain'].nunique():,}")
print(f"{'='*55}")
print(f"\nBy category:")
print(combined_out["category"].value_counts().to_string())

combined_out.to_csv(OUTPUT_CSV, index=False)
print(f"\nSaved: {OUTPUT_CSV}")

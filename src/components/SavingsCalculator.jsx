import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, ChevronDown, MapPin, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { fetchBenchmark } from '../lib/priceBenchmark';
import { PROCEDURE_TYPES, PROCEDURE_CATEGORIES } from '../lib/constants';
import { searchCitiesViaMapbox } from '../lib/places';
import { lookupZip } from '../lib/zipLookup';
import SavingsShareCard from './SavingsShareCard';

const TYPICAL_UNITS = {
  'Botox / Dysport / Xeomin': 28, // legacy grouped name — backward compat
  'Botox': 28,
  'Dysport': 28,
  'Xeomin': 28,
  'Jeuveau': 28,
  'Daxxify': 40,
  'Lip Filler': 1,
  'Cheek Filler': 1,
  'Jawline Filler': 1,
  'HydraFacial': 1,
  'Semaglutide (Ozempic / Wegovy)': 1,
  'Tirzepatide (Mounjaro / Zepbound)': 1,
  'Liraglutide (Saxenda)': 1,
  'Compounded Semaglutide': 1,
  'Compounded Tirzepatide': 1,
  'GLP-1 (unspecified)': 1,
  'Semaglutide / Weight Loss': 1,
  'B12 Injection': 1,
  'Lipotropic / MIC Injection': 1,
};

const UNIT_LABELS = {
  'Botox / Dysport / Xeomin': '/unit', // legacy grouped name — backward compat
  'Botox': '/unit',
  'Dysport': '/unit',
  'Xeomin': '/unit',
  'Jeuveau': '/unit',
  'Daxxify': '/unit',
  'Lip Filler': '/syringe',
  'Cheek Filler': '/syringe',
  'Jawline Filler': '/syringe',
  'Nasolabial Filler': '/syringe',
  'Under Eye Filler': '/syringe',
  'Chin Filler': '/syringe',
  'Nose Filler': '/syringe',
  'Hand Filler': '/syringe',
  'Temple Filler': '/syringe',
  'Kybella': '/session',
  'CoolSculpting': '/area',
  'Emsculpt NEO': '/session',
  'truSculpt': '/session',
  'SculpSure': '/session',
  'BodyTite': '/session',
  'Velashape': '/session',
  'Cellulite Treatment': '/session',
  'Microneedling': '/session',
  'RF Microneedling': '/session',
  'Morpheus8': '/session',
  'PRP Microneedling': '/session',
  'Exosome Microneedling': '/session',
  'Chemical Peel': '/session',
  'HydraFacial': '/session',
  'Dermaplaning': '/session',
  'LED Therapy': '/session',
  'Oxygen Facial': '/session',
  'Microdermabrasion': '/session',
  'Vampire Facial': '/session',
  'Laser Hair Removal': '/session',
  'IPL / Photofacial': '/session',
  'Fractional CO2 Laser': '/session',
  'Clear + Brilliant': '/session',
  'Halo Laser': '/session',
  'Picosure / Picoway': '/session',
  'Erbium Laser': '/session',
  'Thermage': '/session',
  'Ultherapy': '/session',
  'Sofwave': '/session',
  'Tempsure': '/session',
  'Exilis': '/session',
  'Semaglutide (Ozempic / Wegovy)': '/month',
  'Tirzepatide (Mounjaro / Zepbound)': '/month',
  'Liraglutide (Saxenda)': '/month',
  'Compounded Semaglutide': '/month',
  'Compounded Tirzepatide': '/month',
  'GLP-1 (unspecified)': '/month',
  'Semaglutide / Weight Loss': '/month',
  'B12 Injection': '/injection',
  'Lipotropic / MIC Injection': '/injection',
  'IV Therapy': '/session',
  'IV Vitamin Therapy': '/session',
  'IV Drip Therapy': '/session',
  'NAD+ Therapy': '/session',
  'Peptide Therapy': '/month',
  'HRT (Hormone Replacement)': '/month',
  'Testosterone Therapy': '/month',
  'PRP Hair Restoration': '/session',
  'Hair Loss Treatment': '/session',
  'Scalp Micropigmentation': '/session',
  'PRP Injections': '/session',
  'Exosome Therapy': '/session',
  'Sculptra': '/vial',
  'PDO Thread Lift': '/session',
  'Sclerotherapy': '/session',
  'RF Ablation': '/session',
  'Botox Lip Flip': '',
  'Brow Lamination': '',
  'Lash Lift': '',
};

const FREQUENCY_OPTIONS = [
  { value: 3, label: 'Every 3 months' },
  { value: 4, label: 'Every 4 months' },
  { value: 6, label: 'Every 6 months' },
  { value: 12, label: 'Once a year' },
];

function trackEvent(eventName, properties = {}) {
  supabase.from('custom_events').insert({ event_name: eventName, properties }).then(() => {});
}

export default function SavingsCalculator({ variant = 'full', defaultProcedure = '', defaultCity = '' }) {
  const { user, openAuthModal } = useContext(AuthContext);

  // Step 1 — What do you get?
  const [procedureType, setProcedureType] = useState(defaultProcedure);
  const [city, setCity] = useState(defaultCity);
  const [state, setState] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const cityRef = useRef(null);
  const cityDebounce = useRef(null);

  // Step 2 — What do you pay?
  const [price, setPrice] = useState('');
  const [frequency, setFrequency] = useState(3);

  // Results
  const [benchmark, setBenchmark] = useState(null);
  const [benchmarkFallback, setBenchmarkFallback] = useState(false); // true when using state-level data
  const [percentile, setPercentile] = useState(null);
  const [cheaperProviders, setCheaperProviders] = useState([]);

  // Share card
  const [showShareCard, setShowShareCard] = useState(false);

  // Close city dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (cityRef.current && !cityRef.current.contains(e.target)) setCityOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch benchmark when procedure + city selected (with state-level fallback)
  useEffect(() => {
    if (!procedureType || !city || !state) {
      setBenchmark(null);
      setBenchmarkFallback(false);
      setPercentile(null);
      setCheaperProviders([]);
      return;
    }
    async function loadBenchmark() {
      const bm = await fetchBenchmark(procedureType, state, city);
      if (bm) {
        setBenchmark(bm);
        setBenchmarkFallback(false);
      } else {
        // Fallback to state-level average
        const stateBm = await fetchBenchmark(procedureType, state);
        setBenchmark(stateBm);
        setBenchmarkFallback(!!stateBm);
      }
    }
    loadBenchmark();
  }, [procedureType, city, state]);

  // Fetch percentile + cheaper providers when price changes
  useEffect(() => {
    if (!procedureType || !city || !state || !price || !benchmark) {
      setPercentile(null);
      setCheaperProviders([]);
      return;
    }

    const userPrice = parseFloat(price);
    if (isNaN(userPrice) || userPrice <= 0) return;

    // Get percentile
    async function fetchPercentile() {
      const { data: allPrices } = await supabase
        .from('procedures')
        .select('price_paid')
        .eq('procedure_type', procedureType)
        .eq('city', city)
        .eq('state', state)
        .eq('status', 'active');

      if (allPrices && allPrices.length >= 3) {
        const sorted = allPrices.map((p) => Number(p.price_paid)).sort((a, b) => a - b);
        const below = sorted.filter((p) => p <= userPrice).length;
        setPercentile(Math.round((below / sorted.length) * 100));
      } else {
        setPercentile(null);
      }
    }

    // Get cheaper providers (only when above avg)
    async function fetchCheaper() {
      const avgPrice = Number(benchmark.avg_price);
      if (userPrice <= avgPrice) {
        setCheaperProviders([]);
        return;
      }

      const { data } = await supabase
        .from('procedures')
        .select('provider_name, price_paid')
        .eq('procedure_type', procedureType)
        .eq('city', city)
        .eq('state', state)
        .eq('status', 'active')
        .lt('price_paid', userPrice)
        .order('price_paid', { ascending: true })
        .limit(20);

      if (data) {
        // Group by provider, get average
        const providerMap = {};
        for (const row of data) {
          if (!row.provider_name) continue;
          if (!providerMap[row.provider_name]) {
            providerMap[row.provider_name] = { total: 0, count: 0 };
          }
          providerMap[row.provider_name].total += Number(row.price_paid);
          providerMap[row.provider_name].count += 1;
        }
        const sorted = Object.entries(providerMap)
          .map(([name, d]) => ({ provider_name: name, avg_price: d.total / d.count }))
          .sort((a, b) => a.avg_price - b.avg_price);
        setCheaperProviders(sorted.slice(0, 3));
      }
    }

    fetchPercentile();
    fetchCheaper();

    trackEvent(user ? 'calculator_used' : 'calculator_used_no_auth', {
      procedure_type: procedureType,
      city,
      user_id: user?.id || null,
    });
  }, [price, benchmark, procedureType, city, state]);

  // City / zip search
  const searchCities = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) { setCityResults([]); return; }

    // Phone area-code detection — first-time users sometimes type their
    // 3-digit area code into the location input thinking it's a "city
    // ID". Catch the 3-digit case explicitly and surface a friendly
    // hint instead of falling through to the city ilike search.
    if (/^\d{3}$/.test(trimmed)) {
      setCityResults([{ kind: 'areaCodeHint' }]);
      return;
    }

    // 4-digit numeric — keep typing your zip.
    if (/^\d{4}$/.test(trimmed)) {
      setCityResults([{ kind: 'partialZipHint' }]);
      return;
    }

    // Zip code path. Uses the centralized resolver so EVERY US zip
    // works — zippopotam first, Google Geocoding fallback for the long
    // tail (new zips, IRS PO box zips, rural-route consolidations).
    // persist:false so search-as-you-type doesn't overwrite the user's
    // saved location until they pick a result.
    if (/^\d{5}$/.test(trimmed)) {
      setCityLoading(true);
      try {
        const result = await lookupZip(trimmed, { persist: false });
        if (result) {
          setCityResults([{
            city: result.city,
            state: result.state,
          }]);
        } else {
          setCityResults([]);
        }
      } catch {
        setCityResults([]);
      } finally {
        setCityLoading(false);
      }
      return;
    }

    // City/town name path
    if (trimmed.length < 2) { setCityResults([]); return; }
    setCityLoading(true);
    try {
      const { data } = await supabase
        .from('procedures')
        .select('city, state')
        .eq('status', 'active')
        .ilike('city', `${trimmed}%`)
        .limit(200);

      const countMap = new Map();
      for (const row of data || []) {
        if (!row.city || !row.state) continue;
        const key = `${row.city}|${row.state}`;
        countMap.set(key, (countMap.get(key) || 0) + 1);
      }
      const unique = [...countMap.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)
        .map(([key]) => { const [city, state] = key.split('|'); return { city, state }; });
      const seen = new Set(unique.map((u) => `${u.city}|${u.state}`));

      if (unique.length < 3) {
        const mapboxResults = await searchCitiesViaMapbox(trimmed);
        for (const g of mapboxResults) {
          const key = `${g.city}|${g.state}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(g);
          }
          if (unique.length >= 8) break;
        }
      }

      setCityResults(unique);
    } catch {
      setCityResults([]);
    } finally {
      setCityLoading(false);
    }
  }, []);

  function handleCityInput(val) {
    setCityQuery(val);
    setCityOpen(true);
    if (cityDebounce.current) clearTimeout(cityDebounce.current);
    cityDebounce.current = setTimeout(() => searchCities(val), 300);
  }

  function selectCity(loc) {
    setCity(loc.city);
    setState(loc.state);
    setCityQuery('');
    setCityOpen(false);
  }

  // Calculations
  const userPrice = parseFloat(price) || 0;
  const avgPrice = benchmark ? Number(benchmark.avg_price) : 0;
  const typicalUnits = TYPICAL_UNITS[procedureType] || 1;
  const unitLabel = UNIT_LABELS[procedureType] || '';
  const perTreatmentSavings = avgPrice > 0 ? Math.abs(avgPrice - userPrice) * typicalUnits : 0;
  const treatmentsPerYear = 12 / frequency;
  const yearlySavings = perTreatmentSavings * treatmentsPerYear;
  const fiveYearSavings = yearlySavings * 5;
  const paidBelow = userPrice < avgPrice;
  const paidAbove = userPrice > avgPrice;
  const hasResults = userPrice > 0 && avgPrice > 0;

  function handleShareClick() {
    if (!user) {
      openAuthModal('signin');
      return;
    }
    setShowShareCard(true);
  }

  const isCompact = variant === 'compact';

  return (
    <>
      <div className={isCompact ? '' : 'glow-card p-6'}>
        {!isCompact && (
          <div className="flex items-center gap-2.5 mb-5">
            <Calculator size={22} className="text-rose-accent" />
            <h2 className="text-lg font-bold text-text-primary">Savings Calculator</h2>
          </div>
        )}

        {/* Step 1 — Procedure + City */}
        <div className={`grid ${isCompact ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 gap-3'} mb-4`}>
          {/* Procedure dropdown */}
          <div className="relative">
            <label className="block text-xs font-medium text-text-secondary mb-1">Procedure</label>
            <div className="relative">
              <select
                value={procedureType}
                onChange={(e) => setProcedureType(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm bg-white"
              >
                <option value="">Select procedure</option>
                {Object.entries(PROCEDURE_CATEGORIES).map(([category, procedures]) => (
                  <optgroup key={category} label={category}>
                    {procedures.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* City autocomplete */}
          <div ref={cityRef} className="relative">
            <label className="block text-xs font-medium text-text-secondary mb-1">Location</label>
            {city ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white">
                <span className="inline-flex items-center gap-1 text-sm text-text-primary">
                  <MapPin size={12} className="text-text-secondary" />
                  {city}{state ? `, ${state}` : ''}
                </span>
                <button
                  onClick={() => { setCity(''); setState(''); setBenchmark(null); }}
                  className="ml-auto text-text-secondary hover:text-text-primary text-xs"
                >
                  &times;
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="City or zip code (e.g. Miami FL)"
                    value={cityQuery}
                    onChange={(e) => handleCityInput(e.target.value)}
                    onFocus={() => cityQuery.trim() && setCityOpen(true)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                  />
                </div>
                {cityOpen && cityQuery.trim().length >= 1 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-30 overflow-hidden">
                    {cityLoading ? (
                      <div className="px-4 py-3 text-sm text-text-secondary animate-pulse">Searching...</div>
                    ) : cityResults.length > 0 && cityResults[0].kind === 'areaCodeHint' ? (
                      <div className="px-4 py-3 text-sm" style={{ color: '#888', lineHeight: 1.5 }}>
                        <p style={{ color: '#111', fontWeight: 500, marginBottom: 4 }}>
                          Looks like a phone area code.
                        </p>
                        <p>
                          Try typing your city name instead — e.g.{' '}
                          <span style={{ color: '#C94F78', fontWeight: 500 }}>Miami FL</span>,{' '}
                          <span style={{ color: '#C94F78', fontWeight: 500 }}>Mandeville LA</span>,{' '}
                          or a full 5-digit zip code.
                        </p>
                      </div>
                    ) : cityResults.length > 0 && cityResults[0].kind === 'partialZipHint' ? (
                      <div className="px-4 py-3 text-sm" style={{ color: '#888' }}>
                        Keep typing &mdash; US zip codes are 5 digits.
                      </div>
                    ) : cityResults.length > 0 ? (
                      cityResults.map((loc, i) => (
                        <button
                          key={`${loc.city}-${loc.state}-${i}`}
                          onClick={() => selectCity(loc)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-light/40 transition-colors flex items-center gap-2 text-text-primary"
                        >
                          <MapPin size={12} className="text-text-secondary shrink-0" />
                          {loc.city}, {loc.state}
                        </button>
                      ))
                    ) : cityQuery.trim().length >= 2 ? (
                      <div className="px-4 py-3 text-sm text-text-secondary">No locations found</div>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Step 2 — Price + Frequency */}
        <div className={`grid ${isCompact ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 gap-3'} mb-5`}>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              What do you pay?{unitLabel && <span className="text-text-secondary/60"> ({unitLabel.replace('/', 'per ')})</span>}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
              <input
                type="number"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="0.01"
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">How often?</label>
            <div className="relative">
              <select
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm bg-white"
              >
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ═══ RESULTS ═══ */}
        {hasResults && (
          <div className="rounded-xl p-5 mb-4" style={{ background: 'linear-gradient(135deg, #FDF6F0, #FBE8EF)' }}>
            {/* Price comparison */}
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-text-secondary">You pay</span>
              <span className="font-bold text-text-primary">${userPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{unitLabel}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-text-secondary">{benchmarkFallback ? `${state} average` : `${city} average`}</span>
              <span className="font-bold text-text-primary">${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{unitLabel}</span>
            </div>

            {/* Savings breakdown */}
            {paidBelow ? (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Per treatment</span>
                  <span className="text-sm font-bold text-green-600">~${Math.round(perTreatmentSavings).toLocaleString()} savings</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Per year</span>
                  <span className="text-base font-bold" style={{ color: '#C94F78' }}>~${Math.round(yearlySavings).toLocaleString()} savings</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Over 5 years</span>
                  <span className="text-sm font-bold text-text-primary">~${Math.round(fiveYearSavings).toLocaleString()} savings</span>
                </div>
              </div>
            ) : paidAbove ? (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">You could save</span>
                  <span className="text-sm font-bold" style={{ color: '#92400E' }}>${Math.round(perTreatmentSavings).toLocaleString()}/treatment</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Per year</span>
                  <span className="text-base font-bold" style={{ color: '#92400E' }}>${Math.round(yearlySavings).toLocaleString()} potential savings</span>
                </div>
              </div>
            ) : (
              <p className="text-sm font-semibold text-green-600 mb-4">
                Right at the local average &#x2705;
              </p>
            )}

            {/* State fallback note */}
            {benchmarkFallback && (
              <p className="text-xs text-text-secondary/70 italic mb-3">
                Using {state} statewide average — not enough data in {city} yet.
              </p>
            )}

            {/* Percentile */}
            {percentile != null && paidBelow && (
              <p className="text-sm font-medium text-text-primary mb-4">
                You&apos;re in the top {Math.round(100 - percentile)}% of prices in {city} &#x1F389;
              </p>
            )}

            {/* Cheaper providers (above avg) */}
            {paidAbove && cheaperProviders.length > 0 && (
              <div className="border-t border-rose-accent/15 pt-3 mb-4">
                <p className="text-xs font-medium text-text-secondary mb-2">
                  See which providers are cheaper:
                </p>
                <div className="space-y-1.5">
                  {cheaperProviders.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-text-primary flex items-center gap-1.5">
                        <MapPin size={12} className="text-text-secondary" />
                        {p.provider_name}
                      </span>
                      <span className="font-semibold text-text-primary">
                        ${Number(p.avg_price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{unitLabel} avg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleShareClick}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
                style={{ backgroundColor: '#C94F78' }}
              >
                &#x1F4F8; Create Shareable Card
              </button>
              <Link
                to={`/log?procedure=${encodeURIComponent(procedureType)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-rose-accent border border-rose-accent/30 rounded-xl hover:bg-rose-light/50 transition-colors"
              >
                Log this treatment <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Loading indicator when benchmark is fetching */}
        {procedureType && city && state && !benchmark && (
          <div className="text-center py-4">
            <p className="text-sm text-text-secondary animate-pulse">Loading price data...</p>
          </div>
        )}

        {/* No data message — shows only when both city and state benchmarks are null */}
        {procedureType && city && state && benchmark === null && !benchmarkFallback && price && (
          <div className="text-center py-3">
            <p className="text-sm text-text-secondary">
              Not enough prices for {procedureType} in {city} yet.{' '}
              <Link to="/log" className="text-rose-accent font-medium hover:text-rose-dark">
                Share yours
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* Share card modal */}
      {showShareCard && hasResults && (
        <SavingsShareCard
          procedureType={procedureType}
          pricePerUnit={price}
          unitLabel={unitLabel}
          city={city}
          yearlySavings={yearlySavings}
          percentile={percentile}
          paidBelow={paidBelow}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </>
  );
}

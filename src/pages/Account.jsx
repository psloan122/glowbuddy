import { useState, useEffect, useContext, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  User,
  Sparkles,
  Bell,
  Mail,
  Gift,
  AlertTriangle,
  Loader2,
  DollarSign,
  Settings as SettingsIcon,
  ChevronDown,
  X,
  Pencil,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { signOut } from '../lib/auth';
import { getUserAlerts } from '../lib/priceAlerts';
import { getCity, getState, setCity as persistCity, setState as persistState } from '../lib/gating';
import { searchCitiesViaMapbox } from '../lib/places';
import { AuthContext } from '../App';
import { INTEREST_OPTIONS, INTEREST_TO_PROCEDURES, PROCEDURE_PILLS } from '../lib/constants';
import useUserPreferences from '../hooks/useUserPreferences';
import PhoneVerificationCard from '../components/PhoneVerificationCard';
import YourPriceAlerts from '../components/home/YourPriceAlerts';
import YourActivity from '../components/home/YourActivity';
import CreatePriceAlert from '../components/CreatePriceAlert';
import { useNavigate } from 'react-router-dom';

const BRAND_OPTIONS = [
  { category: 'Botox & more', brands: ['Botox', 'Dysport', 'Xeomin', 'Jeuveau', 'Daxxify'] },
  { category: 'Fillers',      brands: ['Juvederm', 'Restylane', 'Sculptra', 'Radiesse'] },
];

const BUDGET_RANGES = [
  { label: 'Under $250', min: 0, max: 250 },
  { label: '$250 – $500', min: 250, max: 500 },
  { label: '$500 – $1,000', min: 500, max: 1000 },
  { label: '$1,000 – $2,500', min: 1000, max: 2500 },
  { label: '$2,500+', min: 2500, max: null },
  { label: 'No budget', min: null, max: null },
];

function matchBudgetRange(min, max) {
  return BUDGET_RANGES.findIndex((r) => r.min === min && r.max === max);
}

const EMAIL_PREFS = [
  {
    key: 'email_monthly_report',
    label: 'Monthly Glow Report',
    description: 'Personalized price trends, savings, and specials in your city.',
    icon: Mail,
  },
  {
    key: 'email_price_alerts',
    label: 'Price Alerts',
    description: 'Get notified when prices drop for procedures you track.',
    icon: Bell,
  },
  {
    key: 'email_giveaway',
    label: 'Community Updates',
    description: 'Community announcements and new features.',
    icon: Gift,
  },
];

export default function Account() {
  const { user, openAuthModal, showToast } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isWelcome = searchParams.get('welcome') === 'true';

  // Profile state
  const [nameFirst, setNameFirst] = useState('');
  const [nameLast, setNameLast] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Email prefs
  const [prefs, setPrefs] = useState({
    email_monthly_report: true,
    email_price_alerts: true,
    email_giveaway: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Treatment preferences
  const {
    preferences: userPrefs,
    procedureTags,
    procedureSlugs,
    brands: selectedBrands,
    updatePreferences,
    updateProcedureSlugs,
    updateBrands,
    toggleProcedureTag,
  } = useUserPreferences();

  const toggleProcedureSlug = (slug) => {
    const next = procedureSlugs.includes(slug)
      ? procedureSlugs.filter((s) => s !== slug)
      : [...procedureSlugs, slug];
    updateProcedureSlugs(next);
  };

  const toggleBrand = (brand) => {
    const next = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    updateBrands(next);
  };

  // Price alerts
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const city = getCity();
  const state = getState();

  // Editable city/state in profile card
  const [profileCity, setProfileCity] = useState(city);
  const [profileState, setProfileState] = useState(state);
  const [cityEditing, setCityEditing] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [citySaving, setCitySaving] = useState(false);
  const [citySaved, setCitySaved] = useState(false);
  const cityContainerRef = useRef(null);

  // Activity
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(true);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Welcome banner dismiss
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  useEffect(() => {
    document.title = 'My Account | Know Before You Glow';
  }, []);

  // Scroll to hash anchor on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    // Small delay to ensure DOM has rendered
    const timer = setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Load profile + email prefs
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    supabase
      .from('profiles')
      .select('email_monthly_report, email_price_alerts, email_giveaway, first_name, full_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            email_monthly_report: data.email_monthly_report ?? true,
            email_price_alerts: data.email_price_alerts ?? true,
            email_giveaway: data.email_giveaway ?? true,
          });
          if (data.first_name) setNameFirst(data.first_name);
          if (data.full_name) {
            const parts = data.full_name.split(' ');
            if (parts.length > 1) setNameLast(parts.slice(1).join(' '));
          }
        }
        setLoading(false);
      });
  }, [user?.id]);

  // Fetch alerts
  useEffect(() => {
    if (!user?.id) {
      setAlertsLoading(false);
      return;
    }
    getUserAlerts()
      .then((data) => setAlerts(data))
      .catch(() => {})
      .finally(() => setAlertsLoading(false));
  }, [user?.id]);

  // Fetch activity
  useEffect(() => {
    if (!user?.id) {
      setActivityLoading(false);
      return;
    }

    async function fetchActivity() {
      try {
        const [countRes, recentRes, pioneerRes] = await Promise.all([
          supabase
            .from('procedures')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'active'),
          supabase
            .from('procedures')
            .select('id, procedure_type, brand, price_paid, created_at')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('pioneer_records')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);

        setActivity({
          pricesShared: countRes.count || 0,
          savedVsAvg: 0,
          isPioneer: (pioneerRes.count || 0) > 0,
          recentSubmissions: recentRes.data || [],
        });
      } catch {
        // ignore
      } finally {
        setActivityLoading(false);
      }
    }

    fetchActivity();
  }, [user?.id]);

  async function togglePref(key) {
    const prevValue = prefs[key];
    const newValue = !prevValue;
    setPrefs((prev) => ({ ...prev, [key]: newValue }));

    const { error } = await supabase
      .from('profiles')
      .update({ [key]: newValue })
      .eq('user_id', user.id);

    if (error) {
      setPrefs((prev) => ({ ...prev, [key]: prevValue }));
      showToast('Couldn\'t save preference — please try again.', 'error');
    }
  }

  function dismissWelcome() {
    setWelcomeDismissed(true);
    // Remove ?welcome=true from the URL without a navigation
    searchParams.delete('welcome');
    setSearchParams(searchParams, { replace: true });
  }

  // Debounced Mapbox search while city editor is open
  useEffect(() => {
    if (!cityEditing) return;
    const q = cityQuery.trim();
    if (!q) { setCitySuggestions([]); return; }
    const timer = setTimeout(async () => {
      const results = await searchCitiesViaMapbox(q);
      setCitySuggestions(results.slice(0, 5));
    }, 300);
    return () => clearTimeout(timer);
  }, [cityQuery, cityEditing]);

  // Close city editor on outside click
  useEffect(() => {
    if (!cityEditing) return;
    function handleClick(e) {
      if (cityContainerRef.current && !cityContainerRef.current.contains(e.target)) {
        setCityEditing(false);
        setCityQuery('');
        setCitySuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [cityEditing]);

  // ── Not logged in ──
  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <User className="w-12 h-12 text-rose-accent mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">My Account</h1>
        <p className="text-text-secondary mb-6">Sign in to manage your account and preferences.</p>
        <button
          onClick={() => openAuthModal('signin')}
          className="bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 text-rose-accent mx-auto animate-spin" />
      </div>
    );
  }

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const initials = nameFirst
    ? nameFirst.charAt(0).toUpperCase()
    : (user.email || '').charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24 md:pb-8">
      {/* Welcome banner */}
      {isWelcome && !welcomeDismissed && (
        <div
          className="mb-6 p-5 flex items-start justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, #E8347A 0%, #D42A6B 100%)',
            borderRadius: '2px',
          }}
        >
          <div>
            <p
              className="text-[10px] font-semibold uppercase mb-1"
              style={{ letterSpacing: '0.16em', color: '#FBE4ED' }}
            >
              Welcome to Know Before You Glow
            </p>
            <p className="text-white font-display text-lg" style={{ fontWeight: 700 }}>
              You&apos;re all set! Start by personalizing your preferences below.
            </p>
          </div>
          <button onClick={dismissWelcome} className="text-white/70 hover:text-white shrink-0 mt-1">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Two-column layout: profile card (left) + sections (right) */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* ── Left: Sticky profile card ── */}
        <div className="md:w-[260px] md:shrink-0">
          <div className="md:sticky md:top-[80px]">
            <div
              id="profile"
              className="glow-card p-6 scroll-mt-20"
            >
              {/* Avatar */}
              <div
                className="w-14 h-14 flex items-center justify-center text-white text-lg font-bold mx-auto mb-3"
                style={{ backgroundColor: '#E8347A', borderRadius: '50%' }}
              >
                {initials}
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="First name"
                  value={nameFirst}
                  onChange={(e) => { setNameFirst(e.target.value); setNameSaved(false); }}
                  className="flex-1 px-3 py-2 border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm min-w-0"
                  style={{ fontSize: '16px', borderRadius: '2px' }}
                />
                <input
                  type="text"
                  placeholder="Last"
                  value={nameLast}
                  onChange={(e) => { setNameLast(e.target.value); setNameSaved(false); }}
                  className="w-20 px-3 py-2 border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                  style={{ fontSize: '16px', borderRadius: '2px' }}
                />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={async () => {
                    const trimmedFirst = nameFirst.trim();
                    const trimmedLast = nameLast.trim();
                    if (!trimmedFirst) return;
                    setNameSaving(true);
                    setNameSaved(false);
                    const fullName = [trimmedFirst, trimmedLast].filter(Boolean).join(' ');
                    await supabase.from('profiles').update({
                      first_name: trimmedFirst,
                      full_name: fullName,
                    }).eq('user_id', user.id);
                    await supabase.auth.updateUser({
                      data: { first_name: trimmedFirst, full_name: fullName },
                    });
                    setNameSaving(false);
                    setNameSaved(true);
                    setTimeout(() => setNameSaved(false), 2000);
                  }}
                  disabled={nameSaving || !nameFirst.trim()}
                  className="bg-rose-accent text-white px-4 py-1.5 text-xs font-semibold hover:bg-rose-dark transition disabled:opacity-50"
                  style={{ borderRadius: '2px' }}
                >
                  {nameSaving ? '...' : 'Save'}
                </button>
                {nameSaved && <span className="text-xs text-green-600">Saved</span>}
              </div>

              {/* Account info */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <p className="text-[12px] text-text-secondary truncate">{user.email}</p>
                {/* Editable city/state */}
                {cityEditing ? (
                  <div ref={cityContainerRef} style={{ position: 'relative' }}>
                    <input
                      autoFocus
                      type="text"
                      value={cityQuery}
                      onChange={(e) => setCityQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setCityEditing(false);
                          setCityQuery('');
                          setCitySuggestions([]);
                        }
                      }}
                      placeholder="Type a city..."
                      className="w-full px-2 py-1 border border-gray-200 focus:border-rose-accent focus:outline-none transition text-[12px]"
                      style={{ borderRadius: '2px', fontFamily: 'var(--font-body)', fontSize: '14px' }}
                    />
                    {citySaving && (
                      <span className="text-[11px] text-text-secondary mt-0.5 block">Saving…</span>
                    )}
                    {citySuggestions.length > 0 && (
                      <div
                        className="absolute top-full left-0 right-0 bg-white border border-[#EDE8E3] z-50 shadow-sm"
                        style={{ borderRadius: '2px' }}
                      >
                        {citySuggestions.map(({ city: c, state: s }) => (
                          <button
                            key={`${c}-${s}`}
                            type="button"
                            onMouseDown={async (e) => {
                              e.preventDefault();
                              setCitySaving(true);
                              persistCity(c);
                              persistState(s);
                              await supabase.from('profiles').update({ city: c, state: s }).eq('user_id', user.id);
                              setProfileCity(c);
                              setProfileState(s);
                              setCitySaving(false);
                              setCitySaved(true);
                              setCityEditing(false);
                              setCityQuery('');
                              setCitySuggestions([]);
                              setTimeout(() => setCitySaved(false), 2000);
                            }}
                            className="w-full text-left px-3 py-2 text-[12px] hover:bg-cream flex items-center gap-1.5"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            {c}, {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {(profileCity && profileState) ? (
                      <span className="text-[11px] text-text-secondary">{profileCity}, {profileState}</span>
                    ) : (
                      <span className="text-[11px] text-text-secondary/50">Add your city</span>
                    )}
                    {citySaved ? (
                      <Check size={11} className="text-green-600 shrink-0" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setCityEditing(true); setCityQuery(''); }}
                        className="text-text-secondary/40 hover:text-hot-pink transition-colors shrink-0"
                        aria-label="Edit city"
                      >
                        <Pencil size={11} />
                      </button>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-text-secondary uppercase" style={{ letterSpacing: '0.06em' }}>
                  Member since {memberSince}
                </p>
              </div>

              {/* Quick nav (desktop only) */}
              <div className="hidden md:block mt-4 pt-3 border-t border-gray-100 space-y-1">
                {[
                  { id: 'preferences', label: 'Preferences' },
                  { id: 'alerts', label: 'Price Alerts' },
                  { id: 'activity', label: 'Activity' },
                  { id: 'notifications', label: 'Notifications' },
                  { id: 'settings', label: 'Danger Zone' },
                ].map((anchor) => (
                  <a
                    key={anchor.id}
                    href={`#${anchor.id}`}
                    className="block text-[12px] text-text-secondary hover:text-hot-pink transition-colors py-1"
                  >
                    {anchor.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Scrollable sections ── */}
        <div className="flex-1 min-w-0 space-y-4">

      {/* ── 2. Treatment Preferences ── */}
      <AccordionSection id="preferences" title="Treatment Preferences" icon={Sparkles}>
        <p className="text-sm text-text-secondary mb-5">
          Personalize what you see across Know Before You Glow. Your picks drive the Browse page so you can skip the gate and jump straight to your treatments.
        </p>

        {/* Treatments I get */}
        <div className="mb-5">
          <p className="text-sm font-medium text-text-primary mb-2">Treatments I get</p>
          <div className="flex flex-wrap gap-2">
            {PROCEDURE_PILLS.filter((p) => p.isPrimary).map((pill) => {
              // Use the brand-specific key so each neurotoxin toggles
              // independently (Botox, Dysport, Xeomin) instead of all
              // sharing the 'neurotoxin' slug.
              const prefKey = pill.brand || pill.slug;
              const isActive = pill.brand
                ? selectedBrands.includes(pill.brand)
                : procedureSlugs.includes(pill.slug);
              return (
                <button
                  key={prefKey}
                  onClick={() => {
                    if (pill.brand) {
                      toggleBrand(pill.brand);
                    } else {
                      toggleProcedureSlug(pill.slug);
                    }
                  }}
                  className="inline-flex items-center transition-colors"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '2px',
                    border: `1px solid ${isActive ? '#E8347A' : '#DDD'}`,
                    background: isActive ? '#E8347A' : 'transparent',
                    color: isActive ? '#fff' : '#888',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                    fontSize: '12px',
                    letterSpacing: '0.06em',
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Brand-specific chips */}
        <div className="mb-5">
          <p className="text-sm font-medium text-text-primary mb-2">Specific brands</p>
          <div className="space-y-3">
            {BRAND_OPTIONS.map(({ category, brands }) => (
              <div key={category}>
                <p className="text-[10px] font-semibold uppercase text-text-secondary mb-1.5" style={{ letterSpacing: '0.08em' }}>
                  {category}
                </p>
                <div className="flex flex-wrap gap-2">
                  {brands.map((brand) => {
                    const isActive = selectedBrands.includes(brand);
                    return (
                      <button
                        key={brand}
                        onClick={() => toggleBrand(brand)}
                        className="inline-flex items-center transition-colors"
                        style={{
                          padding: '6px 14px',
                          borderRadius: '2px',
                          border: `1px solid ${isActive ? '#E8347A' : '#DDD'}`,
                          background: isActive ? '#E8347A' : 'transparent',
                          color: isActive ? '#fff' : '#888',
                          fontFamily: 'var(--font-body)',
                          fontWeight: 500,
                          fontSize: '11px',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {brand}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interest toggles */}
        <div className="mb-5">
          <p className="text-sm font-medium text-text-primary mb-2">Interested in</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map(({ label }) => {
              const procedures = INTEREST_TO_PROCEDURES[label] || [];
              const isActive = procedures.some((p) => procedureTags.includes(p));
              return (
                <button
                  key={label}
                  onClick={() => {
                    procedures.forEach((p) => {
                      const isOn = procedureTags.includes(p);
                      if (isActive && isOn) toggleProcedureTag(p);
                      if (!isActive && !isOn) toggleProcedureTag(p);
                    });
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition ${
                    isActive
                      ? 'bg-rose-accent/10 border-rose-accent text-rose-accent'
                      : 'bg-white border-gray-200 text-text-primary hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget range */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign size={14} className="text-text-secondary" />
            <p className="text-sm font-medium text-text-primary">Typical budget</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BUDGET_RANGES.map((range) => {
              const isActive = matchBudgetRange(userPrefs?.budget_min ?? null, userPrefs?.budget_max ?? null) === BUDGET_RANGES.indexOf(range);
              return (
                <button
                  key={range.label}
                  onClick={() => updatePreferences({ budget_min: range.min, budget_max: range.max })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                    isActive
                      ? 'bg-rose-accent/10 border-rose-accent text-rose-accent'
                      : 'bg-white border-gray-200 text-text-primary hover:border-gray-300'
                  }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>
      </AccordionSection>

      {/* ── 3. Price Alerts ── */}
      <section id="alerts" className="mb-4 scroll-mt-20">
        <YourPriceAlerts
          alerts={alerts}
          loading={alertsLoading}
          onCreateAlert={() => setShowCreateAlert(true)}
        />
      </section>

      {/* ── 4. Activity ── */}
      <section id="activity" className="mb-4 scroll-mt-20">
        <YourActivity activity={activity} loading={activityLoading} />
      </section>

      {/* ── 5. Notification Preferences ── */}
      <AccordionSection id="notifications" title="Notification Preferences" icon={Bell}>
        <p className="text-sm text-text-secondary mb-5">
          Choose which emails you&apos;d like to receive from Know Before You Glow.
        </p>

        <div className="space-y-4">
          {EMAIL_PREFS.map((pref) => {
            const Icon = pref.icon;
            return (
              <div
                key={pref.key}
                className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-start gap-3">
                  <Icon size={18} className="text-text-secondary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{pref.label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{pref.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => togglePref(pref.key)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    prefs[pref.key] ? 'bg-rose-accent' : 'bg-gray-300'
                  }`}
                  aria-label={`Toggle ${pref.label}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      prefs[pref.key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 h-5 flex items-center justify-end">
          {saving && (
            <span className="text-xs text-text-secondary flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Saving...
            </span>
          )}
          {saved && (
            <span className="text-xs text-green-600">Saved</span>
          )}
        </div>

        {/* Phone + SMS */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <PhoneVerificationCard />
        </div>
      </AccordionSection>

      {/* ── 6. Account Settings ── */}
      <section id="settings" className="border border-red-200 rounded-xl p-6 mb-6 scroll-mt-20">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-bold text-red-600">Danger Zone</h2>
        </div>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm text-red-600 border border-red-300 px-4 py-2 rounded-lg hover:bg-red-50 transition"
          >
            Delete My Account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-600">
              This will permanently delete your account and all your data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setDeleting(true);
                  const { error } = await supabase.rpc('delete_my_account');
                  if (!error) {
                    await signOut();
                    navigate('/');
                  }
                  setDeleting(false);
                }}
                disabled={deleting}
                className="text-sm text-white bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="text-sm text-text-secondary px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Create alert modal */}
      {showCreateAlert && (
        <CreatePriceAlert
          onClose={() => {
            setShowCreateAlert(false);
            // Refresh alerts
            getUserAlerts()
              .then((data) => setAlerts(data))
              .catch(() => {});
          }}
          defaultCity={profileCity}
          defaultState={profileState}
        />
      )}
        </div>
      </div>
    </div>
  );
}

/* ── Accordion wrapper — always open on desktop, collapsible on mobile ── */
function AccordionSection({ id, title, icon: Icon, children }) {
  const [open, setOpen] = useState(false);

  return (
    <section id={id} className="glow-card scroll-mt-20 overflow-hidden">
      {/* Header — tappable on mobile, static on desktop */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 p-5 md:pointer-events-none text-left"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} className="text-rose-accent shrink-0" />}
          <h2 className="text-base font-bold text-text-primary">{title}</h2>
        </div>
        <ChevronDown
          size={18}
          className={`text-text-secondary md:hidden transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Body — always visible on md+, toggle on mobile */}
      <div className={`px-5 pb-5 ${open ? 'block' : 'hidden'} md:block`}>
        {children}
      </div>
    </section>
  );
}

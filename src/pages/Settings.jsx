import { useState, useEffect, useContext } from 'react';
import { Settings as SettingsIcon, Mail, Bell, Gift, Loader2, AlertTriangle, DollarSign, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { signOut } from '../lib/auth';
import { AuthContext } from '../App';
import { INTEREST_OPTIONS, INTEREST_TO_PROCEDURES, PROCEDURE_PILLS } from '../lib/constants';
import useUserPreferences from '../hooks/useUserPreferences';
import PhoneVerificationCard from '../components/PhoneVerificationCard';

// Brand chips surfaced under Treatment Preferences so users can opt into
// specific brands (Botox vs Dysport) alongside the category pill. These
// match provider_pricing.brand values exactly.
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
    label: 'Giveaway Updates',
    description: 'Monthly giveaway reminders and winner announcements.',
    icon: Gift,
  },
];

export default function Settings() {
  const { user, openAuthModal } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [prefs, setPrefs] = useState({
    email_monthly_report: true,
    email_price_alerts: true,
    email_giveaway: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  // Scroll to the #treatment-preferences hash when landing from the browse
  // banner "Edit treatment preferences →" link.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#treatment-preferences') return;
    const el = document.getElementById('treatment-preferences');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    document.title = 'Settings | GlowBuddy';
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    supabase
      .from('profiles')
      .select('email_monthly_report, email_price_alerts, email_giveaway')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            email_monthly_report: data.email_monthly_report ?? true,
            email_price_alerts: data.email_price_alerts ?? true,
            email_giveaway: data.email_giveaway ?? true,
          });
        }
        setLoading(false);
      });
  }, [user?.id]);

  async function togglePref(key) {
    const newValue = !prefs[key];
    setPrefs((prev) => ({ ...prev, [key]: newValue }));
    setSaving(true);
    setSaved(false);

    await supabase
      .from('profiles')
      .update({ [key]: newValue })
      .eq('user_id', user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <SettingsIcon className="w-12 h-12 text-rose-accent mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-text-secondary mb-6">Sign in to manage your email preferences.</p>
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

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-7 h-7 text-rose-accent" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Email preferences */}
      <div className="glow-card p-6">
        <h2 className="text-lg font-bold text-text-primary mb-1">Email Preferences</h2>
        <p className="text-sm text-text-secondary mb-5">
          Choose which emails you&apos;d like to receive from GlowBuddy.
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

        {/* Save indicator */}
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
      </div>

      {/* Phone + SMS preferences — needed for the price-alert fan-out */}
      <div className="mt-6">
        <PhoneVerificationCard />
      </div>

      {/* Treatment Preferences */}
      <div id="treatment-preferences" className="glow-card p-6 mt-6 scroll-mt-20">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-rose-accent" />
          <h2 className="text-lg font-bold text-text-primary">Treatment Preferences</h2>
        </div>
        <p className="text-sm text-text-secondary mb-5">
          Personalize what you see across GlowBuddy. Your picks drive the Browse page so you can skip the gate and jump straight to your treatments.
        </p>

        {/* Treatments I get — drives personalized browse */}
        <div className="mb-5">
          <p className="text-sm font-medium text-text-primary mb-2">Treatments I get</p>
          <div className="flex flex-wrap gap-2">
            {PROCEDURE_PILLS.filter((p) => p.isPrimary).map((pill) => {
              const isActive = procedureSlugs.includes(pill.slug);
              return (
                <button
                  key={pill.slug}
                  onClick={() => toggleProcedureSlug(pill.slug)}
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

        {/* Brand-specific chips — neurotoxins & fillers */}
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
                    // Toggle all procedures for this interest
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
      </div>

      {/* Account info */}
      <div className="glow-card p-6 mt-6">
        <h2 className="text-lg font-bold text-text-primary mb-3">Account</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Email</span>
            <span className="text-text-primary font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Member since</span>
            <span className="text-text-primary font-medium">
              {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-200 rounded-xl p-6 mt-6">
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
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ShieldCheck, Gift, Loader2, DollarSign } from 'lucide-react';
import { setInterests, setOnboarded, setProcedureTags, setPreferences as setLocalPrefs } from '../lib/gating';
import { lookupZip } from '../lib/zipLookup';
import { supabase } from '../lib/supabase';
import { sendWelcomeUser } from '../lib/email';
import { INTEREST_OPTIONS, INTEREST_TO_PROCEDURES } from '../lib/constants';
import OnboardingPreferences from './OnboardingPreferences';

// Screen order: 0=Welcome, 1=Location, 2=Interests, 3=Preferences, 4=Mission
const SCREEN_COUNT = 5;

// localStorage keys for mid-flow persistence. Restored on mount so a
// refresh mid-onboarding lands the user back on their current step
// instead of bouncing them to screen 0. Cleared on completion/skip.
const STORAGE_STEP_KEY = 'onboardingStep';
const STORAGE_DATA_KEY = 'onboardingData';

function readSavedStep() {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(STORAGE_STEP_KEY);
  const parsed = raw ? parseInt(raw, 10) : 0;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= SCREEN_COUNT) return 0;
  return parsed;
}

function readSavedData() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_DATA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function clearOnboardingStorage() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_STEP_KEY);
    window.localStorage.removeItem(STORAGE_DATA_KEY);
  } catch {
    // Swallow — quota / private mode shouldn't break completion.
  }
}

export default function Onboarding({ onComplete }) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(readSavedStep);
  const [direction, setDirection] = useState(1); // 1=forward, -1=back
  const [selected, setSelected] = useState(() => readSavedData().selected || []);
  const [zip, setZip] = useState(() => readSavedData().zip || '');
  const [zipError, setZipError] = useState('');
  const [resolvedCity, setResolvedCity] = useState(() => readSavedData().resolvedCity || '');
  const [lookingUp, setLookingUp] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const zipInputRef = useRef(null);

  // Persist step + form data on every change so a refresh recovers.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_STEP_KEY, String(screen));
      window.localStorage.setItem(
        STORAGE_DATA_KEY,
        JSON.stringify({ selected, zip, resolvedCity })
      );
    } catch {
      // Ignore quota / private-mode errors.
    }
  }, [screen, selected, zip, resolvedCity]);

  function goTo(nextScreen) {
    setDirection(nextScreen > screen ? 1 : -1);
    setScreen(nextScreen);
  }

  function handleSkip() {
    if (!showSkipConfirm) {
      setShowSkipConfirm(true);
      return;
    }
    clearOnboardingStorage();
    setOnboarded();
    onComplete();
  }

  function handleSkipCancel() {
    setShowSkipConfirm(false);
  }

  function toggleInterest(label) {
    setSelected((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  }

  function handleInterestsNext() {
    setInterests(selected);
    persistProcedureTags(selected);
    goTo(3);
  }

  function persistProcedureTags(interests) {
    // Resolve broad interests to specific procedure types
    const tags = [];
    for (const label of interests) {
      const mapped = INTEREST_TO_PROCEDURES[label];
      if (mapped) tags.push(...mapped);
    }
    const unique = [...new Set(tags)];
    setProcedureTags(unique);
  }

  function handlePreferencesNext(prefs) {
    setLocalPrefs(prefs);
    // Also save to Supabase if logged in
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) {
        supabase.from('user_preferences').upsert({
          user_id: data.session.user.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }).catch(() => {});
      }
    });
    goTo(4);
  }

  function handlePreferencesSkip() {
    goTo(4);
  }

  // Auto-advance when zip reaches 5 digits
  async function handleZipChange(value) {
    const cleaned = value.replace(/\D/g, '').slice(0, 5);
    setZip(cleaned);
    setZipError('');

    if (cleaned.length === 5) {
      setLookingUp(true);
      const result = await lookupZip(cleaned);
      setLookingUp(false);
      if (result) {
        setResolvedCity(result.city);
        // Brief pause to show the resolved city, then auto-advance
        setTimeout(() => goTo(2), 600);
      } else {
        setZipError('Could not find that zip code');
      }
    }
  }

  function handleZipSkip() {
    goTo(2);
  }

  function handleBrowse() {
    clearOnboardingStorage();
    setOnboarded();
    onComplete();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) sendWelcomeUser(data.session.user.email);
    });
  }

  function handleLogTreatment() {
    clearOnboardingStorage();
    setOnboarded();
    onComplete();
    navigate('/log');
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) sendWelcomeUser(data.session.user.email);
    });
  }

  // Focus zip input when location screen appears
  useEffect(() => {
    if (screen === 1 && zipInputRef.current) {
      zipInputRef.current.focus();
    }
  }, [screen]);

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto"
      style={{
        backgroundColor: '#FDF6F0',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="min-h-full flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[480px]">
          {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: SCREEN_COUNT }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === screen ? 'w-6 bg-[#C94F78]' : 'w-2 bg-[#C94F78]/20'
              }`}
            />
          ))}
        </div>

        <div
          className="bg-white rounded-2xl p-8 shadow-lg transition-all duration-300 ease-out"
          style={{
            animation: `slide-in-${direction > 0 ? 'right' : 'left'} 0.25s ease-out`,
          }}
          key={screen}
        >
          {/* Screen 0 — Welcome */}
          {screen === 0 && (
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-rose-light rounded-full mx-auto mb-6">
                <Sparkles size={28} className="text-[#C94F78]" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Know before you glow.
              </h1>
              <p className="text-text-secondary mb-8">
                See what real people pay for Botox, fillers, and med spa treatments near you.
              </p>
              <button
                onClick={() => goTo(1)}
                className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition"
                style={{ backgroundColor: '#C94F78' }}
              >
                Get Started
              </button>
              {showSkipConfirm ? (
                <div className="mt-3 p-3 rounded-xl bg-gray-50">
                  <p className="text-xs text-text-secondary mb-2">
                    Personalization helps us show relevant prices and specials. Skip anyway?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSkipCancel}
                      className="flex-1 py-2 text-xs font-medium text-text-primary border border-gray-200 rounded-lg hover:bg-white transition"
                    >
                      Keep going
                    </button>
                    <button
                      onClick={handleSkip}
                      className="flex-1 py-2 text-xs text-text-secondary hover:text-text-primary rounded-lg transition"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSkip}
                  className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-text-primary transition"
                >
                  Skip for now
                </button>
              )}
            </div>
          )}

          {/* Screen 1 — Location */}
          {screen === 1 && (
            <div className="text-center">
              <h2 className="text-xl font-bold text-text-primary mb-1">
                Where are you located?
              </h2>
              <p className="text-sm text-text-secondary mb-6">
                We'll show prices and specials near you.
              </p>
              <div className="mb-4">
                <input
                  ref={zipInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="Enter zip code"
                  value={zip}
                  onChange={(e) => handleZipChange(e.target.value)}
                  className="w-full text-center text-2xl tracking-widest px-4 py-4 rounded-xl border border-gray-200 focus:border-[#C94F78] focus:ring-2 focus:ring-[#C94F78]/20 outline-none transition"
                />
                {zipError && (
                  <p className="text-sm text-red-500 mt-2">{zipError}</p>
                )}
                {lookingUp && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-text-secondary">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-sm">Looking up...</span>
                  </div>
                )}
                {resolvedCity && !lookingUp && (
                  <p className="text-sm text-text-primary mt-3 font-medium">
                    {resolvedCity}
                  </p>
                )}
              </div>
              <button
                onClick={handleZipSkip}
                className="text-sm text-text-secondary hover:text-text-primary transition"
              >
                I'll add this later
              </button>
            </div>
          )}

          {/* Screen 2 — Interests */}
          {screen === 2 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-1 text-center">
                What are you most curious about?
              </h2>
              <p className="text-sm text-text-secondary mb-6 text-center">
                Select all that interest you.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {INTEREST_OPTIONS.map(({ label }) => {
                  const isActive = selected.includes(label);
                  return (
                    <button
                      key={label}
                      onClick={() => toggleInterest(label)}
                      className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium border transition ${
                        isActive
                          ? 'bg-[#C94F78]/10 border-[#C94F78] text-[#C94F78]'
                          : 'bg-white border-gray-200 text-text-primary hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleInterestsNext}
                disabled={selected.length === 0}
                className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#C94F78' }}
              >
                Continue
              </button>
            </div>
          )}

          {/* Screen 3 — Preferences */}
          {screen === 3 && (
            <OnboardingPreferences
              onNext={handlePreferencesNext}
              onSkip={handlePreferencesSkip}
            />
          )}

          {/* Screen 4 — Mission / Confirmation */}
          {screen === 4 && (
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-rose-light rounded-full mx-auto mb-6">
                <Sparkles size={28} className="text-[#C94F78]" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                You're all set.
              </h2>
              <p className="text-text-secondary mb-8">
                {resolvedCity
                  ? `We'll personalize your experience for ${resolvedCity}.`
                  : 'Start browsing real treatment prices.'}
              </p>

              <div className="space-y-3 mb-8 text-left">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-rose-light rounded-full flex items-center justify-center">
                    <DollarSign size={16} className="text-[#C94F78]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Real prices from real patients</p>
                    <p className="text-xs text-text-secondary">See what people actually pay near you</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-rose-light rounded-full flex items-center justify-center">
                    <ShieldCheck size={16} className="text-[#C94F78]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">100% anonymous</p>
                    <p className="text-xs text-text-secondary">Your submissions are never tied to your name</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-rose-light rounded-full flex items-center justify-center">
                    <Gift size={16} className="text-[#C94F78]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Build your treatment history</p>
                    <p className="text-xs text-text-secondary">Track what you've paid and when</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleBrowse}
                className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition"
                style={{ backgroundColor: '#C94F78' }}
              >
                Browse Prices
              </button>
              <button
                onClick={handleLogTreatment}
                className="w-full mt-3 py-3 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition"
              >
                Log My Treatment
              </button>
            </div>
          )}
        </div>

          {/* Slide animation styles */}
          <style>{`
            @keyframes slide-in-right {
              from { opacity: 0; transform: translateX(24px); }
              to { opacity: 1; transform: translateX(0); }
            }
            @keyframes slide-in-left {
              from { opacity: 0; transform: translateX(-24px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

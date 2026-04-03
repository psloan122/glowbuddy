import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Sparkles, ShieldCheck, Gift, Loader2 } from 'lucide-react';
import { setInterests, setOnboarded } from '../lib/gating';
import { lookupZip } from '../lib/zipLookup';

const INTEREST_OPTIONS = [
  { emoji: '💉', label: 'Botox & Dysport' },
  { emoji: '💋', label: 'Lip Filler' },
  { emoji: '✨', label: 'Cheek & Jawline Filler' },
  { emoji: '🔬', label: 'Microneedling' },
  { emoji: '⚡', label: 'Laser Treatments' },
  { emoji: '💆', label: 'HydraFacial' },
  { emoji: '💪', label: 'Body Contouring' },
  { emoji: '⚖️', label: 'Weight Loss (GLP-1)' },
  { emoji: '🫧', label: 'Chemical Peels' },
  { emoji: '👁️', label: 'Under Eye Filler' },
];

export default function Onboarding({ onComplete }) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(0);
  const [selected, setSelected] = useState([]);
  const [zip, setZip] = useState('');
  const [zipError, setZipError] = useState('');
  const [resolvedCity, setResolvedCity] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  function handleSkip() {
    setOnboarded();
    onComplete();
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
    setScreen(2);
  }

  async function handleZipSubmit(e) {
    e.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setZipError('Enter a valid 5-digit zip code');
      return;
    }
    setZipError('');
    setLookingUp(true);
    const result = await lookupZip(zip);
    setLookingUp(false);
    if (result) {
      setResolvedCity(result.city);
      setScreen(3);
    } else {
      setZipError('Could not find that zip code');
    }
  }

  function handleZipSkip() {
    setScreen(3);
  }

  function handleBrowse() {
    setOnboarded();
    onComplete();
  }

  function handleLogTreatment() {
    setOnboarded();
    onComplete();
    navigate('/log');
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" style={{ backgroundColor: '#FDF6F0' }}>
      <div className="w-full max-w-[480px]">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === screen ? 'bg-[#C94F78]' : 'bg-[#C94F78]/20'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-lg">
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
                onClick={() => setScreen(1)}
                className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition"
                style={{ backgroundColor: '#C94F78' }}
              >
                Get Started
              </button>
              <button
                onClick={handleSkip}
                className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-text-primary transition"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* Screen 1 — Interests */}
          {screen === 1 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-1 text-center">
                What are you most curious about?
              </h2>
              <p className="text-sm text-text-secondary mb-6 text-center">
                Select all that interest you.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {INTEREST_OPTIONS.map(({ emoji, label }) => {
                  const isActive = selected.includes(label);
                  return (
                    <button
                      key={label}
                      onClick={() => toggleInterest(label)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition ${
                        isActive
                          ? 'bg-[#C94F78]/10 border-[#C94F78] text-[#C94F78]'
                          : 'bg-white border-gray-200 text-text-primary hover:border-gray-300'
                      }`}
                    >
                      <span>{emoji}</span>
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

          {/* Screen 2 — Zip Code */}
          {screen === 2 && (
            <div className="text-center">
              <h2 className="text-xl font-bold text-text-primary mb-1">
                Where are you located?
              </h2>
              <p className="text-sm text-text-secondary mb-6">
                We'll show prices and specials near you.
              </p>
              <form onSubmit={handleZipSubmit} className="mb-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="Enter zip code"
                  value={zip}
                  onChange={(e) => {
                    setZip(e.target.value.replace(/\D/g, '').slice(0, 5));
                    setZipError('');
                  }}
                  className="w-full text-center text-2xl tracking-widest px-4 py-4 rounded-xl border border-gray-200 focus:border-[#C94F78] focus:ring-2 focus:ring-[#C94F78]/20 outline-none transition"
                  autoFocus
                />
                {zipError && (
                  <p className="text-sm text-red-500 mt-2">{zipError}</p>
                )}
                <button
                  type="submit"
                  disabled={zip.length < 5 || lookingUp}
                  className="w-full mt-4 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#C94F78' }}
                >
                  {lookingUp ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Looking up...
                    </span>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>
              <button
                onClick={handleZipSkip}
                className="text-sm text-text-secondary hover:text-text-primary transition"
              >
                I'll add this later
              </button>
            </div>
          )}

          {/* Screen 3 — Confirmation */}
          {screen === 3 && (
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
                    <span className="text-sm">💰</span>
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
                    <p className="text-sm font-medium text-text-primary">Monthly giveaway</p>
                    <p className="text-xs text-text-secondary">Every submission enters you to win</p>
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
      </div>
    </div>
  );
}

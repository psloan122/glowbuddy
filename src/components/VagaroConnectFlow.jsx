import { useState, useEffect } from 'react';
import { CheckCircle, ExternalLink, Loader2, AlertTriangle, Unplug } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ConnectionStatusBadge from './ConnectionStatusBadge';

/**
 * Multi-step Vagaro connection wizard for provider dashboard.
 * Steps: 1=Instructions, 2=Input, 3=Validating, 4=Connected
 */
export default function VagaroConnectFlow({ providerId }) {
  const [step, setStep] = useState(1);
  const [integration, setIntegration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [referralCount, setReferralCount] = useState(0);

  // Form
  const [widgetUrl, setWidgetUrl] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [businessId, setBusinessId] = useState('');

  useEffect(() => {
    fetchIntegration();
  }, [providerId]);

  async function fetchIntegration() {
    setLoading(true);
    const { data } = await supabase
      .from('provider_integrations')
      .select('*')
      .eq('provider_id', providerId)
      .maybeSingle();

    if (data && data.connection_status === 'active') {
      setIntegration(data);
      setStep(4);
      // Fetch referral count
      const { count } = await supabase
        .from('booking_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', providerId);
      setReferralCount(count || 0);
    } else if (data) {
      setIntegration(data);
      setWidgetUrl(data.vagaro_widget_url || '');
      setBookingUrl(data.vagaro_booking_url || '');
      setBusinessId(data.vagaro_business_id || '');
    }
    setLoading(false);
  }

  async function handleValidate(e) {
    e.preventDefault();
    setError('');

    if (!bookingUrl) {
      setError('Booking URL is required.');
      return;
    }

    // Basic URL validation
    try {
      new URL(bookingUrl);
      if (widgetUrl) new URL(widgetUrl);
    } catch {
      setError('Please enter a valid URL starting with https://');
      return;
    }

    setStep(3);
    setValidating(true);

    try {
      const res = await supabase.functions.invoke('validate-vagaro-connection', {
        body: {
          provider_id: providerId,
          vagaro_booking_url: bookingUrl,
          vagaro_widget_url: widgetUrl || null,
          vagaro_business_id: businessId || null,
        },
      });

      if (res.error) throw new Error(res.error.message || 'Validation failed');
      const result = res.data;

      if (result.success) {
        await fetchIntegration();
        setStep(4);
      } else {
        setError(result.error || 'Could not verify connection.');
        setStep(2);
      }
    } catch (err) {
      setError(err.message || 'Validation failed. Check the URL and try again.');
      setStep(2);
    }

    setValidating(false);
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect your Vagaro integration? Booking buttons will stop showing.')) return;

    await supabase
      .from('provider_integrations')
      .update({
        connection_status: 'pending',
        vagaro_widget_url: null,
        vagaro_booking_url: null,
        vagaro_business_id: null,
      })
      .eq('provider_id', providerId);

    setIntegration(null);
    setWidgetUrl('');
    setBookingUrl('');
    setBusinessId('');
    setStep(1);
  }

  async function handleToggleWidget(enabled) {
    await supabase
      .from('provider_integrations')
      .update({ widget_embed_enabled: enabled })
      .eq('provider_id', providerId);
    setIntegration(prev => ({ ...prev, widget_embed_enabled: enabled }));
  }

  if (loading) {
    return <div className="py-8 text-center text-text-secondary">Loading integration...</div>;
  }

  return (
    <div>
      {/* Step 1 — Instructions */}
      {step === 1 && (
        <div className="glow-card p-6 max-w-xl">
          <div className="flex items-center gap-3 mb-4">
            <img src="/logos/vagaro.svg" alt="Vagaro" className="h-6" loading="lazy" onError={(e) => e.target.style.display = 'none'} />
            <h2 className="text-lg font-bold text-text-primary">Connect Vagaro</h2>
          </div>
          <p className="text-sm text-text-secondary mb-6">
            Connect your Vagaro account to let patients book directly from your GlowBuddy listing.
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-rose-accent text-white text-xs font-bold flex items-center justify-center">1</span>
              <p className="text-sm text-text-primary">
                Open Vagaro and go to <strong>Settings &rarr; Online Booking &rarr; Widget</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-rose-accent text-white text-xs font-bold flex items-center justify-center">2</span>
              <p className="text-sm text-text-primary">Copy your <strong>Widget URL</strong> and <strong>Booking Page URL</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-rose-accent text-white text-xs font-bold flex items-center justify-center">3</span>
              <p className="text-sm text-text-primary">Paste them below and we'll verify the connection</p>
            </div>
          </div>

          <img
            src="/screenshots/vagaro-widget.png"
            alt="Where to find the Vagaro Widget URL in Settings → Online Booking → Widget"
            className="w-full rounded-xl border border-gray-200 mb-6"
            loading="lazy"
            onError={(e) => e.target.style.display = 'none'}
          />

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-rose-accent text-white font-semibold rounded-xl hover:bg-rose-dark transition"
          >
            I Have My URLs
          </button>
        </div>
      )}

      {/* Step 2 — Input Form */}
      {step === 2 && (
        <form onSubmit={handleValidate} className="glow-card p-6 max-w-xl">
          <h2 className="text-lg font-bold text-text-primary mb-4">Enter Your Vagaro URLs</h2>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm mb-4">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Vagaro Booking Page URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://www.vagaro.com/yourbusiness"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Vagaro Widget URL
              </label>
              <input
                type="url"
                value={widgetUrl}
                onChange={(e) => setWidgetUrl(e.target.value)}
                placeholder="https://www.vagaro.com/Widget/..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
              />
              <p className="text-xs text-text-secondary mt-1">Optional — enables inline booking on your profile</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Vagaro Business ID
              </label>
              <input
                type="text"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="Auto-detected from URL"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
              />
              <p className="text-xs text-text-secondary mt-1">Optional — we'll try to detect this automatically</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-rose-accent text-white font-semibold rounded-xl hover:bg-rose-dark transition"
            >
              Verify Connection
            </button>
          </div>
        </form>
      )}

      {/* Step 3 — Validating */}
      {step === 3 && (
        <div className="glow-card p-8 max-w-xl text-center">
          <Loader2 size={32} className="animate-spin text-rose-accent mx-auto mb-4" />
          <h2 className="text-lg font-bold text-text-primary mb-2">Verifying your Vagaro connection...</h2>
          <p className="text-sm text-text-secondary">This usually takes a few seconds.</p>
        </div>
      )}

      {/* Step 4 — Connected */}
      {step === 4 && integration && (
        <div className="glow-card p-6 max-w-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="/logos/vagaro.svg" alt="Vagaro" className="h-5" loading="lazy" onError={(e) => e.target.style.display = 'none'} />
              <h2 className="text-lg font-bold text-text-primary">Vagaro</h2>
            </div>
            <ConnectionStatusBadge status={integration.connection_status} />
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-text-secondary">Booking URL</span>
              <a
                href={integration.vagaro_booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-rose-accent hover:underline inline-flex items-center gap-1"
              >
                {integration.vagaro_booking_url?.replace('https://www.', '').slice(0, 30)}...
                <ExternalLink size={12} />
              </a>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-text-secondary">Total referrals</span>
              <span className="text-sm font-bold text-text-primary">{referralCount}</span>
            </div>
            {integration.last_verified_at && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-text-secondary">Last verified</span>
                <span className="text-sm text-text-primary">
                  {new Date(integration.last_verified_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Widget toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl mb-6">
            <div>
              <p className="text-sm font-medium text-text-primary">Inline booking widget</p>
              <p className="text-xs text-text-secondary">Show Vagaro booking form directly on your profile</p>
            </div>
            <button
              onClick={() => handleToggleWidget(!integration.widget_embed_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                integration.widget_embed_enabled ? 'bg-rose-accent' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  integration.widget_embed_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex gap-3">
            <a
              href={integration.vagaro_booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 text-center border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition inline-flex items-center justify-center gap-1.5"
            >
              Test Booking
              <ExternalLink size={14} />
            </a>
            <button
              onClick={handleDisconnect}
              className="px-4 py-3 border border-red-200 text-red-500 font-medium rounded-xl hover:bg-red-50 transition inline-flex items-center gap-1.5"
            >
              <Unplug size={14} />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

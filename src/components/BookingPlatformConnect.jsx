import { useState } from 'react';
import { ExternalLink, Check, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PLATFORMS = [
  {
    key: 'mindbody',
    name: 'Mindbody',
    placeholder: 'https://www.mindbodyonline.com/explore/locations/your-studio',
    hint: 'Paste your Mindbody booking page URL',
  },
  {
    key: 'boulevard',
    name: 'Boulevard',
    placeholder: 'https://dashboard.blvd.co/booking/your-studio',
    hint: 'Paste your Boulevard booking link',
  },
  {
    key: 'square',
    name: 'Square Appointments',
    placeholder: 'https://squareup.com/appointments/book/your-business',
    hint: 'Paste your Square Appointments booking link',
  },
  {
    key: 'jane',
    name: 'Jane App',
    placeholder: 'https://yourstudio.janeapp.com',
    hint: 'Paste your Jane App booking page URL',
  },
  {
    key: 'acuity',
    name: 'Acuity Scheduling',
    placeholder: 'https://app.acuityscheduling.com/schedule.php?owner=...',
    hint: 'Paste your Acuity booking page URL',
  },
  {
    key: 'glossgenius',
    name: 'GlossGenius',
    placeholder: 'https://book.glossgenius.com/your-studio',
    hint: 'Paste your GlossGenius booking link',
  },
  {
    key: 'simplepractice',
    name: 'SimplePractice',
    placeholder: 'https://yourstudio.clientsecure.me',
    hint: 'Paste your SimplePractice booking link',
  },
];

export default function BookingPlatformConnect({ provider, setProvider }) {
  const [editing, setEditing] = useState(null);
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const connectedPlatform = provider?.booking_platform || null;
  const connectedUrl = provider?.booking_url || null;

  function startConnect(platform) {
    setEditing(platform.key);
    setUrl(connectedPlatform === platform.key ? connectedUrl || '' : '');
    setError('');
  }

  function cancel() {
    setEditing(null);
    setUrl('');
    setError('');
  }

  async function handleSave(platformKey) {
    setError('');
    const trimmed = url.trim();

    if (!trimmed) {
      setError('Please enter a booking URL.');
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setError('Please enter a valid URL starting with https://');
      return;
    }

    setSaving(true);
    const { data, error: updateError } = await supabase
      .from('providers')
      .update({
        booking_url: trimmed,
        booking_platform: platformKey,
      })
      .eq('id', provider.id)
      .select()
      .single();

    if (updateError) {
      setError(`Could not save. ${updateError.message}`);
    } else if (data) {
      setProvider(data);
      setEditing(null);
      setUrl('');
    }
    setSaving(false);
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect this booking platform? The "Book Now" button will be removed from your profile.')) return;
    setSaving(true);
    const { data } = await supabase
      .from('providers')
      .update({ booking_url: null, booking_platform: null })
      .eq('id', provider.id)
      .select()
      .single();
    if (data) setProvider(data);
    setSaving(false);
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">
        Connect your booking platform
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        Add your booking link so patients can book directly from your profile.
      </p>

      <div className="space-y-3">
        {PLATFORMS.map((platform) => {
          const isConnected = connectedPlatform === platform.key;
          const isEditing = editing === platform.key;

          return (
            <div
              key={platform.key}
              className={`glow-card p-4 transition ${
                isConnected ? 'border-verified/40' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isConnected ? 'bg-verified' : 'bg-gray-300'
                    }`}
                  />
                  <span className="font-medium text-text-primary text-sm">
                    {platform.name}
                  </span>
                  {isConnected && (
                    <span className="text-xs text-verified font-medium inline-flex items-center gap-1">
                      <Check size={12} /> Connected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isConnected && !isEditing && (
                    <>
                      <a
                        href={connectedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-rose-accent hover:text-rose-dark transition inline-flex items-center gap-1"
                      >
                        Test <ExternalLink size={10} />
                      </a>
                      <button
                        onClick={() => startConnect(platform)}
                        className="text-xs text-text-secondary hover:text-text-primary transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDisconnect}
                        disabled={saving}
                        className="text-xs text-red-500 hover:text-red-600 transition"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                  {!isConnected && !isEditing && (
                    <button
                      onClick={() => startConnect(platform)}
                      className="text-xs font-medium text-rose-accent hover:text-rose-dark transition"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {/* URL input form */}
              {isEditing && (
                <div className="mt-3 space-y-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={platform.placeholder}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                  />
                  <p className="text-xs text-text-secondary">{platform.hint}</p>
                  {error && (
                    <p className="text-xs text-red-600">{error}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSave(platform.key)}
                      disabled={saving}
                      className="bg-rose-accent text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-rose-dark transition disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {saving && <Loader2 size={12} className="animate-spin" />}
                      {isConnected ? 'Update' : 'Connect'}
                    </button>
                    <button
                      onClick={cancel}
                      className="text-xs text-text-secondary hover:text-text-primary transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

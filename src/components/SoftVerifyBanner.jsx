import { useState, useContext } from 'react';
import { X } from 'lucide-react';
import { AuthContext } from '../App';
import { isEmailVerified } from '../lib/auth';
import { supabase } from '../lib/supabase';

const DISMISS_KEY = 'verify_banner_dismissed';

export default function SoftVerifyBanner() {
  const { user } = useContext(AuthContext);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === 'true'
  );
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || isEmailVerified(user) || dismissed) return null;

  async function handleResend() {
    if (!user?.email || sending) return;
    setSending(true);
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
    } catch {
      // Rate limit or other error — show sent state regardless
    }
    setSent(true);
    setSending(false);
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  }

  return (
    <div
      className="flex items-center justify-between px-4 sm:px-6 lg:px-8"
      style={{
        background: '#FBE8EF',
        borderBottom: '0.5px solid #F4C0D1',
        padding: '10px 16px',
      }}
    >
      <span className="text-[13px]" style={{ color: '#9B2C5E' }}>
        Please verify your email to unlock all features.
      </span>
      <div className="flex items-center gap-4 shrink-0">
        {sent ? (
          <span className="text-[13px] font-medium" style={{ color: '#0F6E56' }}>
            Sent! Check your inbox.
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="text-[13px] font-medium transition"
            style={{
              background: 'none',
              border: 'none',
              color: sending ? '#9CA3AF' : '#C94F78',
              cursor: sending ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? 'Sending...' : 'Resend email'}
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="text-text-secondary hover:text-text-primary transition"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

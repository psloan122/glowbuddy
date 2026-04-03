import { useState, useEffect, useContext } from 'react';
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
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!user || isEmailVerified(user) || dismissed) return null;

  async function handleResend() {
    if (!user?.email || cooldown > 0) return;
    await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    setSent(true);
    setCooldown(60);
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
        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-[13px] font-medium transition"
          style={{
            background: 'none',
            border: 'none',
            color: cooldown > 0 ? '#9CA3AF' : '#C94F78',
            cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : sent
              ? 'Sent! Resend'
              : 'Resend email'}
        </button>
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

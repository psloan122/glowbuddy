import { useState, useContext } from 'react';
import { X, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { sendVerificationEmail } from '../lib/auth';

export default function VerifyEmailModal({ action = 'do this', onClose, onVerified }) {
  const { user } = useContext(AuthContext);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);

  async function handleResend() {
    if (!user?.email || sending) return;
    setSending(true);
    try {
      await sendVerificationEmail(user.email);
    } catch {
      // Rate limit or other error — show sent state regardless
    }
    setSent(true);
    setSending(false);
  }

  async function handleCheckVerification() {
    setChecking(true);
    setCheckFailed(false);
    try {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (freshUser?.email_confirmed_at) {
        onVerified?.();
        onClose();
      } else {
        setCheckFailed(true);
      }
    } catch {
      setCheckFailed(true);
    }
    setChecking(false);
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl p-8 max-w-[440px] w-full shadow-xl text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex items-center justify-center w-14 h-14 bg-rose-light rounded-full mx-auto mb-5">
          <Mail size={24} className="text-[#C94F78]" />
        </div>

        <h2 className="text-xl font-bold text-text-primary mb-2">
          Verify your email first
        </h2>

        <p className="text-sm text-text-secondary mb-2">
          You need to verify your email before you can {action}.
        </p>

        <p className="text-[13px] text-text-secondary mb-6">
          We sent a verification link to
          <br />
          <span className="font-medium text-text-primary">{user?.email}</span>
        </p>

        {sent && (
          <div
            className="text-[13px] font-medium px-4 py-2 rounded-lg mb-4"
            style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
          >
            Verification email sent! Check your inbox.
          </div>
        )}

        <button
          onClick={handleResend}
          disabled={sending || sent}
          className="w-full py-3 font-semibold rounded-xl transition mb-3 text-sm"
          style={{
            backgroundColor: (sending || sent) ? '#E5E7EB' : '#C94F78',
            color: (sending || sent) ? '#6B7280' : 'white',
            cursor: (sending || sent) ? 'not-allowed' : 'pointer',
          }}
        >
          {sending ? 'Sending...' : sent ? 'Email sent' : 'Resend verification email'}
        </button>

        <button
          onClick={handleCheckVerification}
          disabled={checking}
          className="w-full py-3 font-semibold rounded-xl transition mb-3 text-sm border"
          style={{
            borderColor: '#C94F78',
            color: checking ? '#9CA3AF' : '#C94F78',
            backgroundColor: 'transparent',
            cursor: checking ? 'not-allowed' : 'pointer',
          }}
        >
          {checking ? 'Checking...' : "I've verified — continue"}
        </button>

        {checkFailed && (
          <p className="text-[13px] text-rose-accent mb-3">
            Email not verified yet. Please click the link in your inbox and try again.
          </p>
        )}

        <button
          onClick={onClose}
          className="text-sm text-text-secondary hover:text-text-primary transition"
        >
          I'll do this later
        </button>
      </div>
    </div>
  );
}

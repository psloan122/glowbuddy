import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Check, Circle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function EmailConfirmation({ email, procedureId }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    setResending(true);
    await supabase.auth.signInWithOtp({ email });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 3000);
  }

  return (
    <div className="text-center">
      {/* Envelope icon */}
      <div className="w-16 h-16 rounded-full bg-rose-accent/10 flex items-center justify-center mx-auto mb-5">
        <Mail size={28} className="text-rose-accent" />
      </div>

      <h3 className="text-xl font-bold text-text-primary mb-2">
        Check your inbox!
      </h3>

      <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
        We sent a magic link to{' '}
        <span className="font-medium text-text-primary">{email}</span>.
        Click it to confirm your account and your submission will be live
        shortly.
      </p>

      <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
        Your price won&apos;t appear publicly until your email is confirmed
        — this helps us keep the data trustworthy for everyone.
      </p>

      {/* Checklist */}
      <div className="max-w-xs mx-auto text-left space-y-3 mb-8">
        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-rose-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check size={12} className="text-rose-accent" />
          </div>
          <span className="text-sm text-text-primary">
            Submission saved — waiting for confirmation
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <Circle size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-text-secondary">
            Check <span className="font-medium">{email}</span> for your
            magic link
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <Circle size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-text-secondary">
            Click the link to go live and see your price report
          </span>
        </div>
      </div>

      {/* Resend */}
      <p className="text-xs text-text-secondary mb-2">
        Didn&apos;t get it? Check your spam folder or tap below to resend.
      </p>
      <button
        onClick={handleResend}
        disabled={resending || resent}
        className="text-sm font-medium text-rose-accent hover:text-rose-dark transition-colors disabled:opacity-50"
      >
        {resent ? 'Sent!' : resending ? 'Sending...' : 'Resend magic link'}
      </button>

      {/* Back to browsing */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <Link
          to="/"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Back to browsing
        </Link>
      </div>
    </div>
  );
}

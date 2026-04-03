import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import EmailConfirmation from './EmailConfirmation';

export default function ThankYou({ procedure, user, outlierFlagged }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [skipToast, setSkipToast] = useState(false);

  async function handleCreateAccount(e) {
    e.preventDefault();
    if (!email || sending) return;
    setSending(true);

    // Send magic link
    await supabase.auth.signInWithOtp({ email });

    // Insert giveaway entry
    const month = format(new Date(), 'yyyy-MM');
    await supabase.from('giveaway_entries').insert({
      email,
      procedure_id: procedure.id,
      month,
      user_id: null,
    });

    setSending(false);
    setEmailSent(true);
  }

  function handleSignIn() {
    // Trigger sign in with existing account — use the same OTP flow
    if (!email) return;
    handleCreateAccount({ preventDefault: () => {} });
  }

  function handleSkip() {
    setSkipToast(true);
    setTimeout(() => {
      navigate('/');
    }, 100);
  }

  // If email has been sent, show confirmation
  if (emailSent) {
    return (
      <div className="max-w-lg mx-auto">
        <EmailConfirmation email={email} procedureId={procedure.id} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto text-center">
      {/* Outlier banner */}
      {outlierFlagged && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-6 text-left">
          Thanks! Your submission is under review and will appear shortly.
        </div>
      )}

      {/* Checkmark */}
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#C94F78' }}>
        <Check size={32} className="text-white" />
      </div>

      {/* Headline */}
      <h2 className="text-2xl font-bold text-text-primary mb-2">
        You're officially a GlowBuddy.
      </h2>

      <p className="text-sm text-text-secondary mb-8 max-w-md mx-auto">
        Thank you for helping women know what things actually cost. Your
        submission has been saved.
      </p>

      {/* Divider */}
      <div className="border-t border-gray-100 mb-8" />

      {/* Email capture — only shown when not authenticated */}
      {!user ? (
        <div className="text-left">
          <h3 className="text-lg font-bold text-text-primary mb-2">
            Want to see how you compare?
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            Create a free account to see your price report, earn badges,
            and enter our monthly $250 treatment giveaway.
          </p>

          <form onSubmit={handleCreateAccount} className="space-y-3 mb-4">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full inline-flex items-center justify-center gap-2 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition text-sm disabled:opacity-50"
              style={{ backgroundColor: '#C94F78' }}
            >
              {sending ? 'Sending...' : (
                <>
                  Create My Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="text-center space-y-3">
            <button
              onClick={handleSignIn}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Already have an account?{' '}
              <span className="font-medium text-rose-accent">Sign in</span>
            </button>

            <div>
              <button
                onClick={handleSkip}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                No thanks, just browsing
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Authenticated user — simple confirmation */
        <div>
          <p className="text-sm text-text-secondary mb-6">
            Your price is{' '}
            {outlierFlagged ? 'under review and will be' : 'now'} live.
            Check your{' '}
            <button
              onClick={() => navigate('/my-treatments')}
              className="font-medium text-rose-accent hover:text-rose-dark transition-colors"
            >
              treatment history
            </button>{' '}
            to see your price report and badges.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/my-treatments')}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-white font-semibold rounded-full hover:opacity-90 transition text-sm"
              style={{ backgroundColor: '#C94F78' }}
            >
              View My Treatments
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Back to browsing
            </button>
          </div>
        </div>
      )}

      {/* Skip toast (rendered briefly before navigation) */}
      {skipToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-white rounded-xl shadow-lg border border-gray-100 px-6 py-4 flex items-center gap-3 animate-fade-in">
          <span className="text-lg">✓</span>
          <p className="text-sm text-text-primary">
            Price submitted! It'll appear once our team reviews it.
          </p>
        </div>
      )}
    </div>
  );
}

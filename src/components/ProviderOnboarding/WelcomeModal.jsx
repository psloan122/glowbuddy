import { useState } from 'react';
import { CheckCircle, Copy, Share2, ArrowRight, Star, Sparkles } from 'lucide-react';

export default function WelcomeModal({ provider, menuCount, tier, onDismiss }) {
  const [copied, setCopied] = useState(false);

  const profileUrl = provider?.slug
    ? `${window.location.origin}/provider/${provider.slug}`
    : null;

  function handleCopy() {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare() {
    if (!profileUrl) return;
    if (navigator.share) {
      navigator.share({
        title: `${provider.name} on GlowBuddy`,
        text: `Check out ${provider.name}'s pricing on GlowBuddy`,
        url: profileUrl,
      });
    } else {
      handleCopy();
    }
  }

  const isPro = tier === 'pro_trial' || tier === 'pro';

  return (
    <div className="fixed inset-0 z-50 bg-warm-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-verified/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles size={32} className="text-verified" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            You're all set!
          </h1>
          <p className="text-text-secondary">
            Your practice listing is live on GlowBuddy.
          </p>
        </div>

        {/* Checklist cards */}
        <div className="space-y-3 mb-8 text-left">
          {/* Share profile */}
          <div className="glow-card p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-light flex items-center justify-center flex-shrink-0">
              <Share2 size={16} className="text-rose-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">Share your profile</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Send your GlowBuddy link to patients so they can find your prices.
              </p>
              {profileUrl && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-warm-gray rounded-lg px-3 py-1.5 text-xs text-text-secondary truncate">
                    {profileUrl}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="text-xs font-medium text-rose-accent hover:text-rose-dark transition flex items-center gap-1"
                  >
                    <Copy size={12} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Complete menu */}
          <div className="glow-card p-4 flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              menuCount > 0 ? 'bg-verified/10' : 'bg-rose-light'
            }`}>
              {menuCount > 0 ? (
                <CheckCircle size={16} className="text-verified" />
              ) : (
                <Star size={16} className="text-rose-accent" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {menuCount > 0 ? `${menuCount} price${menuCount !== 1 ? 's' : ''} listed` : 'Add your price menu'}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {menuCount > 0
                  ? 'You can edit or add more from your dashboard.'
                  : 'Practices with listed prices get more profile views.'}
              </p>
            </div>
          </div>

          {/* Post special (Pro) */}
          {isPro && (
            <div className="glow-card p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-light flex items-center justify-center flex-shrink-0">
                <Star size={16} className="text-rose-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">Post your first special</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Create a deal to reach patients searching near your zip code.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onDismiss}
            className="w-full bg-rose-accent text-white py-3 rounded-full font-semibold hover:bg-rose-dark transition flex items-center justify-center gap-2"
          >
            Go to your dashboard <ArrowRight size={18} />
          </button>
          {profileUrl && (
            <button
              onClick={handleShare}
              className="w-full border border-gray-200 text-text-primary py-3 rounded-full font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <Share2 size={16} /> Share your profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

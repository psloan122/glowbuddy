import { Turnstile } from '@marsidev/react-turnstile';

const INPUT_CLASSES =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export default function Step3({ formData, setFormData, honeypot, setHoneypot, onTurnstileSuccess }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-1">
        Anything else?
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Optional details to help the community.
      </p>

      <div className="space-y-5">
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Notes
          </label>
          <textarea
            placeholder="How was the experience? Tips for others?"
            rows={4}
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            className={`${INPUT_CLASSES} resize-none`}
          />
        </div>

        {/* Anonymous toggle */}
        <div className="flex items-center justify-between">
          <label
            htmlFor="anonymous-toggle"
            className="text-sm font-medium text-text-primary"
          >
            Submit anonymously
          </label>
          <button
            id="anonymous-toggle"
            type="button"
            role="switch"
            aria-checked={formData.anonymous}
            onClick={() =>
              setFormData((prev) => ({ ...prev, anonymous: !prev.anonymous }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.anonymous ? 'bg-rose-accent' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                formData.anonymous ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Giveaway email */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Enter email to be entered in our monthly $250 treatment giveaway
          </label>
          <input
            type="email"
            placeholder="your@email.com (optional)"
            value={formData.giveawayEmail}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                giveawayEmail: e.target.value,
              }))
            }
            className={INPUT_CLASSES}
          />
          <p className="text-xs text-text-secondary mt-1.5">
            Optional. We only use this for the giveaway drawing.
          </p>
        </div>

        {/* Honeypot — hidden from real users, bots fill it */}
        <input
          type="text"
          name="hp_field"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ display: 'none' }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        {/* Cloudflare Turnstile — only renders if site key is configured */}
        {TURNSTILE_KEY && (
          <div className="flex justify-center pt-2">
            <Turnstile
              siteKey={TURNSTILE_KEY}
              onSuccess={onTurnstileSuccess}
              options={{ theme: 'light', size: 'normal' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

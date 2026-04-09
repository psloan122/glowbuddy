export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
      <p className="text-sm text-text-secondary mb-8">Last updated: April 5, 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-text-primary">
        <section>
          <h2 className="text-xl font-bold mb-3">What We Collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-text-secondary">
            <li><strong>Email address</strong> — required to create your account.</li>
            <li><strong>City and ZIP code</strong> — used to show you local pricing data.</li>
            <li><strong>Cosmetic procedure types and prices</strong> — voluntarily submitted by you to build the crowdsourced price index.</li>
            <li><strong>Before/after photos</strong> — voluntarily uploaded by you or your provider.</li>
            <li><strong>Receipts</strong> — voluntarily uploaded for verification; parsed by AI and stored securely.</li>
            <li><strong>Device information and IP address</strong> — hashed and used only for fraud prevention. We do not track you across sites.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">How We Use It</h2>
          <ul className="list-disc pl-5 space-y-1 text-text-secondary">
            <li>Display crowdsourced price data to help people make informed decisions.</li>
            <li>Send price alerts you request.</li>
            <li>Send the monthly Glow Report email (opt-out available in Settings).</li>
            <li>Fraud and spam prevention — detecting fake submissions and duplicate accounts.</li>
            <li>Improve Know Before You Glow through aggregate, anonymized usage patterns.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Who We Share It With</h2>
          <p className="text-text-secondary mb-2">We use the following services to operate Know Before You Glow:</p>
          <ul className="list-disc pl-5 space-y-1 text-text-secondary">
            <li><strong>Supabase</strong> — database hosting and authentication.</li>
            <li><strong>Stripe</strong> — payment processing for provider placements.</li>
            <li><strong>Resend</strong> — transactional email delivery.</li>
            <li><strong>Google</strong> — Maps and Places API for location search.</li>
            <li><strong>Anthropic (Claude)</strong> — AI receipt parsing.</li>
            <li><strong>Cloudflare</strong> — bot protection via Turnstile.</li>
          </ul>
          <p className="text-text-secondary mt-3 font-medium">We do not sell your personal data. Ever.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Your Rights</h2>
          <ul className="list-disc pl-5 space-y-1 text-text-secondary">
            <li><strong>Access your data</strong> — email privacy@knowbeforeyouglow.com and we will provide a copy of your data within 30 days.</li>
            <li><strong>Delete your account and data</strong> — go to Settings and click "Delete Account." Your submissions will be anonymized (prices remain for community benefit, but your identity is permanently removed).</li>
            <li><strong>Opt out of marketing emails</strong> — use the unsubscribe link in every email, or manage preferences in Settings.</li>
            <li><strong>California residents (CCPA)</strong> — you have the right to know what data we collect, request deletion, and opt out of any sale of personal information. We do not sell personal information.</li>
          </ul>
        </section>

        <section id="ccpa">
          <h2 className="text-xl font-bold mb-3">Do Not Sell My Personal Information</h2>
          <p className="text-text-secondary">
            Know Before You Glow does not sell, rent, or trade your personal information to third parties for monetary consideration. If you have questions about this policy, contact us at privacy@knowbeforeyouglow.com.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Data Retention</h2>
          <p className="text-text-secondary">
            Account data is kept until you delete your account. When you delete your account, all personal data is purged within 30 days. Anonymized price submissions remain in the database to preserve the integrity of the crowdsourced price index.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Cookies</h2>
          <p className="text-text-secondary">
            We use essential cookies only — for authentication (Supabase session) and bot protection (Cloudflare Turnstile). We do not use advertising or tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Contact</h2>
          <p className="text-text-secondary">
            For privacy questions or data requests: <a href="mailto:privacy@knowbeforeyouglow.com" className="text-rose-accent hover:text-rose-dark transition">privacy@knowbeforeyouglow.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}

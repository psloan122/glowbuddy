import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-12 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-10 pb-28 md:pb-10">
        {/* Three columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Column 1 — Brand */}
          <div>
            <p className="text-base font-bold text-text-primary mb-1">GlowBuddy</p>
            <p className="text-sm italic text-text-secondary mb-3">Know before you glow.</p>
            <p className="text-xs text-text-secondary">&copy; {new Date().getFullYear()} GlowBuddy LLC</p>
          </div>

          {/* Column 2 — Product */}
          <div>
            <p className="text-xs font-semibold text-text-primary uppercase tracking-wide mb-3">Product</p>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-text-secondary hover:text-rose-accent transition">Browse Prices</Link></li>
              <li><Link to="/prices" className="text-sm text-text-secondary hover:text-rose-accent transition">City Reports</Link></li>
              <li><Link to="/map" className="text-sm text-text-secondary hover:text-rose-accent transition">Map View</Link></li>
              <li><Link to="/business" className="text-sm text-text-secondary hover:text-rose-accent transition">For Providers</Link></li>
            </ul>
          </div>

          {/* Column 3 — Legal / Trust */}
          <div>
            <p className="text-xs font-semibold text-text-primary uppercase tracking-wide mb-3">Legal</p>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="text-sm text-text-secondary hover:text-rose-accent transition">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-text-secondary hover:text-rose-accent transition">Terms of Service</Link></li>
              <li><Link to="/privacy#ccpa" className="text-sm text-text-secondary hover:text-rose-accent transition">Do Not Sell My Information</Link></li>
              <li><a href="mailto:hello@glowbuddy.com" className="text-sm text-text-secondary hover:text-rose-accent transition">Contact Us</a></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-gray-100 pt-6">
          <p className="text-[11px] leading-relaxed" style={{ color: '#9CA3AF' }}>
            Prices on GlowBuddy are community-reported and may not reflect current provider pricing. Always confirm prices directly with your provider.
          </p>
        </div>
      </div>
    </footer>
  );
}

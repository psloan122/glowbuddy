import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-ink mt-16" style={{ borderTop: '2px solid #E8347A' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-28 md:pb-12">
        {/* Three columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">
          {/* Column 1 — Brand */}
          <div>
            <p
              className="font-display text-white leading-none mb-2"
              style={{ fontWeight: 900, fontSize: '28px' }}
            >
              GlowBuddy
            </p>
            <p
              className="font-display italic text-hot-pink mb-4"
              style={{ fontSize: '15px' }}
            >
              Know before you glow.
            </p>
            <p
              className="text-[10px] font-semibold uppercase"
              style={{ letterSpacing: '0.10em', color: '#666' }}
            >
              &copy; {new Date().getFullYear()} GlowBuddy LLC
            </p>
          </div>

          {/* Column 2 — Product */}
          <div>
            <p
              className="text-[10px] font-semibold uppercase text-hot-pink mb-4"
              style={{ letterSpacing: '0.18em' }}
            >
              Product
            </p>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/browse"
                  className="text-[13px] font-light hover:text-hot-pink transition-colors"
                  style={{ color: '#bbb' }}
                >
                  Find Prices
                </Link>
              </li>
              <li>
                <Link
                  to="/prices"
                  className="text-[13px] font-light hover:text-hot-pink transition-colors"
                  style={{ color: '#bbb' }}
                >
                  City Reports
                </Link>
              </li>
              <li>
                <Link
                  to="/map"
                  className="text-[13px] font-light hover:text-hot-pink transition-colors"
                  style={{ color: '#bbb' }}
                >
                  Map View
                </Link>
              </li>
              <li>
                <Link
                  to="/business"
                  className="text-[13px] font-light hover:text-hot-pink transition-colors"
                  style={{ color: '#bbb' }}
                >
                  For Providers
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 — Legal / Trust */}
          <div>
            <p
              className="text-[10px] font-semibold uppercase text-hot-pink mb-4"
              style={{ letterSpacing: '0.18em' }}
            >
              Legal
            </p>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/privacy"
                  className="text-[13px] font-light hover:text-hot-pink transition-colors"
                  style={{ color: '#bbb' }}
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-[13px] font-light hover:text-hot-pink transition-colors"
                  style={{ color: '#bbb' }}
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy#ccpa"
                  className="text-[13px] font-light hover:text-hot-pink transition-colors"
                  style={{ color: '#bbb' }}
                >
                  Do Not Sell My Information
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@glowbuddy.com"
                  className="text-[13px] font-light hover:text-hot-pink transition-colors"
                  style={{ color: '#bbb' }}
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="pt-6" style={{ borderTop: '1px solid #333' }}>
          <p className="text-[11px] leading-relaxed font-light" style={{ color: '#888' }}>
            Prices on GlowBuddy are community-reported and may not reflect current provider
            pricing. Always confirm prices directly with your provider.
          </p>
        </div>
      </div>
    </footer>
  );
}

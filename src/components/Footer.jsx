import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-16">
      {/* Main warm-ink footer body — only allowed dark surface in the app */}
      <div style={{ background: '#1C1410', borderTop: '3px solid #E8347A' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
              <li>
                <Link
                  to="/audit"
                  className="text-[12px] font-light hover:text-hot-pink transition-colors"
                  style={{ color: '#B8A89A' }}
                >
                  Product audit &rarr;
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/waitlist"
                  className="text-[12px] font-light hover:text-hot-pink transition-colors"
                  style={{ color: '#B8A89A' }}
                >
                  Waitlist &rarr;
                </Link>
              </li>
            </ul>
          </div>
        </div>

      </div>
      </div>

      {/* Hot-pink disclaimer bar — sits below the dark footer body.
          Extra bottom padding on mobile clears the fixed bottom nav. */}
      <div
        className="pb-16 md:pb-0"
        style={{
          background: '#E8347A',
          color: 'white',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        <p
          className="text-center"
          style={{
            padding: '12px 24px',
            fontSize: '12px',
            fontWeight: 400,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          <Link
            to="/glow-fund"
            className="footer-glow-fund-link"
            style={{
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            5% of profits fund The Glow Fund
          </Link>
          {' · '}
          Prices are sourced from provider websites and patient submissions. Always confirm pricing before booking.
        </p>
        <style>{`
          .footer-glow-fund-link:hover { text-decoration: underline; }
        `}</style>
      </div>
    </footer>
  );
}

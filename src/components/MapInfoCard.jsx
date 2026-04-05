import { Link } from 'react-router-dom';
import { providerProfileUrl } from '../lib/slugify';

// Inline styles only — Google Maps InfoWindow strips className/Tailwind
const styles = {
  container: {
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: '4px',
    minWidth: 200,
    maxWidth: 260,
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1A1A2E',
    marginBottom: 2,
    lineHeight: 1.3,
  },
  location: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1A1A2E',
  },
  count: {
    fontSize: 13,
    color: '#6B7280',
  },
  link: {
    display: 'inline-block',
    fontSize: 13,
    fontWeight: 500,
    color: '#F4A7B9',
    textDecoration: 'none',
  },
};

export default function MapInfoCard({ provider }) {
  const {
    provider_name,
    provider_slug,
    city,
    state,
    avg_price,
    submission_count,
    has_submissions,
    provider_type,
    google_rating,
    google_review_count,
  } = provider;

  const profileUrl = providerProfileUrl(provider_slug, provider_name, city, state);

  return (
    <div style={styles.container}>
      <div style={styles.name}>{provider_name}</div>
      {(city || state) && (
        <div style={styles.location}>
          {[city, state].filter(Boolean).join(', ')}
        </div>
      )}

      {has_submissions ? (
        <>
          <div style={styles.statsRow}>
            {avg_price > 0 && (
              <span style={styles.price}>${avg_price} avg</span>
            )}
            <span style={styles.count}>
              {submission_count} {submission_count === 1 ? 'price' : 'prices'}
            </span>
          </div>
          {provider_type && (
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
              {provider_type}
            </div>
          )}
          {profileUrl ? (
            <Link to={profileUrl} style={styles.link}>
              View Profile →
            </Link>
          ) : (
            <Link to="/log" style={styles.link}>
              Log a Treatment →
            </Link>
          )}
        </>
      ) : (
        <>
          {google_rating && (
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#F59E0B' }}>★</span>
              <span style={{ fontWeight: 500, color: '#1A1A2E' }}>{Number(google_rating).toFixed(1)}</span>
              {google_review_count && (
                <span>· {google_review_count} Google reviews</span>
              )}
            </div>
          )}
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8, lineHeight: 1.4 }}>
            No prices logged yet.{city ? ` Be the first in ${city} to share what you paid.` : ' Be the first to share what you paid.'}
          </div>
          <Link to="/log" style={{ ...styles.link, color: '#C94F78', fontWeight: 600 }}>
            Log a Price →
          </Link>
        </>
      )}
    </div>
  );
}

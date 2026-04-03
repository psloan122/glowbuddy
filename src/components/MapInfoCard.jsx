import { Link } from 'react-router-dom';

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
    provider_type,
  } = provider;

  return (
    <div style={styles.container}>
      <div style={styles.name}>{provider_name}</div>
      {(city || state) && (
        <div style={styles.location}>
          {[city, state].filter(Boolean).join(', ')}
        </div>
      )}
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
      {provider_slug ? (
        <Link to={`/provider/${provider_slug}`} style={styles.link}>
          View Profile →
        </Link>
      ) : (
        <Link to="/log" style={styles.link}>
          Log a Treatment →
        </Link>
      )}
    </div>
  );
}

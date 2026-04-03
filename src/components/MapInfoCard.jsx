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
  ratingWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  star: {
    color: '#FDB71A',
    fontSize: 13,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1A1A2E',
  },
  reviewCount: {
    fontSize: 12,
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
  const { name, city, state, slug, avgPrice, avg_rating, review_count } = provider;

  return (
    <div style={styles.container}>
      <div style={styles.name}>{name}</div>
      {(city || state) && (
        <div style={styles.location}>
          {[city, state].filter(Boolean).join(', ')}
        </div>
      )}
      <div style={styles.statsRow}>
        {avgPrice != null && (
          <span style={styles.price}>${Math.round(avgPrice)}</span>
        )}
        {avg_rating > 0 && (
          <span style={styles.ratingWrap}>
            <span style={styles.star}>★</span>
            <span style={styles.ratingText}>{avg_rating.toFixed(1)}</span>
            {review_count > 0 && (
              <span style={styles.reviewCount}>({review_count})</span>
            )}
          </span>
        )}
      </div>
      <Link to={`/provider/${slug}`} style={styles.link}>
        View Profile →
      </Link>
    </div>
  );
}

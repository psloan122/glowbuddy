export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FBF9F7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: '#E8347A',
          marginBottom: '16px',
        }}
      >
        404
      </div>
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '48px',
          fontWeight: 900,
          color: '#111',
          marginBottom: '16px',
          lineHeight: 1,
        }}
      >
        Page not found.
      </h1>
      <p
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 300,
          fontSize: '16px',
          color: '#888',
          maxWidth: '380px',
          lineHeight: 1.6,
          marginBottom: '32px',
        }}
      >
        This page doesn't exist or may have moved. Try searching for prices in your city.
      </p>
      <a
        href="/browse"
        style={{
          background: '#E8347A',
          color: 'white',
          padding: '12px 32px',
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          borderRadius: '2px',
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Find Prices
      </a>
    </div>
  );
}

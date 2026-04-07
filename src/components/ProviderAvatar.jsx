/*
 * ProviderAvatar — editorial brand variant.
 *
 * Solid hot-pink (#E8347A) circle with white initials. No gradients,
 * no per-name color hashing — every provider renders identically.
 * Sized via the `size` prop; font-weight is always 700 and font-size
 * scales proportionally.
 */

const HOT_PINK = '#E8347A';

function getInitials(name) {
  if (!name) return '';
  const words = name.replace(/^(Dr\.?|Prof\.?)\s+/i, '').trim().split(/\s+/);
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Spec sizing curve:
//   24px → 8px font · 44px → 14px · 72px → 24px
// All other sizes interpolate at ~size * 0.33 (clamped to 8 minimum).
function getFontSize(size) {
  return Math.max(8, Math.round(size * 0.33));
}

export default function ProviderAvatar({ name, size = 40 }) {
  if (!name) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9CA3AF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
    );
  }

  const initials = getInitials(name);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: HOT_PINK,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#ffffff',
        fontWeight: 700,
        fontSize: getFontSize(size),
        lineHeight: 1,
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

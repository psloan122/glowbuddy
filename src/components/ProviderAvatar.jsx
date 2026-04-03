const GRADIENT_PAIRS = [
  ['#F4A7B9', '#E8818F'], // rose
  ['#F7B7A3', '#E8937A'], // coral
  ['#C9B8E8', '#A78BCA'], // lavender
  ['#A8D5BA', '#7FBF96'], // sage
  ['#F8C9A0', '#E8A870'], // peach
  ['#A0C4E8', '#78A8D4'], // sky
  ['#D4A0C8', '#BC78A8'], // mauve
  ['#E8D4A0', '#D4BC78'], // gold
];

function hashName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getInitials(name) {
  if (!name) return '';
  const words = name.replace(/^(Dr\.?|Prof\.?)\s+/i, '').trim().split(/\s+/);
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
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

  const hash = hashName(name);
  const [color1, color2] = GRADIENT_PAIRS[hash % GRADIENT_PAIRS.length];
  const initials = getInitials(name);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color1}, ${color2})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: 'white',
        fontWeight: 600,
        fontSize: size * 0.4,
        lineHeight: 1,
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

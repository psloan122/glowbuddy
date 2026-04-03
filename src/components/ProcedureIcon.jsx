const ICONS = {
  syringe: (
    <path d="M9 2l1.5 1.5L14 7l3.5 3.5L19 12l-1 1-2-2-8 8-3-3 8-8-2-2-1 1-1.5-1.5L9 4V2z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  lips: (
    <path d="M12 19c-4 0-7-2.5-7-5 0-1.5 1-3 2.5-3.5C8.5 10 10 8 12 7c2 1 3.5 3 4.5 3.5C18 11 19 12.5 19 14c0 2.5-3 5-7 5z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  face: (
    <path d="M12 2a9 9 0 0 1 6 15.5V20a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-2.5A9 9 0 0 1 12 2zm-3 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  eye: (
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  needleGrid: (
    <>
      <circle cx="6" cy="6" r="1" fill="currentColor" />
      <circle cx="12" cy="6" r="1" fill="currentColor" />
      <circle cx="18" cy="6" r="1" fill="currentColor" />
      <circle cx="6" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="18" cy="12" r="1" fill="currentColor" />
      <circle cx="6" cy="18" r="1" fill="currentColor" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
      <circle cx="18" cy="18" r="1" fill="currentColor" />
    </>
  ),
  zap: (
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  dropletFace: (
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  body: (
    <path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-4 8c0-1 .5-2 2-2h4c1.5 0 2 1 2 2v4l2 6h-3l-1.5-5h-3L9 20H6l2-6v-4z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  scale: (
    <path d="M8 21h8m-4-4v4M5 5l7-3 7 3M5 5v3a7 7 0 0 0 3.5 6M19 5v3a7 7 0 0 1-3.5 6" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  layers: (
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  drop: (
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  sparkle: (
    <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3zM5 3l.5 2L7 5.5 5.5 6 5 8l-.5-2L3 5.5 4.5 5 5 3zM19 17l.5 2 1.5.5-1.5.5-.5 2-.5-2L17 19.5l1.5-.5.5-2z" strokeWidth="1" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

const KEYWORD_MAP = [
  { keywords: ['botox', 'dysport', 'xeomin', 'neurotoxin'], icon: 'syringe' },
  { keywords: ['lip filler'], icon: 'lips' },
  { keywords: ['cheek', 'jawline', 'chin filler', 'nasolabial'], icon: 'face' },
  { keywords: ['under eye', 'tear trough'], icon: 'eye' },
  { keywords: ['microneedling'], icon: 'needleGrid' },
  { keywords: ['laser'], icon: 'zap' },
  { keywords: ['hydrafacial', 'facial'], icon: 'dropletFace' },
  { keywords: ['body contouring', 'coolsculpting'], icon: 'body' },
  { keywords: ['weight loss', 'glp', 'semaglutide', 'ozempic', 'tirzepatide'], icon: 'scale' },
  { keywords: ['chemical peel'], icon: 'layers' },
  { keywords: ['prp', 'vampire'], icon: 'drop' },
];

function getIconKey(type) {
  if (!type) return 'sparkle';
  const lower = type.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.icon;
    }
  }
  return 'sparkle';
}

export default function ProcedureIcon({ type, size = 24, className = '' }) {
  const iconKey = getIconKey(type);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      {ICONS[iconKey]}
    </svg>
  );
}

/**
 * Scattered aesthetic medicine illustration pattern for the hero background.
 * Thin-stroke SVG icons at low opacity, creating a soft watercolor-style backdrop.
 */

// Icon path data, each centered at (0,0)
const ICONS = {
  syringe:
    'M0,-18 L0,-13 M-4,-13 L4,-13 M-3,-13 L-3,8 L3,8 L3,-13 M-6,-9 L-3,-9 M3,-9 L6,-9 M0,8 L0,16',
  lips:
    'M-16,1 C-12,-7 -4,-9 0,-4 C4,-9 12,-7 16,1 M-16,1 C-12,7 -4,10 0,6 C4,10 12,7 16,1',
  sparkle:
    'M0,-10 C1,-1 1,-1 10,0 C1,1 1,1 0,10 C-1,1 -1,1 -10,0 C-1,-1 -1,-1 0,-10 Z',
  droplet:
    'M0,-10 C6,-3 7,4 0,10 C-7,4 -6,-3 0,-10 Z',
  face:
    'M0,-14 C3,-14 5,-10 5,-7 C5,-4 2,-2 3,0 C4,1 3,3 2,5 C1,7 -1,10 -2,14',
  flower:
    'M0,-10 C4,-7 4,-3 0,0 C-4,-3 -4,-7 0,-10 Z M9,-3 C7,1 3,3 0,0 C2,-4 6,-6 9,-3 Z M6,8 C3,7 1,3 0,0 C3,2 6,5 6,8 Z M-6,8 C-6,5 -3,2 0,0 C-1,3 -3,7 -6,8 Z M-9,-3 C-6,-6 -2,-4 0,0 C-3,1 -7,1 -9,-3 Z',
  diamond:
    'M-7,-6 L7,-6 L0,10 Z M-3,0 L3,0',
  cross:
    'M0,-7 L0,7 M-7,0 L7,0',
};

// prettier-ignore
const PLACEMENTS = [
  // LEFT ZONE — sparse for text readability
  { t: 'sparkle',  x: 80,   y: 60,   s: 0.65, r: 15,  o: 0.14 },
  { t: 'cross',    x: 180,  y: 400,  s: 1.0,  r: 0,   o: 0.12 },
  { t: 'droplet',  x: 320,  y: 120,  s: 0.65, r: -15, o: 0.16, fl: true, dl: 0 },
  { t: 'syringe',  x: 120,  y: 280,  s: 0.65, r: 30,  o: 0.14 },
  { t: 'sparkle',  x: 400,  y: 320,  s: 1.0,  r: -30, o: 0.12 },
  { t: 'flower',   x: 60,   y: 440,  s: 0.65, r: 45,  o: 0.14, fl: true, dl: 0.5 },
  { t: 'diamond',  x: 350,  y: 80,   s: 0.65, r: -45, o: 0.16 },
  { t: 'sparkle',  x: 240,  y: 200,  s: 0.65, r: 0,   o: 0.12 },
  { t: 'lips',     x: 440,  y: 460,  s: 0.65, r: 15,  o: 0.14, fl: true, dl: 1.0 },
  { t: 'cross',    x: 160,  y: 100,  s: 0.65, r: 45,  o: 0.14 },

  // MIDDLE ZONE
  { t: 'syringe',  x: 500,  y: 80,   s: 1.0,  r: -15, o: 0.12 },
  { t: 'lips',     x: 620,  y: 340,  s: 1.4,  r: 0,   o: 0.10, fl: true, dl: 1.5 },
  { t: 'sparkle',  x: 700,  y: 120,  s: 1.0,  r: 30,  o: 0.14 },
  { t: 'face',     x: 560,  y: 440,  s: 1.0,  r: 0,   o: 0.12, dOnly: true },
  { t: 'droplet',  x: 780,  y: 260,  s: 1.0,  r: -30, o: 0.14, fl: true, dl: 2.0 },
  { t: 'flower',   x: 850,  y: 80,   s: 1.0,  r: 15,  o: 0.12, dOnly: true },
  { t: 'diamond',  x: 480,  y: 240,  s: 1.0,  r: -60, o: 0.14 },
  { t: 'sparkle',  x: 920,  y: 380,  s: 0.65, r: 45,  o: 0.16, fl: true, dl: 2.5, dOnly: true },
  { t: 'cross',    x: 640,  y: 180,  s: 0.65, r: 0,   o: 0.14, dOnly: true },
  { t: 'syringe',  x: 760,  y: 440,  s: 0.65, r: 60,  o: 0.14, dOnly: true },
  { t: 'sparkle',  x: 540,  y: 160,  s: 1.4,  r: -15, o: 0.10, fl: true, dl: 3.0 },
  { t: 'flower',   x: 680,  y: 460,  s: 0.65, r: -30, o: 0.16, dOnly: true },
  { t: 'droplet',  x: 880,  y: 200,  s: 0.65, r: 15,  o: 0.16, dOnly: true },
  { t: 'lips',     x: 460,  y: 380,  s: 0.65, r: 30,  o: 0.14, dOnly: true },

  // RIGHT ZONE — dense (where phone was)
  { t: 'syringe',  x: 960,  y: 60,   s: 1.4,  r: -30, o: 0.10, fl: true, dl: 3.5 },
  { t: 'lips',     x: 1080, y: 180,  s: 1.4,  r: 15,  o: 0.10 },
  { t: 'sparkle',  x: 1200, y: 320,  s: 1.4,  r: 0,   o: 0.10, fl: true, dl: 4.0 },
  { t: 'face',     x: 1300, y: 100,  s: 1.4,  r: -15, o: 0.10, dOnly: true },
  { t: 'diamond',  x: 980,  y: 280,  s: 1.4,  r: 45,  o: 0.10, fl: true, dl: 4.5, dOnly: true },
  { t: 'flower',   x: 1140, y: 440,  s: 1.4,  r: -45, o: 0.10, dOnly: true },
  { t: 'droplet',  x: 1260, y: 60,   s: 1.0,  r: 30,  o: 0.12, dOnly: true },
  { t: 'cross',    x: 1040, y: 380,  s: 1.0,  r: -60, o: 0.14, fl: true, dl: 5.0 },
  { t: 'syringe',  x: 1180, y: 260,  s: 1.0,  r: 0,   o: 0.12, dOnly: true },
  { t: 'sparkle',  x: 1340, y: 200,  s: 1.0,  r: 60,  o: 0.14, dOnly: true },
  { t: 'lips',     x: 980,  y: 440,  s: 1.0,  r: -15, o: 0.12, dOnly: true },
  { t: 'sparkle',  x: 1100, y: 100,  s: 0.65, r: 30,  o: 0.16, fl: true, dl: 5.5 },
  { t: 'cross',    x: 1240, y: 420,  s: 0.65, r: 0,   o: 0.16, dOnly: true },
  { t: 'droplet',  x: 1340, y: 340,  s: 0.65, r: -30, o: 0.16, dOnly: true },
  { t: 'syringe',  x: 1060, y: 160,  s: 0.65, r: 45,  o: 0.16, dOnly: true },
  { t: 'sparkle',  x: 1160, y: 360,  s: 0.65, r: -45, o: 0.16 },
  { t: 'flower',   x: 1300, y: 460,  s: 0.65, r: 15,  o: 0.14, fl: true, dl: 6.0, dOnly: true },
  { t: 'face',     x: 1020, y: 60,   s: 1.0,  r: 0,   o: 0.12, dOnly: true },
  { t: 'diamond',  x: 1260, y: 180,  s: 0.65, r: -15, o: 0.16, dOnly: true },
  { t: 'cross',    x: 1380, y: 440,  s: 0.65, r: 30,  o: 0.16, dOnly: true },
];

export default function HeroPattern() {
  return (
    <svg
      className="hero-pattern"
      viewBox="0 0 1400 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {PLACEMENTS.map((p, i) => {
        const icon = (
          <g
            transform={`translate(${p.x},${p.y}) rotate(${p.r}) scale(${p.s})`}
            opacity={p.o}
          >
            <path
              d={ICONS[p.t]}
              fill="none"
              stroke="#C94F78"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );

        const className = [
          p.dOnly ? 'hero-icon-desktop' : '',
          p.fl ? 'hero-icon-float' : '',
        ].filter(Boolean).join(' ') || undefined;

        if (p.fl) {
          return (
            <g
              key={i}
              className={className}
              style={{ '--float-delay': `${p.dl}s` }}
            >
              {icon}
            </g>
          );
        }

        return (
          <g key={i} className={className}>
            {icon}
          </g>
        );
      })}
    </svg>
  );
}

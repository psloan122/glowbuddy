/**
 * Illustrated backdrop pattern for the hero section.
 * Icons placed in intentional clusters — dense on right, sparse on left.
 * Three size tiers with counterintuitive opacity (small = more visible).
 */

const ICONS = {
  syringe:
    'M-16,-3 L-13,-3 L-13,-5 L-11,-5 L-11,5 L-13,5 L-13,3 L-16,3 Z M-11,0 L-8,0 M-8,-5 Q-8,-6.5 -6,-6.5 L6,-6.5 Q8,-6.5 8,-5 L8,5 Q8,6.5 6,6.5 L-6,6.5 Q-8,6.5 -8,5 Z M8,0 L15,0 M-2,-6.5 L-2,-4.5 M3,-6.5 L3,-4.5',
  lips:
    'M-14,0 C-10,-7 -5,-9 0,-4 C5,-9 10,-7 14,0 M-14,0 C-10,8 10,8 14,0 M0,-4 L0,0',
  sparkle:
    'M0,-10 L1.8,-1.8 L10,0 L1.8,1.8 L0,10 L-1.8,1.8 L-10,0 L-1.8,-1.8 Z',
  droplet:
    'M0,-10 C0,-10 -7,0 -7,4 C-7,8.5 -3.8,11 0,11 C3.8,11 7,8.5 7,4 C7,0 0,-10 0,-10 Z M-2.5,5 C-3,3.5 -2,2.5 -1,3.5',
  diamond:
    'M-5,-5 L5,-5 L9,0 L0,10 L-9,0 Z M-5,-5 L0,3 L5,-5 M-9,0 L9,0',
  cross:
    'M-2,-7 Q-2,-7.5 -1.5,-7.5 L1.5,-7.5 Q2,-7.5 2,-7 L2,-2 L7,-2 Q7.5,-2 7.5,-1.5 L7.5,1.5 Q7.5,2 7,2 L2,2 L2,7 Q2,7.5 1.5,7.5 L-1.5,7.5 Q-2,7.5 -2,7 L-2,2 L-7,2 Q-7.5,2 -7.5,1.5 L-7.5,-1.5 Q-7.5,-2 -7,2 L-2,-2 Z',
  flower:
    'M0,-11 C3,-7 3,-3 0,0 C-3,-3 -3,-7 0,-11 M10.5,-3.4 C7,-0.5 3.5,0.5 0,0 C2,-3.5 6.5,-6.5 10.5,-3.4 M6.5,8.9 C3,7.5 1,4 0,0 C3.5,1 6.5,4.5 6.5,8.9 M-6.5,8.9 C-6.5,4.5 -3.5,1 0,0 C-1,4 -3,7.5 -6.5,8.9 M-10.5,-3.4 C-6.5,-6.5 -2,-3.5 0,0 C-3.5,0.5 -7,-0.5 -10.5,-3.4 M0,-2.5 A2.5,2.5 0 1 0 0,2.5 A2.5,2.5 0 1 0 0,-2.5',
  face:
    'M0,-14 C4,-14 6,-10 6,-6 C6,-3 5.5,0 6.5,2 C7,3 6,5 5,7 C3.5,9.5 1.5,12 0,14',
};

// s = scale tier: L=1.6, M=1.0, S=0.5
// o derived from tier: L=0.07, M=0.11, S=0.14
// fl = float animation, fd = float duration, fld = float delay
// dO = desktop only

// Positions as % of hero container converted to viewBox(0 0 1400 500):
// x% * 14 = x, y% * 5 = y
const PLACEMENTS = [
  // ── TOP AREA (y 0–25%) ──
  { t: 'syringe', x: 1008, y: 25,  s: 1.6, o: 0.07, r: -20, fl: true, fd: 7,   fld: 1.4 },
  { t: 'sparkle', x: 1190, y: 40,  s: 0.5, o: 0.14, r: 15,  fl: true, fd: 4.5, fld: 2.1 },
  { t: 'sparkle', x: 910,  y: 15,  s: 0.5, o: 0.14, r: -35 },
  { t: 'diamond', x: 1260, y: 75,  s: 1.0, o: 0.11, r: 30 },
  { t: 'cross',   x: 770,  y: 60,  s: 0.5, o: 0.14, r: 10 },

  // ── RIGHT SIDE (x 60–100%, y 20–80%) ──
  { t: 'lips',    x: 1092, y: 150, s: 1.6, o: 0.07, r: 10,  fl: true, fd: 5,   fld: 0 },
  { t: 'droplet', x: 952,  y: 210, s: 1.0, o: 0.11, r: -15, fl: true, fd: 6,   fld: 0.8 },
  { t: 'flower',  x: 1232, y: 175, s: 0.5, o: 0.14, r: 25,  fl: true, fd: 6.5, fld: 3.2 },
  { t: 'syringe', x: 1288, y: 250, s: 1.0, o: 0.11, r: 45 },
  { t: 'sparkle', x: 1050, y: 275, s: 0.5, o: 0.14, r: 0 },
  { t: 'face',    x: 1148, y: 325, s: 1.6, o: 0.07, r: -10, fl: true, fd: 5,   fld: 4.5 },
  { t: 'diamond', x: 980,  y: 340, s: 0.5, o: 0.14, r: 40 },
  { t: 'cross',   x: 1330, y: 300, s: 0.5, o: 0.14, r: 20 },

  // ── LEFT SIDE — sparse (x 0–35%) ──
  { t: 'sparkle', x: 70,   y: 50,  s: 0.5, o: 0.14, r: 20,  dO: true },
  { t: 'cross',   x: 168,  y: 175, s: 0.5, o: 0.14, r: -15, dO: true },
  { t: 'droplet', x: 112,  y: 325, s: 0.5, o: 0.14, r: 10,  dO: true },
  { t: 'flower',  x: 42,   y: 400, s: 0.5, o: 0.14, r: 30,  dO: true },

  // ── BOTTOM AREA (y 75–100%) ──
  { t: 'lips',    x: 630,  y: 440, s: 1.0, o: 0.11, r: -20 },
  { t: 'sparkle', x: 840,  y: 460, s: 0.5, o: 0.14, r: 15,  fl: true, fd: 4,   fld: 3.9 },
  { t: 'diamond', x: 1120, y: 425, s: 1.0, o: 0.11, r: -30, fl: true, fd: 5.5, fld: 2.7 },
  { t: 'syringe', x: 350,  y: 475, s: 0.5, o: 0.14, r: 35 },
  { t: 'sparkle', x: 1008, y: 480, s: 0.5, o: 0.14, r: 0 },

  // ── ADDITIONAL desktop-only density fills ──
  { t: 'face',    x: 700,  y: 350, s: 1.0, o: 0.11, r: 5,   dO: true },
  { t: 'sparkle', x: 490,  y: 250, s: 1.0, o: 0.11, r: -20, dO: true },
  { t: 'flower',  x: 868,  y: 375, s: 1.0, o: 0.11, r: -10, dO: true },
  { t: 'cross',   x: 1190, y: 375, s: 1.0, o: 0.11, r: 35,  dO: true },
  { t: 'sparkle', x: 280,  y: 75,  s: 1.0, o: 0.11, r: -45, dO: true },
  { t: 'droplet', x: 560,  y: 475, s: 1.0, o: 0.11, r: 20,  dO: true },
  { t: 'diamond', x: 140,  y: 450, s: 1.6, o: 0.07, r: 15,  dO: true },
  { t: 'sparkle', x: 1372, y: 210, s: 1.6, o: 0.07, r: -25, dO: true },
  { t: 'flower',  x: 812,  y: 50,  s: 1.6, o: 0.07, r: 20,  dO: true },
  { t: 'face',    x: 420,  y: 125, s: 0.5, o: 0.14, r: 0,   dO: true },
  { t: 'syringe', x: 1288, y: 460, s: 0.5, o: 0.14, r: -40, dO: true },
  { t: 'lips',    x: 700,  y: 25,  s: 0.5, o: 0.14, r: 10,  dO: true },
  { t: 'droplet', x: 1092, y: 400, s: 0.5, o: 0.14, r: -20, dO: true },
  { t: 'flower',  x: 910,  y: 250, s: 0.5, o: 0.14, r: 15,  dO: true },
  { t: 'sparkle', x: 1372, y: 100, s: 0.5, o: 0.14, r: -10, dO: true },
  { t: 'syringe', x: 672,  y: 140, s: 1.0, o: 0.11, r: -25, dO: true },
  { t: 'cross',   x: 560,  y: 400, s: 0.5, o: 0.14, r: 10,  dO: true },
  { t: 'diamond', x: 728,  y: 275, s: 0.5, o: 0.14, r: -20, dO: true },
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
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );

        const className = [
          p.dO ? 'hero-icon-desktop' : '',
          p.fl ? 'hero-icon-float' : '',
        ]
          .filter(Boolean)
          .join(' ') || undefined;

        if (p.fl) {
          return (
            <g
              key={i}
              className={className}
              style={{
                '--float-delay': `${p.fld}s`,
                '--float-duration': `${p.fd}s`,
              }}
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

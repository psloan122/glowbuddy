import { format } from 'date-fns';

// Inline "Active Special" banner shown at the top of a browse card.
//
// Fed directly by the `active_special`, `special_expires_at` columns added
// to `providers` in migration 054. Handles the display-rule check itself so
// callers can drop it in without gating logic:
//
//   <SpecialBanner
//     text={procedure.active_special}
//     expiresAt={procedure.special_expires_at}
//   />
//
// Returns null when there's no active, unexpired special.

export function hasActiveSpecial(text, expiresAt) {
  if (!text || !text.trim()) return false;
  if (!expiresAt) return true;
  try {
    return new Date(expiresAt).getTime() > Date.now();
  } catch {
    return true;
  }
}

export default function SpecialBanner({ text, expiresAt, className = '' }) {
  if (!hasActiveSpecial(text, expiresAt)) return null;

  let expiresDisplay = null;
  if (expiresAt) {
    try {
      expiresDisplay = format(new Date(expiresAt), 'MMM d');
    } catch {
      expiresDisplay = null;
    }
  }

  return (
    <div
      className={`flex items-start justify-between gap-3 ${className}`}
      style={{
        background: '#FBF9F7',
        borderLeft: '3px solid #E8347A',
        borderRadius: '0 4px 4px 0',
        padding: '8px 12px',
        marginBottom: '12px',
      }}
    >
      <div className="min-w-0 flex-1">
        <p
          className="uppercase"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '9px',
            letterSpacing: '0.10em',
            color: '#E8347A',
            marginBottom: '2px',
          }}
        >
          Special
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
            fontSize: '13px',
            color: '#111',
            lineHeight: 1.35,
          }}
        >
          {text}
        </p>
      </div>
      {expiresDisplay && (
        <span
          className="shrink-0 whitespace-nowrap"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: '11px',
            color: '#B8A89A',
          }}
        >
          Ends {expiresDisplay}
        </span>
      )}
    </div>
  );
}

// Greyed-out upgrade slot shown at the bottom of an unclaimed card when
// there's no active special. The "Claim listing →" link routes through the
// business onboarding flow.
export function SpecialUpgradeSlot({ className = '' }) {
  return (
    <div
      className={className}
      style={{
        background: '#F8F8F8',
        borderLeft: '3px solid #E8E8E8',
        padding: '8px 12px',
        marginTop: '12px',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="italic"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: '12px',
            color: '#CCC',
          }}
        >
          Add a special or promotion
        </span>
        <a
          href="/business/claim"
          onClick={(e) => e.stopPropagation()}
          className="text-hot-pink hover:text-hot-pink-dark transition-colors shrink-0"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '11px',
            letterSpacing: '0.04em',
          }}
        >
          Claim listing &rarr;
        </a>
      </div>
    </div>
  );
}

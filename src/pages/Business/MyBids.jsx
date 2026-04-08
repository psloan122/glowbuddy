import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Check, ArrowRight, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../App';

// Provider's view of every bid they've submitted. Splits into pending,
// won, and lost lanes; surfaces total lead-fee revenue at the top so the
// provider can see how the channel is performing.

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Won',
  declined: 'Declined',
  expired: 'Closed',
};

function prettifyProcedure(slug) {
  if (!slug) return 'Treatment';
  return slug
    .split('-')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function formatRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function MyBids() {
  const { user, openAuthModal } = useContext(AuthContext);
  const location = useLocation();
  const justSubmittedBidId = location.state?.justSubmittedBidId;

  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providerName, setProviderName] = useState('');

  useEffect(() => {
    document.title = 'My bids | GlowBuddy for Providers';
  }, []);

  useEffect(() => {
    if (user === null) {
      openAuthModal('login', '/business/my-bids');
      return;
    }
    if (!user?.id) return;

    async function load() {
      const { data: provider } = await supabase
        .from('providers')
        .select('id, name')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (!provider) {
        setLoading(false);
        return;
      }
      setProviderName(provider.name || '');

      // Pull every bid this provider has submitted plus the request it
      // refers to. We rely on the provider_bids RLS policy to scope.
      const { data } = await supabase
        .from('provider_bids')
        .select(
          'id, status, total_price, price_per_unit, glowbuddy_score, lead_fee_charged, lead_fee_amount, brand_offered, created_at, request_id, ' +
            'bid_requests:request_id (id, procedure_slug, units_needed, city, state, status, expires_at, budget_min, budget_max)',
        )
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false });

      setBids(data || []);
      setLoading(false);
    }
    load();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const pending = [];
    const won = [];
    const lost = [];
    for (const b of bids) {
      if (b.status === 'accepted') won.push(b);
      else if (b.status === 'pending') pending.push(b);
      else lost.push(b);
    }
    return { pending, won, lost };
  }, [bids]);

  const totalRevenue = useMemo(() => {
    return grouped.won.reduce(
      (sum, b) => sum + Number(b.total_price || 0),
      0,
    );
  }, [grouped.won]);

  const totalLeadFees = useMemo(() => {
    return grouped.won.reduce(
      (sum, b) => sum + Number(b.lead_fee_amount || 35),
      0,
    );
  }, [grouped.won]);

  if (user === null || loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#FBF9F7' }}
      >
        <p className="text-text-secondary text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#FBF9F7' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <p
          className="mb-3"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: '#888',
          }}
        >
          PROVIDER DASHBOARD
        </p>
        <h1
          className="mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '36px',
            lineHeight: 1.1,
            color: '#111',
          }}
        >
          My bids
        </h1>
        <p
          className="mb-8 text-[13px]"
          style={{ fontFamily: 'var(--font-body)', color: '#666' }}
        >
          Track every offer you&rsquo;ve submitted{providerName ? ` for ${providerName}` : ''}.
        </p>

        {/* Revenue summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          <Stat label="Bids submitted" value={bids.length} />
          <Stat label="Won" value={grouped.won.length} accent="#1D9E75" />
          <Stat
            label="Booked revenue"
            value={`$${totalRevenue.toFixed(0)}`}
            sub={`${grouped.won.length > 0 ? `−$${totalLeadFees.toFixed(0)} lead fees` : ''}`}
          />
        </div>

        {bids.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {justSubmittedBidId && (
              <div
                className="mb-8 flex items-center gap-3"
                style={{
                  background: '#EDF7F1',
                  border: '1px solid #BFE2CC',
                  borderLeft: '3px solid #1D9E75',
                  borderRadius: '4px',
                  padding: '14px 16px',
                }}
              >
                <Check size={16} color="#1D9E75" />
                <p
                  className="text-[13px]"
                  style={{
                    fontFamily: 'var(--font-body)',
                    color: '#1D5E45',
                  }}
                >
                  Your bid is live! The patient has been notified.
                </p>
              </div>
            )}

            {grouped.pending.length > 0 && (
              <Lane label="Awaiting response" tone="pending">
                {grouped.pending.map((b) => (
                  <BidRow key={b.id} bid={b} highlight={b.id === justSubmittedBidId} />
                ))}
              </Lane>
            )}

            {grouped.won.length > 0 && (
              <Lane label="Won" tone="won">
                {grouped.won.map((b) => (
                  <BidRow key={b.id} bid={b} />
                ))}
              </Lane>
            )}

            {grouped.lost.length > 0 && (
              <Lane label="Closed" tone="lost">
                {grouped.lost.map((b) => (
                  <BidRow key={b.id} bid={b} />
                ))}
              </Lane>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent = '#111' }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #EDE8E3',
        borderTop: `3px solid ${accent}`,
        borderRadius: '8px',
        padding: '20px',
      }}
    >
      <p
        className="text-[10px] uppercase mb-2"
        style={{
          color: '#888',
          letterSpacing: '0.10em',
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: '28px',
          color: accent,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="mt-2 text-[11px]"
          style={{ color: '#888', fontFamily: 'var(--font-body)' }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function Lane({ label, tone, children }) {
  const dotColor =
    tone === 'won' ? '#1D9E75' : tone === 'pending' ? '#E8347A' : '#C8C2BC';
  return (
    <section className="mb-10">
      <p
        className="mb-3 inline-flex items-center gap-2"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#888',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: dotColor,
            display: 'inline-block',
          }}
        />
        {label}
      </p>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function BidRow({ bid, highlight }) {
  const request = bid.bid_requests || {};
  const procLabel = prettifyProcedure(request.procedure_slug);
  const accent =
    bid.status === 'accepted'
      ? '#1D9E75'
      : bid.status === 'pending'
        ? '#E8347A'
        : '#C8C2BC';

  return (
    <div
      style={{
        background: '#fff',
        border: highlight ? '1px solid #E8347A' : '1px solid #EDE8E3',
        borderTop: `3px solid ${accent}`,
        borderRadius: '8px',
        padding: '18px 20px',
        opacity: bid.status === 'declined' || bid.status === 'expired' ? 0.65 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '18px',
            color: '#111',
          }}
        >
          {procLabel}
          {request.units_needed ? ` — ${request.units_needed} units` : ''}
        </p>
        <span
          className="shrink-0"
          style={{
            background: bid.status === 'accepted' ? '#EDF7F1' : '#F5F0EC',
            color: accent,
            padding: '4px 8px',
            borderRadius: '2px',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '9px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {STATUS_LABELS[bid.status] || bid.status}
        </span>
      </div>

      <p
        className="text-[12px] mb-3"
        style={{ fontFamily: 'var(--font-body)', color: '#666' }}
      >
        {request.city}, {request.state} · submitted {formatRelative(bid.created_at)}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
        <Cell label="Your bid" value={`$${Number(bid.total_price).toFixed(0)}`} />
        {bid.brand_offered && <Cell label="Brand" value={bid.brand_offered} />}
        {bid.glowbuddy_score != null && (
          <Cell
            label="Score"
            value={`${Math.round(Number(bid.glowbuddy_score))}/100`}
          />
        )}
        {request.budget_min != null && request.budget_max != null && (
          <Cell
            label="Budget"
            value={`$${request.budget_min}–${request.budget_max}`}
          />
        )}
      </div>

      {bid.status === 'accepted' && (
        <div
          className="mt-4 pt-4 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid #F0EBE6' }}
        >
          <span
            className="inline-flex items-center gap-1 text-[11px]"
            style={{ fontFamily: 'var(--font-body)', color: '#1D5E45' }}
          >
            <DollarSign size={11} />${Number(bid.lead_fee_amount || 35).toFixed(0)} lead fee {bid.lead_fee_charged ? 'charged' : 'pending'}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold uppercase"
            style={{
              color: '#1D9E75',
              letterSpacing: '0.08em',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Check size={12} />
            Booked
          </span>
        </div>
      )}

      {bid.status === 'pending' && request.expires_at && (
        <div
          className="mt-4 pt-4 flex items-center gap-2 text-[11px]"
          style={{
            borderTop: '1px solid #F0EBE6',
            fontFamily: 'var(--font-body)',
            color: '#888',
          }}
        >
          <Clock size={11} />
          Patient decides by{' '}
          {new Date(request.expires_at).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value }) {
  return (
    <div>
      <p
        className="text-[10px] uppercase mb-1"
        style={{
          color: '#888',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          color: '#111',
          fontWeight: 600,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="text-center"
      style={{
        background: '#fff',
        border: '1px solid #EDE8E3',
        borderTop: '3px solid #E8347A',
        borderRadius: '8px',
        padding: '40px 24px',
      }}
    >
      <p
        className="mb-2"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: '20px',
          color: '#111',
        }}
      >
        No bids yet
      </p>
      <p
        className="mb-5 text-[13px]"
        style={{ fontFamily: 'var(--font-body)', color: '#666' }}
      >
        Browse open requests in your area and submit your first bid.
      </p>
      <Link
        to="/business/bid-requests"
        className="inline-flex items-center gap-1 px-5 py-3 font-bold uppercase text-[11px]"
        style={{
          background: '#E8347A',
          color: '#fff',
          letterSpacing: '0.10em',
          borderRadius: '2px',
          fontFamily: 'var(--font-body)',
        }}
      >
        See bid requests
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}

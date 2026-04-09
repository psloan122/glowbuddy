import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';

// Thin inbox page — shows the patient's bid requests grouped by
// active (open) vs. closed/expired/cancelled. Each card links to the
// detail page where bids are reviewed and accepted.

function hoursUntil(iso) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function prettifyProcedure(slug) {
  if (!slug) return 'Treatment';
  return slug
    .split('-')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export default function MyBidRequests() {
  const { user, openAuthModal } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'My bid requests | Know Before You Glow';
  }, []);

  useEffect(() => {
    if (user === null) {
      openAuthModal('login', '/my-requests');
      return;
    }
    if (!user?.id) return;
    supabase
      .from('bid_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRows(data || []);
        setLoading(false);
      });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (user === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF9F7' }}>
        <p className="text-text-secondary text-sm">Loading…</p>
      </div>
    );
  }

  const open = rows.filter((r) => r.status === 'open' && new Date(r.expires_at) > new Date());
  const closed = rows.filter((r) => !open.includes(r));

  return (
    <div className="min-h-screen" style={{ background: '#FBF9F7' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
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
          YOUR BID REQUESTS
        </p>
        <h1
          className="mb-8"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '36px',
            lineHeight: 1.1,
            color: '#111',
          }}
        >
          My bid requests
        </h1>

        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {open.length > 0 && (
              <section className="mb-10">
                <SectionLabel>Active</SectionLabel>
                <div className="flex flex-col gap-3">
                  {open.map((r) => (
                    <RequestCard key={r.id} request={r} active />
                  ))}
                </div>
              </section>
            )}

            {closed.length > 0 && (
              <section>
                <SectionLabel>Past requests</SectionLabel>
                <div className="flex flex-col gap-3">
                  {closed.map((r) => (
                    <RequestCard key={r.id} request={r} />
                  ))}
                </div>
              </section>
            )}

            <div className="mt-10">
              <Link
                to="/request-bid"
                className="inline-flex items-center gap-2 px-6 py-3 font-semibold uppercase text-[11px]"
                style={{
                  background: '#E8347A',
                  color: '#fff',
                  letterSpacing: '0.10em',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <Plus size={13} />
                Post another request
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p
      className="mb-3"
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#888',
      }}
    >
      {children}
    </p>
  );
}

function RequestCard({ request, active = false }) {
  const remaining = hoursUntil(request.expires_at);
  const statusLabel =
    request.status === 'closed'
      ? 'Closed'
      : request.status === 'expired'
        ? 'Expired'
        : request.status === 'cancelled'
          ? 'Cancelled'
          : !remaining
            ? 'Expired'
            : 'Open';

  return (
    <Link
      to={`/my-requests/${request.id}`}
      className="block hover:-translate-y-0.5 transition-transform"
      style={{
        background: '#fff',
        border: '1px solid #EDE8E3',
        borderTop: `3px solid ${active ? '#E8347A' : '#C8C2BC'}`,
        borderRadius: '8px',
        padding: '20px',
        opacity: active ? 1 : 0.65,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <p
          className="flex-1 min-w-0 truncate"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '20px',
            color: '#111',
          }}
        >
          {prettifyProcedure(request.procedure_slug)} in {request.city}, {request.state}
        </p>
        <span
          className="shrink-0"
          style={{
            background: active ? '#FCEEF3' : '#F5F0EC',
            color: active ? '#E8347A' : '#888',
            padding: '4px 8px',
            borderRadius: '2px',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '9px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {statusLabel}
        </span>
      </div>

      {request.budget_min && request.budget_max && (
        <p
          className="mb-3 text-[12px]"
          style={{ fontFamily: 'var(--font-body)', color: '#888' }}
        >
          Budget ${request.budget_min}–${request.budget_max}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center"
            style={{
              background: '#E8347A',
              color: '#fff',
              padding: '3px 10px',
              borderRadius: '2px',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.04em',
            }}
          >
            {request.bids_count || 0} {request.bids_count === 1 ? 'bid' : 'bids'} received
          </span>
          {active && remaining && (
            <span
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ fontFamily: 'var(--font-body)', color: '#888' }}
            >
              <Clock size={12} />
              Closes in {remaining}
            </span>
          )}
        </div>
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: '#E8347A', fontFamily: 'var(--font-body)' }}
        >
          View bids
          <ArrowRight size={12} />
        </span>
      </div>
    </Link>
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
        No bid requests yet
      </p>
      <p
        className="mb-5 text-[13px]"
        style={{ fontFamily: 'var(--font-body)', color: '#666' }}
      >
        Post a request and let providers compete for your business.
      </p>
      <Link
        to="/request-bid"
        className="inline-flex items-center gap-2 px-6 py-3 font-semibold uppercase text-[11px]"
        style={{
          background: '#E8347A',
          color: '#fff',
          letterSpacing: '0.10em',
          borderRadius: '2px',
          fontFamily: 'var(--font-body)',
        }}
      >
        <Plus size={13} />
        Post your first request
      </Link>
    </div>
  );
}

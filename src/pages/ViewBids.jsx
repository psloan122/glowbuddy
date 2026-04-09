import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Check, Clock, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import ProviderAvatar from '../components/ProviderAvatar';
import { scoreBand } from '../lib/glowbuddyScore';
import {
  notifyProvidersOfAcceptance,
  recordPendingLeadFee,
} from '../lib/bidNotifications';

function prettifyProcedure(slug) {
  if (!slug) return 'Treatment';
  return slug
    .split('-')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function useCountdown(iso) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!iso) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [iso]);

  if (!iso) return { expired: true, display: '00:00:00', danger: false };
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { expired: true, display: '00:00:00', danger: true };
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1_000);
  const pad = (n) => n.toString().padStart(2, '0');
  return {
    expired: false,
    display: `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
    danger: diff < 2 * 3_600_000, // under 2 hours
  };
}

export default function ViewBids() {
  const { requestId } = useParams();
  const { user, openAuthModal } = useContext(AuthContext);
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmBid, setConfirmBid] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptedBid, setAcceptedBid] = useState(null);

  useEffect(() => {
    document.title = 'Your bids | Know Before You Glow';
  }, []);

  useEffect(() => {
    if (user === null) {
      openAuthModal('login', `/my-requests/${requestId}`);
      return;
    }
    if (!user?.id || !requestId) return;

    async function load() {
      setLoading(true);
      const { data: reqData, error: reqErr } = await supabase
        .from('bid_requests')
        .select('*')
        .eq('id', requestId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (reqErr || !reqData) {
        setError('Request not found');
        setLoading(false);
        return;
      }
      setRequest(reqData);

      const { data: bidData } = await supabase
        .from('provider_bids')
        .select(
          'id, request_id, provider_id, injector_name, injector_credentials, brand_offered, price_per_unit, total_price, available_slots, message_to_patient, add_ons, glowbuddy_score, status, created_at, providers(id, name, city, state, slug, google_rating, review_count, owner_user_id)',
        )
        .eq('request_id', requestId)
        .order('glowbuddy_score', { ascending: false });

      setBids(bidData || []);
      const accepted = (bidData || []).find((b) => b.status === 'accepted');
      if (accepted) setAcceptedBid(accepted);
      setLoading(false);
    }

    load();
  }, [requestId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const countdown = useCountdown(request?.expires_at);

  const activeBids = useMemo(
    () =>
      (bids || [])
        .filter((b) => b.status === 'pending' || b.status === 'accepted')
        .sort((a, b) => (Number(b.glowbuddy_score) || 0) - (Number(a.glowbuddy_score) || 0)),
    [bids],
  );

  const topScore = activeBids[0]?.glowbuddy_score || null;

  async function handleAccept() {
    if (!confirmBid || !request) return;
    setAccepting(true);

    try {
      // 1. Mark this bid accepted
      const { data: updatedBid, error: acceptErr } = await supabase
        .from('provider_bids')
        .update({ status: 'accepted' })
        .eq('id', confirmBid.id)
        .select(
          'id, request_id, provider_id, providers(owner_user_id, name, slug, city, state)',
        )
        .single();

      if (acceptErr) throw acceptErr;

      // 2. Expire every other pending bid on this request
      const loserIds = (bids || [])
        .filter((b) => b.id !== confirmBid.id && b.status === 'pending')
        .map((b) => b.id);
      if (loserIds.length > 0) {
        await supabase
          .from('provider_bids')
          .update({ status: 'expired' })
          .in('id', loserIds);
      }

      // 3. Close the request and stamp the accepted bid id
      await supabase
        .from('bid_requests')
        .update({ status: 'closed', accepted_bid_id: confirmBid.id })
        .eq('id', request.id);

      // 4. Record the pending $35 lead fee
      await recordPendingLeadFee({
        bid: { id: confirmBid.id, provider_id: confirmBid.provider_id },
        request,
      });

      // 5. Fire notifications — best effort
      const otherBidProviderUserIds = (bids || [])
        .filter((b) => b.id !== confirmBid.id && b.status === 'pending')
        .map((b) => b.providers?.owner_user_id)
        .filter(Boolean);

      notifyProvidersOfAcceptance({
        acceptedBid: {
          id: confirmBid.id,
          provider_owner_user_id: updatedBid?.providers?.owner_user_id || null,
        },
        otherBidProviderUserIds,
        request,
      }).catch(() => {});

      // 6. Local state update so the page flips to the success view
      setAcceptedBid(confirmBid);
      setBids((prev) =>
        prev.map((b) => {
          if (b.id === confirmBid.id) return { ...b, status: 'accepted' };
          if (loserIds.includes(b.id)) return { ...b, status: 'expired' };
          return b;
        }),
      );
      setRequest((r) => (r ? { ...r, status: 'closed' } : r));
      setConfirmBid(null);
    } catch (e) {
      setError(e.message || 'Could not accept bid');
    } finally {
      setAccepting(false);
    }
  }

  if (user === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF9F7' }}>
        <p className="text-text-secondary text-sm">Loading…</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen" style={{ background: '#FBF9F7' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <Link to="/my-requests" className="text-[12px] text-hot-pink">
            ← Back to my requests
          </Link>
          <p className="mt-6 text-sm text-text-secondary">{error || 'Not found'}</p>
        </div>
      </div>
    );
  }

  const isClosed =
    request.status !== 'open' || (countdown.expired && !acceptedBid);

  return (
    <div className="min-h-screen" style={{ background: '#FBF9F7' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link
          to="/my-requests"
          className="text-[12px] text-hot-pink mb-6 inline-block"
        >
          ← Back to my requests
        </Link>

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
          YOUR BID REQUEST
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
          {prettifyProcedure(request.procedure_slug)} in {request.city}, {request.state}
        </h1>
        <p
          className="mb-6 text-[13px]"
          style={{ fontFamily: 'var(--font-body)', color: '#666' }}
        >
          {activeBids.length} providers submitted bids
          {request.status === 'open' && !countdown.expired && ' · Closes in'}{' '}
          {request.status === 'open' && !countdown.expired && (
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '14px',
                color: countdown.danger ? '#C8001A' : '#111',
                marginLeft: 4,
              }}
            >
              {countdown.display}
            </span>
          )}
        </p>

        {acceptedBid && (
          <AcceptedBanner bid={acceptedBid} />
        )}

        {activeBids.length === 0 ? (
          <EmptyBids isClosed={isClosed} />
        ) : (
          <div className="flex flex-col gap-4">
            {activeBids.map((bid, idx) => (
              <BidCard
                key={bid.id}
                bid={bid}
                rank={idx}
                isTop={bid.glowbuddy_score === topScore && idx === 0}
                isAccepted={bid.status === 'accepted'}
                canAccept={request.status === 'open' && !countdown.expired && !acceptedBid}
                onAccept={() => setConfirmBid(bid)}
              />
            ))}
          </div>
        )}

        {confirmBid && (
          <ConfirmModal
            bid={confirmBid}
            accepting={accepting}
            onCancel={() => setConfirmBid(null)}
            onConfirm={handleAccept}
          />
        )}
      </div>
    </div>
  );
}

// ─── Bid card ─────────────────────────────────────────────────────────

function BidCard({ bid, rank, isTop, isAccepted, canAccept, onAccept }) {
  const provider = bid.providers || {};
  // Provider identity is concealed until the bid is accepted.
  const blurred = !isAccepted;
  const displayName = blurred ? `Provider ${String.fromCharCode(65 + rank)}` : provider.name;
  const score = Number(bid.glowbuddy_score) || 0;
  const band = scoreBand(score);

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #EDE8E3',
        borderTop: `3px solid ${isAccepted ? '#1D9E75' : isTop ? '#E8347A' : '#111'}`,
        borderRadius: '8px',
        padding: '20px',
        position: 'relative',
      }}
    >
      {isTop && !isAccepted && (
        <span
          className="inline-flex items-center mb-3"
          style={{
            background: '#F0FAF5',
            color: '#1D9E75',
            padding: '4px 10px',
            borderRadius: '2px',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '9px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          Best match
        </span>
      )}
      {isAccepted && (
        <span
          className="inline-flex items-center mb-3"
          style={{
            background: '#1D9E75',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '2px',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '9px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          Accepted
        </span>
      )}

      <div className="flex items-start gap-4">
        {/* Left: provider + offer */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <ProviderAvatar name={displayName} size={36} />
            <div className="min-w-0">
              <p
                className="truncate"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '15px',
                  color: '#111',
                  filter: blurred ? 'blur(3px)' : 'none',
                }}
              >
                {displayName}
              </p>
              <p
                className="text-[11px]"
                style={{ fontFamily: 'var(--font-body)', color: '#888' }}
              >
                Med Spa · {provider.city || '—'}, {provider.state || '—'}
              </p>
            </div>
          </div>

          {/* Injector */}
          {bid.injector_name && (
            <p
              className="text-[12px] mb-3"
              style={{ fontFamily: 'var(--font-body)', color: '#444' }}
            >
              {bid.injector_name}
              {bid.injector_credentials && `, ${bid.injector_credentials}`}
            </p>
          )}

          {/* Brand + price */}
          <div className="flex items-baseline gap-2 mb-2">
            {bid.brand_offered && (
              <span
                className="inline-flex items-center"
                style={{
                  background: '#FCEEF3',
                  color: '#E8347A',
                  padding: '3px 8px',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: '10px',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                }}
              >
                {bid.brand_offered}
              </span>
            )}
          </div>

          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '32px',
              color: '#111',
              lineHeight: 1,
            }}
          >
            ${Number(bid.total_price).toLocaleString()}
          </p>
          {bid.price_per_unit && (
            <p
              className="mt-1 text-[12px]"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 300, color: '#888' }}
            >
              ${Number(bid.price_per_unit).toFixed(2)} / unit
            </p>
          )}

          {/* Availability */}
          {bid.available_slots && (
            <p
              className="mt-3 text-[12px]"
              style={{ fontFamily: 'var(--font-body)', color: '#444' }}
            >
              Available: {formatSlots(bid.available_slots)}
            </p>
          )}

          {/* Add-ons */}
          {bid.add_ons && (
            <div
              className="mt-3 pl-3"
              style={{ borderLeft: '3px solid #E8347A' }}
            >
              <p
                className="text-[12px]"
                style={{ fontFamily: 'var(--font-body)', color: '#444' }}
              >
                {bid.add_ons}
              </p>
            </div>
          )}

          {/* Provider message */}
          {bid.message_to_patient && (
            <p
              className="mt-4 italic"
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: '14px',
                color: '#555',
                lineHeight: 1.5,
              }}
            >
              &ldquo;{bid.message_to_patient}&rdquo;
            </p>
          )}
        </div>

        {/* Right: score circle */}
        <ScoreCircle score={score} color={band.color} />
      </div>

      {/* Actions */}
      {canAccept && (
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid #F0EBE6' }}>
          <button
            type="button"
            onClick={onAccept}
            className="w-full py-3 font-bold uppercase"
            style={{
              background: '#E8347A',
              color: '#fff',
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              borderRadius: '2px',
            }}
          >
            Accept this bid
          </button>
          <button
            type="button"
            className="w-full mt-2 text-center text-[11px]"
            style={{ color: '#B8A89A', fontFamily: 'var(--font-body)' }}
            onClick={() => undefined /* decline is a no-op placeholder */}
          >
            Decline
          </button>
        </div>
      )}

      {isAccepted && provider?.slug && (
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid #F0EBE6' }}>
          <Link
            to={`/provider/${provider.slug}`}
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase"
            style={{ color: '#E8347A', fontFamily: 'var(--font-body)', letterSpacing: '0.10em' }}
          >
            View provider profile →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Score circle ─────────────────────────────────────────────────────

function ScoreCircle({ score, color }) {
  // Pure-CSS conic-gradient meter. The trailing ring uses `transparent`
  // so the underlying card shows through between the arc and the
  // center hole.
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="shrink-0 hidden sm:flex flex-col items-center">
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: `conic-gradient(${color} ${pct}%, #F0EBE6 ${pct}%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '20px',
            color: '#111',
          }}
        >
          {Math.round(pct)}
        </div>
      </div>
      <p
        className="mt-1 text-center"
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: '9px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#888',
        }}
      >
        Know Before You Glow Score
      </p>
    </div>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────────

function ConfirmModal({ bid, accepting, onCancel, onConfirm }) {
  const provider = bid.providers || {};
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17, 17, 17, 0.55)' }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #EDE8E3',
          borderTop: '3px solid #E8347A',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: 420,
          width: '100%',
        }}
      >
        <p
          className="mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '22px',
            color: '#111',
          }}
        >
          Accept {provider.name || 'this provider'}'s bid?
        </p>
        <p
          className="mb-4 text-[13px]"
          style={{ fontFamily: 'var(--font-body)', color: '#444' }}
        >
          {provider.name} in {provider.city}, {provider.state} — ${Number(bid.total_price).toLocaleString()}.
          They'll be notified immediately.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={accepting}
            className="flex-1 py-3 font-bold uppercase"
            style={{
              background: '#E8347A',
              color: '#fff',
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              borderRadius: '2px',
              opacity: accepting ? 0.6 : 1,
            }}
          >
            {accepting ? 'Accepting…' : 'Confirm'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={accepting}
            className="text-[12px]"
            style={{ color: '#B8A89A', fontFamily: 'var(--font-body)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AcceptedBanner({ bid }) {
  const provider = bid.providers || {};
  return (
    <div
      className="mb-6"
      style={{
        background: '#F0FAF5',
        borderLeft: '3px solid #1D9E75',
        padding: '16px 18px',
      }}
    >
      <p
        className="mb-1"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: 700,
          color: '#1D9E75',
        }}
      >
        You accepted {provider.name || 'this provider'}'s bid
      </p>
      <p
        className="text-[12px]"
        style={{ fontFamily: 'var(--font-body)', color: '#444' }}
      >
        Contact details below. They've been notified.
      </p>
    </div>
  );
}

function EmptyBids({ isClosed }) {
  return (
    <div
      className="text-center"
      style={{
        background: '#fff',
        border: '1px solid #EDE8E3',
        borderTop: '3px solid #C8C2BC',
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
        {isClosed ? 'No bids received' : 'No bids yet'}
      </p>
      <p className="text-[13px]" style={{ fontFamily: 'var(--font-body)', color: '#666' }}>
        {isClosed
          ? "Your request expired without any bids."
          : "Providers are reviewing your request. Check back soon."}
      </p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatSlots(slots) {
  if (!slots) return '';
  if (Array.isArray(slots)) return slots.join(' · ');
  if (typeof slots === 'string') return slots;
  if (typeof slots === 'object') {
    return Object.entries(slots)
      .map(([k, v]) => `${k} ${Array.isArray(v) ? v.join(', ') : v}`)
      .join(' · ');
  }
  return '';
}

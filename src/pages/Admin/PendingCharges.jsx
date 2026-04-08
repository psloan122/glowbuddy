import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../App';
import { Check, Copy, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

// Admin-only ledger of $35 lead fees that GlowBuddy needs to charge a
// provider after a patient accepts their bid. Each row points back to
// the bid + request. The admin runs Stripe manually, then flips status
// to 'charged' and pastes the Stripe payment intent into the notes.
// Phase 2 will replace this page with a Stripe Connect automation.

const STATUS_FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'charged', label: 'Charged' },
  { key: 'failed', label: 'Failed' },
  { key: 'waived', label: 'Waived' },
  { key: 'all', label: 'All' },
];

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function prettifyProcedure(slug) {
  if (!slug) return 'Treatment';
  return slug
    .split('-')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export default function PendingCharges() {
  const { user } = useContext(AuthContext);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [savingId, setSavingId] = useState(null);
  const [draftNotes, setDraftNotes] = useState({});
  const [draftIntent, setDraftIntent] = useState({});

  useEffect(() => {
    document.title = 'Pending charges | Admin | GlowBuddy';
  }, []);

  // JWT user_metadata.user_role check, mirroring Admin.jsx.
  useEffect(() => {
    if (!user?.id) {
      setAuthenticated(false);
      setAuthChecking(false);
      return;
    }
    setAuthChecking(true);
    supabase.auth.getUser().then(({ data: { user: freshUser } }) => {
      const role = freshUser?.user_metadata?.user_role;
      setAuthenticated(role === 'admin');
      setAuthChecking(false);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!authenticated) return;
    load();
  }, [authenticated, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    let query = supabase
      .from('pending_charges')
      .select(
        'id, provider_id, bid_id, request_id, amount, status, stripe_payment_intent, notes, created_at, charged_at, ' +
          'providers:provider_id (id, name, city, state, slug, owner_user_id), ' +
          'bid_requests:request_id (id, procedure_slug, units_needed, budget_min, budget_max, user_id), ' +
          'provider_bids:bid_id (id, total_price, brand_offered, injector_name)',
      )
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;
    if (error) {
      setRows([]);
    } else {
      setRows(data || []);
      // Hydrate draft fields so the inputs aren't empty for already-edited rows
      const notesDraft = {};
      const intentDraft = {};
      for (const r of data || []) {
        notesDraft[r.id] = r.notes || '';
        intentDraft[r.id] = r.stripe_payment_intent || '';
      }
      setDraftNotes(notesDraft);
      setDraftIntent(intentDraft);
    }
    setLoading(false);
  }

  async function updateStatus(row, newStatus) {
    setSavingId(row.id);
    const patch = {
      status: newStatus,
      notes: draftNotes[row.id] || null,
      stripe_payment_intent: draftIntent[row.id] || null,
    };
    if (newStatus === 'charged') {
      patch.charged_at = new Date().toISOString();
      // Mark the bid itself as having had its lead fee collected
      await supabase
        .from('provider_bids')
        .update({ lead_fee_charged: true })
        .eq('id', row.bid_id);
    }
    await supabase.from('pending_charges').update(patch).eq('id', row.id);
    setSavingId(null);
    await load();
  }

  const totals = useMemo(() => {
    const pending = rows.filter((r) => r.status === 'pending');
    const charged = rows.filter((r) => r.status === 'charged');
    const sum = (arr) => arr.reduce((s, r) => s + Number(r.amount || 0), 0);
    return {
      pendingCount: pending.length,
      pendingAmount: sum(pending),
      chargedCount: charged.length,
      chargedAmount: sum(charged),
    };
  }, [rows]);

  if (authChecking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#FBF9F7' }}
      >
        <Loader2 size={20} className="animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: '#FBF9F7' }}
      >
        <div className="text-center max-w-md">
          <p
            className="mb-3"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '24px',
              color: '#111',
            }}
          >
            Admin access required
          </p>
          <p
            className="text-[13px]"
            style={{ fontFamily: 'var(--font-body)', color: '#666' }}
          >
            You need an admin role to view pending charges.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#FBF9F7' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
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
          ADMIN · LEAD FEE LEDGER
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
          Pending charges
        </h1>
        <p
          className="mb-8 text-[13px]"
          style={{ fontFamily: 'var(--font-body)', color: '#666' }}
        >
          Run each $35 charge in Stripe, paste the payment intent ID, and mark it
          as charged.
        </p>

        {/* Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Stat
            label="Pending"
            value={totals.pendingCount}
            sub={`$${totals.pendingAmount.toFixed(0)}`}
            accent="#E8347A"
          />
          <Stat
            label="Charged"
            value={totals.chargedCount}
            sub={`$${totals.chargedAmount.toFixed(0)}`}
            accent="#1D9E75"
          />
          <Stat label="Total rows" value={rows.length} />
          <Stat
            label="Avg fee"
            value={
              rows.length > 0
                ? `$${(rows.reduce((s, r) => s + Number(r.amount || 0), 0) / rows.length).toFixed(0)}`
                : '$0'
            }
          />
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className="px-3 py-2 text-[11px] font-bold uppercase"
                style={{
                  background: active ? '#111' : '#fff',
                  color: active ? '#fff' : '#444',
                  border: '1px solid #E8E8E8',
                  letterSpacing: '0.10em',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p
            className="text-[13px]"
            style={{ fontFamily: 'var(--font-body)', color: '#888' }}
          >
            Loading…
          </p>
        ) : rows.length === 0 ? (
          <div
            className="text-center py-12"
            style={{
              background: '#fff',
              border: '1px solid #EDE8E3',
              borderTop: '3px solid #C8C2BC',
              borderRadius: '8px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '18px',
                color: '#111',
              }}
            >
              No {filter === 'all' ? '' : filter} charges
            </p>
            <p
              className="mt-2 text-[13px]"
              style={{ fontFamily: 'var(--font-body)', color: '#666' }}
            >
              The ledger is clean.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <ChargeRow
                key={row.id}
                row={row}
                draftNotes={draftNotes[row.id] || ''}
                draftIntent={draftIntent[row.id] || ''}
                setNotes={(v) => setDraftNotes((s) => ({ ...s, [row.id]: v }))}
                setIntent={(v) => setDraftIntent((s) => ({ ...s, [row.id]: v }))}
                onUpdate={updateStatus}
                saving={savingId === row.id}
              />
            ))}
          </div>
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
        padding: '16px',
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
          fontSize: '24px',
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

function ChargeRow({ row, draftNotes, draftIntent, setNotes, setIntent, onUpdate, saving }) {
  const provider = row.providers || {};
  const request = row.bid_requests || {};
  const bid = row.provider_bids || {};
  const procLabel = prettifyProcedure(request.procedure_slug);
  const accent =
    row.status === 'charged'
      ? '#1D9E75'
      : row.status === 'failed'
        ? '#C8001A'
        : row.status === 'waived'
          ? '#888'
          : '#E8347A';

  function copyEmail() {
    if (provider.owner_user_id) {
      navigator.clipboard?.writeText(provider.owner_user_id);
    }
  }

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
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '20px',
              color: '#111',
            }}
          >
            {provider.name || 'Unknown provider'} — {procLabel}
          </p>
          <p
            className="text-[12px] mt-1"
            style={{ fontFamily: 'var(--font-body)', color: '#666' }}
          >
            {provider.city}, {provider.state} · accepted {fmtDate(row.created_at)}
          </p>
        </div>
        <span
          className="shrink-0"
          style={{
            background: row.status === 'charged' ? '#EDF7F1' : '#F5F0EC',
            color: accent,
            padding: '4px 10px',
            borderRadius: '2px',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '10px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {row.status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-[12px]">
        <Cell label="Lead fee" value={`$${Number(row.amount).toFixed(2)}`} />
        <Cell label="Bid total" value={`$${Number(bid.total_price || 0).toFixed(0)}`} />
        {bid.brand_offered && <Cell label="Brand" value={bid.brand_offered} />}
        {bid.injector_name && <Cell label="Injector" value={bid.injector_name} />}
        {row.charged_at && <Cell label="Charged" value={fmtDate(row.charged_at)} />}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 text-[11px]">
        {provider.slug && (
          <Link
            to={`/provider/${provider.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1"
            style={{ color: '#E8347A', fontFamily: 'var(--font-body)' }}
          >
            <ExternalLink size={11} />
            Provider page
          </Link>
        )}
        {provider.owner_user_id && (
          <button
            type="button"
            onClick={copyEmail}
            className="inline-flex items-center gap-1"
            style={{ color: '#666', fontFamily: 'var(--font-body)' }}
          >
            <Copy size={11} />
            Copy owner UID
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label
            className="block mb-1 text-[10px] uppercase"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              letterSpacing: '0.10em',
              color: '#666',
            }}
          >
            Stripe payment intent
          </label>
          <input
            type="text"
            value={draftIntent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="pi_3Nx…"
            className="w-full px-3 py-2 text-[12px]"
            style={{
              background: '#fff',
              border: '1px solid #E8E8E8',
              borderRadius: '2px',
              fontFamily: 'var(--font-body)',
              color: '#111',
            }}
          />
        </div>
        <div>
          <label
            className="block mb-1 text-[10px] uppercase"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              letterSpacing: '0.10em',
              color: '#666',
            }}
          >
            Notes
          </label>
          <input
            type="text"
            value={draftNotes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything to remember"
            className="w-full px-3 py-2 text-[12px]"
            style={{
              background: '#fff',
              border: '1px solid #E8E8E8',
              borderRadius: '2px',
              fontFamily: 'var(--font-body)',
              color: '#111',
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-3" style={{ borderTop: '1px solid #F0EBE6' }}>
        <button
          type="button"
          disabled={saving || row.status === 'charged'}
          onClick={() => onUpdate(row, 'charged')}
          className="inline-flex items-center gap-1 px-3 py-2 text-[11px] font-bold uppercase"
          style={{
            background: row.status === 'charged' ? '#C8C2BC' : '#1D9E75',
            color: '#fff',
            letterSpacing: '0.10em',
            borderRadius: '2px',
            fontFamily: 'var(--font-body)',
            cursor: saving || row.status === 'charged' ? 'not-allowed' : 'pointer',
          }}
        >
          <Check size={12} />
          Mark charged
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onUpdate(row, 'failed')}
          className="inline-flex items-center gap-1 px-3 py-2 text-[11px] font-bold uppercase"
          style={{
            background: '#fff',
            color: '#C8001A',
            border: '1px solid #F0B2B2',
            letterSpacing: '0.10em',
            borderRadius: '2px',
            fontFamily: 'var(--font-body)',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          <AlertCircle size={12} />
          Failed
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onUpdate(row, 'waived')}
          className="px-3 py-2 text-[11px] font-bold uppercase"
          style={{
            background: '#fff',
            color: '#666',
            border: '1px solid #E8E8E8',
            letterSpacing: '0.10em',
            borderRadius: '2px',
            fontFamily: 'var(--font-body)',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          Waive
        </button>
        {row.status !== 'pending' && (
          <button
            type="button"
            disabled={saving}
            onClick={() => onUpdate(row, 'pending')}
            className="px-3 py-2 text-[11px] font-semibold uppercase"
            style={{
              background: '#fff',
              color: '#666',
              border: '1px solid #E8E8E8',
              letterSpacing: '0.10em',
              borderRadius: '2px',
              fontFamily: 'var(--font-body)',
            }}
          >
            Reset
          </button>
        )}
        {saving && (
          <span
            className="inline-flex items-center gap-1 text-[11px] ml-2"
            style={{ color: '#888', fontFamily: 'var(--font-body)' }}
          >
            <Loader2 size={11} className="animate-spin" />
            Saving…
          </span>
        )}
      </div>
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
      <p style={{ fontFamily: 'var(--font-body)', color: '#111', fontWeight: 600 }}>
        {value}
      </p>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Internal admin view of the bid request waitlist. No auth gate for now
// per the spec — surface only via the footer link, not the main nav.
// The Supabase RLS policy on waitlist_signups grants SELECT to all
// authenticated users, so this page works as long as the visitor is
// signed in. Tighten later if we publish the URL.

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'patient', label: 'Patients' },
  { key: 'provider', label: 'Providers' },
];

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function escapeCsv(value) {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function Waitlist() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    document.title = 'Waitlist | Admin | GlowBuddy';
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('waitlist_signups')
        .select('id, email, type, city, state, created_at')
        .order('created_at', { ascending: false });
      setRows(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => r.type === filter);
  }, [rows, filter]);

  const totals = useMemo(() => {
    return {
      total: rows.length,
      patient: rows.filter((r) => r.type === 'patient').length,
      provider: rows.filter((r) => r.type === 'provider').length,
    };
  }, [rows]);

  function exportCsv() {
    const header = ['email', 'type', 'city', 'state', 'created_at'];
    const lines = [header.join(',')];
    for (const r of filtered) {
      lines.push(
        [r.email, r.type, r.city, r.state, r.created_at].map(escapeCsv).join(','),
      );
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          ADMIN · WAITLIST
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
          Bid request waitlist
        </h1>
        <p
          className="mb-8 text-[13px]"
          style={{ fontFamily: 'var(--font-body)', color: '#666' }}
        >
          Email signups from /request-bid and /business/bid-requests.
        </p>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Stat label="Total signups" value={totals.total} />
          <Stat label="Patients" value={totals.patient} accent="#E8347A" />
          <Stat label="Providers" value={totals.provider} accent="#1D9E75" />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => {
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
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase"
            style={{
              background: '#fff',
              color: '#111',
              border: '1px solid #E8E8E8',
              letterSpacing: '0.10em',
              borderRadius: '2px',
              fontFamily: 'var(--font-body)',
              cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <p
            className="text-[13px]"
            style={{ fontFamily: 'var(--font-body)', color: '#888' }}
          >
            Loading…
          </p>
        ) : filtered.length === 0 ? (
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
              No signups yet
            </p>
            <p
              className="mt-2 text-[13px]"
              style={{ fontFamily: 'var(--font-body)', color: '#666' }}
            >
              The waitlist is empty.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: '#fff',
              border: '1px solid #EDE8E3',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table className="w-full text-[13px]" style={{ fontFamily: 'var(--font-body)' }}>
              <thead>
                <tr style={{ background: '#FBF9F7', borderBottom: '1px solid #EDE8E3' }}>
                  <Th>Email</Th>
                  <Th>Type</Th>
                  <Th>Joined</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #F5F0EC' }}>
                    <Td>{row.email}</Td>
                    <Td>
                      <span
                        style={{
                          background: row.type === 'provider' ? '#EDF7F1' : '#FCEEF3',
                          color: row.type === 'provider' ? '#1D9E75' : '#E8347A',
                          padding: '3px 8px',
                          borderRadius: '2px',
                          fontWeight: 700,
                          fontSize: '10px',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {row.type || 'unknown'}
                      </span>
                    </Td>
                    <Td>{fmtDate(row.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent = '#111' }) {
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
    </div>
  );
}

function Th({ children }) {
  return (
    <th
      className="text-left px-4 py-3 text-[10px] uppercase"
      style={{
        color: '#888',
        letterSpacing: '0.10em',
        fontWeight: 700,
        fontFamily: 'var(--font-body)',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td className="px-4 py-3" style={{ color: '#111' }}>
      {children}
    </td>
  );
}

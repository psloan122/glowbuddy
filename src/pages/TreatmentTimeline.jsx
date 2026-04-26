import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, Users, PiggyBank, Ticket, Plus, ArrowUpDown,
  Pencil, Trash2, Share2, FileCheck, Camera, CheckCircle,
  Loader2, Download, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { fetchBenchmark, getBenchmarkLabel } from '../lib/priceBenchmark';
import { getProcedureLabel } from '../lib/procedureLabel';
import ProcedureIcon from '../components/ProcedureIcon';
import StarRating from '../components/StarRating';
import FairPriceBadge from '../components/FairPriceBadge';

const TYPICAL_UNITS = {
  'Botox / Dysport / Xeomin': 28, // legacy grouped name — backward compat
  'Botox': 28,
  'Dysport': 28,
  'Xeomin': 28,
  'Lip Filler': 1,
  'Cheek Filler': 1,
  'HydraFacial': 1,
};

function getUnits(proc) {
  if (proc.units_or_volume) {
    const num = parseFloat(proc.units_or_volume);
    if (!isNaN(num) && num > 0) return num;
  }
  return TYPICAL_UNITS[proc.procedure_type] || 1;
}

const FILTER_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'botox', label: 'Botox', match: (t) => t.includes('Botox') || t.includes('Dysport') || t.includes('Xeomin') || t === 'Botox Lip Flip' },
  { key: 'fillers', label: 'Fillers', match: (t) => t.toLowerCase().includes('filler') },
  { key: 'facials', label: 'Facials', match: (t) => ['HydraFacial', 'Chemical Peel', 'Microneedling', 'RF Microneedling', 'IPL / Photofacial'].includes(t) },
  { key: 'other', label: 'Other', match: () => true }, // fallback
];

function getCategory(procedureType) {
  for (const cat of FILTER_CATEGORIES) {
    if (cat.key === 'all' || cat.key === 'other') continue;
    if (cat.match(procedureType)) return cat.key;
  }
  return 'other';
}

function formatMonthYear(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTrustBadge(proc) {
  if (proc.receipt_verified) {
    return { label: 'Verified Purchase', color: '#0F6E56', bg: '#E1F5EE', icon: CheckCircle };
  }
  if (proc.result_photo_url) {
    return { label: 'Has result photo', color: '#185FA5', bg: '#E6F1FB', icon: Camera };
  }
  if (proc.has_receipt) {
    return { label: 'Receipt uploaded', color: '#92400E', bg: '#FEF3C7', icon: FileCheck };
  }
  return null;
}

export default function TreatmentTimeline() {
  const { user, openAuthModal, showToast } = useContext(AuthContext);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortAsc, setSortAsc] = useState(false);
  const [benchmarks, setBenchmarks] = useState({});
  const [profile, setProfile] = useState(null);
  const [totalEntries, setTotalEntries] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const deleteRef = useRef(null);

  useEffect(() => {
    document.title = 'My Treatment History | Know Before You Glow';
  }, []);

  // Close delete modal on outside click
  useEffect(() => {
    function handleClick(e) {
      if (deleteRef.current && !deleteRef.current.contains(e.target)) {
        setDeleteTarget(null);
      }
    }
    if (deleteTarget) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [deleteTarget]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    loadData();
  }, [user?.id]);

  async function loadData() {
    setLoading(true);

    const [procsResult, profileResult, entriesResult] = await Promise.all([
      supabase
        .from('procedures')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('city, state')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('giveaway_entries')
        .select('entries')
        .eq('user_id', user.id),
    ]);

    const procs = (procsResult.data || []).filter((p) =>
      p.normalized_category !== 'hidden'
    );
    setProcedures(procs);
    setProfile(profileResult.data);

    const total = (entriesResult.data || []).reduce((s, r) => s + (r.entries || 0), 0);
    setTotalEntries(total);

    // Batch fetch benchmarks
    const seen = new Set();
    const benchmarkMap = {};
    for (const p of procs) {
      const key = `${p.procedure_type}|${p.state}|${p.city}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const bm = await fetchBenchmark(p.procedure_type, p.state, p.city);
      if (bm) benchmarkMap[key] = bm;
    }
    setBenchmarks(benchmarkMap);
    setLoading(false);
  }

  // Stats calculations
  const uniqueProviders = new Set(procedures.map((p) => p.provider_name)).size;

  const totalSavings = procedures.reduce((acc, p) => {
    const key = `${p.procedure_type}|${p.state}|${p.city}`;
    const bm = benchmarks[key];
    if (!bm) return acc;
    const avgPrice = Number(bm.avg_price);
    const units = getUnits(p);
    const savings = (avgPrice - Number(p.price_paid)) * units;
    return savings > 0 ? acc + savings : acc;
  }, 0);

  const userCity = profile?.city || procedures[0]?.city || '';
  const userState = profile?.state || procedures[0]?.state || '';

  // Filtering
  const filtered = procedures.filter((p) => {
    if (filter === 'all') return true;
    return getCategory(p.procedure_type) === filter;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    const da = new Date(a.created_at).getTime();
    const db = new Date(b.created_at).getTime();
    return sortAsc ? da - db : db - da;
  });

  // Group by month
  const grouped = [];
  let currentMonth = null;
  for (const proc of sorted) {
    const month = formatMonthYear(proc.created_at);
    if (month !== currentMonth) {
      currentMonth = month;
      grouped.push({ type: 'divider', month });
    }
    grouped.push({ type: 'entry', proc });
  }

  // Delete handler
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase
      .from('procedures')
      .update({ status: 'deleted_by_user' })
      .eq('id', deleteTarget.id);
    setProcedures((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
    showToast('Treatment removed from your history.');
  }

  // Share handler
  const handleShare = useCallback(async (proc) => {
    const bmKey = `${proc.procedure_type}|${proc.state}|${proc.city}`;
    const bm = benchmarks[bmKey];
    const units = getUnits(proc);
    const total = Number(proc.price_paid) * units;
    let savingsText = '';
    if (bm) {
      const savings = (Number(bm.avg_price) - Number(proc.price_paid)) * units;
      if (savings > 0) savingsText = ` · Saved $${Math.round(savings)} vs avg`;
    }

    const text = `${proc.procedure_type} at ${proc.provider_name} · ${proc.city}, ${proc.state}\n$${Number(proc.price_paid).toLocaleString()}${proc.units_or_volume ? ` · ${proc.units_or_volume}` : ''}${savingsText}\n\nTracked on Know Before You Glow`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!');
    } catch {
      showToast('Could not share — try copying manually.', 'error');
    }
  }, [benchmarks, showToast]);

  // Export handler — opens print-friendly HTML in new tab for Save as PDF
  async function handleExport() {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-history', {
        body: {},
        responseType: 'text',
      });
      if (error) throw error;

      const html = typeof data === 'string' ? data : await data.text?.() || '';
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Trigger print dialog after content loads
        printWindow.onload = () => printWindow.print();
      }
      showToast('Print dialog opened — save as PDF.');
    } catch {
      showToast('Failed to export. Please try again.', 'error');
    }
    setExporting(false);
  }

  // Auth gate
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="glow-card p-8">
          <Clock className="w-12 h-12 text-rose-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">My Treatment History</h1>
          <p className="text-text-secondary mb-6">
            Sign in to see your complete cosmetic treatment timeline.
          </p>
          <button
            onClick={() => openAuthModal('signup')}
            className="px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="animate-pulse text-rose-accent text-center text-lg">
          Loading your history...
        </div>
      </div>
    );
  }

  // Empty state
  if (procedures.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="glow-card p-8">
          <Clock className="w-12 h-12 text-rose-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">My Treatment History</h1>
          <p className="text-text-secondary mb-6">
            Your treatment history will appear here.
            Share your first price to get started.
          </p>
          <Link
            to="/log"
            className="inline-flex items-center gap-1.5 px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            <Plus size={16} />
            Share a price
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">My Treatment History</h1>
        <p className="text-text-secondary mt-1">
          {procedures.length} treatment{procedures.length !== 1 ? 's' : ''} logged
          {userCity ? ` · ${userCity}${userState ? `, ${userState}` : ''}` : ''}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="glow-card p-4 text-center">
          <Clock size={18} className="text-rose-accent mx-auto mb-1.5" />
          <p className="text-xl font-bold text-text-primary">{procedures.length}</p>
          <p className="text-[11px] text-text-secondary">Treatments</p>
        </div>
        <div className="glow-card p-4 text-center">
          <Users size={18} className="text-rose-accent mx-auto mb-1.5" />
          <p className="text-xl font-bold text-text-primary">{uniqueProviders}</p>
          <p className="text-[11px] text-text-secondary">Providers</p>
        </div>
        <div className="glow-card p-4 text-center">
          <PiggyBank size={18} className="text-rose-accent mx-auto mb-1.5" />
          <p className="text-xl font-bold text-text-primary">
            {totalSavings > 0 ? `$${Math.round(totalSavings).toLocaleString()}` : '$0'}
          </p>
          <p className="text-[11px] text-text-secondary">Est Savings</p>
        </div>
        <div className="glow-card p-4 text-center">
          <Ticket size={18} className="text-rose-accent mx-auto mb-1.5" />
          <p className="text-xl font-bold text-text-primary">{totalEntries}</p>
          <p className="text-[11px] text-text-secondary">Entries</p>
        </div>
      </div>

      {/* Filter bar + sort toggle */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                filter === cat.key
                  ? 'bg-rose-accent text-white'
                  : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-gray-100 hover:bg-gray-200 rounded-full transition-colors shrink-0"
          title={sortAsc ? 'Oldest first' : 'Newest first'}
        >
          <ArrowUpDown size={12} />
          {sortAsc ? 'Oldest' : 'Newest'}
        </button>
      </div>

      {/* No results for filter */}
      {sorted.length === 0 && (
        <div className="glow-card p-8 text-center">
          <p className="text-text-secondary">No treatments match this filter.</p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        {sorted.length > 0 && (
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
        )}

        {grouped.map((item, idx) => {
          if (item.type === 'divider') {
            return (
              <div key={`div-${item.month}`} className="relative flex items-center gap-3 mb-4 mt-6 first:mt-0">
                <div className="w-8 h-8 rounded-full bg-rose-accent/10 flex items-center justify-center shrink-0 z-10">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-accent" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">{item.month}</h3>
              </div>
            );
          }

          const proc = item.proc;
          const bmKey = `${proc.procedure_type}|${proc.state}|${proc.city}`;
          const bm = benchmarks[bmKey];
          const units = getUnits(proc);
          const total = Number(proc.price_paid) * units;
          const trustBadge = getTrustBadge(proc);

          let savings = null;
          if (bm) {
            const s = (Number(bm.avg_price) - Number(proc.price_paid)) * units;
            if (s > 0) savings = Math.round(s);
          }

          return (
            <div key={proc.id} className="relative flex gap-3 mb-4 pl-0">
              {/* Timeline dot */}
              <div className="w-8 flex justify-center shrink-0 pt-5 z-10">
                <div className="w-2 h-2 rounded-full bg-gray-300" />
              </div>

              {/* Card */}
              <div className="flex-1 glow-card p-4">
                {/* Top row: procedure pill + trust badge */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-dark bg-rose-light px-2.5 py-1 rounded-full">
                    <ProcedureIcon type={proc.procedure_type} size={14} className="text-rose-dark" />
                    {getProcedureLabel(proc.procedure_type, proc.brand)}
                  </span>
                  {trustBadge && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ color: trustBadge.color, backgroundColor: trustBadge.bg }}
                    >
                      <trustBadge.icon size={11} />
                      {trustBadge.label}
                    </span>
                  )}
                </div>

                {/* Provider + location */}
                <p className="text-sm text-text-primary font-medium">
                  {proc.provider_name}
                  {proc.city && proc.state && (
                    <span className="text-text-secondary font-normal">
                      {' '}&middot; {proc.city}, {proc.state}
                    </span>
                  )}
                </p>

                {/* Date */}
                <p className="text-xs text-text-secondary mt-0.5">
                  {formatDate(proc.created_at)}
                  {proc.updated_at && proc.updated_at !== proc.created_at && (
                    <span className="text-text-secondary/60"> · Edited {formatDate(proc.updated_at)}</span>
                  )}
                </p>

                {/* Price line */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-lg font-bold text-text-primary">
                    ${Number(proc.price_paid).toLocaleString()}
                  </span>
                  {proc.units_or_volume && (
                    <span className="text-sm text-text-secondary">
                      · {proc.units_or_volume}
                      {total !== Number(proc.price_paid) && ` · $${total.toLocaleString()} total`}
                    </span>
                  )}
                </div>

                {/* Fair price badge */}
                <div className="mt-1.5">
                  <FairPriceBadge
                    price={proc.price_paid}
                    procedureType={proc.procedure_type}
                    state={proc.state}
                    city={proc.city}
                  />
                  {savings && (
                    <span className="ml-2 text-xs text-green-600 font-medium">
                      Saved ${savings.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Rating + review */}
                {proc.rating && (
                  <div className="mt-2.5">
                    <StarRating value={proc.rating} readOnly size={14} />
                    {proc.review_body && (
                      <p className="text-xs italic text-text-secondary mt-1 line-clamp-2">
                        &ldquo;{proc.review_body}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Result photo thumbnail */}
                {proc.result_photo_url && (
                  <div className="mt-2.5">
                    <img
                      src={proc.result_photo_url}
                      alt="Result"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-100"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Pioneer + entries */}
                {proc.pioneer_tier && (
                  <p className="text-xs text-text-secondary mt-2">
                    <span className="text-amber-500">&#127941;</span> Pioneer
                  </p>
                )}

                {/* Notes */}
                {proc.notes && (
                  <p className="text-xs text-text-secondary mt-2 line-clamp-2 italic">
                    {proc.notes}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Link
                    to={`/log?procedure=${encodeURIComponent(proc.procedure_type)}&provider=${encodeURIComponent(proc.provider_name || '')}&city=${encodeURIComponent(proc.city || '')}&state=${encodeURIComponent(proc.state || '')}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-rose-accent transition-colors px-2 py-1 rounded-lg hover:bg-rose-light/30"
                  >
                    <Pencil size={12} />
                    Edit
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(proc)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                  <button
                    onClick={() => handleShare(proc)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-rose-accent transition-colors px-2 py-1 rounded-lg hover:bg-rose-light/30"
                  >
                    <Share2 size={12} />
                    Share
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Export PDF */}
      {procedures.length > 0 && (
        <div className="text-center mt-8 pb-4">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-rose-accent transition-colors"
          >
            {exporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {exporting ? 'Generating PDF...' : 'Export PDF'}
          </button>
          <p className="text-[11px] text-text-secondary/60 mt-1">
            Great for medical records, FSA reimbursement, or VA documentation.
          </p>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
          <div ref={deleteRef} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">Remove Treatment</h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              Remove this treatment from your history? This will also remove it from
              Know Before You Glow&apos;s price data.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

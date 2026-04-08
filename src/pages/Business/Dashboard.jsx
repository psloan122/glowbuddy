import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  Check,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Star,
  Settings as SettingsIcon,
  Sparkles,
  Eye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../App';
import { extractPlaceData } from '../../lib/places';
import { loadGoogleMaps } from '../../lib/loadGoogleMaps';
import {
  PROCEDURE_TYPES,
  PROCEDURE_CATEGORIES,
  TREATMENT_AREAS,
} from '../../lib/constants';
import InjectorsTab from '../../components/DashboardTabs/InjectorsTab';
import DashboardBeforeAfterTab from '../../components/DashboardTabs/BeforeAfterTab';
import DashboardReviewsTab from '../../components/DashboardTabs/ReviewsTab';
import SpecialsManager from '../../components/SpecialsManager';
import CallAnalyticsTab from '../../components/DashboardTabs/CallAnalyticsTab';
import SubmissionsTab from '../../components/DashboardTabs/SubmissionsTab';
import CallVolumeChart from '../../components/CallVolumeChart';
import VagaroConnectFlow from '../../components/VagaroConnectFlow';
import IntegrationStats from '../../components/IntegrationStats';


const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

const TABS = ['Overview', 'Menu', 'Promoted Specials', 'Call Analytics', 'Integrations', 'Injectors', 'Before & Afters', 'Reviews', 'Submissions', 'Disputes', 'Settings'];

export default function Dashboard() {
  const { session, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');

  // Menu state
  const [pricing, setPricing] = useState([]);
  const [showAddPricing, setShowAddPricing] = useState(false);
  const [editingPricingId, setEditingPricingId] = useState(null);
  const [pricingForm, setPricingForm] = useState({
    procedure_type: '',
    treatment_area: '',
    units_or_volume: '',
    price: '',
    price_label: '',
  });
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingError, setPricingError] = useState('');

  // Disputes state
  const [disputes, setDisputes] = useState([]);

  // Community procedures state
  const [communityProcedures, setCommunityProcedures] = useState([]);

  // Page view analytics state
  const [pageViewsByWeek, setPageViewsByWeek] = useState([]);
  const [pageViewsLoading, setPageViewsLoading] = useState(false);

  // Dispute resolution state
  const [disputeFilter, setDisputeFilter] = useState('all');
  const [resolvingDisputeId, setResolvingDisputeId] = useState(null);
  const [disputeAction, setDisputeAction] = useState('resolved');
  const [disputeNote, setDisputeNote] = useState('');
  const [disputeSaving, setDisputeSaving] = useState(false);

  // New tab states
  const [dashInjectors, setDashInjectors] = useState([]);
  const [dashBAPhotos, setDashBAPhotos] = useState([]);
  const [dashReviews, setDashReviews] = useState([]);

  // Settings state
  const [refreshing, setRefreshing] = useState(false);
  const detailsServiceRef = useRef(null);

  useEffect(() => {
    document.title = 'Provider Dashboard | GlowBuddy';
  }, []);

  // Auth redirect
  useEffect(() => {
    if (!session) {
      navigate('/business/onboarding');
    }
  }, [session, navigate]);

  // Fetch provider on mount
  const fetchProvider = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('owner_user_id', user.id)
      .single();

    if (error || !data) {
      setProvider(null);
    } else {
      setProvider(data);

      // Ensure profile role is synced (may have been missed during onboarding)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile && profile.role !== 'provider') {
        await supabase
          .from('profiles')
          .update({ role: 'provider' })
          .eq('id', user.id);
      }
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchProvider();
  }, [fetchProvider]);

  // Fetch all data once provider is loaded
  const fetchPricing = useCallback(async () => {
    if (!provider) return;
    const { data } = await supabase
      .from('provider_pricing')
      .select('*')
      .eq('provider_id', provider.id)
      .order('procedure_type');
    setPricing(data || []);
  }, [provider]);

  const fetchDisputes = useCallback(async () => {
    if (!provider) return;
    const { data } = await supabase
      .from('disputes')
      .select('*, procedures(*)')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false });
    setDisputes(data || []);
  }, [provider]);

  const fetchCommunityProcedures = useCallback(async () => {
    if (!provider) return;
    const { data } = await supabase
      .from('procedures')
      .select('*')
      .eq('provider_slug', provider.slug)
      .eq('status', 'active');
    setCommunityProcedures(data || []);
  }, [provider]);

  const fetchInjectors = useCallback(async () => {
    if (!provider) return;
    const { data } = await supabase
      .from('injectors')
      .select('*')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false });
    setDashInjectors(data || []);
  }, [provider]);

  const fetchBAPhotos = useCallback(async () => {
    if (!provider) return;
    const { data } = await supabase
      .from('before_after_photos')
      .select('*, injectors(name)')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false });
    setDashBAPhotos(data || []);
  }, [provider]);

  const fetchDashReviews = useCallback(async () => {
    if (!provider) return;
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false });
    setDashReviews(data || []);
  }, [provider]);

  const fetchPageViewAnalytics = useCallback(async () => {
    if (!provider?.slug) return;
    setPageViewsLoading(true);
    const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('custom_events')
      .select('created_at')
      .eq('event_name', 'provider_page_view')
      .contains('properties', { provider_slug: provider.slug })
      .gte('created_at', twentyEightDaysAgo);

    const events = data || [];
    const now = new Date();
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      weeks.push({ label: `Week ${4 - i}`, calls: 0, start, end });
    }
    for (const event of events) {
      const eventDate = new Date(event.created_at);
      for (const week of weeks) {
        if (eventDate >= week.start && eventDate < week.end) {
          week.calls++;
          break;
        }
      }
    }
    setPageViewsByWeek(weeks.map(({ label, calls }) => ({ label, calls })));
    setPageViewsLoading(false);
  }, [provider?.slug]);

  useEffect(() => {
    if (provider) {
      fetchPricing();
      fetchDisputes();
      fetchCommunityProcedures();
      fetchInjectors();
      fetchBAPhotos();
      fetchDashReviews();
      fetchPageViewAnalytics();
    }
  }, [provider, fetchPricing, fetchDisputes, fetchCommunityProcedures, fetchInjectors, fetchBAPhotos, fetchDashReviews, fetchPageViewAnalytics]);

  // --- Menu Handlers ---

  function resetPricingForm() {
    setPricingForm({
      procedure_type: '',
      treatment_area: '',
      units_or_volume: '',
      price: '',
      price_label: '',
    });
  }

  function startEditPricing(item) {
    setEditingPricingId(item.id);
    setPricingForm({
      procedure_type: item.procedure_type || '',
      treatment_area: item.treatment_area || '',
      units_or_volume: item.units_or_volume || '',
      price: item.price?.toString() || '',
      price_label: item.price_label || '',
    });
    setShowAddPricing(false);
  }

  function cancelEditPricing() {
    setEditingPricingId(null);
    resetPricingForm();
  }

  async function handleSavePricing(e) {
    e.preventDefault();
    setPricingSaving(true);
    setPricingError('');

    const payload = {
      provider_id: provider.id,
      procedure_type: pricingForm.procedure_type,
      treatment_area: pricingForm.treatment_area || null,
      units_or_volume: pricingForm.units_or_volume || null,
      price: parseFloat(pricingForm.price),
      price_label: pricingForm.price_label || null,
    };

    if (editingPricingId) {
      const { error: updateError } = await supabase
        .from('provider_pricing')
        .update(payload)
        .eq('id', editingPricingId);

      if (updateError) {
        setPricingError(`Could not save pricing. Please try again. (${updateError.message})`);
        setPricingSaving(false);
        return;
      }
      setEditingPricingId(null);
    } else {
      const { error: insertError } = await supabase
        .from('provider_pricing')
        .insert(payload);

      if (insertError) {
        setPricingError(`Could not save pricing. Please try again. (${insertError.message})`);
        setPricingSaving(false);
        return;
      }
      setShowAddPricing(false);
    }

    resetPricingForm();
    setPricingSaving(false);
    fetchPricing();
  }

  async function handleDeletePricing(id) {
    if (!window.confirm('Are you sure you want to delete this pricing entry?')) {
      return;
    }
    await supabase.from('provider_pricing').delete().eq('id', id);
    fetchPricing();
  }

  // --- Settings: Refresh from Google ---

  async function handleRefreshFromGoogle() {
    if (!provider?.google_place_id) return;
    setRefreshing(true);

    try {
      // Load Google Maps if not loaded
      if (!window.google?.maps?.places) {
        await loadGoogleMaps();
        await new Promise((r) => {
          const check = () => window.google?.maps?.places ? r() : setTimeout(check, 100);
          check();
        });
      }
      if (!detailsServiceRef.current) {
        const el = document.createElement('div');
        detailsServiceRef.current = new window.google.maps.places.PlacesService(el);
      }

      const place = await new Promise((resolve, reject) => {
        detailsServiceRef.current.getDetails(
          {
            placeId: provider.google_place_id,
            fields: [
              'name', 'address_components', 'formatted_address', 'formatted_phone_number',
              'website', 'place_id', 'geometry',
              'opening_hours', 'photos', 'rating', 'user_ratings_total', 'price_level', 'types', 'url',
            ],
          },
          (result, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
              resolve(result);
            } else {
              reject(new Error('Places lookup failed'));
            }
          }
        );
      });

      const placeData = extractPlaceData(place);

      // Update Google metadata only (don't overwrite custom fields)
      const { data } = await supabase
        .from('providers')
        .update({
          google_rating: placeData.googleRating,
          google_review_count: placeData.googleReviewCount,
          google_maps_url: placeData.googleMapsUrl,
          google_price_level: placeData.googlePriceLevel,
          hours_text: placeData.hoursText || null,
          google_synced_at: new Date().toISOString(),
        })
        .eq('id', provider.id)
        .select()
        .single();

      if (data) setProvider(data);

      // Import photos if none exist yet
      if (!provider.photos_imported && placeData.googlePhotos.length > 0) {
        try {
          await fetch('/api/import-google-photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              providerId: provider.id,
              photos: placeData.googlePhotos,
            }),
          });
          await supabase
            .from('providers')
            .update({ photos_imported: true })
            .eq('id', provider.id);
        } catch {
          // Photo import is non-blocking during refresh
        }
      }
    } catch {
      // Refresh is non-blocking — state is already set
    }

    setRefreshing(false);
  }

  // --- Dispute Resolution Handler ---

  async function handleResolveDispute(disputeId, newStatus) {
    setDisputeSaving(true);
    await supabase
      .from('disputes')
      .update({
        status: newStatus,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        response_note: disputeNote.trim() || null,
      })
      .eq('id', disputeId);

    setResolvingDisputeId(null);
    setDisputeAction('resolved');
    setDisputeNote('');
    setDisputeSaving(false);
    fetchDisputes();
  }

  // --- Computed Stats ---

  const communityAvgPrice =
    communityProcedures.length > 0
      ? Math.round(
          communityProcedures.reduce((sum, p) => sum + (p.price_paid || 0), 0) /
            communityProcedures.length
        )
      : null;

  const menuAvgPrice =
    pricing.length > 0
      ? Math.round(
          pricing.reduce((sum, p) => sum + (p.price || 0), 0) / pricing.length
        )
      : null;

  // --- Pricing form row component ---

  function PricingFormRow({ onSubmit, onCancel, isEdit }) {
    return (
      <form onSubmit={onSubmit} className="glow-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Procedure Type
            </label>
            <select
              value={pricingForm.procedure_type}
              onChange={(e) =>
                setPricingForm((f) => ({
                  ...f,
                  procedure_type: e.target.value,
                }))
              }
              required
              className={INPUT_CLASS + ' text-sm'}
            >
              <option value="">Select...</option>
              {Object.entries(PROCEDURE_CATEGORIES).map(([category, procedures]) => (
                <optgroup key={category} label={category}>
                  {procedures.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Treatment Area
            </label>
            <select
              value={pricingForm.treatment_area}
              onChange={(e) =>
                setPricingForm((f) => ({
                  ...f,
                  treatment_area: e.target.value,
                }))
              }
              className={INPUT_CLASS + ' text-sm'}
            >
              <option value="">Select...</option>
              {TREATMENT_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Units / Volume
            </label>
            <input
              type="text"
              value={pricingForm.units_or_volume}
              onChange={(e) =>
                setPricingForm((f) => ({
                  ...f,
                  units_or_volume: e.target.value,
                }))
              }
              placeholder="e.g. 20 units"
              className={INPUT_CLASS + ' text-sm'}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={pricingForm.price}
              onChange={(e) =>
                setPricingForm((f) => ({ ...f, price: e.target.value }))
              }
              required
              placeholder="0.00"
              className={INPUT_CLASS + ' text-sm'}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Price Label
            </label>
            <input
              type="text"
              value={pricingForm.price_label}
              onChange={(e) =>
                setPricingForm((f) => ({
                  ...f,
                  price_label: e.target.value,
                }))
              }
              placeholder="e.g. per unit"
              className={INPUT_CLASS + ' text-sm'}
            />
          </div>
        </div>
        {pricingError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {pricingError}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pricingSaving}
            className="bg-rose-accent text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-rose-dark transition disabled:opacity-50"
          >
            {pricingSaving ? 'Saving...' : isEdit ? 'Update' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-text-secondary hover:text-text-primary transition text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  // --- Loading / Auth States ---

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-rose-accent" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="glow-card p-8">
          <AlertTriangle
            size={40}
            className="text-rose-accent mx-auto mb-4"
          />
          <h2 className="text-xl font-bold text-text-primary mb-2">
            You haven't claimed a listing yet
          </h2>
          <p className="text-text-secondary mb-6">
            Claim or create your practice listing to access the provider
            dashboard.
          </p>
          <Link
            to="/business/onboarding"
            className="inline-block bg-rose-accent text-white px-8 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
          >
            Set Up Your Practice
          </Link>
        </div>
      </div>
    );
  }

  // --- Main Dashboard ---

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {provider.name}
          </h1>
          <p className="text-text-secondary text-sm">
            {provider.city}, {provider.state}{' '}
            {provider.is_verified && (
              <span className="inline-flex items-center gap-1 text-verified text-xs font-medium ml-1">
                <Check size={14} /> Verified
              </span>
            )}
          </p>
        </div>
        <Link
          to={`/provider/${provider.slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-rose-accent hover:text-rose-dark transition font-medium"
        >
          View Public Profile <ArrowUpRight size={16} />
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-6 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-2 border-rose-accent text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'Overview' && (
        <div>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="glow-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-rose-light flex items-center justify-center">
                  <Eye size={18} className="text-rose-accent" />
                </div>
                <span className="text-sm text-text-secondary">
                  Profile Views
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {provider.page_view_count_week || 0}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                this week &middot; {provider.page_view_count_total || 0} all time
              </p>
            </div>

            <div className="glow-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Star size={18} className="text-amber-500" />
                </div>
                <span className="text-sm text-text-secondary">
                  GlowBuddy Rating
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {provider.avg_rating || '--'}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {dashReviews.length} review{dashReviews.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="glow-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-community/10 flex items-center justify-center">
                  <Users size={18} className="text-community" />
                </div>
                <span className="text-sm text-text-secondary">
                  Community Submissions
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {communityProcedures.length}
              </p>
            </div>

            <div className="glow-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-community/10 flex items-center justify-center">
                  <DollarSign size={18} className="text-community" />
                </div>
                <span className="text-sm text-text-secondary">
                  Avg Patient-Reported
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {communityAvgPrice !== null ? `$${communityAvgPrice}` : '--'}
              </p>
            </div>

            <div className="glow-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-verified/10 flex items-center justify-center">
                  <BarChart3 size={18} className="text-verified" />
                </div>
                <span className="text-sm text-text-secondary">
                  Avg Menu Price
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {menuAvgPrice !== null ? `$${menuAvgPrice}` : '--'}
              </p>
            </div>
          </div>

          {/* Page Views Weekly Chart */}
          {!pageViewsLoading && pageViewsByWeek.some((w) => w.calls > 0) && (
            <div className="glow-card p-6 mb-8">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Profile Views by Week</h3>
              <CallVolumeChart data={pageViewsByWeek} chart="bar" />
            </div>
          )}

          {/* Quick Comparison */}
          {communityAvgPrice !== null && menuAvgPrice !== null && (
            <div className="glow-card p-5 mb-8">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Quick Comparison
              </h3>
              <p className="text-text-primary">
                Patients report an average of{' '}
                <span className="font-bold">${communityAvgPrice}</span> vs your
                menu price of{' '}
                <span className="font-bold">${menuAvgPrice}</span>.
              </p>
            </div>
          )}

          {/* Bid Requests waitlist CTA */}
          <Link
            to="/business/bid-requests"
            className="block mb-8"
            style={{
              background: '#fff',
              border: '1px solid #EDE8E3',
              borderTop: '3px solid #E8347A',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <p
                className="text-[10px] uppercase"
                style={{
                  color: '#888',
                  letterSpacing: '0.10em',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                }}
              >
                BID REQUESTS
              </p>
              <span
                style={{
                  background: '#E8347A',
                  color: '#fff',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: '9px',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '2px',
                }}
              >
                Waitlist Open
              </span>
            </div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '20px',
                color: '#111',
              }}
            >
              New patients will bid for your availability — coming soon
            </p>
            <p
              className="mt-1 text-[12px]"
              style={{ fontFamily: 'var(--font-body)', color: '#666' }}
            >
              Join the waitlist and we&rsquo;ll notify you the moment it launches.
            </p>
          </Link>

          {/* Upgrade CTA */}
          <UpgradeCTA />
        </div>
      )}

      {/* ===== MENU TAB ===== */}
      {activeTab === 'Menu' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text-primary">
              Your Procedure Menu
            </h2>
            {!showAddPricing && !editingPricingId && (
              <button
                onClick={() => {
                  resetPricingForm();
                  setShowAddPricing(true);
                }}
                className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-rose-dark transition"
              >
                <Plus size={16} /> Add Procedure
              </button>
            )}
          </div>

          {/* Add form */}
          {showAddPricing && (
            <div className="mb-6">
              <PricingFormRow
                onSubmit={handleSavePricing}
                onCancel={() => {
                  setShowAddPricing(false);
                  resetPricingForm();
                }}
                isEdit={false}
              />
            </div>
          )}

          {/* Pricing list */}
          {pricing.length === 0 && !showAddPricing ? (
            <div className="glow-card p-8 text-center">
              <p className="text-text-secondary mb-3">
                No procedures on your menu yet.
              </p>
              <button
                onClick={() => {
                  resetPricingForm();
                  setShowAddPricing(true);
                }}
                className="text-rose-accent font-medium hover:text-rose-dark transition"
              >
                Add your first procedure
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pricing.map((item) =>
                editingPricingId === item.id ? (
                  <PricingFormRow
                    key={item.id}
                    onSubmit={handleSavePricing}
                    onCancel={cancelEditPricing}
                    isEdit={true}
                  />
                ) : (
                  <div
                    key={item.id}
                    className="glow-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-text-primary">
                          {item.procedure_type}
                        </span>
                        {item.treatment_area && (
                          <span className="text-xs bg-warm-gray text-text-secondary px-2 py-0.5 rounded-full">
                            {item.treatment_area}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-lg font-bold text-text-primary">
                          ${item.price}
                        </span>
                        {item.price_label && (
                          <span className="text-sm text-text-secondary">
                            {item.price_label}
                          </span>
                        )}
                        {item.units_or_volume && (
                          <span className="text-sm text-text-secondary">
                            ({item.units_or_volume})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEditPricing(item)}
                        className="p-2 rounded-lg hover:bg-warm-gray text-text-secondary hover:text-text-primary transition"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePricing(item.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-500 transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Upgrade CTA */}
          <div className="mt-8">
            <UpgradeCTA />
          </div>
        </div>
      )}

      {/* ===== PROMOTED SPECIALS TAB ===== */}
      {activeTab === 'Promoted Specials' && (
        <SpecialsManager provider={provider} />
      )}

      {/* ===== CALL ANALYTICS TAB ===== */}
      {activeTab === 'Call Analytics' && (
        <CallAnalyticsTab providerId={provider?.id} />
      )}

      {/* ===== INTEGRATIONS TAB ===== */}
      {activeTab === 'Integrations' && (
        <div>
          <VagaroConnectFlow providerId={provider?.id} />
          <IntegrationStats providerId={provider?.id} />
        </div>
      )}

      {/* ===== INJECTORS TAB ===== */}
      {activeTab === 'Injectors' && (
        <InjectorsTab
          provider={provider}
          injectors={dashInjectors}
          onRefresh={fetchInjectors}
        />
      )}

      {/* ===== BEFORE & AFTERS TAB ===== */}
      {activeTab === 'Before & Afters' && (
        <DashboardBeforeAfterTab
          provider={provider}
          photos={dashBAPhotos}
          injectors={dashInjectors}
          onRefresh={fetchBAPhotos}
        />
      )}

      {/* ===== REVIEWS TAB ===== */}
      {activeTab === 'Reviews' && (
        <DashboardReviewsTab
          reviews={dashReviews}
          provider={provider}
          onRefresh={fetchDashReviews}
        />
      )}

      {/* ===== SUBMISSIONS TAB ===== */}
      {activeTab === 'Submissions' && (
        <SubmissionsTab communityProcedures={communityProcedures} pricing={pricing} />
      )}

      {/* ===== DISPUTES TAB ===== */}
      {activeTab === 'Disputes' && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-6">
            Flagged Submissions
          </h2>

          {/* Filter bar */}
          {disputes.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <select
                value={disputeFilter}
                onChange={(e) => setDisputeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-text-primary focus:border-rose-accent outline-none transition"
              >
                <option value="all">All ({disputes.length})</option>
                <option value="pending">
                  Pending ({disputes.filter((d) => d.status === 'pending').length})
                </option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          )}

          {disputes.length === 0 ? (
            <div className="glow-card p-8 text-center">
              <p className="text-text-secondary">No flagged submissions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes
                .filter((d) => disputeFilter === 'all' || d.status === disputeFilter)
                .map((dispute) => {
                const proc = dispute.procedures;
                const matchingMenu = pricing.find(
                  (p) => p.procedure_type === proc?.procedure_type
                );

                let statusColor = 'bg-yellow-100 text-yellow-700';
                if (dispute.status === 'resolved') {
                  statusColor = 'bg-verified/10 text-verified';
                } else if (dispute.status === 'dismissed') {
                  statusColor = 'bg-gray-100 text-text-secondary';
                }

                return (
                  <div key={dispute.id} className="glow-card p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-text-primary">
                            {proc?.procedure_type || 'Unknown Procedure'}
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor}`}
                          >
                            {dispute.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-text-secondary">
                              Patient reported:
                            </span>{' '}
                            <span className="font-medium text-text-primary">
                              ${proc?.price_paid || '--'}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-secondary">
                              Your menu price:
                            </span>{' '}
                            <span className="font-medium text-text-primary">
                              {matchingMenu
                                ? `$${matchingMenu.price}`
                                : 'Not listed'}
                            </span>
                          </div>
                          {proc?.created_at && (
                            <div>
                              <span className="text-text-secondary">
                                Date:
                              </span>{' '}
                              <span className="text-text-primary">
                                {new Date(
                                  proc.created_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {proc?.city && (
                            <div>
                              <span className="text-text-secondary">
                                City:
                              </span>{' '}
                              <span className="text-text-primary">
                                {proc.city}
                              </span>
                            </div>
                          )}
                        </div>
                        {dispute.reason && (
                          <div className="mt-2 text-sm">
                            <span className="text-text-secondary">
                              Dispute reason:
                            </span>{' '}
                            <span className="text-text-primary">
                              {dispute.reason}
                            </span>
                          </div>
                        )}

                        {/* Resolution info for resolved/dismissed disputes */}
                        {(dispute.status === 'resolved' || dispute.status === 'dismissed') && dispute.resolved_at && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-text-secondary">
                              {dispute.status === 'resolved' ? 'Resolved' : 'Dismissed'} on{' '}
                              {new Date(dispute.resolved_at).toLocaleDateString()}
                            </p>
                            {dispute.response_note && (
                              <p className="text-sm text-text-primary mt-1">
                                {dispute.response_note}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons for pending disputes */}
                      {dispute.status === 'pending' && (
                        <div className="shrink-0">
                          {resolvingDisputeId === dispute.id ? (
                            <div className="space-y-2 w-64">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setDisputeAction('resolved')}
                                  className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                                    disputeAction === 'resolved'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                                  }`}
                                >
                                  Resolve
                                </button>
                                <button
                                  onClick={() => setDisputeAction('dismissed')}
                                  className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                                    disputeAction === 'dismissed'
                                      ? 'bg-gray-200 text-text-primary'
                                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                                  }`}
                                >
                                  Dismiss
                                </button>
                              </div>
                              <textarea
                                value={disputeNote}
                                onChange={(e) => setDisputeNote(e.target.value)}
                                placeholder="Optional note..."
                                rows={2}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm resize-none"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleResolveDispute(dispute.id, disputeAction)}
                                  disabled={disputeSaving}
                                  className="bg-rose-accent text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-rose-dark transition disabled:opacity-50 inline-flex items-center gap-1"
                                >
                                  {disputeSaving && <Loader2 size={12} className="animate-spin" />}
                                  Confirm
                                </button>
                                <button
                                  onClick={() => {
                                    setResolvingDisputeId(null);
                                    setDisputeAction('resolved');
                                    setDisputeNote('');
                                  }}
                                  className="text-xs text-text-secondary hover:text-text-primary transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setResolvingDisputeId(dispute.id);
                                  setDisputeAction('resolved');
                                  setDisputeNote('');
                                }}
                                className="text-xs px-3 py-1.5 rounded-full font-medium bg-green-50 text-green-700 hover:bg-green-100 transition"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => {
                                  setResolvingDisputeId(dispute.id);
                                  setDisputeAction('dismissed');
                                  setDisputeNote('');
                                }}
                                className="text-xs px-3 py-1.5 rounded-full font-medium bg-gray-100 text-text-secondary hover:bg-gray-200 transition"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upgrade CTA */}
          <div className="mt-8">
            <UpgradeCTA />
          </div>
        </div>
      )}

      {/* ===== SETTINGS TAB ===== */}
      {activeTab === 'Settings' && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-6">
            Settings
          </h2>

          {/* Google Places Data */}
          {provider.google_place_id && (
            <div className="glow-card p-5 mb-6">
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <SettingsIcon size={16} className="text-text-secondary" />
                Google Places Data
              </h3>

              <div className="space-y-3">
                {provider.google_synced_at && (
                  <p className="text-sm text-text-secondary">
                    Last synced from Google:{' '}
                    <span className="text-text-primary font-medium">
                      {formatDistanceToNow(new Date(provider.google_synced_at), { addSuffix: true })}
                    </span>
                  </p>
                )}

                {provider.google_rating && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="font-medium text-text-primary">{provider.google_rating}</span>
                    {provider.google_review_count && (
                      <span className="text-text-secondary">
                        &middot; {provider.google_review_count.toLocaleString()} reviews
                      </span>
                    )}
                  </div>
                )}

                <button
                  onClick={handleRefreshFromGoogle}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 bg-white border border-gray-200 text-text-primary px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Refreshing...' : 'Refresh from Google'}
                </button>

                <p className="text-xs text-text-secondary">
                  Updates your Google rating, review count, and hours. Does not overwrite your tagline, about, or Instagram.
                </p>
              </div>
            </div>
          )}

          {!provider.google_place_id && (
            <div className="glow-card p-5">
              <p className="text-sm text-text-secondary">
                No Google Places data linked to this profile. Google sync is available for practices found via Google search during onboarding.
              </p>
            </div>
          )}

          {/* Active Special (inline promo on browse cards) */}
          <ActiveSpecialEditor provider={provider} setProvider={setProvider} />

          {/* First-Timer Settings */}
          <div className="glow-card p-5 mt-6">
            <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-[#0369A1]" />
              First-Timer Settings
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={provider.first_timer_friendly || false}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    const { data } = await supabase
                      .from('providers')
                      .update({ first_timer_friendly: val })
                      .eq('id', provider.id)
                      .select()
                      .single();
                    if (data) setProvider(data);
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-text-primary">We welcome first-timers</span>
              </label>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  First-Timer Special (shown on your profile)
                </label>
                <textarea
                  defaultValue={provider.first_timer_special || ''}
                  onBlur={async (e) => {
                    const val = e.target.value.trim() || null;
                    if (val === (provider.first_timer_special || null)) return;
                    const { data } = await supabase
                      .from('providers')
                      .update({ first_timer_special: val })
                      .eq('id', provider.id)
                      .select()
                      .single();
                    if (data) setProvider(data);
                  }}
                  placeholder="e.g. 10% off your first Botox session"
                  rows={2}
                  className={INPUT_CLASS + ' text-sm'}
                />
                <p className="text-xs text-text-secondary mt-1">
                  Saves automatically when you click away.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline editor for the single-line "Active Special" shown on a provider's
// browse card. Distinct from the full Promoted Specials workflow. Gated to
// claimed providers; a future "Verified" tier check can be dropped in here
// when the subscription schema lands.
function ActiveSpecialEditor({ provider, setProvider }) {
  const MAX_LEN = 80;
  const [text, setText] = useState(provider.active_special || '');
  const [expiresAt, setExpiresAt] = useState(
    provider.special_expires_at
      ? provider.special_expires_at.slice(0, 10)
      : '',
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const trimmed = text.trim();
    const payload = {
      active_special: trimmed || null,
      special_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      special_added_at: trimmed ? new Date().toISOString() : null,
    };
    const { data } = await supabase
      .from('providers')
      .update(payload)
      .eq('id', provider.id)
      .select()
      .single();
    if (data) setProvider(data);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const overLimit = text.length > MAX_LEN;

  return (
    <div className="glow-card p-5 mt-6">
      <h3 className="font-semibold text-text-primary mb-1 flex items-center gap-2">
        <Sparkles size={16} className="text-hot-pink" />
        Current Special
      </h3>
      <p className="text-xs text-text-secondary mb-3">
        Shown on your listing in search results.
      </p>
      <div className="space-y-3">
        <div>
          <input
            type="text"
            value={text}
            maxLength={MAX_LEN + 10}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. $10/unit Botox through April"
            className={INPUT_CLASS + ' text-sm'}
          />
          <div className="flex items-center justify-between mt-1">
            <span
              className="text-xs"
              style={{ color: overLimit ? '#C8005A' : '#888' }}
            >
              {text.length} / {MAX_LEN}
            </span>
            {saved && (
              <span className="text-xs text-verified font-medium">Saved</span>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Expires (optional)
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={INPUT_CLASS + ' text-sm'}
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || overLimit}
          className="text-white uppercase transition-colors disabled:opacity-50"
          style={{
            backgroundColor: '#E8347A',
            padding: '10px 18px',
            borderRadius: '2px',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.10em',
          }}
        >
          {saving ? 'Saving...' : 'Save Special'}
        </button>
      </div>
    </div>
  );
}

function UpgradeCTA() {
  return (
    <div className="glow-card p-5 bg-gradient-to-r from-rose-light/40 to-warm-white border border-rose-accent/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-text-primary">
            Upgrade to Pro for analytics, deals, and featured placement
          </p>
          <p className="text-sm text-text-secondary">$149/mo</p>
        </div>
        <button
          onClick={() => alert('Stripe integration coming soon')}
          className="bg-rose-accent text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-rose-dark transition shrink-0"
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}

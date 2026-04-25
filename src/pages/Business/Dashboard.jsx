import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  DollarSign,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Star,
  Settings as SettingsIcon,
  Sparkles,
  Eye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { formatPricingUnit } from '../../utils/formatPricingUnit';
import { AuthContext } from '../../App';
import { extractPlaceData } from '../../lib/places';
import { loadGoogleMaps } from '../../lib/loadGoogleMaps';
import {
  PROCEDURE_CATEGORIES,
  TREATMENT_AREAS,
} from '../../lib/constants';
import InjectorsTab from '../../components/DashboardTabs/InjectorsTab';
import DashboardBeforeAfterTab from '../../components/DashboardTabs/BeforeAfterTab';
import DashboardReviewsTab from '../../components/DashboardTabs/ReviewsTab';
import SpecialsManager from '../../components/SpecialsManager';
import CallAnalyticsTab from '../../components/DashboardTabs/CallAnalyticsTab';
import SubmissionsTab from '../../components/DashboardTabs/SubmissionsTab';
import DemandIntelTab from '../../components/DashboardTabs/DemandIntelTab';
import MenuUploader from '../../components/business/MenuUploader';
import CallVolumeChart from '../../components/CallVolumeChart';
import VagaroConnectFlow from '../../components/VagaroConnectFlow';
import BookingPlatformConnect from '../../components/BookingPlatformConnect';
import IntegrationStats from '../../components/IntegrationStats';
import useTier from '../../hooks/useTier';
import ErrorBoundary from '../../components/ErrorBoundary';
import FeatureGate from '../../components/FeatureGate';
import { createSubscriptionCheckout } from '../../lib/stripe';
import { TIER_BADGE_STYLE, TIER_BADGE_LABEL } from '../../lib/tierBadge';
import { tabLabelFromSlug, tabSlugFromLabel } from '../../lib/businessTabs';


const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';


function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
}


function TabErrorFallback({ reset }) {
  return (
    <div className="glow-card p-8 text-center">
      <AlertTriangle size={32} className="text-rose-accent mx-auto mb-3" />
      <p className="text-text-primary font-medium mb-1">This section ran into a problem.</p>
      <p className="text-sm text-text-secondary mb-4">Try refreshing, or switch to another tab.</p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-accent text-white text-sm font-medium rounded-xl hover:bg-rose-dark transition-colors"
      >
        <RefreshCw size={14} />
        Try Again
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { session, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = tabLabelFromSlug(searchParams.get('tab') || 'overview');

  // Demand Intel → Promoted Specials prefill handoff. When a user clicks
  // "Post a $X special" on the Demand Intel tab, we stash the suggested
  // values here, jump to the Promoted Specials tab, and pass them to
  // SpecialsManager so the Create form opens pre-filled.
  const [specialsPrefill, setSpecialsPrefill] = useState(null);

  const tierHelpers = useTier(provider);

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
    document.title = 'Provider Dashboard | Know Before You Glow';
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
      .maybeSingle();

    if (error || !data) {
      setProvider(null);
    } else {
      setProvider(data);

      // Ensure profile role is synced (may have been missed during onboarding)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name, full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setOwnerFirstName(profile.first_name || (profile.full_name ? profile.full_name.split(' ')[0] : ''));
        if (profile.role !== 'provider') {
          await supabase
            .from('profiles')
            .update({ role: 'provider' })
            .eq('user_id', user.id);
        }
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

  // Single tab-change entry point. Clears the specials prefill on every
  // tab switch so revisiting Promoted Specials later doesn't auto-open
  // the create form again.
  function handleTabChange(tab) {
    if (specialsPrefill) setSpecialsPrefill(null);
    setSearchParams({ tab: tabSlugFromLabel(tab) }, { replace: true });
  }

  function handlePostSpecialFromDemand({ procedure_type, suggested_price }) {
    setSpecialsPrefill({
      treatmentName: procedure_type,
      promoPrice: String(suggested_price),
    });
    setSearchParams({ tab: 'specials' }, { replace: true });
  }

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
            to="/business/claim"
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
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-[24px] font-medium text-text-primary">
          {getGreeting()}, {ownerFirstName || 'there'}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Here&rsquo;s what&rsquo;s happening at {provider.name}
        </p>
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
                  Know Before You Glow Rating
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

          {/* Upgrade CTA */}
          <UpgradeCTA providerId={provider?.id} tierHelpers={tierHelpers} />
        </div>
      )}

      {/* ===== MENU TAB ===== */}
      {activeTab === 'Menu' && (
        <div>
          {/* AI menu parser — upload PDF/image */}
          {provider?.id && (
            <div className="glow-card p-5 mb-6" style={{ borderTop: '3px solid #E8347A' }}>
              <MenuUploader providerId={provider.id} />
            </div>
          )}

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
                        {item.price_label && formatPricingUnit(item.price_label) && (
                          <span className="text-sm text-text-secondary">
                            {formatPricingUnit(item.price_label)}
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
            <UpgradeCTA providerId={provider?.id} tierHelpers={tierHelpers} />
          </div>
        </div>
      )}

      {/* ===== DEMAND INTEL TAB ===== */}
      {activeTab === 'Demand Intel' && (
        <ErrorBoundary label="Demand Intel" fallback={({ reset }) => <TabErrorFallback reset={reset} />}>
          <DemandIntelTab
            provider={provider}
            tierHelpers={tierHelpers}
            onPostSpecial={handlePostSpecialFromDemand}
          />
        </ErrorBoundary>
      )}

      {/* ===== PROMOTED SPECIALS TAB ===== */}
      {activeTab === 'Promoted Specials' && (
        <ErrorBoundary label="Promoted Specials" fallback={({ reset }) => <TabErrorFallback reset={reset} />}>
          <FeatureGate feature="promoted_specials" tierHelpers={tierHelpers}>
            <SpecialsManager provider={provider} prefill={specialsPrefill} />
          </FeatureGate>
        </ErrorBoundary>
      )}

      {/* ===== CALL ANALYTICS TAB ===== */}
      {activeTab === 'Call Analytics' && (
        <ErrorBoundary label="Call Analytics" fallback={({ reset }) => <TabErrorFallback reset={reset} />}>
          <FeatureGate feature="call_analytics" tierHelpers={tierHelpers}>
            <CallAnalyticsTab providerId={provider?.id} />
          </FeatureGate>
        </ErrorBoundary>
      )}

      {/* ===== INTEGRATIONS TAB ===== */}
      {activeTab === 'Integrations' && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-6">Integrations</h2>

          {/* Vagaro (rich integration) */}
          <div className="mb-8">
            <VagaroConnectFlow providerId={provider?.id} />
          </div>

          {/* Other booking platforms (simple URL connect) */}
          <div className="mb-8">
            <BookingPlatformConnect provider={provider} setProvider={setProvider} />
          </div>

          {/* Quick links — Google Business Profile, Instagram, Website */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-text-primary mb-1">Other connections</h3>
            <p className="text-xs text-text-secondary mb-4">
              These links appear on your public profile.
            </p>
            <div className="space-y-3">
              <div className="glow-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${provider?.website ? 'bg-verified' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium text-text-primary">Website</span>
                  {provider?.website && (
                    <span className="text-xs text-verified font-medium">Connected</span>
                  )}
                </div>
                {provider?.website ? (
                  <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-accent hover:text-rose-dark transition">
                    {provider.website.replace(/^https?:\/\/(www\.)?/, '').slice(0, 30)}
                  </a>
                ) : (
                  <button onClick={() => handleTabChange('Settings')} className="text-xs text-rose-accent hover:text-rose-dark transition">
                    Add in Settings
                  </button>
                )}
              </div>

              <div className="glow-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${provider?.instagram ? 'bg-verified' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium text-text-primary">Instagram</span>
                  {provider?.instagram && (
                    <span className="text-xs text-verified font-medium">Connected</span>
                  )}
                </div>
                {provider?.instagram ? (
                  <a href={`https://instagram.com/${provider.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-accent hover:text-rose-dark transition">
                    @{provider.instagram.replace('@', '')}
                  </a>
                ) : (
                  <button onClick={() => handleTabChange('Settings')} className="text-xs text-rose-accent hover:text-rose-dark transition">
                    Add in Settings
                  </button>
                )}
              </div>

              <div className="glow-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${provider?.google_place_id ? 'bg-verified' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium text-text-primary">Google Business Profile</span>
                  {provider?.google_place_id && (
                    <span className="text-xs text-verified font-medium">Linked</span>
                  )}
                </div>
                {provider?.google_maps_url ? (
                  <a href={provider.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-accent hover:text-rose-dark transition">
                    View on Google
                  </a>
                ) : (
                  <span className="text-xs text-text-secondary">Auto-linked during onboarding</span>
                )}
              </div>
            </div>
          </div>

          {/* Booking referral stats */}
          <IntegrationStats providerId={provider?.id} />
        </div>
      )}

      {/* ===== INJECTORS TAB ===== */}
      {activeTab === 'Injectors' && (
        <ErrorBoundary label="Injectors" fallback={({ reset }) => <TabErrorFallback reset={reset} />}>
          <InjectorsTab
            provider={provider}
            injectors={dashInjectors}
            onRefresh={fetchInjectors}
          />
        </ErrorBoundary>
      )}

      {/* ===== BEFORE & AFTERS TAB ===== */}
      {activeTab === 'Before & Afters' && (
        <ErrorBoundary label="Before & Afters" fallback={({ reset }) => <TabErrorFallback reset={reset} />}>
          <DashboardBeforeAfterTab
            provider={provider}
            photos={dashBAPhotos}
            injectors={dashInjectors}
            onRefresh={fetchBAPhotos}
          />
        </ErrorBoundary>
      )}

      {/* ===== REVIEWS TAB ===== */}
      {activeTab === 'Reviews' && (
        <ErrorBoundary label="Reviews" fallback={({ reset }) => <TabErrorFallback reset={reset} />}>
          <DashboardReviewsTab
            reviews={dashReviews}
            provider={provider}
            onRefresh={fetchDashReviews}
          />
        </ErrorBoundary>
      )}

      {/* ===== SUBMISSIONS TAB ===== */}
      {activeTab === 'Submissions' && (
        <ErrorBoundary label="Submissions" fallback={({ reset }) => <TabErrorFallback reset={reset} />}>
          <SubmissionsTab communityProcedures={communityProcedures} pricing={pricing} providerId={provider?.id} onRefresh={fetchCommunityProcedures} />
        </ErrorBoundary>
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
                                  className={`text-xs px-3 py-1 rounded-sm font-medium transition ${
                                    disputeAction === 'resolved'
                                      ? 'bg-rose-light text-rose-accent'
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
                                className="text-xs px-3 py-1.5 rounded-sm font-medium bg-rose-light text-rose-accent hover:bg-rose-accent hover:text-white transition"
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
            <UpgradeCTA providerId={provider?.id} tierHelpers={tierHelpers} />
          </div>
        </div>
      )}

      {/* ===== SETTINGS TAB ===== */}
      {activeTab === 'Settings' && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-6">
            Settings
          </h2>

          {/* Business Info */}
          <BusinessInfoEditor provider={provider} setProvider={setProvider} />

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

function BusinessInfoEditor({ provider, setProvider }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveField(field, value) {
    setSaving(true);
    setSaved(false);
    const { data } = await supabase
      .from('providers')
      .update({ [field]: value || null })
      .eq('id', provider.id)
      .select()
      .single();
    if (data) setProvider(data);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const fields = [
    { key: 'name', label: 'Practice Name', required: true },
    { key: 'tagline', label: 'Tagline' },
    { key: 'phone', label: 'Phone' },
    { key: 'website', label: 'Website' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'zip_code', label: 'ZIP Code' },
  ];

  return (
    <div className="glow-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <SettingsIcon size={16} className="text-text-secondary" />
          Business Information
        </h3>
        {saving && <span className="text-xs text-text-secondary">Saving...</span>}
        {saved && <span className="text-xs text-verified font-medium">Saved</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(({ key, label, required }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              {label}{required && ' *'}
            </label>
            <input
              type="text"
              defaultValue={provider[key] || ''}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val === (provider[key] || '')) return;
                saveField(key, val);
              }}
              className={INPUT_CLASS + ' text-sm'}
            />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <label className="block text-xs font-medium text-text-secondary mb-1">
          About
        </label>
        <textarea
          defaultValue={provider.about || ''}
          onBlur={(e) => {
            const val = e.target.value.trim();
            if (val === (provider.about || '')) return;
            saveField('about', val);
          }}
          rows={3}
          placeholder="Tell patients about your practice..."
          className={INPUT_CLASS + ' text-sm'}
        />
      </div>
      <p className="text-xs text-text-secondary mt-3">
        Fields save automatically when you click away.
      </p>
    </div>
  );
}

const UPGRADE_PATHS = {
  free:      { target: 'verified',  label: 'Verified',   price: '$99/mo',  pitch: 'analytics, demand intel, and promoted specials' },
  verified:  { target: 'certified', label: 'Certified',  price: '$299/mo', pitch: 'competitor comparison, city report features, and 90-day analytics' },
  certified: { target: 'enterprise', label: 'Enterprise', price: '$799/mo', pitch: 'multi-location, API access, and a dedicated account manager' },
};

function UpgradeCTA({ providerId, tierHelpers }) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const path = tierHelpers ? UPGRADE_PATHS[tierHelpers.tier] : UPGRADE_PATHS.free;
  // Don't show CTA if already at enterprise (no upgrade path)
  if (!path) return null;

  async function handleUpgrade() {
    setChecking(true);
    setError('');
    const result = await createSubscriptionCheckout({
      tier: path.target,
      providerId,
    });
    if (result.simulated) {
      setError(result.message);
    } else if (result.error) {
      setError(result.error);
    }
    setChecking(false);
  }

  return (
    <div className="glow-card p-5 bg-gradient-to-r from-rose-light/40 to-warm-white border border-rose-accent/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-text-primary">
            Upgrade to {path.label} for {path.pitch}
          </p>
          <p className="text-sm text-text-secondary">{path.price}</p>
        </div>
        <button
          onClick={handleUpgrade}
          disabled={checking}
          className="bg-rose-accent text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-rose-dark transition shrink-0 disabled:opacity-50"
        >
          {checking ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Loading...
            </span>
          ) : (
            `Upgrade to ${path.label}`
          )}
        </button>
      </div>
      {error && (
        <p className="text-sm mt-2" style={{ color: '#991B1B' }}>{error}</p>
      )}
    </div>
  );
}


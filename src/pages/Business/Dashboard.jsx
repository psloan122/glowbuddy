import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  Users,
  DollarSign,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  Lock,
  RefreshCw,
  Star,
  Settings as SettingsIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../App';
import { extractPlaceData } from '../../lib/places';
import {
  PROCEDURE_TYPES,
  TREATMENT_AREAS,
  DISCOUNT_TYPES,
} from '../../lib/constants';
import InjectorsTab from '../../components/DashboardTabs/InjectorsTab';
import DashboardBeforeAfterTab from '../../components/DashboardTabs/BeforeAfterTab';
import DashboardReviewsTab from '../../components/DashboardTabs/ReviewsTab';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

const TABS = ['Overview', 'Menu', 'Specials', 'Injectors', 'Before & Afters', 'Reviews', 'Disputes', 'Settings'];

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

  // Specials state
  const [specials, setSpecials] = useState([]);
  const [showAddSpecial, setShowAddSpecial] = useState(false);
  const [specialForm, setSpecialForm] = useState({
    title: '',
    description: '',
    procedure_type: '',
    discount_type: '',
    original_price: '',
    special_price: '',
    expires_at: '',
  });
  const [specialSaving, setSpecialSaving] = useState(false);

  // Disputes state
  const [disputes, setDisputes] = useState([]);

  // Community procedures state
  const [communityProcedures, setCommunityProcedures] = useState([]);

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
    }

    setLoading(false);
  }, [user]);

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

  const fetchSpecials = useCallback(async () => {
    if (!provider) return;
    const { data } = await supabase
      .from('specials')
      .select('*')
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false });
    setSpecials(data || []);
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

  useEffect(() => {
    if (provider) {
      fetchPricing();
      fetchSpecials();
      fetchDisputes();
      fetchCommunityProcedures();
      fetchInjectors();
      fetchBAPhotos();
      fetchDashReviews();
    }
  }, [provider, fetchPricing, fetchSpecials, fetchDisputes, fetchCommunityProcedures, fetchInjectors, fetchBAPhotos, fetchDashReviews]);

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

    const payload = {
      provider_id: provider.id,
      procedure_type: pricingForm.procedure_type,
      treatment_area: pricingForm.treatment_area || null,
      units_or_volume: pricingForm.units_or_volume || null,
      price: parseFloat(pricingForm.price),
      price_label: pricingForm.price_label || null,
    };

    if (editingPricingId) {
      await supabase
        .from('provider_pricing')
        .update(payload)
        .eq('id', editingPricingId);
      setEditingPricingId(null);
    } else {
      await supabase.from('provider_pricing').insert(payload);
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

  // --- Specials Handlers ---

  function resetSpecialForm() {
    setSpecialForm({
      title: '',
      description: '',
      procedure_type: '',
      discount_type: '',
      original_price: '',
      special_price: '',
      expires_at: '',
    });
  }

  async function handleSaveSpecial(e) {
    e.preventDefault();
    setSpecialSaving(true);

    const payload = {
      provider_id: provider.id,
      title: specialForm.title,
      description: specialForm.description || null,
      procedure_type: specialForm.procedure_type || null,
      discount_type: specialForm.discount_type || null,
      original_price: specialForm.original_price
        ? parseFloat(specialForm.original_price)
        : null,
      special_price: specialForm.special_price
        ? parseFloat(specialForm.special_price)
        : null,
      expires_at: specialForm.expires_at || null,
      is_active: true,
    };

    await supabase.from('specials').insert(payload);

    resetSpecialForm();
    setShowAddSpecial(false);
    setSpecialSaving(false);
    fetchSpecials();
  }

  async function handleToggleSpecialActive(special) {
    await supabase
      .from('specials')
      .update({ is_active: !special.is_active })
      .eq('id', special.id);
    fetchSpecials();
  }

  async function handleDeleteSpecial(id) {
    if (!window.confirm('Are you sure you want to delete this special?')) {
      return;
    }
    await supabase.from('specials').delete().eq('id', id);
    fetchSpecials();
  }

  // --- Settings: Refresh from Google ---

  async function handleRefreshFromGoogle() {
    if (!provider?.google_place_id) return;
    setRefreshing(true);

    try {
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
        } catch (err) {
          console.error('Photo import during refresh failed:', err);
        }
      }
    } catch (err) {
      console.error('Refresh from Google failed:', err);
    }

    setRefreshing(false);
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
              {PROCEDURE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* ===== SPECIALS TAB ===== */}
      {activeTab === 'Specials' && (
        <div>
          {provider.tier === 'pro' || provider.tier === 'pro_trial' ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text-primary">
                  Your Specials
                </h2>
                {!showAddSpecial && (
                  <button
                    onClick={() => {
                      resetSpecialForm();
                      setShowAddSpecial(true);
                    }}
                    className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-rose-dark transition"
                  >
                    <Plus size={16} /> Create Special
                  </button>
                )}
              </div>

              {/* Add special form */}
              {showAddSpecial && (
                <div className="glow-card p-5 mb-6">
                  <form onSubmit={handleSaveSpecial} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={specialForm.title}
                          onChange={(e) =>
                            setSpecialForm((f) => ({
                              ...f,
                              title: e.target.value,
                            }))
                          }
                          required
                          placeholder="e.g. Summer Botox Special"
                          className={INPUT_CLASS + ' text-sm'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Procedure Type (optional)
                        </label>
                        <select
                          value={specialForm.procedure_type}
                          onChange={(e) =>
                            setSpecialForm((f) => ({
                              ...f,
                              procedure_type: e.target.value,
                            }))
                          }
                          className={INPUT_CLASS + ' text-sm'}
                        >
                          <option value="">Select...</option>
                          {PROCEDURE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Description
                      </label>
                      <textarea
                        value={specialForm.description}
                        onChange={(e) =>
                          setSpecialForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Describe your special offer..."
                        className={INPUT_CLASS + ' text-sm'}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Discount Type
                        </label>
                        <select
                          value={specialForm.discount_type}
                          onChange={(e) =>
                            setSpecialForm((f) => ({
                              ...f,
                              discount_type: e.target.value,
                            }))
                          }
                          className={INPUT_CLASS + ' text-sm'}
                        >
                          <option value="">Select...</option>
                          {DISCOUNT_TYPES.map((dt) => (
                            <option key={dt.value} value={dt.value}>
                              {dt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Original Price ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={specialForm.original_price}
                          onChange={(e) =>
                            setSpecialForm((f) => ({
                              ...f,
                              original_price: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className={INPUT_CLASS + ' text-sm'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Special Price ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={specialForm.special_price}
                          onChange={(e) =>
                            setSpecialForm((f) => ({
                              ...f,
                              special_price: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className={INPUT_CLASS + ' text-sm'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Expires At
                        </label>
                        <input
                          type="datetime-local"
                          value={specialForm.expires_at}
                          onChange={(e) =>
                            setSpecialForm((f) => ({
                              ...f,
                              expires_at: e.target.value,
                            }))
                          }
                          className={INPUT_CLASS + ' text-sm'}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={specialSaving}
                        className="bg-rose-accent text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-rose-dark transition disabled:opacity-50"
                      >
                        {specialSaving ? 'Saving...' : 'Create Special'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddSpecial(false);
                          resetSpecialForm();
                        }}
                        className="text-text-secondary hover:text-text-primary transition text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Specials list */}
              {specials.length === 0 && !showAddSpecial ? (
                <div className="glow-card p-8 text-center">
                  <p className="text-text-secondary mb-3">
                    No specials created yet.
                  </p>
                  <button
                    onClick={() => {
                      resetSpecialForm();
                      setShowAddSpecial(true);
                    }}
                    className="text-rose-accent font-medium hover:text-rose-dark transition"
                  >
                    Create your first special
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {specials.map((special) => (
                    <div key={special.id} className="glow-card p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-text-primary">
                              {special.title}
                            </h3>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                special.is_active
                                  ? 'bg-verified/10 text-verified'
                                  : 'bg-gray-100 text-text-secondary'
                              }`}
                            >
                              {special.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {special.description && (
                            <p className="text-sm text-text-secondary mb-2">
                              {special.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            {special.procedure_type && (
                              <span className="bg-warm-gray text-text-secondary px-2 py-0.5 rounded-full text-xs">
                                {special.procedure_type}
                              </span>
                            )}
                            {special.original_price != null && (
                              <span className="text-text-secondary line-through">
                                ${special.original_price}
                              </span>
                            )}
                            {special.special_price != null && (
                              <span className="font-bold text-rose-accent">
                                ${special.special_price}
                              </span>
                            )}
                            {special.expires_at && (
                              <span className="text-text-secondary text-xs">
                                Expires:{' '}
                                {new Date(special.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleSpecialActive(special)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                              special.is_active
                                ? 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                                : 'bg-verified/10 text-verified hover:bg-verified/20'
                            }`}
                          >
                            {special.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteSpecial(special.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-500 transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="glow-card p-10 text-center">
              <Lock size={40} className="text-text-secondary/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-text-primary mb-2">
                Posting specials is a Pro feature
              </h3>
              <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
                Reach patients searching near your zip code with time-limited deals.
              </p>
              <button
                onClick={() => alert('Stripe integration coming soon')}
                className="inline-block bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
              >
                Upgrade to Pro — $149/mo
              </button>
            </div>
          )}
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

      {/* ===== DISPUTES TAB ===== */}
      {activeTab === 'Disputes' && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-6">
            Flagged Submissions
          </h2>

          {disputes.length === 0 ? (
            <div className="glow-card p-8 text-center">
              <p className="text-text-secondary">No flagged submissions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map((dispute) => {
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
                      </div>
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
        </div>
      )}
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

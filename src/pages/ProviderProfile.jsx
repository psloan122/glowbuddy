import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle,
  ExternalLink,
  Globe,
  Phone,
  Plus,
  Star,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import DisputeModal from '../components/DisputeModal';
import ReviewModal from '../components/ReviewModal';
import ProviderAvatar from '../components/ProviderAvatar';
import StarRating from '../components/StarRating';
import OverviewTab from '../components/ProviderTabs/OverviewTab';
import BeforeAfterTab from '../components/ProviderTabs/BeforeAfterTab';
import ReviewsTab from '../components/ProviderTabs/ReviewsTab';
import PricesTab from '../components/ProviderTabs/PricesTab';

const PROFILE_TABS = ['Overview', 'Before & Afters', 'Reviews', 'Prices'];

export default function ProviderProfile() {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);

  const [provider, setProvider] = useState(null);
  const [communityData, setCommunityData] = useState([]);
  const [verifiedPricing, setVerifiedPricing] = useState([]);
  const [specials, setSpecials] = useState([]);
  const [providerPhotos, setProviderPhotos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [baPhotos, setBaPhotos] = useState([]);
  const [injectors, setInjectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProviderOwner, setIsProviderOwner] = useState(false);
  const [disputeTarget, setDisputeTarget] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Default tab: mobile shows B&A, desktop shows Overview
  const [activeTab, setActiveTab] = useState(() =>
    window.innerWidth < 768 ? 'Before & Afters' : 'Overview'
  );

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: providerRow } = await supabase
        .from('providers')
        .select('*')
        .eq('slug', slug)
        .single();

      setProvider(providerRow);

      const { data: community } = await supabase
        .from('procedures')
        .select('*')
        .eq('provider_slug', slug)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setCommunityData(community || []);

      if (providerRow) {
        // Parallel fetches
        const [pricingRes, specialsRes, photosRes, reviewsRes, baRes, injectorsRes] =
          await Promise.all([
            supabase
              .from('provider_pricing')
              .select('*')
              .eq('provider_id', providerRow.id),
            supabase
              .from('specials')
              .select('*')
              .eq('provider_id', providerRow.id)
              .eq('is_active', true)
              .order('created_at', { ascending: false }),
            supabase
              .from('provider_photos')
              .select('*')
              .eq('provider_id', providerRow.id)
              .order('display_order'),
            supabase
              .from('reviews')
              .select('*')
              .eq('provider_id', providerRow.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false }),
            supabase
              .from('before_after_photos')
              .select('*, injectors(name)')
              .eq('provider_id', providerRow.id)
              .eq('status', 'active')
              .order('display_order'),
            supabase
              .from('injectors')
              .select('*')
              .eq('provider_id', providerRow.id)
              .eq('is_active', true),
          ]);

        setVerifiedPricing(pricingRes.data || []);
        setSpecials(specialsRes.data || []);
        setProviderPhotos(photosRes.data || []);
        setReviews(reviewsRes.data || []);
        setBaPhotos(baRes.data || []);
        setInjectors(injectorsRes.data || []);
      }

      setLoading(false);
    }

    fetchData();
  }, [slug]);

  // Check ownership
  useEffect(() => {
    async function checkOwnership() {
      if (!user) {
        setIsProviderOwner(false);
        return;
      }
      const { data } = await supabase
        .from('providers')
        .select('id')
        .eq('owner_user_id', user.id)
        .maybeSingle();
      setIsProviderOwner(!!data);
    }
    checkOwnership();
  }, [user]);

  // SEO
  useEffect(() => {
    const name =
      provider?.name ||
      (communityData.length > 0 ? communityData[0].provider_name : 'Provider');
    const ratingStr =
      provider?.avg_rating && provider?.review_count
        ? ` — ${provider.avg_rating} stars (${provider.review_count} reviews)`
        : '';
    document.title = `${name} Prices & Reviews | GlowBuddy`;
    const content = `See real prices, reviews${ratingStr}, and verified menu for ${name}. Compare what patients paid on GlowBuddy.`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = content;
      document.head.appendChild(newMeta);
    }

    // Review schema markup
    if ((provider?.weighted_rating || provider?.avg_rating) && provider?.review_count) {
      const existingSchema = document.getElementById('gb-review-schema');
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: provider.weighted_rating || provider.avg_rating,
          reviewCount: provider.review_count,
          bestRating: 5,
          worstRating: 1,
        },
      };
      if (existingSchema) {
        existingSchema.textContent = JSON.stringify(schema);
      } else {
        const script = document.createElement('script');
        script.id = 'gb-review-schema';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      }
    }
  }, [provider, communityData]);

  function handleDisputeSubmitted() {
    supabase
      .from('procedures')
      .select('*')
      .eq('provider_slug', slug)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => setCommunityData(data || []));
  }

  function refreshReviews() {
    if (!provider) return;
    supabase
      .from('reviews')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data || []));
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse text-rose-accent text-center text-lg">
          Loading provider...
        </div>
      </div>
    );
  }

  const providerName =
    provider?.name ||
    (communityData.length > 0
      ? communityData[0].provider_name
      : 'Unknown Provider');

  const providerCity =
    provider?.city ||
    (communityData.length > 0 ? communityData[0].city : null);

  const providerState =
    provider?.state ||
    (communityData.length > 0 ? communityData[0].state : null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Provider Header */}
      <div className="glow-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <ProviderAvatar name={providerName} size={64} />
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                {providerName}
              </h1>

              {providerCity && providerState && (
                <p className="text-text-secondary mb-3">
                  {providerCity}, {providerState}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-3">
                {provider?.provider_type && (
                  <span className="inline-block bg-rose-light text-rose-dark px-3 py-1 text-xs font-medium rounded-full">
                    {provider.provider_type}
                  </span>
                )}
                {provider?.is_verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-verified bg-verified/10 px-3 py-1 rounded-full">
                    <CheckCircle size={14} />
                    Verified Provider
                  </span>
                )}
              </div>

              {/* GlowBuddy Rating */}
              {(provider?.weighted_rating || provider?.avg_rating) && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <StarRating
                      value={Math.round(provider.weighted_rating || provider.avg_rating)}
                      readOnly
                      size={14}
                    />
                    <span className="font-medium text-text-primary">
                      {provider.weighted_rating || provider.avg_rating}
                    </span>
                    <span className="text-text-secondary/70">weighted</span>
                    {provider.review_count > 0 && (
                      <span>
                        &middot; {provider.review_count} review
                        {provider.review_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {/* Trust breakdown - condensed on mobile */}
                  {provider.review_count > 0 && (
                    <p className="text-xs text-text-secondary mt-0.5 hidden sm:block">
                      {provider.verified_review_count > 0 &&
                        `${provider.verified_review_count} verified`}
                      {provider.verified_review_count > 0 && provider.photo_review_count > 0 &&
                        ' \u00b7 '}
                      {provider.photo_review_count > 0 &&
                        `${provider.photo_review_count} with photos`}
                      {(provider.verified_review_count > 0 || provider.photo_review_count > 0) &&
                        provider.unverified_review_count > 0 &&
                        ' \u00b7 '}
                      {provider.unverified_review_count > 0 &&
                        `${provider.unverified_review_count} unverified`}
                    </p>
                  )}
                  {/* Mobile condensed */}
                  {provider.verified_review_count > 0 && (
                    <p className="text-xs text-text-secondary mt-0.5 sm:hidden">
                      {provider.verified_review_count} &#10003; verified
                    </p>
                  )}
                </div>
              )}

              {/* Google Rating */}
              {provider?.google_rating && (
                <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <Star
                    size={14}
                    className="text-amber-400 fill-amber-400"
                  />
                  <span className="font-medium text-text-primary">
                    {provider.google_rating}
                  </span>
                  {provider.google_review_count && (
                    <span>
                      &middot;{' '}
                      {provider.google_review_count.toLocaleString()} Google
                      reviews
                    </span>
                  )}
                  {provider.google_maps_url && (
                    <>
                      <span>&middot;</span>
                      <a
                        href={provider.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rose-accent hover:text-rose-dark transition inline-flex items-center gap-0.5"
                      >
                        View on Google Maps
                        <ExternalLink size={12} />
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact links + Write Review */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowReviewModal(true)}
              className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-rose-dark transition"
            >
              <Star size={14} />
              Write a Review
            </button>

            {provider?.website && (
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-text-primary text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <ExternalLink size={14} />
                Website
              </a>
            )}
            {provider?.instagram && (
              <a
                href={`https://instagram.com/${provider.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-text-primary text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Globe size={14} />
                Instagram
              </a>
            )}
            {provider?.phone && (
              <a
                href={`tel:${provider.phone}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-text-primary text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Phone size={14} />
                {provider.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6 -mb-px overflow-x-auto">
          {PROFILE_TABS.map((tab) => (
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
              {tab === 'Reviews' && reviews.length > 0 && (
                <span className="ml-1.5 text-xs text-text-secondary">
                  ({reviews.length})
                </span>
              )}
              {tab === 'Before & Afters' && baPhotos.length > 0 && (
                <span className="ml-1.5 text-xs text-text-secondary">
                  ({baPhotos.length})
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <OverviewTab
          provider={provider}
          providerPhotos={providerPhotos}
          specials={specials}
          injectors={injectors}
          reviews={reviews}
          baPhotos={baPhotos}
          communityData={communityData}
          verifiedPricing={verifiedPricing}
          isProviderOwner={isProviderOwner}
          user={user}
          onDisputeTarget={setDisputeTarget}
          onSwitchTab={setActiveTab}
        />
      )}

      {activeTab === 'Before & Afters' && (
        <BeforeAfterTab
          photos={baPhotos}
          injectors={injectors}
          provider={provider}
          isProviderOwner={isProviderOwner}
        />
      )}

      {activeTab === 'Reviews' && (
        <ReviewsTab
          reviews={reviews}
          provider={provider}
          onReviewSubmitted={refreshReviews}
        />
      )}

      {activeTab === 'Prices' && (
        <PricesTab
          verifiedPricing={verifiedPricing}
          communityData={communityData}
          provider={provider}
          user={user}
          isProviderOwner={isProviderOwner}
          onDisputeTarget={setDisputeTarget}
        />
      )}

      {/* CTAs */}
      <div className="flex flex-wrap gap-4 mt-8">
        <Link
          to="/log"
          className="inline-flex items-center gap-2 px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
        >
          <Plus size={18} />
          Add a price for this provider
        </Link>
        {provider?.website && (
          <a
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={18} />
            Book / Visit Website
          </a>
        )}
      </div>

      {/* Dispute Modal */}
      {disputeTarget && (
        <DisputeModal
          procedure={disputeTarget}
          providerId={provider?.id}
          onClose={() => setDisputeTarget(null)}
          onSubmitted={handleDisputeSubmitted}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          provider={provider}
          onClose={() => setShowReviewModal(false)}
          onSubmitted={() => {
            refreshReviews();
            setShowReviewModal(false);
          }}
        />
      )}
    </div>
  );
}

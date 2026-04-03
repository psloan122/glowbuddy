import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle,
  ExternalLink,
  Globe,
  Phone,
  ShieldCheck,
  Users,
  Flag,
  Plus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import ProcedureCard from '../components/ProcedureCard';
import SpecialCard from '../components/SpecialCard';
import DisputeModal from '../components/DisputeModal';

export default function ProviderProfile() {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);

  const [provider, setProvider] = useState(null);
  const [communityData, setCommunityData] = useState([]);
  const [verifiedPricing, setVerifiedPricing] = useState([]);
  const [specials, setSpecials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProviderOwner, setIsProviderOwner] = useState(false);
  const [disputeTarget, setDisputeTarget] = useState(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch provider record
      const { data: providerRow } = await supabase
        .from('providers')
        .select('*')
        .eq('slug', slug)
        .single();

      setProvider(providerRow);

      // Fetch community submissions for this provider
      const { data: community } = await supabase
        .from('procedures')
        .select('*')
        .eq('provider_slug', slug)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setCommunityData(community || []);

      if (providerRow) {
        // Fetch verified pricing
        const { data: pricing } = await supabase
          .from('provider_pricing')
          .select('*')
          .eq('provider_id', providerRow.id);

        setVerifiedPricing(pricing || []);

        // Fetch active specials
        const { data: activeSpecials } = await supabase
          .from('specials')
          .select('*')
          .eq('provider_id', providerRow.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        setSpecials(activeSpecials || []);
      }

      setLoading(false);
    }

    fetchData();
  }, [slug]);

  // Check if current user owns a provider account (for flag button visibility)
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
      (communityData.length > 0
        ? communityData[0].provider_name
        : 'Provider');
    document.title = `${name} Prices & Reviews | GlowBuddy`;
    const meta = document.querySelector('meta[name="description"]');
    const content = `See real prices and verified menu for ${name}. Compare what patients paid and view current specials on GlowBuddy.`;
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = content;
      document.head.appendChild(newMeta);
    }
  }, [provider, communityData]);

  function handleDisputeSubmitted() {
    // Refresh community data after a flag
    supabase
      .from('procedures')
      .select('*')
      .eq('provider_slug', slug)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => setCommunityData(data || []));
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
          </div>

          {/* Contact links */}
          <div className="flex flex-wrap items-center gap-3">
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

      {/* Active Specials */}
      {specials.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-4">
            Current Specials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {specials.map((special) => (
              <SpecialCard
                key={special.id}
                special={special}
                provider={provider}
              />
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column: Verified Menu */}
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <ShieldCheck size={20} className="text-verified" />
            Their Menu
          </h2>

          {verifiedPricing.length > 0 ? (
            <div className="glow-card overflow-hidden">
              <div className="divide-y divide-gray-100">
                {verifiedPricing.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {item.procedure_type}
                      </p>
                      {item.units_or_volume && (
                        <p className="text-xs text-text-secondary mt-0.5">
                          {item.units_or_volume}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-text-primary">
                        ${Number(item.price).toLocaleString()}
                      </p>
                      {item.price_label && (
                        <p className="text-xs text-text-secondary">
                          {item.price_label}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glow-card p-6 text-center">
              <p className="text-text-secondary text-sm">
                This provider hasn't uploaded their menu yet.
              </p>
            </div>
          )}
        </div>

        {/* Right column: Community Prices */}
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <Users size={20} className="text-community" />
            What Patients Paid
          </h2>

          {communityData.length > 0 ? (
            <div className="flex flex-col gap-4">
              {communityData.map((procedure, index) => (
                <div key={procedure.id} className="relative">
                  <ProcedureCard procedure={procedure} index={index} />

                  {/* Flag button: only for authenticated provider owners */}
                  {user && isProviderOwner && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDisputeTarget(procedure);
                      }}
                      className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 text-xs text-text-secondary bg-white/90 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-rose-accent transition-colors z-10"
                      title="Flag this price"
                    >
                      <Flag size={12} />
                      Flag
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glow-card p-6 text-center">
              <p className="text-text-secondary text-sm">
                No community prices yet for this provider.
              </p>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
}

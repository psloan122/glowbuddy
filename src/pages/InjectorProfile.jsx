import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BadgeCheck, ExternalLink, MapPin, Briefcase, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FollowInjectorButton from '../components/FollowInjectorButton';
import InjectorUpdateCard from '../components/InjectorUpdateCard';

const CREDENTIAL_COLORS = {
  RN: { bg: '#DBEAFE', color: '#1D4ED8' },
  NP: { bg: '#E0E7FF', color: '#4338CA' },
  PA: { bg: '#EDE9FE', color: '#6D28D9' },
  MD: { bg: '#D1FAE5', color: '#065F46' },
  DO: { bg: '#D1FAE5', color: '#065F46' },
};

export default function InjectorProfile() {
  const { slugOrId } = useParams();
  const [injector, setInjector] = useState(null);
  const [provider, setProvider] = useState(null);
  const [previousProviders, setPreviousProviders] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Try slug first, then id
      let { data } = await supabase
        .from('injectors')
        .select('*, providers(id, name, slug, city, state)')
        .eq('slug', slugOrId)
        .maybeSingle();

      if (!data) {
        const res = await supabase
          .from('injectors')
          .select('*, providers(id, name, slug, city, state)')
          .eq('id', slugOrId)
          .maybeSingle();
        data = res.data;
      }

      if (data) {
        setInjector(data);
        setProvider(data.providers);

        // Fetch previous providers
        if (data.previous_provider_ids?.length > 0) {
          const { data: prev } = await supabase
            .from('providers')
            .select('id, name, slug')
            .in('id', data.previous_provider_ids);
          setPreviousProviders(prev || []);
        }

        // Fetch updates
        const { data: updateData } = await supabase
          .from('injector_updates')
          .select('*')
          .eq('injector_id', data.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setUpdates(updateData || []);
      }
      setLoading(false);
    }
    load();
  }, [slugOrId]);

  useEffect(() => {
    if (!injector) return;
    document.title = `${injector.display_name || injector.name} — Injector Profile | Know Before You Glow`;
  }, [injector]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-text-secondary animate-pulse text-center">Loading profile...</p>
      </div>
    );
  }

  if (!injector) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Injector Not Found</h1>
        <Link to="/" className="text-rose-accent hover:text-rose-dark font-medium transition">Back to Home</Link>
      </div>
    );
  }

  const displayName = injector.display_name || injector.name;
  const cred = injector.credentials?.toUpperCase();
  const credStyle = CREDENTIAL_COLORS[cred] || { bg: '#F3F4F6', color: '#6B7280' };
  const initials = displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {injector.profile_photo_url ? (
          <img src={injector.profile_photo_url} alt={displayName} className="w-20 h-20 rounded-full object-cover" loading="lazy" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-sky-100 text-[#0369A1] flex items-center justify-center text-2xl font-semibold">
            {initials}
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-text-primary">{displayName}</h1>
            {injector.is_verified && <BadgeCheck size={20} className="text-[#0369A1]" />}
          </div>

          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {cred && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: credStyle.bg, color: credStyle.color }}>
                {cred}
              </span>
            )}
            {injector.follower_count > 0 && (
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <Users size={12} /> {injector.follower_count} follower{injector.follower_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <FollowInjectorButton injectorId={injector.id} injectorName={displayName} />
        </div>
      </div>

      {/* Current practice */}
      {provider && (
        <div className="glow-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={14} className="text-text-secondary" />
            <span className="text-sm font-medium text-text-primary">Current Practice</span>
          </div>
          <Link to={`/provider/${provider.slug}`} className="text-sm text-[#0369A1] hover:text-sky-800 font-medium transition">
            {provider.name}
          </Link>
          {(provider.city || provider.state) && (
            <p className="text-xs text-text-secondary mt-0.5">{provider.city}{provider.state ? `, ${provider.state}` : ''}</p>
          )}
        </div>
      )}

      {/* Bio */}
      {injector.bio && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-text-primary mb-2">About</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{injector.bio}</p>
        </div>
      )}

      {/* ExternalLink */}
      {injector.instagram && (
        <a
          href={`https://instagram.com/${injector.instagram.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-[#0369A1] hover:text-sky-800 transition mb-6"
        >
          <ExternalLink size={14} /> @{injector.instagram.replace('@', '')}
        </a>
      )}

      {/* Booking link */}
      {injector.booking_url && (
        <div className="mb-6">
          <a
            href={injector.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-white font-semibold text-sm hover:opacity-90 transition"
            style={{ backgroundColor: '#C94F78' }}
          >
            Book with {displayName.split(' ')[0]}
          </a>
        </div>
      )}

      {/* Practice history */}
      {previousProviders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1.5">
            <Briefcase size={14} /> Practice History
          </h2>
          <div className="space-y-1">
            {previousProviders.map((p) => (
              <Link key={p.id} to={`/provider/${p.slug}`} className="block text-sm text-text-secondary hover:text-[#0369A1] transition">
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Claim CTA */}
      {!injector.is_claimed && (
        <div className="glow-card p-4 mb-6 border border-sky-200 bg-sky-50/30">
          <p className="text-sm text-text-primary mb-2">Is this you?</p>
          <Link
            to={`/injectors/${injector.slug || injector.id}/claim`}
            className="text-sm font-medium text-[#0369A1] hover:text-sky-800 transition"
          >
            Claim this profile &rarr;
          </Link>
        </div>
      )}

      {/* Updates feed */}
      {updates.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3">Recent Updates</h2>
          <div className="space-y-3">
            {updates.map((u) => (
              <InjectorUpdateCard key={u.id} update={u} injector={injector} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

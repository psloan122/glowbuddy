import { useState, useEffect } from 'react';
import { Check, X, Loader2, Building2, Star, Phone, Globe, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminPendingProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    fetchPending();
  }, []);

  async function fetchPending() {
    setLoading(true);
    const { data } = await supabase
      .from('providers')
      .select('id, name, address, city, state, slug, phone, website, google_rating, google_review_count, owner_user_id, created_at')
      .eq('is_active', false)
      .eq('verification_method', 'self_submitted')
      .order('created_at', { ascending: false });

    // Fetch owner emails
    const rows = data || [];
    const ownerIds = [...new Set(rows.map((r) => r.owner_user_id).filter(Boolean))];

    let emailMap = {};
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', ownerIds);

      if (profiles) {
        for (const p of profiles) {
          emailMap[p.user_id] = p.email;
        }
      }
    }

    setProviders(
      rows.map((r) => ({ ...r, ownerEmail: emailMap[r.owner_user_id] || 'Unknown' })),
    );
    setLoading(false);
  }

  async function handleApprove(provider) {
    setActionId(provider.id);

    await supabase
      .from('providers')
      .update({
        is_active: true,
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', provider.id);

    // Send approval email
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          template: 'provider_listing_approved',
          to: provider.ownerEmail,
          data: {
            providerName: provider.name,
            slug: provider.slug,
          },
        },
      });
    } catch {
      // Non-blocking — listing is already approved
    }

    setActionId(null);
    fetchPending();
  }

  async function handleReject(provider) {
    if (!window.confirm(`Remove "${provider.name}"? This cannot be undone.`)) return;

    setActionId(provider.id);
    await supabase.from('providers').delete().eq('id', provider.id);
    setActionId(null);
    fetchPending();
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-text-secondary animate-pulse">
        Loading...
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="glow-card p-8 text-center text-text-secondary">
        No pending provider submissions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary mb-2">
        {providers.length} pending submission{providers.length !== 1 ? 's' : ''}
      </p>
      {providers.map((provider) => (
        <div key={provider.id} className="glow-card p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={16} className="text-rose-accent" />
                <span className="font-bold text-lg text-text-primary">
                  {provider.name}
                </span>
              </div>
              {provider.address && (
                <p className="text-sm text-text-secondary flex items-center gap-1">
                  <MapPin size={12} />
                  {provider.address}, {provider.city}, {provider.state}
                </p>
              )}
              {!provider.address && (
                <p className="text-sm text-text-secondary">
                  {provider.city}, {provider.state}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-text-secondary">
                {provider.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {provider.phone}
                  </span>
                )}
                {provider.website && (
                  <a
                    href={provider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-rose-accent hover:text-rose-dark"
                  >
                    <Globe size={12} /> Website
                  </a>
                )}
                {provider.google_rating && (
                  <span className="flex items-center gap-1">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    {provider.google_rating} ({provider.google_review_count || 0})
                  </span>
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1">
                Submitted by: {provider.ownerEmail}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {new Date(provider.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleApprove(provider)}
                disabled={actionId === provider.id}
                className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium text-sm disabled:opacity-50"
              >
                {actionId === provider.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Approve
              </button>
              <button
                onClick={() => handleReject(provider)}
                disabled={actionId === provider.id}
                className="flex items-center gap-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium text-sm disabled:opacity-50"
              >
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

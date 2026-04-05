import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Check, AlertTriangle, ArrowRight } from 'lucide-react';

export default function AdminInjectorsTab() {
  const [injectors, setInjectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moveFlags, setMoveFlags] = useState([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('injectors')
        .select('*, providers(name, slug)')
        .order('follower_count', { ascending: false });
      setInjectors(data || []);

      // Check for recent submissions tagging injectors at different providers
      const { data: recent } = await supabase
        .from('procedures')
        .select('injector_name, provider_name, provider_slug')
        .not('injector_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);

      if (recent && data) {
        const flags = [];
        for (const inj of data) {
          const name = (inj.display_name || inj.name || '').toLowerCase();
          const currentSlug = inj.providers?.slug;
          const atOther = recent.find(
            (p) => p.injector_name?.toLowerCase() === name && p.provider_slug && p.provider_slug !== currentSlug
          );
          if (atOther) {
            flags.push({ injector: inj, otherProvider: atOther.provider_name, otherSlug: atOther.provider_slug });
          }
        }
        setMoveFlags(flags);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function markAsMoved(injectorId, newProviderSlug) {
    const { data: provider } = await supabase
      .from('providers')
      .select('id, name')
      .eq('slug', newProviderSlug)
      .maybeSingle();

    if (!provider) return;

    // Update injector's current provider
    const inj = injectors.find((i) => i.id === injectorId);
    const prevIds = inj?.previous_provider_ids || [];
    if (inj?.provider_id) prevIds.push(inj.provider_id);

    await supabase
      .from('injectors')
      .update({
        provider_id: provider.id,
        previous_provider_ids: prevIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', injectorId);

    // Create injector_update
    const { data: update } = await supabase
      .from('injector_updates')
      .insert({
        injector_id: injectorId,
        update_type: 'moved',
        title: `moved to ${provider.name}`,
        provider_id: provider.id,
      })
      .select()
      .single();

    // Fan out notifications
    if (update) {
      supabase.functions.invoke('fan-out-injector-update', {
        body: { injector_update_id: update.id },
      }).catch(console.error);
    }

    // Refresh
    setMoveFlags((prev) => prev.filter((f) => f.injector.id !== injectorId));
  }

  if (loading) return <div className="text-center py-12 text-text-secondary animate-pulse">Loading...</div>;

  return (
    <div className="space-y-6">
      {moveFlags.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-500" />
            Possible Moves Detected
          </h3>
          <div className="space-y-3">
            {moveFlags.map((flag) => (
              <div key={flag.injector.id} className="glow-card p-4 border-l-4 border-amber-400">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-text-primary">{flag.injector.display_name || flag.injector.name}</p>
                    <p className="text-sm text-text-secondary">
                      Currently at: {flag.injector.providers?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      Recent submission tags them at: <span className="font-medium">{flag.otherProvider}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => markAsMoved(flag.injector.id, flag.otherSlug)}
                    className="flex items-center gap-1 bg-amber-500 text-white px-3 py-2 rounded-lg hover:bg-amber-600 transition text-sm font-medium shrink-0"
                  >
                    <ArrowRight size={14} /> Mark as Moved
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-text-primary mb-3">All Injectors ({injectors.length})</h3>
        <div className="space-y-2">
          {injectors.map((inj) => (
            <div key={inj.id} className="glow-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">{inj.display_name || inj.name}</span>
                    {inj.credentials && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-[#0369A1]">{inj.credentials}</span>
                    )}
                    {inj.is_claimed && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">Claimed</span>}
                    {inj.is_verified && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Verified</span>}
                  </div>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {inj.providers?.name || 'No provider'} &middot; {inj.follower_count || 0} followers
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

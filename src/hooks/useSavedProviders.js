import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../App';
import { supabase } from '../lib/supabase';

export default function useSavedProviders() {
  const { user } = useContext(AuthContext);
  const [savedProviders, setSavedProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setSavedProviders([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase
      .from('saved_providers')
      .select('id, provider_id, provider_slug, notes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setSavedProviders(data || []);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  const isSaved = useCallback((providerSlug) => {
    return savedProviders.some((s) => s.provider_slug === providerSlug);
  }, [savedProviders]);

  const saveProvider = useCallback(async (providerSlug, providerId = null) => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('saved_providers')
      .insert({
        user_id: user.id,
        provider_slug: providerSlug,
        provider_id: providerId,
      })
      .select('id, provider_id, provider_slug, notes, created_at')
      .single();

    if (data) {
      setSavedProviders((prev) => [data, ...prev]);
    }
  }, [user?.id]);

  const unsaveProvider = useCallback(async (providerSlug) => {
    if (!user?.id) return;

    const existing = savedProviders.find((s) => s.provider_slug === providerSlug);
    if (!existing) return;

    await supabase.from('saved_providers').delete().eq('id', existing.id);
    setSavedProviders((prev) => prev.filter((s) => s.id !== existing.id));
  }, [user?.id, savedProviders]);

  return { savedProviders, isSaved, saveProvider, unsaveProvider, loading };
}

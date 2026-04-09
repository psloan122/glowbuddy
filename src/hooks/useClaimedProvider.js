import { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';

export default function useClaimedProvider() {
  const { user } = useContext(AuthContext);
  const userId = user?.id;
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  function refresh() {
    setRefreshCounter((c) => c + 1);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId) {
        if (!cancelled) {
          setProvider(null);
          setError(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

      const { data, error: fetchErr } = await supabase
        .from('providers')
        .select('*')
        .eq('owner_user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchErr) {
        setError(fetchErr);
        setProvider(null);
      } else {
        setProvider(data || null);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshCounter]);

  return { provider, loading, error, refresh };
}

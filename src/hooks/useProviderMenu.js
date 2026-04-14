import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Fetches confirmed menu items for a provider. Used by the log flow
 * to show the provider's actual menu as a selection list.
 */
export default function useProviderMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMenu = useCallback(async (providerId) => {
    if (!providerId) {
      setMenuItems([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase
        .from('menu_items_staging')
        .select('procedure_type, price, price_label, notes')
        .eq('provider_id', providerId)
        .eq('is_confirmed', true)
        .order('procedure_type');

      setMenuItems(data || []);
    } catch {
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setMenuItems([]), []);

  return { menuItems, loading, fetchMenu, clear };
}

import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../App';
import { supabase } from '../lib/supabase';
import { getInterests, getPreferences, getProcedureTags, setPreferences as setLocalPrefs, setProcedureTags as setLocalTags } from '../lib/gating';
import { INTEREST_TO_PROCEDURES, PROCEDURE_CATEGORIES } from '../lib/constants';

export default function useUserPreferences() {
  const { user } = useContext(AuthContext);
  const [preferences, setPreferences] = useState(null);
  const [procedureTags, setProcedureTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load preferences
  useEffect(() => {
    if (!user?.id) {
      // Unauthenticated: use localStorage
      const localPrefs = getPreferences();
      const localTags = getProcedureTags();
      setPreferences(localPrefs);
      setProcedureTags(localTags.length > 0 ? localTags : resolveInterestsToTags(getInterests()));
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [prefsRes, tagsRes] = await Promise.all([
          supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('user_procedure_tags')
            .select('procedure_type')
            .eq('user_id', user.id),
        ]);

        if (cancelled) return;

        setPreferences(prefsRes.data || {});
        setProcedureTags((tagsRes.data || []).map((t) => t.procedure_type));
      } catch {
        // Fall back to localStorage
        setPreferences(getPreferences());
        setProcedureTags(getProcedureTags());
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const updatePreferences = useCallback(async (updates) => {
    const merged = { ...preferences, ...updates };
    setPreferences(merged);

    if (!user?.id) {
      setLocalPrefs(merged);
      return;
    }

    try {
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    } catch {
      // Best effort
    }
  }, [user?.id, preferences]);

  const toggleProcedureTag = useCallback(async (procedureType) => {
    const exists = procedureTags.includes(procedureType);
    const next = exists
      ? procedureTags.filter((t) => t !== procedureType)
      : [...procedureTags, procedureType];

    setProcedureTags(next);

    if (!user?.id) {
      setLocalTags(next);
      return;
    }

    try {
      if (exists) {
        await supabase
          .from('user_procedure_tags')
          .delete()
          .eq('user_id', user.id)
          .eq('procedure_type', procedureType);
      } else {
        await supabase
          .from('user_procedure_tags')
          .upsert({ user_id: user.id, procedure_type: procedureType, source: 'manual' }, { onConflict: 'user_id,procedure_type' });
      }
    } catch {
      // Best effort
    }
  }, [user?.id, procedureTags]);

  const isInterestedIn = useCallback((procedureType) => {
    return procedureTags.includes(procedureType);
  }, [procedureTags]);

  return { preferences, procedureTags, loading, updatePreferences, toggleProcedureTag, isInterestedIn };
}

// Resolve broad onboarding interests to specific procedure types
function resolveInterestsToTags(interests) {
  const tags = [];
  for (const interest of interests) {
    const mapped = INTEREST_TO_PROCEDURES[interest];
    if (mapped) {
      tags.push(...mapped);
    }
  }
  return [...new Set(tags)];
}

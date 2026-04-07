import { supabase } from './supabase';
import { BADGE_DEFINITIONS } from './constants';

export async function checkAndAwardBadges(userId) {
  if (!userId) return [];

  const { count } = await supabase
    .from('procedures')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { data: existingBadges } = await supabase
    .from('user_badges')
    .select('badge_type')
    .eq('user_id', userId);

  const earned = new Set((existingBadges || []).map((b) => b.badge_type));
  const newBadges = [];

  for (const [key, badge] of Object.entries(BADGE_DEFINITIONS)) {
    if (!earned.has(key) && count >= badge.threshold) {
      const { error } = await supabase.from('user_badges').insert({
        user_id: userId,
        badge_type: key,
      });
      if (!error) {
        newBadges.push(badge);
      }
    }
  }

  return newBadges;
}

import { supabase } from './supabase';

export async function createAlert({ procedureType, city, state, maxPrice, frequency = 'instant' }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be signed in');

  const { data, error } = await supabase
    .from('price_alerts')
    .insert({
      user_id: user.id,
      procedure_type: procedureType,
      city: city || null,
      state: state || null,
      max_price: maxPrice || null,
      frequency,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserAlerts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteAlert(alertId) {
  const { error } = await supabase
    .from('price_alerts')
    .delete()
    .eq('id', alertId);

  if (error) throw error;
}

export async function toggleAlert(alertId, isActive) {
  const { error } = await supabase
    .from('price_alerts')
    .update({ is_active: isActive })
    .eq('id', alertId);

  if (error) throw error;
}

export async function getUnreadCount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('price_alert_triggers')
    .select('*, price_alerts!inner(user_id)', { count: 'exact', head: true })
    .eq('price_alerts.user_id', user.id)
    .eq('was_read', false);

  if (error) return 0;
  return count || 0;
}

export async function markTriggersRead(alertId) {
  const { error } = await supabase
    .from('price_alert_triggers')
    .update({ was_read: true })
    .eq('alert_id', alertId)
    .eq('was_read', false);

  if (error) throw error;
}

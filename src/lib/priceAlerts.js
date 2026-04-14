import { supabase } from './supabase';

export async function createAlert({
  procedureType,
  brand = null,
  priceUnit = 'per_unit',
  city = null,
  state = null,
  lat = null,
  lng = null,
  zip = null,
  radiusMiles = 25,
  maxPrice = null,
  frequency = 'instant',
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be signed in');

  const { data, error } = await supabase
    .from('price_alerts')
    .insert({
      user_id: user.id,
      procedure_type: procedureType,
      brand: brand || null,
      price_unit: priceUnit || 'per_unit',
      city: city || null,
      state: state || null,
      lat: lat ?? null,
      lng: lng ?? null,
      zip_code: zip || null,
      radius_miles: radiusMiles ?? 25,
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
    .select('id, user_id, procedure_type, brand, price_unit, city, state, zip_code, lat, lng, radius_miles, max_price, is_active, created_at')
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

// Fetch active alerts for the current user (lightweight, for AlertMatchBadge)
export async function getUserActiveAlerts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('price_alerts')
    .select('id, procedure_type, city, state, max_price, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) return [];
  return data || [];
}

// Fetch current average price for a treatment in a location
export async function fetchCurrentAvg(procedureType, city, state) {
  if (!procedureType) return null;

  let query = supabase
    .from('procedures')
    .select('price_paid')
    .eq('procedure_type', procedureType)
    .eq('status', 'active');

  if (city) query = query.ilike('city', city);
  if (state) query = query.eq('state', state);

  const { data } = await query.limit(200);
  if (!data || data.length === 0) return null;

  const sum = data.reduce((acc, row) => acc + Number(row.price_paid), 0);
  return Math.round((sum / data.length) * 100) / 100;
}

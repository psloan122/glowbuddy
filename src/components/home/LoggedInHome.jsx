import { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { getUserAlerts } from '../../lib/priceAlerts';
import { fetchCityReport } from '../../lib/cityReport';
import { getCity, getState } from '../../lib/gating';
import { AuthContext } from '../../App';
import DashboardHeader from './DashboardHeader';
import AlertStrip from './AlertStrip';
import YourPriceAlerts from './YourPriceAlerts';
import PriceTrends from './PriceTrends';
import PricesNearYou from './PricesNearYou';
import FollowingSection from './FollowingSection';
import YourActivity from './YourActivity';
import CityReportPreview from './CityReportPreview';
import NationalTrends from './NationalTrends';
import QuickActionsBar from './QuickActionsBar';
import CreatePriceAlert from '../CreatePriceAlert';

export default function LoggedInHome() {
  const { user } = useContext(AuthContext);
  const userId = user?.id;
  const city = getCity();
  const state = getState();

  // Data states
  const [profile, setProfile] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [nearbyPrices, setNearbyPrices] = useState([]);
  const [follows, setFollows] = useState([]);
  const [activity, setActivity] = useState(null);
  const [cityReport, setCityReport] = useState(null);

  // Loading states
  const [profileLoading, setProfileLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const [followsLoading, setFollowsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);

  // UI state
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [triggersDismissed, setTriggersDismissed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadAllData();
  }, [userId]);

  async function loadAllData() {
    const results = await Promise.allSettled([
      fetchProfile(),
      fetchAlerts(),
      fetchTriggers(),
      fetchNearby(),
      fetchFollowing(),
      fetchActivityData(),
      fetchReport(),
    ]);

    // Each handler sets its own loading state, so nothing to do here
    void results;
  }

  async function fetchProfile() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .single();
      setProfile(data);
    } catch {
      // profile not found — use email fallback
    } finally {
      setProfileLoading(false);
    }
  }

  async function fetchAlerts() {
    try {
      const data = await getUserAlerts();
      setAlerts(data);
    } catch {
      // ignore
    } finally {
      setAlertsLoading(false);
    }
  }

  async function fetchTriggers() {
    try {
      const { data } = await supabase
        .from('price_alert_triggers')
        .select('*, price_alerts!inner(user_id, procedure_type, city, max_price)')
        .eq('price_alerts.user_id', userId)
        .eq('was_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      const mapped = (data || []).map((t) => ({
        ...t,
        procedure_type: t.price_alerts?.procedure_type,
        city: t.price_alerts?.city,
        max_price: t.price_alerts?.max_price,
        triggered_price: t.triggered_price || t.price_alerts?.max_price,
      }));
      setTriggers(mapped);
    } catch {
      // ignore
    }
  }

  async function fetchNearby() {
    try {
      if (!city || !state) {
        setNearbyPrices([]);
        setNearbyLoading(false);
        return;
      }
      const { data } = await supabase
        .from('procedures')
        .select('id, procedure_type, price_paid, unit, units_or_volume, provider_name, provider_type, city, state, created_at, rating, receipt_verified, result_photo_url, trust_tier, is_anonymous, provider_slug, provider_id')
        .eq('status', 'active')
        .ilike('city', city)
        .eq('state', state)
        .order('created_at', { ascending: false })
        .limit(4);
      setNearbyPrices(data || []);
    } catch {
      // ignore
    } finally {
      setNearbyLoading(false);
    }
  }

  async function fetchFollowing() {
    try {
      const { data } = await supabase
        .from('injector_follows')
        .select('id, injectors(id, slug, name, display_name, city, avg_rating, providers(city, state))')
        .eq('user_id', userId)
        .limit(10);
      setFollows(data || []);
    } catch {
      // ignore
    } finally {
      setFollowsLoading(false);
    }
  }

  async function fetchActivityData() {
    try {
      // Run all three queries in parallel
      const [countRes, recentRes, pioneerRes] = await Promise.all([
        supabase
          .from('procedures')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'active'),
        supabase
          .from('procedures')
          .select('id, procedure_type, price_paid, created_at')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('pioneer_records')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);

      setActivity({
        pricesShared: countRes.count || 0,
        savedVsAvg: 0,
        isPioneer: (pioneerRes.count || 0) > 0,
        recentSubmissions: recentRes.data || [],
      });
    } catch {
      // ignore
    } finally {
      setActivityLoading(false);
    }
  }

  async function fetchReport() {
    try {
      if (!city || !state) {
        setCityReport(null);
        setReportLoading(false);
        return;
      }
      const report = await fetchCityReport(city, state);
      setCityReport(report);
    } catch {
      // ignore
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 lg:pb-6">
      {/* Header */}
      <DashboardHeader
        displayName={profile?.display_name}
        email={user?.email}
        city={city}
        state={state}
      />

      {/* Alert strip */}
      {!triggersDismissed && triggers.length > 0 && (
        <div className="mt-4">
          <AlertStrip triggers={triggers} onDismiss={() => setTriggersDismissed(true)} />
        </div>
      )}

      {/* Quick actions (desktop inline) */}
      <div className="mt-5">
        <QuickActionsBar />
      </div>

      {/* Two-column layout */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT column */}
        <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
          {/* Mobile: PricesNearYou comes first */}
          <div className="lg:hidden">
            <PricesNearYou
              procedures={nearbyPrices}
              city={city}
              state={state}
              loading={nearbyLoading}
            />
          </div>

          <YourPriceAlerts
            alerts={alerts}
            loading={alertsLoading}
            onCreateAlert={() => setShowCreateAlert(true)}
          />

          <PriceTrends userCity={city} userState={state} />

          <FollowingSection follows={follows} loading={followsLoading} />
        </div>

        {/* RIGHT column */}
        <div className="lg:col-span-5 space-y-6 order-1 lg:order-2">
          {/* Desktop: PricesNearYou on right */}
          <div className="hidden lg:block">
            <PricesNearYou
              procedures={nearbyPrices}
              city={city}
              state={state}
              loading={nearbyLoading}
            />
          </div>

          <YourActivity activity={activity} loading={activityLoading} />

          <CityReportPreview
            report={cityReport}
            city={city}
            state={state}
            loading={reportLoading}
          />

          <NationalTrends />
        </div>
      </div>

      {/* Create alert modal */}
      {showCreateAlert && (
        <CreatePriceAlert
          onClose={() => {
            setShowCreateAlert(false);
            // Refresh alerts after creating
            fetchAlerts();
          }}
          defaultCity={city}
          defaultState={state}
        />
      )}
    </div>
  );
}

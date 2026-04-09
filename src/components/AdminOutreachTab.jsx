import { useState, useEffect } from 'react';
import { Send, Mail, ExternalLink, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminOutreachTab() {
  const [providers, setProviders] = useState([]);
  const [emailLog, setEmailLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null); // provider id being sent
  const [filter, setFilter] = useState('unsent'); // 'unsent' | 'sent' | 'all'
  const [stats, setStats] = useState({ total: 0, emailed: 0, optedOut: 0, claimed: 0 });

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    setLoading(true);

    // Fetch providers with contact_email
    let query = supabase
      .from('providers')
      .select('id, name, slug, city, state, contact_email, is_claimed, activity_email_opted_out, last_activity_email_sent_at, page_view_count_week, page_view_count_total')
      .not('contact_email', 'is', null)
      .order('page_view_count_week', { ascending: false });

    if (filter === 'unsent') {
      query = query.eq('is_claimed', false).is('last_activity_email_sent_at', null);
    } else if (filter === 'sent') {
      query = query.not('last_activity_email_sent_at', 'is', null);
    }

    const { data: rows } = await query.limit(200);
    setProviders(rows || []);

    // Fetch email sent events
    const { data: events } = await supabase
      .from('custom_events')
      .select('properties, created_at')
      .eq('event_name', 'provider_activity_email_sent')
      .order('created_at', { ascending: false })
      .limit(50);
    setEmailLog(events || []);

    // Stats
    const { count: totalWithEmail } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .not('contact_email', 'is', null)
      .eq('is_claimed', false);

    const { count: emailed } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .not('contact_email', 'is', null)
      .eq('is_claimed', false)
      .not('last_activity_email_sent_at', 'is', null);

    const { count: optedOut } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .not('contact_email', 'is', null)
      .eq('activity_email_opted_out', true);

    const { count: claimedFromEmail } = await supabase
      .from('custom_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_name', 'provider_claim_from_email');

    setStats({
      total: totalWithEmail || 0,
      emailed: emailed || 0,
      optedOut: optedOut || 0,
      claimed: claimedFromEmail || 0,
    });

    setLoading(false);
  }

  async function handleSendNow(provider) {
    setSending(provider.id);

    try {
      // Invoke the cron function for a single provider via send-email directly
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get submissions this week
      const { data: weekSubs } = await supabase
        .from('procedures')
        .select('price_paid')
        .ilike('provider_name', provider.name)
        .eq('status', 'active')
        .gte('created_at', sevenDaysAgo);

      const submissionsWeek = weekSubs?.length || 0;

      // Avg price
      let avgPrice = null;
      if (weekSubs && weekSubs.length > 0) {
        const prices = weekSubs.map((s) => Number(s.price_paid)).filter((p) => p > 0);
        if (prices.length > 0) {
          avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        }
      }

      // Total submissions
      const { count: totalSubs } = await supabase
        .from('procedures')
        .select('id', { count: 'exact', head: true })
        .ilike('provider_name', provider.name)
        .eq('status', 'active');

      // Competitor count
      const { count: competitors } = await supabase
        .from('providers')
        .select('id', { count: 'exact', head: true })
        .eq('is_claimed', true)
        .eq('city', provider.city)
        .eq('state', provider.state)
        .neq('id', provider.id);

      // Competitor name
      let competitorName = null;
      let competitorCity = null;
      if ((competitors || 0) > 0) {
        const { data: comp } = await supabase
          .from('providers')
          .select('name, city')
          .eq('is_claimed', true)
          .eq('city', provider.city)
          .eq('state', provider.state)
          .neq('id', provider.id)
          .limit(1)
          .single();
        if (comp) {
          competitorName = comp.name;
          competitorCity = comp.city;
        }
      }

      const claimUrl = `https://knowbeforeyouglow.com/business/onboarding?provider=${provider.slug}&source=email`;
      const pageUrl = `https://knowbeforeyouglow.com/provider/${provider.slug}`;

      // Use simple HMAC for opt-out (same logic as cron function)
      const optoutUrl = `https://knowbeforeyouglow.com/api/provider-email-optout?id=${provider.id}&token=admin-manual`;

      const useCompetitorSubject = (competitors || 0) > 0 && competitorName;
      const subject = useCompetitorSubject
        ? 'A competitor is advertising on your Know Before You Glow page'
        : `${provider.page_view_count_week || 0} people viewed ${provider.name} on Know Before You Glow this week`;

      await supabase.functions.invoke('send-email', {
        body: {
          template: 'provider_activity',
          to: provider.contact_email,
          subject,
          data: {
            providerName: provider.name,
            providerSlug: provider.slug,
            pageViews: provider.page_view_count_week || 0,
            submissionsWeek: submissionsWeek,
            submissionsTotal: totalSubs || 0,
            avgPrice,
            competitorCount: competitors || 0,
            competitorName,
            competitorCity,
            claimUrl,
            pageUrl,
            optoutUrl,
          },
        },
      });

      // Update last sent
      await supabase
        .from('providers')
        .update({ last_activity_email_sent_at: new Date().toISOString() })
        .eq('id', provider.id);

      // Track event
      await supabase.from('custom_events').insert({
        event_name: 'provider_activity_email_sent',
        properties: {
          provider_id: provider.id,
          provider_slug: provider.slug,
          page_views: provider.page_view_count_week || 0,
          submissions_week: submissionsWeek,
          competitor_count: competitors || 0,
          subject_variant: useCompetitorSubject ? 'competitor' : 'activity',
          source: 'admin_manual',
        },
      });

      loadData();
    } catch {
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(null);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-rose-accent animate-pulse">Loading outreach data...</div>;
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
          <p className="text-xs text-text-secondary">With Email</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.emailed}</p>
          <p className="text-xs text-text-secondary">Emailed</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{stats.optedOut}</p>
          <p className="text-xs text-text-secondary">Opted Out</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.claimed}</p>
          <p className="text-xs text-text-secondary">Claimed from Email</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['unsent', 'sent', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              filter === f ? 'bg-rose-accent text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {f === 'unsent' ? 'Not Yet Emailed' : f === 'sent' ? 'Already Sent' : 'All'}
          </button>
        ))}
      </div>

      {/* Provider table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-text-secondary">Provider</th>
              <th className="text-left px-3 py-2 font-medium text-text-secondary">Email</th>
              <th className="text-right px-3 py-2 font-medium text-text-secondary">Views/wk</th>
              <th className="text-right px-3 py-2 font-medium text-text-secondary">Total Views</th>
              <th className="text-center px-3 py-2 font-medium text-text-secondary">Status</th>
              <th className="text-center px-3 py-2 font-medium text-text-secondary">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {providers.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <td className="px-3 py-2">
                  <a
                    href={`/provider/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-text-primary hover:text-rose-accent flex items-center gap-1"
                  >
                    {p.name}
                    <ExternalLink size={12} className="text-text-secondary" />
                  </a>
                  <span className="text-xs text-text-secondary">{p.city}, {p.state}</span>
                </td>
                <td className="px-3 py-2 text-text-secondary text-xs font-mono">{p.contact_email}</td>
                <td className="px-3 py-2 text-right font-semibold">{p.page_view_count_week || 0}</td>
                <td className="px-3 py-2 text-right text-text-secondary">{p.page_view_count_total || 0}</td>
                <td className="px-3 py-2 text-center">
                  {p.is_claimed ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle size={12} /> Claimed</span>
                  ) : p.activity_email_opted_out ? (
                    <span className="inline-flex items-center gap-1 text-xs text-red-500"><XCircle size={12} /> Opted Out</span>
                  ) : p.last_activity_email_sent_at ? (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                      <Clock size={12} /> Sent {new Date(p.last_activity_email_sent_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-xs text-text-secondary">Not sent</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {!p.is_claimed && !p.activity_email_opted_out && (
                    <button
                      onClick={() => handleSendNow(p)}
                      disabled={sending === p.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#C94F78' }}
                    >
                      {sending === p.id ? 'Sending...' : <><Send size={12} /> Send Now</>}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {providers.length === 0 && (
          <p className="text-center py-8 text-text-secondary">No providers match this filter.</p>
        )}
      </div>

      {/* Email sent log */}
      <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
        <Mail size={18} /> Recent Email Log
      </h3>
      {emailLog.length === 0 ? (
        <p className="text-text-secondary text-sm">No emails sent yet.</p>
      ) : (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {emailLog.map((event, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div>
                <span className="font-medium text-text-primary">{event.properties?.provider_slug}</span>
                <span className="text-text-secondary ml-2">
                  {event.properties?.subject_variant === 'competitor' ? '(competitor)' : '(activity)'}
                </span>
                {event.properties?.source === 'admin_manual' && (
                  <span className="text-xs text-amber-600 ml-1">(manual)</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-secondary flex items-center gap-1">
                  <Eye size={12} /> {event.properties?.page_views || 0} views
                </span>
                <span className="text-xs text-text-secondary">
                  {new Date(event.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

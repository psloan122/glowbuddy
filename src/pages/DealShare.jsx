import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Bell, ArrowRight, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DealShare() {
  const [searchParams] = useSearchParams();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const treatment = searchParams.get('treatment');
  const price = searchParams.get('price');
  const city = searchParams.get('city');

  useEffect(() => {
    if (treatment) {
      document.title = `${treatment} deal${city ? ` in ${city}` : ''} | Know Before You Glow`;
    } else {
      document.title = 'Shared Deal | Know Before You Glow';
    }
  }, [treatment, city]);

  useEffect(() => {
    async function fetchMatches() {
      if (!treatment) {
        setLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('procedures')
          .select('*')
          .eq('procedure_type', treatment)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5);

        if (city) {
          query = query.ilike('city', city);
        }

        const { data } = await query;
        setMatches(data || []);
      } catch {
        // Silent — setLoading finalizes below
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [treatment, city]);

  // Fallback when no params are provided
  if (!treatment && !price) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Browse prices on Know Before You Glow
        </h1>
        <p className="text-gray-600 mb-8">
          Compare real med spa prices from real patients.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition-colors"
        >
          Go to Know Before You Glow
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex items-center gap-3 mb-8">
        <Share2 className="w-5 h-5 text-sky-600 flex-shrink-0" />
        <p className="text-sky-800 text-sm font-medium">
          This deal was shared with you
        </p>
      </div>

      {/* Hero */}
      <section className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 capitalize mb-2">
          {treatment}
        </h1>
        {price && (
          <p className="text-5xl font-extrabold text-rose-500 mb-2">
            ${price}
          </p>
        )}
        {city && (
          <p className="text-lg text-gray-500">
            in <span className="capitalize">{city}</span>
          </p>
        )}
      </section>

      {/* Matching submissions */}
      <section className="mb-10">
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            Loading matching prices...
          </div>
        ) : matches.length > 0 ? (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Recent matching prices
            </h2>
            <div className="space-y-3">
              {matches.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      {item.provider_name && (
                        <p className="font-semibold text-gray-900">
                          {item.provider_name}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        {[item.city, item.state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      {item.price != null && (
                        <p className="text-xl font-bold text-rose-500">
                          ${item.price}
                        </p>
                      )}
                      {item.created_at && (
                        <p className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">
            No matching submissions found yet.
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-gray-50 rounded-2xl p-6 text-center">
        <Bell className="w-8 h-8 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Want to get notified about deals like this?
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Set a price alert and we'll let you know when new prices drop.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/alerts"
            className="inline-flex items-center gap-2 bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition-colors"
          >
            <Bell className="w-4 h-4" />
            Set a Price Alert
          </Link>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Find All Prices
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

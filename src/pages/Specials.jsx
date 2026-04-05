import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Tag, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PROCEDURE_TYPES, US_STATES } from '../lib/constants';
import { AuthContext } from '../App';
import { getWalletBalance } from '../lib/referral';
import SpecialCard from '../components/SpecialCard';
import WalletCreditBanner from '../components/WalletCreditBanner';

export default function Specials() {
  const { user } = useContext(AuthContext);
  const [specials, setSpecials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procedureFilter, setProcedureFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (user) {
      getWalletBalance(user.id).then(setWalletBalance);
    }
  }, [user]);

  // SEO
  useEffect(() => {
    document.title = 'Med Spa Specials & Deals | GlowBuddy';
    const meta = document.querySelector('meta[name="description"]');
    const content =
      'Browse current med spa specials, promotions, and deals from verified providers on GlowBuddy.';
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = content;
      document.head.appendChild(newMeta);
    }
  }, []);

  // Fetch specials
  useEffect(() => {
    async function fetchSpecials() {
      setLoading(true);

      const { data } = await supabase
        .from('specials')
        .select('*, providers(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setSpecials(data || []);
      setLoading(false);
    }

    fetchSpecials();
  }, []);

  // Apply filters
  function getFilteredSpecials() {
    let filtered = specials;
    if (procedureFilter) {
      filtered = filtered.filter(
        (s) => s.procedure_type === procedureFilter
      );
    }
    if (stateFilter) {
      filtered = filtered.filter(
        (s) => s.providers?.state === stateFilter
      );
    }
    return filtered;
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse text-rose-accent text-center text-lg">
          Loading specials...
        </div>
      </div>
    );
  }

  const filteredSpecials = getFilteredSpecials();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
          <Sparkles size={28} className="text-rose-accent" />
          Specials & Deals
        </h1>
        <p className="text-text-secondary">
          Current promotions from med spas and providers
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={procedureFilter}
          onChange={(e) => setProcedureFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-accent/50"
        >
          <option value="">All Procedures</option>
          {PROCEDURE_TYPES.map((pt) => (
            <option key={pt} value={pt}>
              {pt}
            </option>
          ))}
        </select>

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-accent/50"
        >
          <option value="">All States</option>
          {US_STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Wallet credit banner */}
      <WalletCreditBanner />

      {/* Specials Grid */}
      {filteredSpecials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpecials.map((special) => (
            <SpecialCard
              key={special.id}
              special={special}
              provider={special.providers}
              walletBalance={walletBalance}
            />
          ))}
        </div>
      ) : (
        <div className="glow-card p-8 text-center">
          <div className="flex justify-center mb-4">
            <Tag size={40} className="text-text-secondary/30" />
          </div>
          <p className="text-text-secondary mb-4">
            No specials posted in this area yet.
          </p>
          <Link
            to="/business"
            className="inline-block px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            List Your Business
          </Link>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, X, CheckCircle, Phone, ExternalLink, Search, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../App';

export default function Step1FindPractice({ onComplete, initialQuery = '' }) {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [existingProvider, setExistingProvider] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualData, setManualData] = useState({ name: '', address: '', city: '', state: '', zip: '', phone: '', website: '' });
  const [error, setError] = useState(null);

  function providerToPlace(provider) {
    return {
      name: provider.name,
      formattedAddress: `${provider.address || ''}, ${provider.city}, ${provider.state} ${provider.zip_code || ''}`,
      city: provider.city,
      state: provider.state,
      zipCode: provider.zip_code,
      address: provider.address,
      phone: provider.phone,
      website: provider.website,
      placeId: provider.google_place_id,
      lat: provider.lat,
      lng: provider.lng,
      googleRating: null,
      googleReviewCount: null,
      googleMapsUrl: null,
      googlePriceLevel: null,
      googleTypes: [],
      hoursText: '',
      googlePhotos: [],
    };
  }

  const urlParamsDone = useRef(false);
  useEffect(() => {
    if (urlParamsDone.current) return;
    urlParamsDone.current = true;

    const name = searchParams.get('name');
    const city = searchParams.get('city');
    const providerId = searchParams.get('provider_id');

    if (!name && !providerId) return;

    if (providerId) {
      supabase
        .from('providers')
        .select('id, name, city, state, address, lat, lng, phone, website, google_place_id, is_claimed, owner_user_id')
        .eq('id', providerId)
        .single()
        .then(({ data }) => {
          if (data) {
            if (data.is_claimed && data.owner_user_id !== user?.id) {
              setError(
                'This listing has already been claimed. Contact support@knowbeforeyouglow.com if you believe this is an error.'
              );
              return;
            }
            setSelectedPlace(providerToPlace(data));
            setExistingProvider(data);
            setValue(data.name);
          }
        });
      return;
    }

    if (name) setValue(name);

    if (name && city) {
      supabase
        .from('providers')
        .select('id, name, city, state, address, lat, lng, phone, website, google_place_id, is_claimed, owner_user_id')
        .ilike('name', `%${name}%`)
        .ilike('city', `${city}%`)
        .eq('is_active', true)
        .limit(3)
        .then(({ data }) => {
          if (data?.length === 1) {
            setSelectedPlace(providerToPlace(data[0]));
            setExistingProvider(data[0]);
            setValue(data[0].name);
          }
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setResults([]);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const prefillDone = useRef(false);
  useEffect(() => {
    if (initialQuery && !prefillDone.current) {
      prefillDone.current = true;
      handleInputChange(initialQuery);
    }
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedPlace) {
      setExistingProvider(null);
      setProviderStatus(null);
      return;
    }

    async function check() {
      let provider = null;

      if (selectedPlace.placeId) {
        const { data } = await supabase
          .from('providers')
          .select('*')
          .eq('google_place_id', selectedPlace.placeId)
          .maybeSingle();
        provider = data;
      }

      if (!provider && selectedPlace.name) {
        const { data } = await supabase
          .from('providers')
          .select('*')
          .ilike('name', selectedPlace.name)
          .ilike('city', selectedPlace.city || '')
          .eq('is_active', true)
          .limit(1);
        provider = data?.[0] || null;
      }

      if (!provider) {
        setProviderStatus('new');
        setExistingProvider(null);
        setSubmissionCount(0);
      } else if (provider.is_claimed) {
        setProviderStatus('claimed');
        setExistingProvider(provider);
      } else {
        const { count } = await supabase
          .from('procedures')
          .select('*', { count: 'exact', head: true })
          .eq('provider_slug', provider.slug)
          .eq('status', 'active');
        setProviderStatus('unclaimed');
        setExistingProvider(provider);
        setSubmissionCount(count || 0);
      }
    }
    check();
  }, [selectedPlace]);

  function handleInputChange(input) {
    setValue(input);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (input.length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('providers')
        .select('id, name, city, state, address, lat, lng, phone, website, google_place_id')
        .ilike('name', `%${input}%`)
        .eq('is_active', true)
        .limit(8);
      setResults(data || []);
    }, 300);
  }

  function handleSelect(provider) {
    setValue(provider.name);
    setResults([]);
    setSelectedPlace(providerToPlace(provider));
  }

  function handleConfirm() {
    onComplete(selectedPlace, existingProvider, false);
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    const place = {
      name: manualData.name,
      formattedAddress: `${manualData.address}, ${manualData.city}, ${manualData.state} ${manualData.zip}`,
      city: manualData.city,
      state: manualData.state,
      zipCode: manualData.zip,
      address: manualData.address,
      phone: manualData.phone,
      website: manualData.website,
      placeId: null,
      lat: null,
      lng: null,
      googleRating: null,
      googleReviewCount: null,
      googleMapsUrl: null,
      googlePriceLevel: null,
      googleTypes: [],
      hoursText: '',
      googlePhotos: [],
    };
    onComplete(place, null, false);
  }

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-2">Find your practice</h1>
      <p className="text-text-secondary mb-8">
        Search for your med spa or clinic to see if it's already on Know Before You Glow.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {!selectedPlace ? (
        <>
          <div ref={wrapperRef} className="relative mb-6">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Search your practice name..."
                className="w-full pl-10 pr-10 py-3.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
              />
              {value.length >= 2 && (
                <button type="button" onClick={() => { setValue(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5">
                  <X size={14} />
                </button>
              )}
            </div>

            {results.length > 0 && (
              <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => handleSelect(p)} className="w-full text-left px-4 py-3 hover:bg-rose-light/50 transition-colors flex items-start gap-3">
                      <MapPin size={14} className="text-text-secondary mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm text-text-primary font-medium block">{p.name}</span>
                        <span className="text-xs text-text-secondary">{[p.city, p.state].filter(Boolean).join(', ')}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!showManualForm ? (
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-text-secondary mb-2">Don't see your practice?</p>
              <button onClick={() => setShowManualForm(true)} className="text-sm text-rose-accent font-medium hover:text-rose-dark transition">
                Add it manually &rarr;
              </button>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="glow-card p-5 space-y-4 mt-4">
              <h3 className="font-semibold text-text-primary">Add your practice manually</h3>
              <input type="text" required placeholder="Practice name" value={manualData.name} onChange={(e) => setManualData(d => ({ ...d, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm" />
              <input type="text" required placeholder="Street address" value={manualData.address} onChange={(e) => setManualData(d => ({ ...d, address: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm" />
              <div className="grid grid-cols-3 gap-3">
                <input type="text" required placeholder="City" value={manualData.city} onChange={(e) => setManualData(d => ({ ...d, city: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm" />
                <input type="text" required placeholder="State (e.g. CA)" maxLength={2} value={manualData.state} onChange={(e) => setManualData(d => ({ ...d, state: e.target.value.toUpperCase() }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm" />
                <input type="text" required placeholder="Zip" maxLength={5} value={manualData.zip} onChange={(e) => setManualData(d => ({ ...d, zip: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" placeholder="Phone (optional)" value={manualData.phone} onChange={(e) => setManualData(d => ({ ...d, phone: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm" />
                <input type="url" placeholder="Website (optional)" value={manualData.website} onChange={(e) => setManualData(d => ({ ...d, website: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm" />
              </div>
              <button type="submit" className="bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition w-full">
                Continue &rarr;
              </button>
            </form>
          )}
        </>
      ) : (
        <div>
          {/* Confirmation card */}
          <div className="glow-card p-5 mb-4">
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle size={20} className="text-verified flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-primary">{selectedPlace.name}</h3>
                <p className="text-sm text-text-secondary">{selectedPlace.formattedAddress}</p>
                {selectedPlace.phone && (
                  <p className="text-sm text-text-secondary flex items-center gap-1 mt-1"><Phone size={12} /> {selectedPlace.phone}</p>
                )}
                {selectedPlace.website && (
                  <p className="text-sm text-text-secondary flex items-center gap-1 mt-1"><ExternalLink size={12} /> {selectedPlace.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
                )}
              </div>
            </div>

            {selectedPlace.lat && selectedPlace.lng && mapboxToken && (
              <img
                src={
                  `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
                  `pin-s+E8347A(${selectedPlace.lng},${selectedPlace.lat})/` +
                  `${selectedPlace.lng},${selectedPlace.lat},15/` +
                  `400x200@2x` +
                  `?access_token=${mapboxToken}`
                }
                alt="Map"
                className="w-full h-[140px] object-cover rounded-lg"
                loading="lazy"
              />
            )}
          </div>

          {/* Status banners */}
          {providerStatus === 'new' && (
            <div className="bg-verified/10 border border-verified/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-verified font-medium">
                Great news — you're the first to claim this listing on Know Before You Glow.
              </p>
            </div>
          )}

          {providerStatus === 'unclaimed' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-700 font-medium">
                Your practice already has a Know Before You Glow profile with {submissionCount} patient submission{submissionCount !== 1 ? 's' : ''}. Claim it to manage your listing.
              </p>
            </div>
          )}

          {providerStatus === 'claimed' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-700 font-medium">
                    This listing has already been claimed.
                  </p>
                  <p className="text-sm text-yellow-600 mt-1">
                    If you own this practice and believe this is an error, contact us at{' '}
                    <a href="mailto:support@knowbeforeyouglow.com" className="underline">support@knowbeforeyouglow.com</a>.
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm font-medium text-text-primary mb-3">Is this your practice?</p>
          <div className="flex gap-3">
            {providerStatus !== 'claimed' && (
              <button onClick={handleConfirm} className="flex-1 bg-rose-accent text-white py-3 rounded-full font-semibold hover:bg-rose-dark transition">
                Yes, this is mine &rarr;
              </button>
            )}
            <button onClick={() => { setSelectedPlace(null); setValue(''); }} className="flex-1 border border-gray-200 text-text-secondary py-3 rounded-full font-medium hover:bg-gray-50 transition">
              Search again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../App';
import { isEmailVerified } from '../../lib/auth';
import { slugify } from '../../lib/slugify';
import Step1FindPractice from '../../components/ProviderOnboarding/Step1FindPractice';
import Step2VerifyOwnership from '../../components/ProviderOnboarding/Step2VerifyOwnership';
import Step3PracticeProfile from '../../components/ProviderOnboarding/Step3PracticeProfile';
import Step4PriceMenu from '../../components/ProviderOnboarding/Step4PriceMenu';
import Step5ChoosePlan from '../../components/ProviderOnboarding/Step5ChoosePlan';
import WelcomeModal from '../../components/ProviderOnboarding/WelcomeModal';
import { sendProviderWelcome } from '../../lib/email';

const STEP_COUNT = 5;

export default function Onboarding() {
  const { session, user, openAuthModal } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [showWelcome, setShowWelcome] = useState(false);

  // Shared state across steps
  const [placeData, setPlaceData] = useState(null);
  const [existingProvider, setExistingProvider] = useState(null); // null | { id, is_claimed, submissionCount }
  const [verificationMethod, setVerificationMethod] = useState(null);
  const [selectedTier, setSelectedTier] = useState('free');
  const [profileData, setProfileData] = useState({
    name: '',
    provider_type: '',
    about: '',
    tagline: '',
    website: '',
    phone: '',
    instagram: '',
    hours: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    logo_url: '',
  });
  const [menuItems, setMenuItems] = useState([]);
  const [createdProvider, setCreatedProvider] = useState(null);
  const [initialSearchQuery, setInitialSearchQuery] = useState('');

  // Google photo import state
  const [googlePhotos, setGooglePhotos] = useState([]);
  const [importPhotos, setImportPhotos] = useState(false);
  const [menuError, setMenuError] = useState('');

  useEffect(() => {
    document.title = 'Set Up Your Practice | Know Before You Glow';
  }, []);

  // Pre-fill from place_id URL param (from "Claim This Listing" banner)
  useEffect(() => {
    const placeId = searchParams.get('place_id');
    if (placeId && !placeData) {
      // Look up existing provider by google_place_id
      supabase
        .from('providers')
        .select('*')
        .eq('google_place_id', placeId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            prefillFromProvider(data);
          }
        });
    }
  }, [searchParams, placeData]);

  // Pre-fill from provider slug URL param (from activity email claim CTA)
  useEffect(() => {
    const providerSlug = searchParams.get('provider');
    const source = searchParams.get('source');
    if (providerSlug && !placeData) {
      supabase
        .from('providers')
        .select('*')
        .eq('slug', providerSlug)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            prefillFromProvider(data);
            // Track claim-from-email event
            if (source === 'email') {
              supabase.from('custom_events').insert({
                event_name: 'provider_claim_from_email',
                properties: { provider_id: data.id, provider_slug: data.slug },
              });
            }
          }
        });
    }
  }, [searchParams, placeData]);

  // Pre-fill from name/city/state URL params (fallback when no place_id)
  useEffect(() => {
    const name = searchParams.get('name');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    if (!name || placeData || searchParams.get('place_id') || searchParams.get('provider')) return;

    async function findByName() {
      let query = supabase.from('providers').select('*').ilike('name', name);
      if (city) query = query.ilike('city', city);
      if (state) query = query.eq('state', state);
      const { data } = await query.limit(1);
      if (data && data.length > 0) {
        prefillFromProvider(data[0]);
      } else {
        // Provider not in DB — seed the search input
        setInitialSearchQuery(city ? `${name} ${city}` : name);
      }
    }
    findByName();
  }, [searchParams, placeData]);

  function prefillFromProvider(data) {
    setExistingProvider(data);
    setPlaceData({
      name: data.name,
      formattedAddress: `${data.address || ''}, ${data.city}, ${data.state} ${data.zip_code || ''}`,
      city: data.city,
      state: data.state,
      zipCode: data.zip_code,
      address: data.address,
      phone: data.phone,
      website: data.website,
      placeId: data.google_place_id,
      lat: data.lat,
      lng: data.lng,
      googleRating: null,
      googleReviewCount: null,
      googleMapsUrl: null,
      googlePriceLevel: null,
      googleTypes: [],
      hoursText: '',
      googlePhotos: [],
    });
    setProfileData((prev) => ({
      ...prev,
      name: data.name,
      provider_type: data.provider_type || '',
      website: data.website || '',
      phone: data.phone || '',
      instagram: data.instagram || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip_code || '',
    }));
    // Skip to step 2 (Profile)
    setStep(2);
  }

  // Require auth
  if (!session) {
    return (
      <div className="fixed inset-0 z-50 bg-warm-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Sign in to get started
          </h1>
          <p className="text-text-secondary mb-6">
            Create an account or sign in to claim your practice listing.
          </p>
          <button
            onClick={() => openAuthModal('signup', '/business/onboarding')}
            className="bg-rose-accent text-white px-8 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
          >
            Sign In / Sign Up
          </button>
        </div>
      </div>
    );
  }

  // Require email verification to claim a listing
  if (!isEmailVerified(user)) {
    return (
      <div className="fixed inset-0 z-50 bg-warm-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="flex items-center justify-center w-14 h-14 bg-rose-light rounded-full mx-auto mb-5">
            <Mail size={24} className="text-rose-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Verify your email first
          </h1>
          <p className="text-text-secondary mb-6">
            You need to verify your email before you can claim a provider listing.
            Check your inbox for a verification link.
          </p>
          <p className="text-sm text-text-secondary mb-6">
            Sent to <span className="font-medium text-text-primary">{user?.email}</span>
          </p>
          <button
            onClick={async () => {
              if (user?.email) {
                await supabase.auth.resend({ type: 'signup', email: user.email });
              }
            }}
            className="bg-rose-accent text-white px-8 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
          >
            Resend Verification Email
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Find Practice → advance to Profile (step 2)
  function handleStep1Complete(place, existing, shouldImportPhotos) {
    setPlaceData(place);
    setExistingProvider(existing);
    setGooglePhotos(place.googlePhotos || []);
    setImportPhotos(shouldImportPhotos || false);
    // Pre-fill profile from place data
    setProfileData((prev) => ({
      ...prev,
      name: place.name || prev.name,
      website: place.website || prev.website,
      phone: place.phone || prev.phone,
      address: place.address || prev.address,
      city: place.city || prev.city,
      state: place.state || prev.state,
      zip: place.zipCode || prev.zip,
      hours: place.hoursText || prev.hours,
    }));
    setStep(2);
  }

  // Step 2: Practice Profile → advance to Prices (step 3)
  function handleProfileComplete(data) {
    setProfileData(data);
    setStep(3);
  }

  // Step 3: Price Menu → advance to Plan (step 4)
  function handlePricesComplete(items) {
    setMenuItems(items);
    setStep(4);
  }

  // Step 4: Choose Plan → store tier, advance to Verify (step 5)
  async function handlePlanSelected(tier) {
    setSelectedTier(tier);
    setStep(5);
  }

  // Step 5: Verify Ownership → create/claim provider with stored tier
  async function handleVerifyComplete(method) {
    setVerificationMethod(method);

    // Use the tier stored in step 4 directly — no more pro→verified mapping
    const tier = selectedTier;
    const trialEndsAt =
      tier !== 'free'
        ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const googleMeta = {
      google_rating: placeData?.googleRating || null,
      google_review_count: placeData?.googleReviewCount || null,
      google_maps_url: placeData?.googleMapsUrl || null,
      google_price_level: placeData?.googlePriceLevel || null,
      hours_text: placeData?.hoursText || null,
      google_synced_at: placeData?.placeId ? new Date().toISOString() : null,
    };

    let providerId = null;

    if (existingProvider && !existingProvider.is_claimed) {
      // Claim existing
      const { data, error } = await supabase
        .from('providers')
        .update({
          owner_user_id: user.id,
          is_claimed: true,
          is_verified: true,
          name: profileData.name,
          provider_type: profileData.provider_type,
          about: profileData.about || null,
          tagline: profileData.tagline || null,
          website: profileData.website || null,
          phone: profileData.phone || null,
          instagram: profileData.instagram || null,
          hours: profileData.hours || null,
          address: profileData.address || null,
          city: profileData.city,
          state: profileData.state,
          zip_code: profileData.zip,
          logo_url: profileData.logo_url || null,
          tier,
          trial_ends_at: trialEndsAt,
          onboarding_completed: true,
          verification_method: method,
          verified_at: new Date().toISOString(),
          ...googleMeta,
        })
        .eq('id', existingProvider.id)
        .select()
        .single();

      if (!error && data) {
        setCreatedProvider(data);
        providerId = data.id;
      }
    } else {
      // Create new
      const slug = slugify(
        profileData.name + ' ' + profileData.city
      );
      const { data, error } = await supabase
        .from('providers')
        .insert({
          owner_user_id: user.id,
          name: profileData.name,
          slug,
          provider_type: profileData.provider_type,
          about: profileData.about || null,
          tagline: profileData.tagline || null,
          website: profileData.website || null,
          phone: profileData.phone || null,
          instagram: profileData.instagram || null,
          hours: profileData.hours || null,
          address: profileData.address || null,
          city: profileData.city,
          state: profileData.state,
          zip_code: profileData.zip,
          logo_url: profileData.logo_url || null,
          google_place_id: placeData?.placeId || null,
          lat: placeData?.lat || null,
          lng: placeData?.lng || null,
          is_claimed: true,
          is_verified: true,
          tier,
          trial_ends_at: trialEndsAt,
          onboarding_completed: true,
          verification_method: method,
          verified_at: new Date().toISOString(),
          ...googleMeta,
        })
        .select()
        .single();

      if (!error && data) {
        setCreatedProvider(data);
        providerId = data.id;
      }
    }

    // Save menu items — use providerId from response (not stale createdProvider state)
    const menuProviderId = providerId || existingProvider?.id;
    if (menuItems.length > 0 && menuProviderId) {
      const rows = menuItems.map((item) => ({
        provider_id: menuProviderId,
        procedure_type: item.procedure_type,
        treatment_area: item.treatment_area || null,
        price: item.price,
        price_label: item.price_label || 'per unit',
      }));
      const { error: menuInsertError } = await supabase
        .from('provider_pricing')
        .insert(rows);

      if (menuInsertError) {
        setMenuError(
          `Could not save pricing menu. Please try again. (${menuInsertError.message})`
        );
        return;
      }
    }

    // Import Google photos (non-blocking)
    if (importPhotos && googlePhotos.length > 0 && menuProviderId) {
      try {
        await fetch('/api/import-google-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: menuProviderId,
            photos: googlePhotos,
          }),
        });
        // Mark photos as imported
        await supabase
          .from('providers')
          .update({ photos_imported: true })
          .eq('id', menuProviderId);
      } catch {
        // Photo import is non-blocking
      }
    }

    // Set user role (JWT metadata + profiles table)
    await supabase.auth.updateUser({ data: { user_role: 'provider' } });

    await supabase
      .from('profiles')
      .update({ role: 'provider' })
      .eq('user_id', user.id);

    setShowWelcome(true);

    // Send provider welcome email (fire-and-forget)
    const p = createdProvider || existingProvider;
    if (user?.email && p) {
      sendProviderWelcome(user.email, {
        providerName: p.name,
        slug: p.slug,
        menuCount: menuItems.length,
        tier: p.tier || 'free',
      });
    }
  }

  function handleWelcomeDismiss() {
    setShowWelcome(false);
    navigate('/business/dashboard');
  }

  const progressPercent = (step / STEP_COUNT) * 100;

  if (showWelcome) {
    return (
      <WelcomeModal
        provider={createdProvider || existingProvider}
        menuCount={menuItems.length}
        tier={createdProvider?.tier || 'free'}
        onDismiss={handleWelcomeDismiss}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-warm-white overflow-y-auto">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-warm-white">
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-rose-accent transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-text-secondary">
            Step {step} of {STEP_COUNT}
          </span>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm text-text-secondary hover:text-text-primary transition"
            >
              &larr; Back
            </button>
          )}
        </div>
      </div>

      {/* Step content — New order: Find → Profile → Prices → Plan → Verify */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {step === 1 && (
          <Step1FindPractice onComplete={handleStep1Complete} initialQuery={initialSearchQuery} />
        )}
        {step === 2 && (
          <Step3PracticeProfile
            initialData={profileData}
            googleRating={placeData?.googleRating}
            googleReviewCount={placeData?.googleReviewCount}
            onComplete={handleProfileComplete}
          />
        )}
        {step === 3 && (
          <Step4PriceMenu
            existingItems={menuItems}
            onComplete={handlePricesComplete}
          />
        )}
        {step === 4 && (
          <Step5ChoosePlan
            profileData={profileData}
            menuCount={menuItems.length}
            onComplete={handlePlanSelected}
          />
        )}
        {step === 5 && (
          <>
            {menuError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
                {menuError}
              </div>
            )}
            <Step2VerifyOwnership
              placeData={placeData}
              onComplete={handleVerifyComplete}
            />
          </>
        )}
      </div>
    </div>
  );
}

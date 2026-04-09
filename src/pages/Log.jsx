import { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { providerSlug } from '../lib/slugify';
import { checkOutlier } from '../lib/outlierDetection';
import { checkAndAwardBadges } from '../lib/badgeLogic';
import { checkAndAwardPioneer } from '../lib/pioneerLogic';
import {
  REQUIRES_TREATMENT_AREA,
  PROCEDURE_TYPES,
  VALID_STATE_CODES,
} from '../lib/constants';
import {
  checkVelocity,
  calculateTrustScore,
  checkDuplicate,
} from '../lib/trustDetection';
import { getCity as getGatingCity, getState as getGatingState } from '../lib/gating';
import { calculateEntries, calculateEntriesFromCount } from '../lib/points';

import { assignTrustTier } from '../lib/trustTiers';
import { isEmailVerified } from '../lib/auth';
import Step1 from '../components/LogForm/Step1';
import Step2 from '../components/LogForm/Step2';
import Step3 from '../components/LogForm/Step3';
import ThankYou from '../components/ThankYou';
import HowdIDoScreen from '../components/HowdIDoScreen';
import VerifyEmailModal from '../components/VerifyEmailModal';
import { format } from 'date-fns';
import { fetchBenchmark } from '../lib/priceBenchmark';

const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

const INITIAL_FORM_DATA = {
  procedureType: '',
  treatmentArea: '',
  unitsOrVolume: '',
  pricePaid: '',
  providerName: '',
  providerType: '',
  city: '',
  state: '',
  zipCode: '',
  treatmentDate: format(new Date(), 'yyyy-MM-dd'),
  notes: '',
  anonymous: true,
  giveawayEmail: '',
  // Google Places fields
  googlePlaceId: '',
  providerAddress: '',
  providerPhone: '',
  providerWebsite: '',
  lat: null,
  lng: null,
  // Rating & review fields
  rating: null,
  reviewTitle: '',
  reviewBody: '',
  wouldReturn: null,
  injectorName: '',
  injectorId: null,
  resultPhotoUrl: null,
  resultPhotoConsent: false,
  // User-submitted provider (from inline add modal)
  userSubmittedProviderId: null,
};

export default function Log() {
  const { user, openAuthModal } = useContext(AuthContext);
  const [searchParams] = useSearchParams();

  const [currentStep, setCurrentStep] = useState(1);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  // Pre-filled provider from provider profile page
  const [prefilledProvider, setPrefilledProvider] = useState(null);

  const [formData, setFormData] = useState(() => {
    const prefill = { ...INITIAL_FORM_DATA };
    const procedure = searchParams.get('procedure');
    const providerName = searchParams.get('provider');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const placeId = searchParams.get('place_id');
    if (procedure) prefill.procedureType = procedure;
    if (providerName) prefill.providerName = providerName;
    // Use provider's city/state from URL params first, then user's saved location as fallback
    prefill.city = city || getGatingCity() || '';
    prefill.state = state || getGatingState() || '';
    if (placeId) prefill.googlePlaceId = placeId;
    return prefill;
  });

  // Fetch provider details when linked from a provider page
  useEffect(() => {
    const providerId = searchParams.get('provider_id');
    const placeId = searchParams.get('place_id');
    const providerSlugParam = searchParams.get('slug');
    if (!providerId && !placeId && !providerSlugParam) return;

    async function fetchProvider() {
      let providerRow = null;

      // Try by ID first, then place_id, then slug
      if (providerId) {
        const { data } = await supabase
          .from('providers')
          .select('id, name, city, state, zip_code, google_place_id, address, phone, website, lat, lng, slug')
          .eq('id', providerId)
          .maybeSingle();
        providerRow = data;
      }
      if (!providerRow && placeId) {
        const { data } = await supabase
          .from('providers')
          .select('id, name, city, state, zip_code, google_place_id, address, phone, website, lat, lng, slug')
          .eq('google_place_id', placeId)
          .maybeSingle();
        providerRow = data;
      }
      if (!providerRow && providerSlugParam) {
        const { data } = await supabase
          .from('providers')
          .select('id, name, city, state, zip_code, google_place_id, address, phone, website, lat, lng, slug')
          .eq('slug', providerSlugParam)
          .maybeSingle();
        providerRow = data;
      }

      if (providerRow) {
        setPrefilledProvider(providerRow);
        setFormData((prev) => ({
          ...prev,
          providerName: providerRow.name || prev.providerName,
          city: providerRow.city || prev.city,
          state: providerRow.state || prev.state,
          zipCode: providerRow.zip_code || prev.zipCode,
          googlePlaceId: providerRow.google_place_id || prev.googlePlaceId,
          providerAddress: providerRow.address || prev.providerAddress,
          providerPhone: providerRow.phone || prev.providerPhone,
          providerWebsite: providerRow.website || prev.providerWebsite,
          lat: providerRow.lat || prev.lat,
          lng: providerRow.lng || prev.lng,
        }));
      }
    }

    fetchProvider();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [outlierFlagged, setOutlierFlagged] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Bot protection state
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  // Duplicate detection
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  // Receipt state
  const [receiptPath, setReceiptPath] = useState(null);
  const [hasReceipt, setHasReceipt] = useState(false);
  const [receiptParsed, setReceiptParsed] = useState(false);
  const [parsedBanner, setParsedBanner] = useState(false);

  // Entry tracking
  const [activeCount, setActiveCount] = useState(null);
  const [entryCount, setEntryCount] = useState(1);

  // Pioneer tracking
  const [pioneerResult, setPioneerResult] = useState(null);

  // Price comparison data (for HowdIDoScreen)
  const [comparisonData, setComparisonData] = useState(null);
  const [cheaperProviders, setCheaperProviders] = useState([]);

  // SEO
  useEffect(() => {
    document.title = 'Share What You Paid | Know Before You Glow';
  }, []);

  // Fetch user's active submission count for entry calculation
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('procedures')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active')
        .then(({ count }) => setActiveCount(count || 0));
    }
  }, [user?.id]);

  // Result photo state
  const [resultPhotoUrl, setResultPhotoUrl] = useState(null);

  // Recalculate entries when receipt or rating/review/photo changes
  useEffect(() => {
    setEntryCount(
      calculateEntriesFromCount(
        activeCount,
        hasReceipt,
        !!formData.rating,
        !!formData.reviewBody,
        !!resultPhotoUrl,
        false // receiptVerified — always false at submission time, admin verifies later
      )
    );
  }, [hasReceipt, activeCount, formData.rating, formData.reviewBody, resultPhotoUrl]);

  // Receipt handlers
  function handleReceiptUpload(path) {
    setReceiptPath(path);
    setHasReceipt(true);
  }

  function handleReceiptParsed(data) {
    setReceiptParsed(true);
    // Pre-fill any empty form fields with parsed values
    setFormData((prev) => {
      const updates = {};
      if (data.price_paid && !prev.pricePaid) {
        updates.pricePaid = String(data.price_paid);
      }
      if (data.provider_name && !prev.providerName) {
        updates.providerName = data.provider_name;
      }
      if (data.date && !prev.treatmentDate) {
        updates.treatmentDate = data.date;
      }
      if (data.units && !prev.unitsOrVolume) {
        updates.unitsOrVolume = data.units;
      }
      // Only set procedure_name if it matches a valid type
      if (
        data.procedure_name &&
        !prev.procedureType &&
        PROCEDURE_TYPES.includes(data.procedure_name)
      ) {
        updates.procedureType = data.procedure_name;
      }
      if (Object.keys(updates).length > 0) {
        setParsedBanner(true);
      }
      return { ...prev, ...updates };
    });
  }

  function handleReceiptRemove() {
    setReceiptPath(null);
    setHasReceipt(false);
    setReceiptParsed(false);
    setParsedBanner(false);
  }

  // Validate current step before allowing next
  function canAdvance() {
    if (currentStep === 1) {
      const hasPrice =
        formData.pricePaid && parseInt(formData.pricePaid, 10) > 0;
      const needsArea = REQUIRES_TREATMENT_AREA.has(formData.procedureType);
      const hasArea = !needsArea || formData.treatmentArea;
      return formData.procedureType && hasPrice && hasArea;
    }
    if (currentStep === 2) {
      return formData.providerName && formData.city && formData.state;
    }
    return true;
  }

  function handleNext() {
    if (!canAdvance()) return;
    setCurrentStep((prev) => prev + 1);
  }

  function handleBack() {
    setCurrentStep((prev) => prev - 1);
  }

  // --- Validation helpers ---

  function validateSubmission(price) {
    if (!price || isNaN(price) || price <= 0) return false;
    if (price > 50000) return false;
    if (!PROCEDURE_TYPES.includes(formData.procedureType)) return false;
    if (!formData.providerName || formData.providerName.trim().length < 2)
      return false;
    if (!formData.city || formData.city.trim().length < 2) return false;
    if (!VALID_STATE_CODES.has(formData.state)) return false;

    // Date validation
    if (formData.treatmentDate) {
      const treatmentDate = new Date(formData.treatmentDate);
      if (treatmentDate > new Date()) return false;
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      if (treatmentDate < twoYearsAgo) return false;
    }

    return true;
  }

  function checkRateLimit() {
    const raw = localStorage.getItem('gb_submission_log');
    const submissions = raw ? JSON.parse(raw) : [];
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentSubmissions = submissions.filter((ts) => ts > oneDayAgo);

    if (recentSubmissions.length >= 10) {
      return false;
    }

    // Log this submission timestamp
    recentSubmissions.push(Date.now());
    localStorage.setItem(
      'gb_submission_log',
      JSON.stringify(recentSubmissions)
    );
    return true;
  }

  // --- Submit handler ---

  async function handleSubmit() {
    if (isSubmitting) return;
    setSubmitError('');

    // Gate: require auth
    if (!user) {
      openAuthModal('signup');
      return;
    }

    // Gate: require email verification
    if (!isEmailVerified(user)) {
      setShowVerifyModal(true);
      return;
    }

    const price = parseInt(formData.pricePaid, 10);

    // 1. Honeypot check — bots fill hidden fields. Block silently
    //    without faking a success screen (the old fake-success path
    //    caused real users to lose data when browser autofill triggered
    //    the honeypot field).
    if (honeypot !== '') {
      setIsSubmitting(false);
      return;
    }

    // 2. Client-side validation
    if (!validateSubmission(price)) {
      setSubmitError('Please check your submission and try again.');
      return;
    }

    // 3. Rate limit check
    if (!checkRateLimit()) {
      setSubmitError(
        'You\u2019ve submitted a lot today. Please try again tomorrow.'
      );
      return;
    }

    // 4. Turnstile check (only if key is configured)
    if (TURNSTILE_KEY && !turnstileToken) {
      setSubmitError('Please complete the verification challenge.');
      return;
    }

    // 5. Duplicate detection (only for authenticated users)
    if (user?.id && !duplicateConfirmed) {
      const { isDuplicate } = await checkDuplicate(
        user.id,
        formData.providerName,
        formData.procedureType
      );
      if (isDuplicate) {
        setDuplicateWarning(true);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const slug = providerSlug(
        formData.providerName,
        formData.city,
        formData.googlePlaceId
      );

      // 6. Check for outlier
      const isOutlier = await checkOutlier(
        formData.procedureType,
        formData.state,
        price
      );

      setOutlierFlagged(isOutlier);

      // Calculate trust score
      const trustScore = await calculateTrustScore(user?.id || null);

      // Auto-create or update provider if we have a google_place_id
      if (formData.googlePlaceId) {
        const { data: existingProvider } = await supabase
          .from('providers')
          .select('id')
          .eq('google_place_id', formData.googlePlaceId)
          .maybeSingle();

        const providerRow = {
          name: formData.providerName,
          slug,
          provider_type: formData.providerType || 'Other',
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode || '',
          address: formData.providerAddress || null,
          phone: formData.providerPhone || null,
          website: formData.providerWebsite || null,
          google_place_id: formData.googlePlaceId,
          lat: formData.lat,
          lng: formData.lng,
        };

        if (existingProvider) {
          await supabase
            .from('providers')
            .update(providerRow)
            .eq('id', existingProvider.id);
        } else {
          await supabase.from('providers').insert(providerRow);
        }
      }

      // Auto-create unclaimed injector profile if user typed a new name
      let resolvedInjectorId = formData.injectorId;
      if (formData.injectorName && !formData.injectorId && formData.googlePlaceId) {
        try {
          const { data: provider } = await supabase
            .from('providers')
            .select('id')
            .eq('google_place_id', formData.googlePlaceId)
            .maybeSingle();
          if (provider) {
            const injectorSlug = formData.injectorName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');
            const { data: newInjector } = await supabase
              .from('injectors')
              .insert({
                provider_id: provider.id,
                name: formData.injectorName,
                display_name: formData.injectorName,
                slug: `${injectorSlug}-${Date.now()}`,
                is_claimed: false,
              })
              .select('id')
              .single();
            if (newInjector) resolvedInjectorId = newInjector.id;
          }
        } catch {
          // Non-blocking — proceed without injector_id
        }
      }

      // Determine status based on outlier detection. Anonymous and
      // signed-in submissions follow the same path — there is no
      // server-side promotion from `pending_confirmation` to `active`,
      // and the `Public read active procedures` RLS policy only
      // exposes rows where status='active', so anything else is a
      // black hole that never reaches the map or profile feed.
      const status = isOutlier ? 'pending' : 'active';

      // Build the procedure row to insert
      const row = {
        procedure_type: formData.procedureType,
        treatment_area: formData.treatmentArea || null,
        units_or_volume: formData.unitsOrVolume || null,
        price_paid: price,
        provider_name: formData.providerName,
        provider_type: formData.providerType || null,
        provider_slug: slug,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode || null,
        date_of_treatment: formData.treatmentDate || null,
        notes: formData.notes || null,
        is_anonymous: formData.anonymous,
        status,
        outlier_flagged: isOutlier,
        trust_score: trustScore,
        user_id: user?.id || null,
        google_place_id: formData.googlePlaceId || null,
        provider_address: formData.providerAddress || null,
        provider_phone: formData.providerPhone || null,
        provider_website: formData.providerWebsite || null,
        lat: formData.lat || null,
        lng: formData.lng || null,
        // Receipt fields
        has_receipt: hasReceipt,
        receipt_path: receiptPath || null,
        receipt_verified: false,
        receipt_parsed: receiptParsed,
        // Rating & review fields
        rating: formData.rating || null,
        review_title: formData.reviewTitle || null,
        review_body: formData.reviewBody || null,
        would_return: formData.wouldReturn,
        injector_name: formData.injectorName || null,
        injector_id: resolvedInjectorId || null,
        result_photo_url: resultPhotoUrl || null,
        result_photo_consent: formData.resultPhotoConsent,
      };

      const { data: inserted, error } = await supabase
        .from('procedures')
        .insert(row)
        .select()
        .single();

      if (error) {
        // Surface the real Supabase error so RLS / schema / constraint
        // problems are visible instead of being masked. Also write the
        // error to submission_errors so we can audit silent failures.
        // eslint-disable-next-line no-console
        console.error('[Log] insert procedures failed', error, row);
        try {
          await supabase.from('submission_errors').insert({
            user_id: user?.id || null,
            procedure_type: formData.procedureType,
            city: formData.city || null,
            state: formData.state || null,
            error_code: error.code || null,
            error_message: error.message || null,
            payload: row,
          });
        } catch {
          // Non-blocking — table may not exist yet
        }
        setSubmitError(
          `Could not save your price: ${error.message || 'unknown database error'}. Please try again or email hello@knowbeforeyouglow.com.`
        );
        setIsSubmitting(false);
        return;
      }

      // 7. Save to localStorage for claiming after email confirmation
      localStorage.setItem('gb_last_submission_id', inserted.id);
      localStorage.setItem(
        'gb_pending_submission',
        JSON.stringify({ ...inserted, timestamp: Date.now() })
      );

      setSubmissionResult(inserted);

      // 7a. If user left a rating, create a review record and update provider stats
      if (formData.rating && user?.id) {
        try {
          // Find the provider record for this slug
          const { data: providerForReview } = await supabase
            .from('providers')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

          if (providerForReview) {
            // Check if user has a receipt-verified procedure at this provider
            let receiptLinked = false;
            let linkedReceiptId = null;
            const { data: verifiedProc } = await supabase
              .from('procedures')
              .select('id')
              .eq('user_id', user.id)
              .eq('provider_slug', slug)
              .eq('receipt_verified', true)
              .limit(1);

            if (verifiedProc && verifiedProc.length > 0) {
              receiptLinked = true;
              linkedReceiptId = verifiedProc[0].id;
            }

            // Calculate trust tier
            const hasPhoto = !!resultPhotoUrl;
            const trustData = assignTrustTier({
              receipt_verified: receiptLinked,
              has_result_photo: hasPhoto,
            });

            await supabase.from('reviews').insert({
              user_id: user.id,
              provider_id: providerForReview.id,
              procedure_id: inserted.id,
              rating: formData.rating,
              title: formData.reviewTitle || null,
              body: formData.reviewBody || null,
              procedure_type: formData.procedureType,
              would_return: formData.wouldReturn,
              status: 'active',
              receipt_verified: receiptLinked,
              has_result_photo: hasPhoto,
              receipt_id: linkedReceiptId,
              trust_tier: trustData.trust_tier,
              trust_weight: trustData.trust_weight,
            });

            // Trigger handles provider rating update automatically,
            // but also update avg_rating for backward compat
            const { data: allReviews } = await supabase
              .from('reviews')
              .select('rating')
              .eq('provider_id', providerForReview.id)
              .eq('status', 'active');

            if (allReviews && allReviews.length > 0) {
              const avg =
                allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
              await supabase
                .from('providers')
                .update({
                  avg_rating: Math.round(avg * 10) / 10,
                  review_count: allReviews.length,
                })
                .eq('id', providerForReview.id);
            }
          }
        } catch {
          // Review insert is non-blocking — main submission already succeeded
        }
      }

      // Giveaway entry from Step 3 email field (if provided)
      if (formData.giveawayEmail) {
        const entries = await calculateEntries(
          user?.id || null,
          hasReceipt,
          !!formData.rating,
          !!formData.reviewBody,
          !!resultPhotoUrl,
          false // receiptVerified — pending admin review
        );
        const month = format(new Date(), 'yyyy-MM');
        await supabase.from('giveaway_entries').insert({
          email: formData.giveawayEmail,
          procedure_id: inserted.id,
          month,
          user_id: user?.id || null,
          entries,
          has_receipt: hasReceipt,
        });
      }

      // If already authenticated, award badges and check pioneer status
      if (user?.id) {
        await checkAndAwardBadges(user.id);
        const pioneer = await checkAndAwardPioneer(user.id, inserted);
        setPioneerResult(pioneer);

      }

      // 8. Run velocity check in background (silent, never blocks UI)
      checkVelocity(formData.providerName, formData.city, formData.state);

      // 9. Fetch price comparison data for HowdIDoScreen
      try {
        const benchmark = await fetchBenchmark(
          formData.procedureType,
          formData.state,
          formData.city
        );
        if (benchmark && benchmark.sample_size >= 3) {
          // Fetch min/max/percentile from procedures directly
          const { data: priceRows } = await supabase
            .from('procedures')
            .select('price_paid')
            .eq('procedure_type', formData.procedureType)
            .eq('city', formData.city)
            .eq('state', formData.state)
            .eq('status', 'active')
            .gt('price_paid', 0)
            .order('price_paid', { ascending: true });

          if (priceRows && priceRows.length >= 3) {
            const prices = priceRows.map((r) => Number(r.price_paid));
            const minP = prices[0];
            const maxP = prices[prices.length - 1];
            const belowCount = prices.filter((p) => p >= price).length;
            const pct = ((prices.length - belowCount) / prices.length) * 100;

            setComparisonData({
              avg_price: benchmark.avg_price,
              median_price: benchmark.median_price,
              sample_size: benchmark.sample_size,
              min_price: minP,
              max_price: maxP,
              percentile: Math.round(pct),
              city: formData.city,
              state: formData.state,
            });

            // If user paid above avg, find cheaper providers
            if (price > Number(benchmark.avg_price)) {
              const { data: providerRows } = await supabase
                .from('procedures')
                .select('provider_name, price_paid')
                .eq('procedure_type', formData.procedureType)
                .eq('city', formData.city)
                .eq('state', formData.state)
                .eq('status', 'active')
                .gt('price_paid', 0)
                .lt('price_paid', price)
                .order('price_paid', { ascending: true });

              if (providerRows && providerRows.length > 0) {
                // Group by provider and average
                const byProvider = {};
                providerRows.forEach((r) => {
                  const name = r.provider_name;
                  if (!byProvider[name]) byProvider[name] = { total: 0, count: 0 };
                  byProvider[name].total += Number(r.price_paid);
                  byProvider[name].count += 1;
                });
                const cheaper = Object.entries(byProvider)
                  .map(([name, { total, count }]) => ({
                    provider_name: name,
                    avg_price: Math.round(total / count),
                  }))
                  .sort((a, b) => a.avg_price - b.avg_price)
                  .slice(0, 3);
                setCheaperProviders(cheaper);
              }
            }
          }
        }
      } catch {
        // Non-blocking — comparison is optional
      }

      // 10. Show success screen
      setDuplicateWarning(false);
      setDuplicateConfirmed(false);
      setCurrentStep('success');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Log] handleSubmit threw', err);
      setSubmitError(
        `Could not save your price: ${err?.message || 'unexpected error'}. Please try again or email hello@knowbeforeyouglow.com.`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Determine if submit should be disabled
  const submitDisabled =
    isSubmitting || (!!TURNSTILE_KEY && !turnstileToken);

  // Step labels for progress indicator
  const steps = [
    { num: 1, label: 'The basics' },
    { num: 2, label: 'Your experience' },
    { num: 3, label: 'Verify for bonus entries' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {currentStep !== 'success' && (
        <>
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-10">
            {steps.map((step, i) => (
              <div key={step.num} className="flex items-center">
                {/* Step circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      currentStep > step.num
                        ? 'bg-rose-accent text-white'
                        : currentStep === step.num
                          ? 'bg-rose-accent text-white'
                          : 'bg-gray-200 text-text-secondary'
                    }`}
                  >
                    {currentStep > step.num ? (
                      <Check size={18} />
                    ) : (
                      step.num
                    )}
                  </div>
                  <span className="text-xs text-text-secondary mt-1.5">
                    {step.label}
                  </span>
                </div>

                {/* Connecting line */}
                {i < steps.length - 1 && (
                  <div
                    className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 ${
                      currentStep > step.num
                        ? 'bg-rose-accent'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Receipt parsed banner */}
          {parsedBanner && (
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              We read your receipt! Please verify the details are correct.
            </div>
          )}

          {/* Form steps */}
          <div className="glow-card p-6 sm:p-8">
            {currentStep === 1 && (
              <Step1 formData={formData} setFormData={setFormData} />
            )}
            {currentStep === 2 && (
              <Step2 formData={formData} setFormData={setFormData} prefilledProvider={prefilledProvider} />
            )}
            {currentStep === 3 && (
              <Step3
                formData={formData}
                setFormData={setFormData}
                honeypot={honeypot}
                setHoneypot={setHoneypot}
                onTurnstileSuccess={setTurnstileToken}
                userId={user?.id}
                onReceiptUpload={handleReceiptUpload}
                onReceiptParsed={handleReceiptParsed}
                onReceiptRemove={handleReceiptRemove}
                entryCount={entryCount}
                onResultPhotoUpload={(url) => setResultPhotoUrl(url)}
                onResultPhotoRemove={() => setResultPhotoUrl(null)}
              />
            )}

            {/* Duplicate warning */}
            {duplicateWarning && (
              <div className="mt-4 px-4 py-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800 mb-3">
                  Looks like you&apos;ve already logged this treatment recently.
                  Are you submitting a new visit?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDuplicateWarning(false);
                      setDuplicateConfirmed(true);
                      handleSubmit();
                    }}
                    className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition"
                  >
                    Yes, new visit
                  </button>
                  <button
                    onClick={() => setDuplicateWarning(false)}
                    className="px-4 py-2 border border-amber-300 text-amber-800 text-sm font-medium rounded-lg hover:bg-amber-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Validation error */}
            {submitError && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {submitError}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              {currentStep > 1 ? (
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < 3 ? (
                <button
                  onClick={handleNext}
                  disabled={!canAdvance()}
                  className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-rose-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitDisabled}
                  className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-rose-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    'Share my price'
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Success screen: comparison view or standard thank-you */}
      {currentStep === 'success' && submissionResult && (
        comparisonData ? (
          <HowdIDoScreen
            procedure={submissionResult}
            comparison={comparisonData}
            user={user}
            outlierFlagged={outlierFlagged}
            entries={entryCount}
            hasReceipt={hasReceipt}
            activeCount={activeCount}
            hasRating={!!formData.rating}
            hasReview={!!formData.reviewBody}
            hasResultPhoto={!!resultPhotoUrl}
            pioneerResult={pioneerResult}
            cheaperProviders={cheaperProviders}
          />
        ) : (
          <ThankYou
            procedure={submissionResult}
            user={user}
            outlierFlagged={outlierFlagged}
            entries={entryCount}
            hasReceipt={hasReceipt}
            activeCount={activeCount}
            hasRating={!!formData.rating}
            hasReview={!!formData.reviewBody}
            hasResultPhoto={!!resultPhotoUrl}
            pioneerResult={pioneerResult}
            isNewProvider={!!formData.userSubmittedProviderId}
            providerName={formData.providerName}
          />
        )
      )}

      {showVerifyModal && (
        <VerifyEmailModal
          action="log a treatment"
          onClose={() => setShowVerifyModal(false)}
        />
      )}
    </div>
  );
}

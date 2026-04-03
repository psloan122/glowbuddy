import { useState, useEffect, useContext } from 'react';
import { Check, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { providerSlug } from '../lib/slugify';
import { checkOutlier } from '../lib/outlierDetection';
import { checkAndAwardBadges } from '../lib/badgeLogic';
import { REQUIRES_TREATMENT_AREA } from '../lib/constants';
import Step1 from '../components/LogForm/Step1';
import Step2 from '../components/LogForm/Step2';
import Step3 from '../components/LogForm/Step3';
import ThankYou from '../components/ThankYou';
import { format } from 'date-fns';

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
};

export default function Log() {
  const { user } = useContext(AuthContext);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [outlierFlagged, setOutlierFlagged] = useState(false);

  // SEO
  useEffect(() => {
    document.title = 'Log a Treatment | GlowBuddy';
  }, []);

  // Validate current step before allowing next
  function canAdvance() {
    if (currentStep === 1) {
      const hasPrice = formData.pricePaid && parseInt(formData.pricePaid, 10) > 0;
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

  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const slug = providerSlug(
        formData.providerName,
        formData.city,
        formData.googlePlaceId
      );
      const price = parseInt(formData.pricePaid, 10);

      // Check for outlier
      const isOutlier = await checkOutlier(
        formData.procedureType,
        formData.state,
        price
      );

      setOutlierFlagged(isOutlier);

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

      // Determine status based on auth and outlier
      let status;
      if (user) {
        status = isOutlier ? 'pending' : 'active';
      } else {
        status = 'pending_confirmation';
      }

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
        user_id: user?.id || null,
        google_place_id: formData.googlePlaceId || null,
        provider_address: formData.providerAddress || null,
        provider_phone: formData.providerPhone || null,
        provider_website: formData.providerWebsite || null,
        lat: formData.lat || null,
        lng: formData.lng || null,
      };

      const { data: inserted, error } = await supabase
        .from('procedures')
        .insert(row)
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        setIsSubmitting(false);
        return;
      }

      // Save to localStorage for claiming after email confirmation
      localStorage.setItem('gb_last_submission_id', inserted.id);
      localStorage.setItem(
        'gb_pending_submission',
        JSON.stringify({ ...inserted, timestamp: Date.now() })
      );

      setSubmissionResult(inserted);

      // Giveaway entry from Step 3 email field (if provided)
      if (formData.giveawayEmail) {
        const month = format(new Date(), 'yyyy-MM');
        await supabase.from('giveaway_entries').insert({
          email: formData.giveawayEmail,
          procedure_id: inserted.id,
          month,
          user_id: user?.id || null,
        });
      }

      // If already authenticated, award badges immediately
      if (user?.id) {
        await checkAndAwardBadges(user.id);
      }

      setCurrentStep('success');
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step labels for progress indicator
  const steps = [
    { num: 1, label: 'What you got' },
    { num: 2, label: 'Where you went' },
    { num: 3, label: 'Last step' },
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

          {/* Form steps */}
          <div className="glow-card p-6 sm:p-8">
            {currentStep === 1 && (
              <Step1 formData={formData} setFormData={setFormData} />
            )}
            {currentStep === 2 && (
              <Step2 formData={formData} setFormData={setFormData} />
            )}
            {currentStep === 3 && (
              <Step3 formData={formData} setFormData={setFormData} />
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
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-rose-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
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

      {/* Thank You screen */}
      {currentStep === 'success' && submissionResult && (
        <ThankYou
          procedure={submissionResult}
          user={user}
          outlierFlagged={outlierFlagged}
        />
      )}
    </div>
  );
}

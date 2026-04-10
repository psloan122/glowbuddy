import { useState, useRef, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Trophy, Upload, CheckCircle, X, Loader2, Search, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ReceiptUpload from '../ReceiptUpload';
import StarRating from '../StarRating';

const INPUT_CLASSES =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export default function Step3({
  formData,
  setFormData,
  honeypot,
  setHoneypot,
  onTurnstileSuccess,
  // Receipt props
  userId,
  onReceiptUpload,
  onReceiptParsed,
  onReceiptRemove,
  entryCount,
  // Result photo props
  onResultPhotoUpload,
  onResultPhotoRemove,
}) {
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef(null);

  // Injector search state
  const [injectorResults, setInjectorResults] = useState([]);
  const [showInjectorDropdown, setShowInjectorDropdown] = useState(false);
  const [injectorQuery, setInjectorQuery] = useState(formData.injectorName || '');
  const injectorRef = useRef(null);

  // Fetch injectors at the selected provider
  useEffect(() => {
    async function fetchInjectors() {
      if (!formData.googlePlaceId && !formData.providerName) {
        setInjectorResults([]);
        return;
      }
      // Find provider by google_place_id first, fallback to name match
      let providerId = null;
      if (formData.googlePlaceId) {
        const { data } = await supabase
          .from('providers')
          .select('id')
          .eq('google_place_id', formData.googlePlaceId)
          .maybeSingle();
        if (data) providerId = data.id;
      }
      if (!providerId && formData.providerName) {
        const { data } = await supabase
          .from('providers')
          .select('id')
          .ilike('name', formData.providerName)
          .limit(1)
          .maybeSingle();
        if (data) providerId = data.id;
      }
      if (!providerId) {
        setInjectorResults([]);
        return;
      }
      const { data: injectors } = await supabase
        .from('injectors')
        .select('id, name, display_name, credentials')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('name');
      setInjectorResults(injectors || []);
    }
    fetchInjectors();
  }, [formData.googlePlaceId, formData.providerName]);

  // Close injector dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (injectorRef.current && !injectorRef.current.contains(e.target)) {
        setShowInjectorDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredInjectors = injectorResults.filter((inj) => {
    const name = (inj.display_name || inj.name).toLowerCase();
    return name.includes(injectorQuery.toLowerCase());
  });

  function selectInjector(inj) {
    const name = inj.display_name || inj.name;
    setInjectorQuery(name);
    setFormData((prev) => ({
      ...prev,
      injectorName: name,
      injectorId: inj.id,
    }));
    setShowInjectorDropdown(false);
  }

  function handleInjectorInput(value) {
    setInjectorQuery(value);
    setFormData((prev) => ({
      ...prev,
      injectorName: value,
      injectorId: null, // Clear ID when typing freely
    }));
    setShowInjectorDropdown(true);
  }

  async function handlePhotoFile(f) {
    if (!f) return;
    setPhotoError('');
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(f.type)) {
      setPhotoError('Please upload a JPG, PNG, or WebP image.');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setPhotoError('File must be under 15 MB.');
      return;
    }

    if (!formData.resultPhotoConsent) return;

    setPhotoUploading(true);
    try {
      const ext = f.name.split('.').pop().toLowerCase();
      const folder = userId || `anonymous/${crypto.randomUUID()}`;
      const path = `${folder}/${Date.now()}-result.${ext}`;

      const { error } = await supabase.storage
        .from('before-after-photos')
        .upload(path, f, { contentType: f.type, upsert: false });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('before-after-photos')
        .getPublicUrl(path);

      setFormData((prev) => ({ ...prev, resultPhotoUrl: publicUrl }));
      onResultPhotoUpload?.(publicUrl);
    } catch {
      // Upload failed — user can retry
    } finally {
      setPhotoUploading(false);
    }
  }

  function handlePhotoRemove() {
    setFormData((prev) => ({ ...prev, resultPhotoUrl: null }));
    if (photoInputRef.current) photoInputRef.current.value = '';
    onResultPhotoRemove?.();
  }

  // Auto-default wouldReturn based on rating
  function handleRatingChange(rating) {
    setFormData((prev) => {
      const updates = { rating };
      if (rating >= 4) updates.wouldReturn = true;
      else if (rating <= 2) updates.wouldReturn = false;
      return { ...prev, ...updates };
    });
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-1">
        Verify for bonus entries
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Each detail you add earns more giveaway entries and helps others trust the price.
      </p>

      <div className="space-y-5">
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Notes
          </label>
          <textarea
            placeholder="How was the experience? Tips for others?"
            rows={4}
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            className={`${INPUT_CLASSES} resize-none`}
          />
        </div>

        {/* ===== Rating & Review Section ===== */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-text-primary mb-3">
            How was your experience?
          </p>

          {/* Star Rating */}
          <div className="mb-4">
            <StarRating
              value={formData.rating || 0}
              onChange={handleRatingChange}
              size={28}
              showLabel
            />
          </div>

          {/* Would Return Toggle */}
          {formData.rating > 0 && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <label
                  htmlFor="would-return-toggle"
                  className="text-sm font-medium text-text-primary"
                >
                  Would you return?
                </label>
              </div>
              <button
                id="would-return-toggle"
                type="button"
                role="switch"
                aria-checked={formData.wouldReturn === true}
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    wouldReturn: prev.wouldReturn === true ? false : true,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.wouldReturn === true ? 'bg-verified' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    formData.wouldReturn === true ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Review Title */}
          <div className="mb-3">
            <input
              type="text"
              value={formData.reviewTitle}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reviewTitle: e.target.value.slice(0, 60),
                }))
              }
              placeholder="Sum it up in one line..."
              maxLength={60}
              className={`${INPUT_CLASSES} text-sm`}
            />
          </div>

          {/* Review Body */}
          <div className="mb-3">
            <textarea
              value={formData.reviewBody}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reviewBody: e.target.value.slice(0, 500),
                }))
              }
              placeholder="How was the experience? Skill of the injector, results, value for money..."
              rows={3}
              className={`${INPUT_CLASSES} text-sm resize-none`}
            />
            {formData.reviewBody.length > 0 && (
              <p className="text-xs text-text-secondary mt-1 text-right">
                {formData.reviewBody.length}/500
              </p>
            )}
          </div>

          {/* Injector Name — searchable dropdown */}
          <div ref={injectorRef} className="relative">
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Who did your treatment?
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              <input
                type="text"
                value={injectorQuery}
                onChange={(e) => handleInjectorInput(e.target.value)}
                onFocus={() => injectorResults.length > 0 && setShowInjectorDropdown(true)}
                placeholder="Search or type injector name..."
                className={`${INPUT_CLASSES} text-sm pl-9`}
              />
            </div>
            {showInjectorDropdown && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredInjectors.map((inj) => (
                  <button
                    key={inj.id}
                    type="button"
                    onClick={() => selectInjector(inj)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-sky-50 transition-colors flex items-center gap-2"
                  >
                    <span className="font-medium text-text-primary">
                      {inj.display_name || inj.name}
                    </span>
                    {inj.credentials && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-[#0369A1]">
                        {inj.credentials.toUpperCase()}
                      </span>
                    )}
                  </button>
                ))}
                {injectorQuery.trim() && !filteredInjectors.some(
                  (inj) => (inj.display_name || inj.name).toLowerCase() === injectorQuery.trim().toLowerCase()
                ) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        injectorName: injectorQuery.trim(),
                        injectorId: null,
                      }));
                      setShowInjectorDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-sky-50 transition-colors flex items-center gap-2 border-t border-gray-100 text-[#0369A1]"
                  >
                    <UserPlus size={14} />
                    Add &ldquo;{injectorQuery.trim()}&rdquo; as new injector
                  </button>
                )}
                {!injectorQuery.trim() && filteredInjectors.length === 0 && (
                  <p className="px-4 py-3 text-xs text-text-secondary">
                    No injectors found at this provider yet
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-text-secondary mt-1">
              {injectorResults.length > 0 ? 'Select from list or add a new name' : 'Helps others find the right person'}
            </p>
          </div>
        </div>

        {/* Receipt Upload Section */}
        <div>
          <div className="bg-rose-light/30 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="sm:flex-1">
                <p className="text-sm font-semibold text-text-primary mb-1">
                  Add receipt for verified status
                </p>
                <p className="text-sm text-rose-dark mb-1">
                  Verified prices get 3x more visibility and earn you 3 bonus giveaway entries.
                </p>
                <p className="text-xs text-text-secondary">
                  Takes 30 seconds. Your name is never shown.
                </p>
              </div>
              <div className="sm:flex-1">
                <ReceiptUpload
                  userId={userId}
                  onUploadComplete={onReceiptUpload}
                  onParsedData={onReceiptParsed}
                  onRemove={onReceiptRemove}
                />
              </div>
            </div>
            {/* Entry counter */}
            <div className="mt-3 pt-3 border-t border-rose-accent/10">
              <p className="text-xs font-medium text-text-primary">
                Your entries this submission:{' '}
                <span className="text-rose-accent font-bold">
                  {entryCount}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* ===== Result Photo Section ===== */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-text-primary mb-1">
            Show your results
          </p>
          <p className="text-xs text-text-secondary mb-3">
            +2 giveaway entries for photo upload
          </p>

          {/* Consent checkbox */}
          <label className="flex items-start gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.resultPhotoConsent}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  resultPhotoConsent: e.target.checked,
                }))
              }
              className="mt-0.5 rounded border-gray-300 text-rose-accent focus:ring-rose-accent/20"
            />
            <span className="text-xs text-text-secondary">
              I confirm this is a photo of myself, I consent to public display, I can delete it anytime, and no other person&apos;s face is visible.
            </span>
          </label>

          {/* Photo upload or preview */}
          {formData.resultPhotoUrl ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">
                  Photo uploaded
                </p>
                <p className="text-xs text-green-600">
                  Thanks! Your photo will appear after a quick review.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePhotoRemove}
                className="text-green-600 hover:text-green-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : photoUploading ? (
            <div className="flex items-center gap-3 px-4 py-4 border border-gray-200 rounded-xl">
              <Loader2 className="w-5 h-5 text-rose-accent animate-spin shrink-0" />
              <p className="text-sm font-medium text-text-primary">Uploading...</p>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setPhotoDragOver(true); }}
              onDragLeave={() => setPhotoDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setPhotoDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handlePhotoFile(f);
              }}
              onClick={() => formData.resultPhotoConsent && photoInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl px-4 py-5 text-center transition-colors ${
                !formData.resultPhotoConsent ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                photoDragOver
                  ? 'border-rose-accent bg-rose-accent/5'
                  : 'border-gray-200 hover:border-rose-accent/50'
              }`}
            >
              <Upload className={`w-6 h-6 mx-auto mb-2 ${photoDragOver ? 'text-rose-accent' : 'text-text-secondary'}`} />
              <p className="text-sm font-medium text-text-primary">
                Drop result photo here
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                or tap to browse &middot; JPG, PNG or WebP
              </p>
            </div>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files[0];
              if (f) handlePhotoFile(f);
            }}
            className="hidden"
          />
          {photoError && (
            <p className="text-xs text-red-500 mt-1">{photoError}</p>
          )}
        </div>

        {/* Anonymous toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label
              htmlFor="anonymous-toggle"
              className="text-sm font-medium text-text-primary"
            >
              Keep my submission anonymous
            </label>
            <p className="text-xs text-text-secondary mt-0.5">
              Your name will never appear publicly. Only the procedure, price, and location are shown.
            </p>
          </div>
          <button
            id="anonymous-toggle"
            type="button"
            role="switch"
            aria-checked={formData.anonymous}
            onClick={() =>
              setFormData((prev) => ({ ...prev, anonymous: !prev.anonymous }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.anonymous ? 'bg-rose-accent' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                formData.anonymous ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Giveaway email */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Enter email to be entered in our monthly $250 treatment giveaway
          </label>
          <input
            type="email"
            placeholder="your@email.com (optional)"
            value={formData.giveawayEmail}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                giveawayEmail: e.target.value,
              }))
            }
            className={INPUT_CLASSES}
          />
          <p className="text-xs text-text-secondary mt-1.5">
            Optional. We only use this for the giveaway drawing.
          </p>
        </div>

        {/* Honeypot — hidden from real users, bots fill it */}
        <input
          type="text"
          name="hp_field"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ display: 'none' }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        {/* Cloudflare Turnstile — only renders if site key is configured */}
        {TURNSTILE_KEY && (
          <div className="flex justify-center pt-2">
            <Turnstile
              siteKey={TURNSTILE_KEY}
              onSuccess={onTurnstileSuccess}
              options={{ theme: 'light', size: 'normal' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

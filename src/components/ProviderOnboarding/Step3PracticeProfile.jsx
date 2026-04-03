import { useState, useRef } from 'react';
import { Upload, X, Loader2, Camera, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ONBOARDING_PROVIDER_TYPES, US_STATES } from '../../lib/constants';

export default function Step3PracticeProfile({ initialData, googleRating, googleReviewCount, onComplete }) {
  const [form, setForm] = useState({ ...initialData });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef(null);

  // Track whether hours was pre-filled from Google
  const hoursPreFilled = initialData.hours && initialData.hours.length > 0;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Please upload a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB.');
      return;
    }

    setUploadError('');
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('provider-logos')
      .upload(path, file, { upsert: true });

    if (error) {
      setUploadError('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('provider-logos')
      .getPublicUrl(path);

    update('logo_url', urlData.publicUrl);
    setUploading(false);
  }

  function removeLogo() {
    update('logo_url', '');
  }

  function handleSubmit(e) {
    e.preventDefault();
    onComplete(form);
  }

  const charCountAbout = (form.about || '').length;
  const charCountTagline = (form.tagline || '').length;

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-2">Set up your profile</h1>
      <p className="text-text-secondary mb-8">
        This is what patients will see when they visit your listing.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Practice logo
          </label>
          <div className="flex items-center gap-4">
            {form.logo_url ? (
              <div className="relative">
                <img
                  src={form.logo_url}
                  alt="Logo"
                  className="w-20 h-20 rounded-xl object-cover border border-gray-200"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-text-secondary hover:border-rose-accent hover:text-rose-accent transition"
              >
                {uploading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Camera size={20} />
                    <span className="text-[10px] mt-1">Upload</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <p className="text-xs text-text-secondary">JPG, PNG, or WebP. Max 5MB.</p>
          </div>
          {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
        </div>

        {/* Practice Name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Practice name <span className="text-rose-accent">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
          />
        </div>

        {/* Provider Type */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Practice type <span className="text-rose-accent">*</span>
          </label>
          <select
            required
            value={form.provider_type}
            onChange={(e) => update('provider_type', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
          >
            <option value="">Select...</option>
            {ONBOARDING_PROVIDER_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Tagline
          </label>
          <input
            type="text"
            maxLength={80}
            value={form.tagline || ''}
            onChange={(e) => update('tagline', e.target.value)}
            placeholder="e.g. Expert injectors in Beverly Hills"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
          />
          <p className="text-xs text-text-secondary mt-1 text-right">{charCountTagline}/80</p>
        </div>

        {/* About */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            About your practice
          </label>
          <textarea
            maxLength={300}
            rows={3}
            value={form.about || ''}
            onChange={(e) => update('about', e.target.value)}
            placeholder="Tell patients what makes your practice special..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm resize-none"
          />
          <p className="text-xs text-text-secondary mt-1 text-right">{charCountAbout}/300</p>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Website</label>
            <input
              type="url"
              value={form.website || ''}
              onChange={(e) => update('website', e.target.value)}
              placeholder="https://yourpractice.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone || ''}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Instagram</label>
            <input
              type="text"
              value={form.instagram || ''}
              onChange={(e) => update('instagram', e.target.value)}
              placeholder="@yourpractice"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Hours</label>
            <input
              type="text"
              value={form.hours || ''}
              onChange={(e) => update('hours', e.target.value)}
              placeholder="Mon-Fri 9am-5pm"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
            />
            {hoursPreFilled && form.hours === initialData.hours && (
              <p className="text-xs text-text-secondary/60 mt-1">Pre-filled from Google Places</p>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Street address
          </label>
          <input
            type="text"
            value={form.address || ''}
            onChange={(e) => update('address', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              City <span className="text-rose-accent">*</span>
            </label>
            <input
              type="text"
              required
              value={form.city || ''}
              onChange={(e) => update('city', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              State <span className="text-rose-accent">*</span>
            </label>
            <select
              required
              value={form.state || ''}
              onChange={(e) => update('state', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
            >
              <option value="">Select...</option>
              {US_STATES.map((s) => (
                <option key={s.value} value={s.value}>{s.value}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Zip</label>
            <input
              type="text"
              maxLength={5}
              value={form.zip || ''}
              onChange={(e) => update('zip', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
            />
          </div>
        </div>

        {/* Google Rating Info Card */}
        {googleRating && (
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-amber-400 fill-amber-400" />
              <span className="font-semibold text-text-primary">{googleRating}</span>
              {googleReviewCount && (
                <span className="text-sm text-text-secondary">
                  &middot; {googleReviewCount.toLocaleString()} Google reviews
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-1">From Google &middot; Shown on your public profile</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-rose-accent text-white py-3 rounded-full font-semibold hover:bg-rose-dark transition"
        >
          Continue &rarr;
        </button>
      </form>
    </div>
  );
}

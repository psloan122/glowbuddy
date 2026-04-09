import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PROCEDURE_TYPES, PROCEDURE_CATEGORIES, TREATMENT_AREAS } from '../../lib/constants';
import BeforeAfterUpload from '../BeforeAfterUpload';
import BeforeAfterCard from '../BeforeAfterCard';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

export default function DashboardBeforeAfterTab({
  provider,
  photos,
  injectors,
  onRefresh,
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    procedureType: '',
    treatmentArea: '',
    injectorId: '',
    caption: '',
  });
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [afterUrl, setAfterUrl] = useState(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleUploadComplete(before, after) {
    setBeforeUrl(before);
    setAfterUrl(after);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!beforeUrl || !afterUrl) return;
    setSaving(true);

    await supabase.from('before_after_photos').insert({
      provider_id: provider.id,
      injector_id: uploadForm.injectorId || null,
      uploaded_by: 'provider',
      uploader_user_id: null,
      procedure_type: uploadForm.procedureType || null,
      treatment_area: uploadForm.treatmentArea || null,
      before_url: beforeUrl,
      after_url: afterUrl,
      caption: uploadForm.caption.trim() || null,
      consent_confirmed: consentConfirmed,
      consent_timestamp: new Date().toISOString(),
      status: 'active', // auto-approved for provider uploads
    });

    // Increment before_after_count
    await supabase
      .from('providers')
      .update({ before_after_count: (provider.before_after_count || 0) + 1 })
      .eq('id', provider.id);

    setShowUpload(false);
    setBeforeUrl(null);
    setAfterUrl(null);
    setUploadForm({ procedureType: '', treatmentArea: '', injectorId: '', caption: '' });
    setConsentConfirmed(false);
    setSaving(false);
    onRefresh();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this before/after photo?')) return;
    await supabase.from('before_after_photos').delete().eq('id', id);
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary">
          Before & After Photos
        </h2>
        {!showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-rose-dark transition"
          >
            Upload Photos
          </button>
        )}
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="glow-card p-5 mb-6">
          <form onSubmit={handleSave} className="space-y-4">
            <BeforeAfterUpload
              providerId={provider.id}
              onUploadComplete={handleUploadComplete}
              onRemove={() => {
                setBeforeUrl(null);
                setAfterUrl(null);
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Procedure Type
                </label>
                <select
                  value={uploadForm.procedureType}
                  onChange={(e) =>
                    setUploadForm((f) => ({ ...f, procedureType: e.target.value }))
                  }
                  className={INPUT_CLASS + ' text-sm'}
                >
                  <option value="">Select...</option>
                  {Object.entries(PROCEDURE_CATEGORIES).map(([category, procedures]) => (
                    <optgroup key={category} label={category}>
                      {procedures.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Treatment Area
                </label>
                <select
                  value={uploadForm.treatmentArea}
                  onChange={(e) =>
                    setUploadForm((f) => ({ ...f, treatmentArea: e.target.value }))
                  }
                  className={INPUT_CLASS + ' text-sm'}
                >
                  <option value="">Select...</option>
                  {TREATMENT_AREAS.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>

            {injectors.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Injector
                </label>
                <select
                  value={uploadForm.injectorId}
                  onChange={(e) =>
                    setUploadForm((f) => ({ ...f, injectorId: e.target.value }))
                  }
                  className={INPUT_CLASS + ' text-sm'}
                >
                  <option value="">Select injector...</option>
                  {injectors.map((inj) => (
                    <option key={inj.id} value={inj.id}>{inj.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Caption
              </label>
              <input
                type="text"
                value={uploadForm.caption}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, caption: e.target.value }))
                }
                placeholder="Brief description..."
                className={INPUT_CLASS + ' text-sm'}
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-rose-accent focus:ring-rose-accent"
              />
              <span className="text-sm text-text-secondary">
                I confirm that the patient in these photos has given written consent for their images to be published.
              </span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !beforeUrl || !afterUrl || !consentConfirmed}
                className="bg-rose-accent text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-rose-dark transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Photos'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpload(false);
                  setBeforeUrl(null);
                  setAfterUrl(null);
                }}
                className="text-text-secondary hover:text-text-primary transition text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Photos Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative">
              <BeforeAfterCard photo={photo} />
              <button
                onClick={() => handleDelete(photo.id)}
                className="absolute top-2 right-2 p-1.5 bg-white/90 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-500 text-text-secondary transition z-10"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        !showUpload && (
          <div className="glow-card p-8 text-center">
            <p className="text-text-secondary mb-3">
              No before & after photos yet.
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="text-rose-accent font-medium hover:text-rose-dark transition"
            >
              Upload your first photos
            </button>
          </div>
        )
      )}
    </div>
  );
}

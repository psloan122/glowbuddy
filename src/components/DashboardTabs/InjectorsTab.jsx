import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PROCEDURE_TYPES } from '../../lib/constants';
import ProviderAvatar from '../ProviderAvatar';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

const CREDENTIAL_OPTIONS = ['RN', 'NP', 'PA', 'MD', 'DO', 'Aesthetician', 'Other'];

const INITIAL_FORM = {
  name: '',
  credentials: '',
  bio: '',
  instagram: '',
  specialties: [],
  years_experience: '',
  profile_photo_url: null,
};

export default function InjectorsTab({ provider, injectors, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(injector) {
    setForm({
      name: injector.name || '',
      credentials: injector.credentials || '',
      bio: injector.bio || '',
      instagram: injector.instagram || '',
      specialties: injector.specialties || [],
      years_experience: injector.years_experience?.toString() || '',
      profile_photo_url: injector.profile_photo_url || null,
    });
    setEditingId(injector.id);
    setShowForm(false);
  }

  async function handlePhotoUpload(f) {
    if (!f) return;
    setUploading(true);
    try {
      const ext = f.name.split('.').pop().toLowerCase();
      const path = `${provider.id}/${Date.now()}-injector.${ext}`;

      const { error } = await supabase.storage
        .from('injector-photos')
        .upload(path, f, { contentType: f.type, upsert: false });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('injector-photos')
        .getPublicUrl(path);

      setForm((prev) => ({ ...prev, profile_photo_url: publicUrl }));
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setUploading(false);
    }
  }

  function toggleSpecialty(spec) {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(spec)
        ? prev.specialties.filter((s) => s !== spec)
        : [...prev.specialties, spec],
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    const payload = {
      provider_id: provider.id,
      name: form.name.trim(),
      credentials: form.credentials || null,
      bio: form.bio.trim() || null,
      instagram: form.instagram.trim() || null,
      specialties: form.specialties.length > 0 ? form.specialties : null,
      years_experience: form.years_experience
        ? parseInt(form.years_experience, 10)
        : null,
      profile_photo_url: form.profile_photo_url || null,
    };

    if (editingId) {
      await supabase.from('injectors').update(payload).eq('id', editingId);
    } else {
      await supabase.from('injectors').insert(payload);
    }

    resetForm();
    setSaving(false);
    onRefresh();
  }

  async function handleDeactivate(id, currentActive) {
    await supabase
      .from('injectors')
      .update({ is_active: !currentActive })
      .eq('id', id);
    onRefresh();
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to remove this injector?')) return;
    await supabase.from('injectors').delete().eq('id', id);
    onRefresh();
  }

  const isFormOpen = showForm || editingId;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary">Your Team</h2>
        {!isFormOpen && (
          <button
            onClick={() => {
              setForm(INITIAL_FORM);
              setEditingId(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-rose-dark transition"
          >
            <Plus size={16} /> Add Injector
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isFormOpen && (
        <div className="glow-card p-5 mb-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Full name"
                  className={INPUT_CLASS + ' text-sm'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Credentials
                </label>
                <select
                  value={form.credentials}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, credentials: e.target.value }))
                  }
                  className={INPUT_CLASS + ' text-sm'}
                >
                  <option value="">Select...</option>
                  {CREDENTIAL_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Bio (max 200)
              </label>
              <textarea
                value={form.bio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: e.target.value.slice(0, 200) }))
                }
                rows={2}
                maxLength={200}
                placeholder="Brief bio..."
                className={INPUT_CLASS + ' text-sm resize-none'}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Instagram
                </label>
                <input
                  type="text"
                  value={form.instagram}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, instagram: e.target.value }))
                  }
                  placeholder="@handle"
                  className={INPUT_CLASS + ' text-sm'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Years Experience
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.years_experience}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, years_experience: e.target.value }))
                  }
                  placeholder="e.g. 5"
                  className={INPUT_CLASS + ' text-sm'}
                />
              </div>
            </div>

            {/* Specialties */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Specialties
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PROCEDURE_TYPES.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialty(spec)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${
                      form.specialties.includes(spec)
                        ? 'bg-rose-accent text-white border-rose-accent'
                        : 'bg-white text-text-secondary border-gray-200 hover:border-rose-accent/50'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Photo */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Profile Photo
              </label>
              <div className="flex items-center gap-3">
                {form.profile_photo_url ? (
                  <img
                    src={form.profile_photo_url}
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <ProviderAvatar name={form.name || '?'} size={48} />
                )}
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="text-sm text-rose-accent hover:text-rose-dark transition"
                >
                  {uploading ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 size={14} className="animate-spin" /> Uploading...
                    </span>
                  ) : (
                    'Upload photo'
                  )}
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) handlePhotoUpload(f);
                }}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-rose-accent text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-rose-dark transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Injector'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="text-text-secondary hover:text-text-primary transition text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Injectors List */}
      {injectors.length === 0 && !isFormOpen ? (
        <div className="glow-card p-8 text-center">
          <p className="text-text-secondary mb-3">
            No team members added yet.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="text-rose-accent font-medium hover:text-rose-dark transition"
          >
            Add your first injector
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {injectors.map((injector) => (
            <div
              key={injector.id}
              className="glow-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1">
                {injector.profile_photo_url ? (
                  <img
                    src={injector.profile_photo_url}
                    alt={injector.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <ProviderAvatar name={injector.name} size={40} />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">
                      {injector.name}
                    </span>
                    {injector.credentials && (
                      <span className="text-xs bg-warm-gray text-text-secondary px-1.5 py-0.5 rounded-full">
                        {injector.credentials}
                      </span>
                    )}
                    {!injector.is_active && (
                      <span className="text-xs bg-gray-100 text-text-secondary px-1.5 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  {injector.specialties && injector.specialties.length > 0 && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      {injector.specialties.slice(0, 3).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDeactivate(injector.id, injector.is_active)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                    injector.is_active
                      ? 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                      : 'bg-verified/10 text-verified hover:bg-verified/20'
                  }`}
                >
                  {injector.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => startEdit(injector)}
                  className="p-2 rounded-lg hover:bg-warm-gray text-text-secondary hover:text-text-primary transition"
                  title="Edit"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(injector.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-500 transition"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

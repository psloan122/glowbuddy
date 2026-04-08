import { useState, useContext, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';

export default function InjectorClaim() {
  const { slugOrId } = useParams();
  const { user, openAuthModal, showToast } = useContext(AuthContext);
  const navigate = useNavigate();

  const [injector, setInjector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form data
  const [displayName, setDisplayName] = useState('');
  const [credential, setCredential] = useState('');
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [verifyMethod, setVerifyMethod] = useState('email');
  const [verifyEmail, setVerifyEmail] = useState('');

  useEffect(() => {
    async function load() {
      let { data } = await supabase
        .from('injectors')
        .select('*')
        .eq('slug', slugOrId)
        .maybeSingle();
      if (!data) {
        const res = await supabase.from('injectors').select('*').eq('id', slugOrId).maybeSingle();
        data = res.data;
      }
      if (data) {
        setInjector(data);
        setDisplayName(data.display_name || data.name || '');
        setCredential(data.credentials || '');
        setBio(data.bio || '');
        setInstagram(data.instagram || '');
      }
      setLoading(false);
    }
    load();
  }, [slugOrId]);

  async function handleSubmitStep1() {
    if (!user) { openAuthModal('signup'); return; }
    setStep(2);
  }

  async function handleSubmitStep2() {
    setSaving(true);

    // For now, mark as claimed immediately (verification can be async)
    const { error } = await supabase
      .from('injectors')
      .update({
        display_name: displayName,
        credentials: credential,
        bio,
        instagram,
        is_claimed: true,
        claimed_user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', injector.id);

    if (error) {
      setSaving(false);
      return;
    }

    setSaving(false);
    setStep(3);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-text-secondary animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!injector) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Injector Not Found</h1>
      </div>
    );
  }

  if (injector.is_claimed) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Profile Already Claimed</h1>
        <p className="text-text-secondary">This injector profile has already been claimed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Claim Your Profile</h1>
      <p className="text-text-secondary mb-6">
        Claiming your profile lets you edit your bio, post updates, and see your follower count.
      </p>

      {step === 1 && (
        <div className="glow-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0369A1] focus:ring-2 focus:ring-sky-200/50 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Credential</label>
            <select
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0369A1] focus:ring-2 focus:ring-sky-200/50 outline-none text-sm"
            >
              <option value="">Select...</option>
              <option value="RN">RN</option>
              <option value="NP">NP</option>
              <option value="PA">PA</option>
              <option value="MD">MD</option>
              <option value="DO">DO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0369A1] focus:ring-2 focus:ring-sky-200/50 outline-none text-sm resize-none"
              placeholder="Tell patients about your experience..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Instagram Handle</label>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0369A1] focus:ring-2 focus:ring-sky-200/50 outline-none text-sm"
              placeholder="@yourhandle"
            />
          </div>
          <button
            onClick={handleSubmitStep1}
            disabled={!displayName.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition disabled:opacity-50"
            style={{ backgroundColor: '#0369A1' }}
          >
            Continue to Verification
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="glow-card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Verify Your Identity</h2>
          <p className="text-sm text-text-secondary">
            Choose a verification method to confirm you are {displayName}.
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={verifyMethod === 'email'} onChange={() => setVerifyMethod('email')} className="text-[#0369A1]" />
              <span className="text-sm text-text-primary">Practice email verification</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={verifyMethod === 'instagram'} onChange={() => setVerifyMethod('instagram')} className="text-[#0369A1]" />
              <span className="text-sm text-text-primary">Instagram DM verification</span>
            </label>
          </div>

          {verifyMethod === 'email' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Practice Email</label>
              <input
                type="email"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#0369A1] focus:ring-2 focus:ring-sky-200/50 outline-none text-sm"
                placeholder="you@practicename.com"
              />
            </div>
          )}

          {verifyMethod === 'instagram' && (
            <div className="rounded-xl bg-warm-gray p-4">
              <p className="text-sm text-text-secondary">
                DM <span className="font-medium">@glowbuddy</span> on Instagram from your account ({instagram || 'your handle'}) with the code: <span className="font-mono font-bold text-text-primary">GLOW-{injector.id.slice(0, 6).toUpperCase()}</span>
              </p>
            </div>
          )}

          <button
            onClick={handleSubmitStep2}
            disabled={saving}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#0369A1' }}
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Claiming...</> : 'Claim Profile'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="glow-card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check size={24} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Profile Claimed!</h2>
          <p className="text-text-secondary mb-6">
            You can now edit your bio, post updates, and see your followers.
          </p>
          <button
            onClick={() => navigate(`/injectors/${injector.slug || injector.id}`)}
            className="inline-block text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition"
            style={{ backgroundColor: '#0369A1' }}
          >
            View Your Profile
          </button>
        </div>
      )}
    </div>
  );
}

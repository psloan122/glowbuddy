import { useState, useRef } from 'react';
import { Upload, CheckCircle, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function BeforeAfterUpload({ providerId, onUploadComplete, onRemove }) {
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [afterUrl, setAfterUrl] = useState(null);
  const [uploading, setUploading] = useState({ before: false, after: false });
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [dragOver, setDragOver] = useState({ before: false, after: false });
  const beforeRef = useRef(null);
  const afterRef = useRef(null);

  function validateFile(f) {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Please upload a JPG, PNG, or WebP file.');
      return false;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError('File must be under 15MB.');
      return false;
    }
    setError('');
    return true;
  }

  async function uploadFile(f, type) {
    if (!validateFile(f)) return;
    if (!consent) {
      setError('Please confirm consent before uploading.');
      return;
    }

    setUploading((prev) => ({ ...prev, [type]: true }));

    try {
      const ext = f.name.split('.').pop().toLowerCase();
      const timestamp = Date.now();
      const path = `${providerId}/${timestamp}_${type}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('before-after-photos')
        .upload(path, f, { contentType: f.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('before-after-photos')
        .getPublicUrl(path);

      if (type === 'before') {
        setBeforeUrl(publicUrl);
        if (afterUrl) onUploadComplete?.(publicUrl, afterUrl);
      } else {
        setAfterUrl(publicUrl);
        if (beforeUrl) onUploadComplete?.(beforeUrl, publicUrl);
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error('B&A upload error:', err);
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  }

  function handleDrop(e, type) {
    e.preventDefault();
    setDragOver((prev) => ({ ...prev, [type]: false }));
    const f = e.dataTransfer.files[0];
    if (f) uploadFile(f, type);
  }

  function handleRemove() {
    setBeforeUrl(null);
    setAfterUrl(null);
    setError('');
    if (beforeRef.current) beforeRef.current.value = '';
    if (afterRef.current) afterRef.current.value = '';
    onRemove?.();
  }

  // Both uploaded
  if (beforeUrl && afterUrl) {
    return (
      <div>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <img src={beforeUrl} alt="Before" className="w-full h-32 object-cover rounded-xl" />
            <span className="absolute bottom-1 left-1 text-[10px] font-medium bg-black/50 text-white px-1.5 py-0.5 rounded">Before</span>
          </div>
          <div className="relative">
            <img src={afterUrl} alt="After" className="w-full h-32 object-cover rounded-xl" />
            <span className="absolute bottom-1 left-1 text-[10px] font-medium bg-black/50 text-white px-1.5 py-0.5 rounded">After</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 text-green-600">
            <CheckCircle size={14} />
            <span className="text-xs font-medium">Photos uploaded</span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-text-secondary hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  function DropZone({ type, label, fileRef, url }) {
    if (uploading[type]) {
      return (
        <div className="flex items-center justify-center h-32 border border-gray-200 rounded-xl">
          <Loader2 size={20} className="text-rose-accent animate-spin" />
        </div>
      );
    }

    if (url) {
      return (
        <div className="relative">
          <img src={url} alt={label} className="w-full h-32 object-cover rounded-xl" />
          <span className="absolute bottom-1 left-1 text-[10px] font-medium bg-black/50 text-white px-1.5 py-0.5 rounded">{label}</span>
        </div>
      );
    }

    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver((prev) => ({ ...prev, [type]: true })); }}
        onDragLeave={() => setDragOver((prev) => ({ ...prev, [type]: false }))}
        onDrop={(e) => handleDrop(e, type)}
        onClick={() => consent && fileRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center transition-colors ${
          !consent ? 'opacity-50 cursor-not-allowed' : ''
        } ${
          dragOver[type]
            ? 'border-rose-accent bg-rose-accent/5'
            : 'border-gray-200 hover:border-rose-accent/50'
        }`}
      >
        <Upload size={20} className="text-text-secondary mb-1" />
        <p className="text-xs font-medium text-text-primary">{label}</p>
        <p className="text-[10px] text-text-secondary mt-0.5">Drop or tap</p>
      </div>
    );
  }

  return (
    <div>
      {/* Consent checkbox */}
      <label className="flex items-start gap-2 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 rounded border-gray-300 text-rose-accent focus:ring-rose-accent/20"
        />
        <span className="text-xs text-text-secondary">
          I confirm this is a photo of myself, I consent to public display, I can delete it anytime, and no other person&apos;s face is visible.
        </span>
      </label>

      {/* Two drop zones side by side */}
      <div className="grid grid-cols-2 gap-3">
        <DropZone type="before" label="Before" fileRef={beforeRef} url={beforeUrl} />
        <DropZone type="after" label="After" fileRef={afterRef} url={afterUrl} />
      </div>

      <input
        ref={beforeRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => { const f = e.target.files[0]; if (f) uploadFile(f, 'before'); }}
        className="hidden"
      />
      <input
        ref={afterRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => { const f = e.target.files[0]; if (f) uploadFile(f, 'after'); }}
        className="hidden"
      />

      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

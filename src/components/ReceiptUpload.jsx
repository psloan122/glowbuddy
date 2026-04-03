import { useState, useRef } from 'react';
import { Upload, CheckCircle, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseReceipt } from '../lib/receiptParser';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export default function ReceiptUpload({
  userId,
  onUploadComplete,
  onParsedData,
  onRemove,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  function validateFile(f) {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Please upload a JPG, PNG, WebP, or PDF file.');
      return false;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError('File must be under 10MB.');
      return false;
    }
    setError('');
    return true;
  }

  async function handleFile(f) {
    if (!validateFile(f)) return;
    setUploading(true);
    setError('');

    try {
      const ext = f.name.split('.').pop().toLowerCase();
      const timestamp = Date.now();
      const folder = userId || `anonymous/${crypto.randomUUID()}`;
      const path = `${folder}/${timestamp}-receipt.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, f, {
          contentType: f.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploaded(true);
      onUploadComplete(path);

      // Try AI parsing in background
      setParsing(true);
      try {
        const parsed = await parseReceipt(path);
        if (parsed && parsed.confidence !== 'low') {
          onParsedData(parsed);
        }
      } catch {
        // Silent fail — still award entries for uploading
      } finally {
        setParsing(false);
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error('Receipt upload error:', err);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleRemove() {
    setUploaded(false);
    setError('');
    onRemove();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Uploaded state
  if (uploaded) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800">
            Receipt uploaded
          </p>
          <p className="text-xs text-green-600">+3 entries earned</p>
          {parsing && (
            <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Reading receipt...
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="text-green-600 hover:text-green-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Uploading state
  if (uploading) {
    return (
      <div className="flex items-center gap-3 px-4 py-4 border border-gray-200 rounded-xl">
        <Loader2 className="w-5 h-5 text-rose-accent animate-spin shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">
            Uploading...
          </p>
          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-rose-accent rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // Default drop zone
  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-xl px-4 py-5 text-center transition-colors ${
          dragOver
            ? 'border-rose-accent bg-rose-accent/5'
            : 'border-gray-200 hover:border-rose-accent/50'
        }`}
      >
        <Upload
          className={`w-6 h-6 mx-auto mb-2 ${dragOver ? 'text-rose-accent' : 'text-text-secondary'}`}
        />
        <p className="text-sm font-medium text-text-primary">
          Drop receipt here
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          or tap to browse
        </p>
        <p className="text-xs text-text-secondary mt-1">
          JPG, PNG or PDF &middot; Max 10MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => {
          const f = e.target.files[0];
          if (f) handleFile(f);
        }}
        className="hidden"
      />

      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

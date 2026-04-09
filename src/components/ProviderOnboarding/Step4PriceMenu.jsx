import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Lightbulb, Upload, Check, Loader2, AlertCircle } from 'lucide-react';
import {
  PROCEDURE_TYPES,
  PROCEDURE_CATEGORIES,
  TREATMENT_AREAS,
  PRICE_LABEL_OPTIONS,
  REQUIRES_TREATMENT_AREA,
  AVG_PRICES,
} from '../../lib/constants';

const EMPTY_ITEM = {
  procedure_type: '',
  treatment_area: '',
  price: '',
  price_label: 'per unit',
};

const LOADING_MESSAGES = [
  'Reading your menu...',
  'Identifying procedures...',
  'Extracting prices...',
];

const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Step4PriceMenu({ existingItems, onComplete }) {
  // Manual entry state
  const [items, setItems] = useState(
    existingItems.length > 0 ? existingItems : [{ ...EMPTY_ITEM }]
  );

  // Upload / AI parsing state
  const [uploadPhase, setUploadPhase] = useState('idle'); // idle | parsing | confirming
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [extractedItems, setExtractedItems] = useState([]);
  const [checkedSet, setCheckedSet] = useState(new Set());
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Cycle loading messages while parsing
  useEffect(() => {
    if (uploadPhase !== 'parsing') return;
    setLoadingMsgIndex(0);
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) =>
        prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 2500);
    return () => clearInterval(interval);
  }, [uploadPhase]);

  // ── File handling ──────────────────────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      setUploadError('Please upload a JPG, PNG, WebP, or PDF file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File must be under 10 MB.');
      return;
    }

    setUploadError('');
    setUploadPhase('parsing');

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch('/api/parse-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, mimeType: file.type }),
      });

      if (!res.ok) throw new Error('Parse request failed');

      const data = await res.json();
      if (!data.items || data.items.length === 0) {
        setUploadError(
          'No prices found in this file. Try a different image or enter prices manually below.'
        );
        setUploadPhase('idle');
        return;
      }

      // Pre-check all items except consultation fees
      const checked = new Set();
      data.items.forEach((item, i) => {
        if (!item.is_consultation) checked.add(i);
      });

      setExtractedItems(data.items);
      setCheckedSet(checked);
      setUploadPhase('confirming');
    } catch (err) {
      console.error('Menu upload error:', err);
      setUploadError('Something went wrong. Please try again or enter prices manually.');
      setUploadPhase('idle');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  // ── Extracted items editing ────────────────────────────────────────────────
  function toggleChecked(index) {
    setCheckedSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function updateExtracted(index, field, value) {
    setExtractedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function addSelectedItems() {
    const selected = extractedItems
      .filter((_, i) => checkedSet.has(i))
      .map((item) => ({
        procedure_type: item.procedure_type || item.menu_name,
        treatment_area: item.treatment_area || '',
        price: String(item.price),
        price_label: item.price_label || 'per session',
      }));

    if (selected.length === 0) return;

    setItems((prev) => {
      const isOnlyEmpty =
        prev.length === 1 && !prev[0].procedure_type && !prev[0].price;
      return isOnlyEmpty ? selected : [...prev, ...selected];
    });

    setExtractedItems([]);
    setCheckedSet(new Set());
    setUploadPhase('idle');
  }

  // ── Manual entry handlers ──────────────────────────────────────────────────
  function updateItem(index, field, value) {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    const valid = items.filter((item) => item.procedure_type && item.price);
    onComplete(valid);
  }

  function handleSkip() {
    onComplete([]);
  }

  const validCount = items.filter((item) => item.procedure_type && item.price).length;
  const checkedCount = checkedSet.size;

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-2">Upload your price menu</h1>
      <p className="text-text-secondary mb-6">
        Add the procedures you offer and their prices. This helps patients compare costs.
      </p>

      {/* Pro tip */}
      <div className="bg-rose-light/50 border border-rose-accent/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Lightbulb size={18} className="text-rose-accent flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-text-primary">
            Practices with 3+ listed prices get significantly more profile views.
          </p>
          <p className="text-xs text-text-secondary mt-1">
            You can always add more from your dashboard later.
          </p>
        </div>
      </div>

      {/* ── Upload zone ── */}
      {uploadPhase === 'idle' && (
        <div className="mb-8">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              dragOver
                ? 'border-rose-accent bg-rose-light/30'
                : 'border-gray-200 hover:border-rose-accent/50 hover:bg-rose-light/10'
            }`}
          >
            <Upload size={32} className="mx-auto text-rose-accent mb-3" />
            <p className="font-semibold text-text-primary mb-1">
              Upload your price menu
            </p>
            <p className="text-sm text-text-secondary mb-3">
              Drop a PDF or photo of your menu &mdash; we&rsquo;ll extract the prices automatically
            </p>
            <span className="text-xs text-text-secondary">
              JPG, PNG, WebP, or PDF &mdash; up to 10 MB
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>
          {uploadError && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-600">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Parsing loading state ── */}
      {uploadPhase === 'parsing' && (
        <div className="mb-8 glow-card p-8 text-center">
          <Loader2 size={32} className="mx-auto text-rose-accent mb-4 animate-spin" />
          <p className="font-semibold text-text-primary mb-1">
            {LOADING_MESSAGES[loadingMsgIndex]}
          </p>
          <p className="text-sm text-text-secondary">
            This usually takes 10&ndash;20 seconds
          </p>
        </div>
      )}

      {/* ── Confirmation table ── */}
      {uploadPhase === 'confirming' && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-text-primary">
              We found {extractedItems.length} price
              {extractedItems.length !== 1 ? 's' : ''}
            </h2>
            <button
              type="button"
              onClick={() => {
                setUploadPhase('idle');
                setExtractedItems([]);
                setCheckedSet(new Set());
              }}
              className="text-sm text-text-secondary hover:text-text-primary transition"
            >
              Upload different file
            </button>
          </div>
          <p className="text-sm text-text-secondary mb-4">
            Review and edit below, then add the ones you want.
            {extractedItems.some((it) => it.is_consultation) && (
              <span className="ml-1 text-amber-600">
                Consultation fees are unchecked by default.
              </span>
            )}
          </p>

          <div className="space-y-2 mb-4">
            {extractedItems.map((item, i) => (
              <div
                key={i}
                className={`glow-card p-3 flex items-start gap-3 transition ${
                  !checkedSet.has(i) ? 'opacity-50' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleChecked(i)}
                  className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                    checkedSet.has(i)
                      ? 'bg-rose-accent border-rose-accent text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {checkedSet.has(i) && <Check size={12} />}
                </button>

                {/* Fields */}
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Procedure */}
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-medium text-text-secondary mb-0.5">
                      Procedure
                    </label>
                    <input
                      type="text"
                      value={item.procedure_type || item.menu_name}
                      onChange={(e) =>
                        updateExtracted(i, 'procedure_type', e.target.value)
                      }
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 focus:border-rose-accent focus:ring-1 focus:ring-rose-accent/20 outline-none text-sm"
                    />
                    {item.menu_name &&
                      item.menu_name !== item.procedure_type && (
                        <p className="text-[10px] text-text-secondary mt-0.5 truncate">
                          Menu: {item.menu_name}
                        </p>
                      )}
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-[10px] font-medium text-text-secondary mb-0.5">
                      Price
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-text-secondary">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) =>
                          updateExtracted(i, 'price', e.target.value)
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 focus:border-rose-accent focus:ring-1 focus:ring-rose-accent/20 outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Price label */}
                  <div>
                    <label className="block text-[10px] font-medium text-text-secondary mb-0.5">
                      Label
                    </label>
                    <select
                      value={item.price_label || 'per session'}
                      onChange={(e) =>
                        updateExtracted(i, 'price_label', e.target.value)
                      }
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 focus:border-rose-accent focus:ring-1 focus:ring-rose-accent/20 outline-none text-sm"
                    >
                      {PRICE_LABEL_OPTIONS.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addSelectedItems}
            disabled={checkedCount === 0}
            className="w-full bg-rose-accent text-white py-2.5 rounded-full font-semibold hover:bg-rose-dark transition disabled:opacity-50"
          >
            Add {checkedCount} selected item{checkedCount !== 1 ? 's' : ''}{' '}
            &rarr;
          </button>
        </div>
      )}

      {/* ── Divider ── */}
      {uploadPhase !== 'parsing' && (
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-text-secondary font-medium">
            {uploadPhase === 'confirming'
              ? 'or continue editing below'
              : 'or enter prices manually'}
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}

      {/* ── Progress (hidden during parsing) ── */}
      {uploadPhase !== 'parsing' && (
        <div className="flex items-center gap-2 mb-6">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-8 h-1.5 rounded-full transition ${
                  i < validCount ? 'bg-rose-accent' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-text-secondary">
            {validCount} of 3 recommended
          </span>
        </div>
      )}

      {/* ── Manual entry items (hidden during parsing) ── */}
      {uploadPhase !== 'parsing' && (
        <>
          <div className="space-y-4 mb-6">
            {items.map((item, index) => {
              const needsArea = REQUIRES_TREATMENT_AREA.has(item.procedure_type);
              const avg = AVG_PRICES[item.procedure_type];

              return (
                <div key={index} className="glow-card p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-medium text-text-secondary">
                      Item {index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 text-text-secondary hover:text-red-500 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Procedure type */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Procedure
                      </label>
                      <select
                        value={item.procedure_type}
                        onChange={(e) =>
                          updateItem(index, 'procedure_type', e.target.value)
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                      >
                        <option value="">Select...</option>
                        {/* Show AI-extracted name as custom option if not in list */}
                        {item.procedure_type &&
                          !PROCEDURE_TYPES.includes(item.procedure_type) && (
                            <option value={item.procedure_type}>
                              {item.procedure_type}
                            </option>
                          )}
                        {Object.entries(PROCEDURE_CATEGORIES).map(
                          ([category, procedures]) => (
                            <optgroup key={category} label={category}>
                              {procedures.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </optgroup>
                          )
                        )}
                      </select>
                    </div>

                    {/* Treatment area (conditional) */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Treatment area{' '}
                        {needsArea && (
                          <span className="text-rose-accent">*</span>
                        )}
                      </label>
                      <select
                        value={item.treatment_area}
                        onChange={(e) =>
                          updateItem(index, 'treatment_area', e.target.value)
                        }
                        disabled={!needsArea}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm disabled:opacity-50 disabled:bg-gray-50"
                      >
                        <option value="">
                          {needsArea ? 'Select...' : 'N/A'}
                        </option>
                        {TREATMENT_AREAS.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Price ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(index, 'price', e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                      />
                      {avg && (
                        <p className="text-[10px] text-text-secondary mt-1">
                          National avg: ${avg.avg}
                          {avg.unit}
                        </p>
                      )}
                    </div>

                    {/* Price label */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Price label
                      </label>
                      <select
                        value={item.price_label}
                        onChange={(e) =>
                          updateItem(index, 'price_label', e.target.value)
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                      >
                        {PRICE_LABEL_OPTIONS.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add another */}
          <button
            type="button"
            onClick={addItem}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-medium text-text-secondary hover:border-rose-accent hover:text-rose-accent transition flex items-center justify-center gap-2 mb-8"
          >
            <Plus size={16} /> Add another procedure
          </button>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleSubmit}
              disabled={validCount === 0}
              className="w-full bg-rose-accent text-white py-3 rounded-full font-semibold hover:bg-rose-dark transition disabled:opacity-50"
            >
              Continue with {validCount} item{validCount !== 1 ? 's' : ''}{' '}
              &rarr;
            </button>
            <button
              onClick={handleSkip}
              className="w-full text-sm text-text-secondary hover:text-text-primary transition py-2"
            >
              Skip for now &mdash; I&rsquo;ll add prices later
            </button>
          </div>
        </>
      )}
    </div>
  );
}

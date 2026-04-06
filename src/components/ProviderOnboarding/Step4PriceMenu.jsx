import { useState } from 'react';
import { Plus, Trash2, Lightbulb } from 'lucide-react';
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

export default function Step4PriceMenu({ existingItems, onComplete }) {
  const [items, setItems] = useState(
    existingItems.length > 0 ? existingItems : [{ ...EMPTY_ITEM }]
  );

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
    // Filter out empty rows
    const valid = items.filter((item) => item.procedure_type && item.price);
    onComplete(valid);
  }

  function handleSkip() {
    onComplete([]);
  }

  const validCount = items.filter((item) => item.procedure_type && item.price).length;

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

      {/* Progress */}
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

      {/* Menu items */}
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
                    onChange={(e) => updateItem(index, 'procedure_type', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
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

                {/* Treatment area (conditional) */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Treatment area {needsArea && <span className="text-rose-accent">*</span>}
                  </label>
                  <select
                    value={item.treatment_area}
                    onChange={(e) => updateItem(index, 'treatment_area', e.target.value)}
                    disabled={!needsArea}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm disabled:opacity-50 disabled:bg-gray-50"
                  >
                    <option value="">{needsArea ? 'Select...' : 'N/A'}</option>
                    {TREATMENT_AREAS.map((area) => (
                      <option key={area} value={area}>{area}</option>
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
                    onChange={(e) => updateItem(index, 'price', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                  />
                  {avg && (
                    <p className="text-[10px] text-text-secondary mt-1">
                      National avg: ${avg.avg}{avg.unit}
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
                    onChange={(e) => updateItem(index, 'price_label', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                  >
                    {PRICE_LABEL_OPTIONS.map((label) => (
                      <option key={label} value={label}>{label}</option>
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
          Continue with {validCount} item{validCount !== 1 ? 's' : ''} &rarr;
        </button>
        <button
          onClick={handleSkip}
          className="w-full text-sm text-text-secondary hover:text-text-primary transition py-2"
        >
          Skip for now — I'll add prices later
        </button>
      </div>
    </div>
  );
}

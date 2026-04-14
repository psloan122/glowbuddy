import { useState, useRef, useEffect } from 'react';
import { Search, Check } from 'lucide-react';
import {
  PROCEDURE_TYPES,
  PROCEDURE_CATEGORIES,
  TREATMENT_AREAS,
  REQUIRES_TREATMENT_AREA,
  UNITS_PLACEHOLDER,
  AVG_PRICES,
} from '../../lib/constants';
import { getCity, getState } from '../../lib/gating';
import SuggestTreatmentBlock from '../SuggestTreatmentBlock';

const INPUT_CLASSES =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

export default function Step1({ formData, setFormData }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(formData.procedureType || '');
  const wrapperRef = useRef(null);

  const lowerSearch = searchTerm.toLowerCase();
  const filteredTypes = PROCEDURE_TYPES.filter((type) =>
    type.toLowerCase().includes(lowerSearch)
  );

  // Build grouped results for category headers in the dropdown
  const groupedResults = Object.entries(PROCEDURE_CATEGORIES)
    .map(([cat, procs]) => ({
      category: cat,
      items: procs.filter((p) => p.toLowerCase().includes(lowerSearch)),
    }))
    .filter((g) => g.items.length > 0);

  const needsArea = REQUIRES_TREATMENT_AREA.has(formData.procedureType);
  const avgPrice = AVG_PRICES[formData.procedureType];
  const unitsPlaceholder =
    UNITS_PLACEHOLDER[formData.procedureType] || 'e.g. 1 session';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setSearchOpen(false);
        // Reset search term to selected value if user clicked away
        if (formData.procedureType) {
          setSearchTerm(formData.procedureType);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [formData.procedureType]);

  function selectProcedure(type) {
    setSearchTerm(type);
    setFormData((prev) => ({ ...prev, procedureType: type }));
    setSearchOpen(false);
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-1">
        Share what you paid
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Your price helps women{getCity() ? ` in ${getCity()}` : ''} know what to expect before they book.
      </p>

      <div className="space-y-5">
        {/* Procedure type — searchable dropdown, selection required */}
        <div ref={wrapperRef} className="relative">
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Procedure Type <span className="text-rose-accent">*</span>
          </label>
          <div className="relative">
            {formData.procedureType && !searchOpen ? (
              <Check
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-verified"
              />
            ) : (
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
            )}
            <input
              type="text"
              placeholder="Search procedures..."
              value={searchOpen ? searchTerm : (formData.procedureType || searchTerm)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSearchOpen(true);
                // Always clear selection when typing — force re-selection
                setFormData((prev) => ({ ...prev, procedureType: '' }));
              }}
              onFocus={() => {
                setSearchOpen(true);
                setSearchTerm(formData.procedureType || searchTerm);
              }}
              className={`${INPUT_CLASSES} pl-10 ${
                formData.procedureType && !searchOpen
                  ? 'border-verified/30 bg-verified/5'
                  : ''
              }`}
            />
          </div>
          {searchOpen && (
            <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {groupedResults.length > 0 ? (
                groupedResults.map((group) => (
                  <li key={group.category}>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                      {group.category}
                    </p>
                    {group.items.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => selectProcedure(type)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-rose-light/50 transition-colors ${
                          formData.procedureType === type
                            ? 'bg-rose-light text-rose-dark font-medium'
                            : 'text-text-primary'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </li>
                ))
              ) : (
                <li className="px-4 py-3 text-sm text-text-secondary">
                  No matching procedures
                </li>
              )}
            </ul>
          )}

          {/* Avg price helper */}
          {formData.procedureType && avgPrice && (
            <p className="text-xs text-text-secondary mt-1.5">
              Avg price nationally: <span className="font-medium">${avgPrice.avg.toLocaleString()}{avgPrice.unit}</span>
            </p>
          )}

          {/* Don't see your treatment? — inline suggest form. */}
          <SuggestTreatmentBlock variant="soft" source="log_step1" />
        </div>

        {/* Treatment area */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Treatment Area {needsArea && <span className="text-rose-accent">*</span>}
          </label>
          <select
            value={formData.treatmentArea}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, treatmentArea: e.target.value }))
            }
            className={INPUT_CLASSES}
          >
            <option value="">
              {needsArea ? 'Select area' : 'Select area (optional)'}
            </option>
            {TREATMENT_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {/* How much? — dynamic placeholder */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            How much?
          </label>
          <input
            type="text"
            placeholder={unitsPlaceholder}
            value={formData.unitsOrVolume}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                unitsOrVolume: e.target.value,
              }))
            }
            className={INPUT_CLASSES}
          />
        </div>

        {/* Price paid */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Price Paid <span className="text-rose-accent">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-medium">
              $
            </span>
            <input
              type="number"
              placeholder="e.g. 450"
              min="1"
              step="1"
              value={formData.pricePaid}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d]/g, '');
                setFormData((prev) => ({ ...prev, pricePaid: val }));
              }}
              onKeyDown={(e) => {
                if (e.key === '.' || e.key === '-' || e.key === 'e') {
                  e.preventDefault();
                }
              }}
              className={`${INPUT_CLASSES} pl-8`}
            />
          </div>
          {formData.procedureType && avgPrice && getState() && (
            <p className="text-xs text-text-secondary mt-1.5">
              Avg in {getState()}: <span className="font-medium">${avgPrice.avg.toLocaleString()}{avgPrice.unit}</span>
            </p>
          )}
        </div>

        {/* Discount type */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Did you receive a discount?
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: null, label: 'None' },
              { value: 'Military/Veteran', label: '🎖️ Military' },
              { value: 'First Visit', label: 'First Visit' },
              { value: 'Loyalty', label: 'Loyalty' },
              { value: 'Referral', label: 'Referral' },
              { value: 'Seasonal', label: 'Seasonal' },
              { value: 'Other', label: 'Other' },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    discountType: opt.value,
                    discountAmount: opt.value === null ? '' : prev.discountAmount,
                  }))
                }
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  formData.discountType === opt.value
                    ? 'bg-rose-accent text-white border-rose-accent'
                    : 'bg-white text-text-secondary border-gray-200 hover:border-rose-accent/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {formData.discountType && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Amount saved (optional)
              </label>
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
                  $
                </span>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  min="0"
                  step="1"
                  value={formData.discountAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d]/g, '');
                    setFormData((prev) => ({ ...prev, discountAmount: val }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === '.' || e.key === '-' || e.key === 'e') {
                      e.preventDefault();
                    }
                  }}
                  className={`${INPUT_CLASSES} pl-7 text-sm`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

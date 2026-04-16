import { useState, useRef, useEffect } from 'react';
import { Search, Check, FileText } from 'lucide-react';
import {
  TREATMENT_AREAS,
  REQUIRES_TREATMENT_AREA,
} from '../../lib/constants';
import {
  getGroupedProcedures,
  getProcedureOption,
  LOG_PROC_UNIT_DISPLAY,
} from '../../lib/logProcedures';
import { getCity, getState } from '../../lib/gating';
import useProviderMenu from '../../hooks/useProviderMenu';
import SuggestTreatmentBlock from '../SuggestTreatmentBlock';

const INPUT_CLASSES =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

const MENU_UNIT_LABELS = {
  per_unit: '/unit',
  per_syringe: '/syringe',
  per_vial: '/vial',
  per_session: '/session',
  per_area: '/area',
  per_cycle: '/cycle',
  flat_package: '',
};

export default function Step1({ formData, setFormData, prefilledProvider }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(formData.procedureType || '');
  const wrapperRef = useRef(null);

  const lowerSearch = searchTerm.toLowerCase();

  // Build grouped results for category headers in the dropdown
  const groupedResults = getGroupedProcedures(lowerSearch);

  // Provider menu items — when the provider has an uploaded/parsed menu,
  // show their actual procedures as a selection list.
  const { menuItems, fetchMenu } = useProviderMenu();
  const [useMenuMode, setUseMenuMode] = useState(false);

  useEffect(() => {
    if (prefilledProvider?.id) {
      fetchMenu(prefilledProvider.id);
    }
  }, [prefilledProvider?.id, fetchMenu]);

  // Auto-enable menu mode when items are available
  useEffect(() => {
    if (menuItems.length > 0 && !formData.procedureType) {
      setUseMenuMode(true);
    }
  }, [menuItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectFromMenu(item) {
    setFormData((prev) => ({
      ...prev,
      procedureType: item.procedure_type,
      pricePaid: String(item.price),
    }));
    setSearchTerm(item.procedure_type);
    setUseMenuMode(false);
  }

  const needsArea = REQUIRES_TREATMENT_AREA.has(formData.procedureType);
  const proc = getProcedureOption(formData.procedureType);
  const unitsPlaceholder = proc?.unitHint || 'e.g. 1 session';
  // Area options: procedure-specific list when available, fallback to global list
  const areaOptions = proc?.popularAreas?.length ? proc.popularAreas : TREATMENT_AREAS;
  // Resolved pricing unit (pricingUnit state wins, fallback to procedure default)
  const activePricingUnit = formData.pricingUnit || proc?.defaultUnit || '';
  const isPerUnit = activePricingUnit === 'per_unit';

  const PRICE_LABEL_MAP = {
    per_area: 'Price per area',
    flat_package: 'Total price paid',
    per_session: 'Total price paid',
    per_syringe: 'Price per syringe',
    per_vial: 'Price per vial',
    per_cycle: 'Price per cycle',
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setSearchOpen(false);
        // Reset search term to selected label if user clicked away
        if (formData.procedureType) {
          const selected = getProcedureOption(formData.procedureType);
          setSearchTerm(selected?.label || formData.procedureType);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [formData.procedureType]);

  function selectProcedure(value) {
    const selected = getProcedureOption(value);
    setSearchTerm(selected?.label || value);
    setFormData((prev) => ({
      ...prev,
      procedureType: value,
      pricingUnit: selected?.defaultUnit || prev.pricingUnit || '',
      // Reset treatment area and total spend when procedure changes
      treatmentArea: '',
      totalSpend: '',
    }));
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
        {/* Menu picker — shown when provider has an uploaded menu */}
        {useMenuMode && menuItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-rose-accent" />
              <p className="text-sm font-medium text-text-primary">
                {prefilledProvider?.name || 'This provider'} has a price menu on file
              </p>
            </div>
            <div className="space-y-1.5 mb-3">
              {menuItems.map((item, i) => (
                <button
                  key={`${item.procedure_type}-${item.price}-${i}`}
                  type="button"
                  onClick={() => selectFromMenu(item)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-rose-accent/50 transition-colors flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-text-primary">
                    {((n) => !n ? 'Treatment' : n.includes('/') ? 'Neurotoxin' : n)(item.procedure_type)}
                  </span>
                  <span className="text-sm text-text-secondary">
                    ${item.price}{MENU_UNIT_LABELS[item.price_label] || ''}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setUseMenuMode(false)}
              className="text-xs text-text-secondary underline"
            >
              Price isn't on their menu — enter manually
            </button>
          </div>
        )}

        {/* Procedure type — searchable dropdown, selection required */}
        {!useMenuMode && (
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
                const selected = getProcedureOption(formData.procedureType);
                setSearchTerm(selected?.label || formData.procedureType || searchTerm);
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
                    {group.items.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => selectProcedure(p.value)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-rose-light/50 transition-colors ${
                          formData.procedureType === p.value
                            ? 'bg-rose-light text-rose-dark font-medium'
                            : 'text-text-primary'
                        }`}
                      >
                        {p.label}
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
          {proc?.avgNational && (
            <p className="text-xs text-text-secondary mt-1.5">
              Avg {proc.label} nationally:{' '}
              <span className="font-medium">${proc.avgNational.toLocaleString()}{proc.avgUnit}</span>
            </p>
          )}

          {/* Don't see your treatment? — inline suggest form. */}
          <SuggestTreatmentBlock variant="soft" source="log_step1" />

          {/* Back to menu link — when provider has a menu and user switched to manual */}
          {menuItems.length > 0 && !useMenuMode && (
            <button
              type="button"
              onClick={() => setUseMenuMode(true)}
              className="text-xs text-rose-accent underline mt-1"
            >
              Back to {prefilledProvider?.name || 'provider'} menu
            </button>
          )}
        </div>
        )}

        {/* Unit type selector — shown when the procedure has multiple pricing options */}
        {proc && proc.unitOptions.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              How is it priced?
            </label>
            <div className="flex flex-wrap gap-2">
              {proc.unitOptions.map((unit) => {
                const isActive = (formData.pricingUnit || proc.defaultUnit) === unit;
                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, pricingUnit: unit }))}
                    className="inline-flex items-center transition-colors"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '2px',
                      border: `1px solid ${isActive ? '#E8347A' : '#DDD'}`,
                      background: isActive ? '#E8347A' : 'transparent',
                      color: isActive ? '#fff' : '#888',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 500,
                      fontSize: '12px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {LOG_PROC_UNIT_DISPLAY[unit] || unit.replace(/_/g, ' ')}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
            {areaOptions.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
            {proc?.popularAreas?.length > 0 && (
              <option value="Other">Other</option>
            )}
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

        {/* Price fields — two-field layout for per_unit, single field for others */}
        {isPerUnit ? (
          <>
            {/* Field 1: Unit price — required */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Price per unit <span className="text-rose-accent">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    placeholder="e.g. 12"
                    min="1"
                    step="0.50"
                    value={formData.pricePaid}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d.]/g, '');
                      setFormData((prev) => ({ ...prev, pricePaid: val }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e') e.preventDefault();
                    }}
                    className={`${INPUT_CLASSES} pl-8`}
                  />
                </div>
                <span className="text-text-secondary text-sm whitespace-nowrap">/ unit</span>
              </div>
              {proc?.avgNational && (
                <p className="text-xs text-text-secondary mt-1.5">
                  Avg {proc.label} nationally:{' '}
                  <span className="font-medium">${proc.avgNational.toLocaleString()}{proc.avgUnit}</span>
                </p>
              )}
            </div>

            {/* Field 2: Total visit spend — optional */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                How much did you spend total?{' '}
                <span className="font-normal text-text-secondary">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-medium">
                  $
                </span>
                <input
                  type="number"
                  placeholder="e.g. 350"
                  min="1"
                  step="1"
                  value={formData.totalSpend}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d]/g, '');
                    setFormData((prev) => ({ ...prev, totalSpend: val }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === '.' || e.key === '-' || e.key === 'e') {
                      e.preventDefault();
                    }
                  }}
                  className={`${INPUT_CLASSES} pl-8`}
                />
              </div>
              <p className="text-xs text-text-secondary mt-1.5">
                Helps others know what a full visit costs. e.g. 28 units × $12 = $336
              </p>
              {formData.pricePaid && formData.totalSpend &&
                Number(formData.pricePaid) > 0 && Number(formData.totalSpend) > 0 && (
                <p className="text-xs text-emerald-600 mt-1">
                  ≈ {Math.round(Number(formData.totalSpend) / Number(formData.pricePaid))} units — typical range is 20–50
                </p>
              )}
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {PRICE_LABEL_MAP[activePricingUnit] || 'Price paid'}{' '}
              <span className="text-rose-accent">*</span>
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
            {proc?.avgNational && getState() && (
              <p className="text-xs text-text-secondary mt-1.5">
                Avg {proc.label} nationally:{' '}
                <span className="font-medium">${proc.avgNational.toLocaleString()}{proc.avgUnit}</span>
              </p>
            )}
          </div>
        )}

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

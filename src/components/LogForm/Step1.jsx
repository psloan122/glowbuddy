import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { PROCEDURE_TYPES, TREATMENT_AREAS } from '../../lib/constants';

const INPUT_CLASSES =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

export default function Step1({ formData, setFormData }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(formData.procedureType || '');
  const wrapperRef = useRef(null);

  const filteredTypes = PROCEDURE_TYPES.filter((type) =>
    type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectProcedure(type) {
    setSearchTerm(type);
    setFormData((prev) => ({ ...prev, procedureType: type }));
    setSearchOpen(false);
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-1">
        What did you get?
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Tell us about your treatment.
      </p>

      <div className="space-y-5">
        {/* Procedure type — searchable dropdown */}
        <div ref={wrapperRef} className="relative">
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Procedure Type <span className="text-rose-accent">*</span>
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              placeholder="Search procedures..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSearchOpen(true);
                if (!e.target.value) {
                  setFormData((prev) => ({ ...prev, procedureType: '' }));
                }
              }}
              onFocus={() => setSearchOpen(true)}
              className={`${INPUT_CLASSES} pl-10`}
            />
          </div>
          {searchOpen && filteredTypes.length > 0 && (
            <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {filteredTypes.map((type) => (
                <li key={type}>
                  <button
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
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Treatment area */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Treatment Area
          </label>
          <select
            value={formData.treatmentArea}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, treatmentArea: e.target.value }))
            }
            className={INPUT_CLASSES}
          >
            <option value="">Select area (optional)</option>
            {TREATMENT_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {/* Units or volume */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Units or Volume
          </label>
          <input
            type="text"
            placeholder="e.g. 20 units, 1 syringe"
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
              placeholder="0"
              min="0"
              step="1"
              value={formData.pricePaid}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
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
        </div>
      </div>
    </div>
  );
}

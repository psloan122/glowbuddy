import { useState, useMemo } from 'react';

// Treatment area configs sourced from FDA prescribing information dosing tables
const BOTOX_AREAS = [
  { id: 'forehead', label: 'Forehead', unitRange: [10, 20], description: 'Frontalis muscle' },
  { id: 'glabella', label: 'Glabella (11s)', unitRange: [15, 25], description: 'Corrugator/procerus' },
  { id: 'crows_feet', label: "Crow's Feet", unitRange: [12, 24], description: 'Orbicularis oculi (both sides)' },
];

const FILLER_LEVELS = {
  'Lip Filler': [
    { id: 'subtle', label: 'Subtle', amount: 0.5, unit: 'syringe' },
    { id: 'moderate', label: 'Moderate', amount: 1.0, unit: 'syringe' },
    { id: 'full', label: 'Full', amount: 1.5, unit: 'syringes' },
  ],
  'Cheek Filler': [
    { id: 'subtle', label: 'Subtle', amount: 1, unit: 'syringe' },
    { id: 'moderate', label: 'Moderate', amount: 2, unit: 'syringes' },
    { id: 'full', label: 'Full', amount: 4, unit: 'syringes' },
  ],
};

const SIMPLE_SLIDER_CONFIG = {
  'Kybella': { min: 1, max: 6, step: 1, unit: 'vials', defaultVal: 2, priceLow: 600, priceHigh: 900 },
  'Sculptra': { min: 1, max: 4, step: 1, unit: 'vials', defaultVal: 2, priceLow: 700, priceHigh: 1000 },
};

export default function DosageCalculator({ treatmentName, cityAvgPrice }) {
  // Botox area checkboxes
  const [selectedAreas, setSelectedAreas] = useState(['forehead']);
  // Filler level selection
  const [fillerLevel, setFillerLevel] = useState('subtle');
  // Simple slider
  const sliderConfig = SIMPLE_SLIDER_CONFIG[treatmentName];
  const [sliderVal, setSliderVal] = useState(sliderConfig?.defaultVal || 0);

  const isBotox = treatmentName === 'Botox / Dysport / Xeomin';
  const fillerLevels = FILLER_LEVELS[treatmentName];

  // Botox calculation
  const botoxCalc = useMemo(() => {
    if (!isBotox) return null;
    const selected = BOTOX_AREAS.filter((a) => selectedAreas.includes(a.id));
    if (selected.length === 0) return null;
    const unitLow = selected.reduce((s, a) => s + a.unitRange[0], 0);
    const unitHigh = selected.reduce((s, a) => s + a.unitRange[1], 0);
    // $10-16/unit national range
    return { unitLow, unitHigh, costLow: unitLow * 10, costHigh: unitHigh * 16 };
  }, [isBotox, selectedAreas]);

  // Filler calculation
  const fillerCalc = useMemo(() => {
    if (!fillerLevels) return null;
    const level = fillerLevels.find((l) => l.id === fillerLevel);
    if (!level) return null;
    // $500-800/syringe lip, $600-800/syringe cheek
    const perSyringeLow = treatmentName === 'Lip Filler' ? 500 : 600;
    const perSyringeHigh = treatmentName === 'Lip Filler' ? 800 : 800;
    return {
      amount: level.amount,
      unit: level.unit,
      costLow: Math.round(level.amount * perSyringeLow),
      costHigh: Math.round(level.amount * perSyringeHigh),
    };
  }, [fillerLevels, fillerLevel, treatmentName]);

  // Render nothing if no config for this treatment
  if (!isBotox && !fillerLevels && !sliderConfig) return null;

  function toggleArea(id) {
    setSelectedAreas((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  // Botox: area checkboxes
  if (isBotox) {
    return (
      <div className="glow-card p-4 mb-4" style={{ border: '1px solid #EDE8E3' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold" style={{ color: '#E8347A' }}>Dosage Estimator</span>
          <span className="text-[10px] text-text-secondary bg-warm-gray px-1.5 py-0.5 rounded">Estimate only</span>
        </div>
        <p className="text-xs text-text-secondary mb-3">Select treatment areas (unit ranges per FDA dosing tables):</p>
        <div className="space-y-2 mb-3">
          {BOTOX_AREAS.map((area) => (
            <label key={area.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedAreas.includes(area.id)}
                onChange={() => toggleArea(area.id)}
                className="w-4 h-4 rounded accent-[#E8347A] focus:ring-2 focus:ring-[#E8347A]"
                style={{ accentColor: '#E8347A' }}
              />
              <span className="text-sm text-text-primary flex-1">
                {area.label}
                <span className="text-text-secondary ml-1.5">({area.unitRange[0]}-{area.unitRange[1]} units)</span>
              </span>
            </label>
          ))}
        </div>
        {botoxCalc && (
          <div
            className="p-3"
            style={{
              background: '#FBF9F7',
              border: '1px solid #EDE8E3',
              borderLeft: '3px solid #E8347A',
              borderRadius: '0 4px 4px 0',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-text-secondary">Estimated units</span>
              <span className="text-sm font-medium text-text-primary">{botoxCalc.unitLow}-{botoxCalc.unitHigh} units</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Estimated cost</span>
              <span className="text-lg font-bold text-text-primary">
                ${botoxCalc.costLow.toLocaleString()}&ndash;${botoxCalc.costHigh.toLocaleString()}
              </span>
            </div>
            {cityAvgPrice && (
              <p className="text-xs text-text-secondary mt-1">
                Local average: ${Number(cityAvgPrice).toLocaleString()}
              </p>
            )}
          </div>
        )}
        <p className="text-[10px] text-text-secondary mt-2">
          Actual dosage determined by your provider. Unit ranges based on FDA-approved prescribing information.
        </p>
      </div>
    );
  }

  // Filler: level selector
  if (fillerLevels) {
    return (
      <div className="glow-card p-4 mb-4" style={{ border: '1px solid #EDE8E3' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold" style={{ color: '#E8347A' }}>Dosage Estimator</span>
          <span className="text-[10px] text-text-secondary bg-warm-gray px-1.5 py-0.5 rounded">Estimate only</span>
        </div>
        <p className="text-xs text-text-secondary mb-3">Choose your desired level (per FDA-approved product labeling):</p>
        <div className="flex gap-2 mb-3">
          {fillerLevels.map((level) => {
            const active = fillerLevel === level.id;
            return (
              <button
                key={level.id}
                onClick={() => setFillerLevel(level.id)}
                className="flex-1 py-2.5 px-3 text-sm font-medium transition"
                style={{
                  borderRadius: 0,
                  border: active ? '2px solid #E8347A' : '1px solid #EDE8E3',
                  background: active ? '#FBF9F7' : '#FFFFFF',
                  color: active ? '#E8347A' : 'var(--text-secondary, #666)',
                }}
              >
                <div>{level.label}</div>
                <div className="text-[11px] mt-0.5">{level.amount} {level.unit}</div>
              </button>
            );
          })}
        </div>
        {fillerCalc && (
          <div
            className="p-3"
            style={{
              background: '#FBF9F7',
              border: '1px solid #EDE8E3',
              borderLeft: '3px solid #E8347A',
              borderRadius: '0 4px 4px 0',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Estimated cost</span>
              <span className="text-lg font-bold text-text-primary">
                ${fillerCalc.costLow.toLocaleString()}&ndash;${fillerCalc.costHigh.toLocaleString()}
              </span>
            </div>
            {cityAvgPrice && (
              <p className="text-xs text-text-secondary mt-1">
                Local average: ${Number(cityAvgPrice).toLocaleString()}
              </p>
            )}
          </div>
        )}
        <p className="text-[10px] text-text-secondary mt-2">
          Actual volume determined by your provider based on your anatomy and goals.
        </p>
      </div>
    );
  }

  // Simple slider for Kybella, Sculptra
  const lowEst = Math.round(sliderVal * sliderConfig.priceLow);
  const highEst = Math.round(sliderVal * sliderConfig.priceHigh);

  return (
    <div className="glow-card p-4 mb-4" style={{ border: '1px solid #EDE8E3' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold" style={{ color: '#E8347A' }}>Dosage Estimator</span>
        <span className="text-[10px] text-text-secondary bg-warm-gray px-1.5 py-0.5 rounded">Estimate only</span>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <input
          type="range"
          min={sliderConfig.min}
          max={sliderConfig.max}
          step={sliderConfig.step}
          value={sliderVal}
          onChange={(e) => setSliderVal(parseFloat(e.target.value))}
          className="flex-1 h-2 rounded-full appearance-none range-slider"
          style={{ accentColor: '#E8347A', background: '#F5EFEB' }}
        />
        <span className="text-sm font-medium text-text-primary w-24 text-right">
          {sliderVal} {sliderConfig.unit}
        </span>
      </div>
      <div
        className="p-3"
        style={{
          background: '#FBF9F7',
          border: '1px solid #EDE8E3',
          borderLeft: '3px solid #E8347A',
          borderRadius: '0 4px 4px 0',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Estimated cost</span>
          <span className="text-lg font-bold text-text-primary">
            ${lowEst.toLocaleString()}{lowEst !== highEst ? `\u2013$${highEst.toLocaleString()}` : ''}
          </span>
        </div>
        {cityAvgPrice && (
          <p className="text-xs text-text-secondary mt-1">
            Local average: ${Number(cityAvgPrice).toLocaleString()}
          </p>
        )}
      </div>
      <p className="text-[10px] text-text-secondary mt-2">
        Actual dosage determined by your provider.
      </p>
    </div>
  );
}

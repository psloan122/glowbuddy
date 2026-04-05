import { useState } from 'react';

const DOSAGE_CONFIG = {
  'Botox / Dysport / Xeomin': { min: 10, max: 60, step: 5, unit: 'units', defaultVal: 20, priceLow: 10, priceHigh: 16 },
  'Lip Filler': { min: 0.5, max: 3, step: 0.5, unit: 'syringes', defaultVal: 1, priceLow: 500, priceHigh: 800 },
  'Cheek Filler': { min: 1, max: 6, step: 1, unit: 'syringes', defaultVal: 2, priceLow: 600, priceHigh: 800 },
  'Kybella': { min: 1, max: 6, step: 1, unit: 'vials', defaultVal: 2, priceLow: 600, priceHigh: 900 },
  'Sculptra': { min: 1, max: 4, step: 1, unit: 'vials', defaultVal: 2, priceLow: 700, priceHigh: 1000 },
};

export default function DosageCalculator({ treatmentName, cityAvgPrice }) {
  const config = DOSAGE_CONFIG[treatmentName];
  const [value, setValue] = useState(config?.defaultVal || 0);

  if (!config) return null;

  const lowEst = Math.round(value * config.priceLow);
  const highEst = Math.round(value * config.priceHigh);

  return (
    <div className="glow-card p-4 mb-4 border border-sky-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-[#0369A1]">Dosage Estimator</span>
        <span className="text-[10px] text-text-secondary bg-warm-gray px-1.5 py-0.5 rounded">Estimate only</span>
      </div>
      <div className="flex items-center gap-4 mb-2">
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
          className="flex-1 accent-sky-600 h-2 rounded-full appearance-none bg-sky-100 range-slider"
        />
        <span className="text-sm font-medium text-text-primary w-24 text-right">
          {value} {config.unit}
        </span>
      </div>
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
  );
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NEUROTOXIN_DOSING } from '../data/dosingGuidance';

/**
 * Zustand store for the dosing calculator.
 *
 * selectedAreas — Set of area IDs the user has toggled on (e.g. 'forehead',
 *   'glabella'). Drives the live unit / cost estimates across the app.
 *
 * estimateUnits(brand) — sum typical units for selected areas
 * estimateCost(brand, pricePerUnit) — estimateUnits × pricePerUnit
 * estimateUnitsCrossCalc(sourceBrand, targetBrand) — convert units between brands
 *
 * Persistence: only `selectedAreas` is persisted to localStorage so the
 * user's area selections survive page reloads. Transient UI state like
 * `calculatorOpen` is intentionally excluded.
 */
const useDosingStore = create(
  persist(
    (set, get) => ({
      selectedAreas: [],
      calculatorOpen: false,

      toggleArea: (areaId) =>
        set((s) => {
          const next = s.selectedAreas.includes(areaId)
            ? s.selectedAreas.filter((a) => a !== areaId)
            : [...s.selectedAreas, areaId];
          return { selectedAreas: next };
        }),

      clearAreas: () => set({ selectedAreas: [] }),

      openCalculator: () => set({ calculatorOpen: true }),
      closeCalculator: () => set({ calculatorOpen: false }),
      toggleCalculator: () => set((s) => ({ calculatorOpen: !s.calculatorOpen })),

      /**
       * Sum the `typical` units for every selected area under the given brand.
       * Returns 0 when no areas are selected or the brand is unknown.
       */
      estimateUnits: (brand = 'botox') => {
        const { selectedAreas } = get();
        const brandData = NEUROTOXIN_DOSING[brand];
        if (!brandData || selectedAreas.length === 0) return 0;

        return selectedAreas.reduce((sum, areaId) => {
          const area = brandData.areas[areaId];
          return sum + (area?.typical ?? 0);
        }, 0);
      },

      /**
       * estimateUnits × pricePerUnit.  Returns null when the estimate would
       * be meaningless (no areas selected, no price, etc.).
       */
      estimateCost: (brand = 'botox', pricePerUnit) => {
        if (pricePerUnit == null || !Number.isFinite(pricePerUnit) || pricePerUnit <= 0)
          return null;
        const units = get().estimateUnits(brand);
        if (units === 0) return null;
        return Math.round(units * pricePerUnit);
      },

      /**
       * Convert estimated units from one brand to another using each brand's
       * conversionFactor (relative to Botox units).
       *
       *   Botox 20u → Dysport ≈ 50u   (20 / 1 × 2.5)
       *   Dysport 50u → Botox ≈ 20u   (50 / 2.5 × 1)
       */
      estimateUnitsCrossCalc: (sourceBrand = 'botox', targetBrand = 'dysport') => {
        const sourceData = NEUROTOXIN_DOSING[sourceBrand];
        const targetData = NEUROTOXIN_DOSING[targetBrand];
        if (!sourceData || !targetData) return null;

        const sourceUnits = get().estimateUnits(sourceBrand);
        if (sourceUnits === 0) return null;

        const sourceFactor = sourceData.conversionFactor || 1;
        const targetFactor = targetData.conversionFactor || 1;

        // Normalize to Botox-equivalent, then scale to target
        return Math.round((sourceUnits / sourceFactor) * targetFactor);
      },
    }),
    {
      name: 'gb-dosing',
      partialize: (state) => ({ selectedAreas: state.selectedAreas }),
    },
  ),
);

export default useDosingStore;

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  NEUROTOXIN_DOSING,
  GOAL_LEVELS,
  GENDER_MULTIPLIERS,
  EXPERIENCE_MULTIPLIERS,
  MUSCLE_STRENGTH,
  TREATMENT_AREAS,
  PRODUCTS,
} from '../data/dosingGuidance';

/**
 * Zustand store for the dosing calculator.
 *
 * Two usage modes:
 *
 * 1. **Simple** (used by PriceCard / StickyFilterBar inline estimates):
 *    selectedAreas + estimateUnits/estimateCost/estimateUnitRange
 *
 * 2. **Wizard** (used by DosingCalculatorSheet 5-step flow):
 *    wizardStep + selectedProduct/Goal/Gender/Experience/MuscleStrength
 *    + calculateEstimate (applies all multipliers)
 *
 * Persistence: selectedAreas + wizard profile selections survive reloads.
 * Transient UI state (calculatorOpen, wizardStep) is excluded.
 */
const useDosingStore = create(
  persist(
    (set, get) => ({
      // ── Shared state ──
      selectedAreas: [],
      calculatorOpen: false,

      // ── Wizard state ──
      wizardStep: 0, // 0 = closed, 1-5 = active steps
      selectedProduct: 'botox',
      selectedGoal: 'natural',
      selectedGender: 'female',
      selectedExperience: 'some_experience',
      selectedMuscleStrength: 'average',

      // ── Area actions ──
      toggleArea: (areaId) =>
        set((s) => {
          const next = s.selectedAreas.includes(areaId)
            ? s.selectedAreas.filter((a) => a !== areaId)
            : [...s.selectedAreas, areaId];
          return { selectedAreas: next };
        }),

      clearAreas: () => set({ selectedAreas: [] }),

      selectCombo: (areaKeys, recommendedGoal) =>
        set((s) => ({
          selectedAreas: areaKeys,
          selectedGoal: recommendedGoal || s.selectedGoal,
        })),

      // ── Calculator open/close (legacy inline) ──
      openCalculator: () => set({ calculatorOpen: true }),
      closeCalculator: () => set({ calculatorOpen: false }),
      toggleCalculator: () => set((s) => ({ calculatorOpen: !s.calculatorOpen })),

      // ── Wizard navigation ──
      openWizard: () => set({ wizardStep: 1 }),
      closeWizard: () => set({ wizardStep: 0 }),
      setStep: (step) => set({ wizardStep: step }),
      nextStep: () => set((s) => ({ wizardStep: Math.min(5, s.wizardStep + 1) })),
      prevStep: () => set((s) => ({ wizardStep: Math.max(1, s.wizardStep - 1) })),

      // ── Wizard setters ──
      setProduct: (key) => set({ selectedProduct: key }),
      setGoal: (key) => set({ selectedGoal: key }),
      setGender: (key) => set({ selectedGender: key }),
      setExperience: (key) => set({ selectedExperience: key }),
      setMuscleStrength: (key) => set({ selectedMuscleStrength: key }),

      // ── Simple estimates (unchanged API for PriceCard / StickyFilterBar) ──

      estimateUnits: (brand = 'botox') => {
        const { selectedAreas } = get();
        const brandData = NEUROTOXIN_DOSING[brand];
        if (!brandData || selectedAreas.length === 0) return 0;

        return selectedAreas.reduce((sum, areaId) => {
          const area = brandData.areas[areaId];
          return sum + (area?.typical ?? 0);
        }, 0);
      },

      estimateUnitRange: (brand = 'botox') => {
        const { selectedAreas } = get();
        const brandData = NEUROTOXIN_DOSING[brand];
        if (!brandData || selectedAreas.length === 0) return null;
        let min = 0, max = 0, typical = 0;
        for (const areaId of selectedAreas) {
          const area = brandData.areas[areaId];
          if (area) {
            min += area.min;
            max += area.max;
            typical += area.typical ?? 0;
          }
        }
        return { min, max, typical };
      },

      estimateCost: (brand = 'botox', pricePerUnit) => {
        if (pricePerUnit == null || !Number.isFinite(pricePerUnit) || pricePerUnit <= 0)
          return null;
        const units = get().estimateUnits(brand);
        if (units === 0) return null;
        return Math.round(units * pricePerUnit);
      },

      estimateUnitsCrossCalc: (sourceBrand = 'botox', targetBrand = 'dysport') => {
        const sourceData = NEUROTOXIN_DOSING[sourceBrand];
        const targetData = NEUROTOXIN_DOSING[targetBrand];
        if (!sourceData || !targetData) return null;

        const sourceUnits = get().estimateUnits(sourceBrand);
        if (sourceUnits === 0) return null;

        const sourceFactor = sourceData.conversionFactor || 1;
        const targetFactor = targetData.conversionFactor || 1;
        return Math.round((sourceUnits / sourceFactor) * targetFactor);
      },

      // ── Wizard full estimate (applies all multipliers) ──

      calculateEstimate: () => {
        const {
          selectedProduct, selectedGoal, selectedGender,
          selectedExperience, selectedMuscleStrength, selectedAreas,
        } = get();

        if (!selectedAreas.length) return null;

        const product = PRODUCTS[selectedProduct];
        const goalLevel = GOAL_LEVELS[selectedGoal];
        const gender = GENDER_MULTIPLIERS[selectedGender];
        const experience = EXPERIENCE_MULTIPLIERS[selectedExperience];
        const muscle = MUSCLE_STRENGTH[selectedMuscleStrength];
        if (!product || !goalLevel || !gender || !experience || !muscle) return null;

        let totalMin = 0, totalTypical = 0, totalMax = 0;
        const areaBreakdown = [];
        const warnings = [];
        const notes = [];

        for (const areaKey of selectedAreas) {
          const area = TREATMENT_AREAS[areaKey];
          if (!area) continue;

          const mult = goalLevel.multiplier * gender.multiplier * experience.multiplier * muscle.multiplier;

          const areaMin = Math.round(area.min * mult);
          const areaTypical = Math.round(area.typical * mult);
          const areaMax = Math.round(area.max * mult);

          totalMin += areaMin;
          totalTypical += areaTypical;
          totalMax += areaMax;

          areaBreakdown.push({
            key: areaKey, label: area.label,
            min: areaMin, typical: areaTypical, max: areaMax,
            warning: area.specialist ? 'Requires specialist experience' : null,
          });

          if (area.specialist) {
            warnings.push({ area: area.label, warning: 'Requires specialist experience — confirm your injector has specific training.' });
          }
        }

        if (selectedAreas.includes('forehead') && !selectedAreas.includes('glabella')) {
          warnings.push({
            area: 'Forehead',
            warning: 'Forehead FDA-approved only with glabella. Treating alone increases brow drop risk.',
          });
        }

        if (selectedGender === 'male') {
          notes.push('Male dosing applied: ~1.6× female baseline.');
        }
        if (selectedExperience === 'first_time') {
          notes.push('First-time conservative dosing. Provider can top up at 2-week follow-up.');
        }

        // Convert from Botox baseline to selected product
        const conversion = product.conversionFactor || 1;
        const productMin = Math.round(totalMin * conversion);
        const productTypical = Math.round(totalTypical * conversion);
        const productMax = Math.round(totalMax * conversion);

        return {
          botoxMin: totalMin, botoxTypical: totalTypical, botoxMax: totalMax,
          productMin, productTypical, productMax,
          productName: product.name, productKey: selectedProduct,
          conversionNote: selectedProduct !== 'botox' ? product.conversionNote : null,
          areaBreakdown, warnings, notes,
          goalLabel: goalLevel.label,
          genderLabel: gender.label,
          experienceLabel: experience.label,
          muscleLabel: muscle.label,
        };
      },

      wizardEstimateCost: (unitPrice) => {
        const estimate = get().calculateEstimate();
        if (!estimate || !unitPrice) return null;
        return {
          minCost: Math.round(estimate.productMin * unitPrice),
          typicalCost: Math.round(estimate.productTypical * unitPrice),
          maxCost: Math.round(estimate.productMax * unitPrice),
          unitPrice,
          units: { min: estimate.productMin, typical: estimate.productTypical, max: estimate.productMax },
        };
      },
    }),
    {
      name: 'gb-dosing-v2',
      partialize: (state) => ({
        selectedAreas: state.selectedAreas,
        selectedProduct: state.selectedProduct,
        selectedGoal: state.selectedGoal,
        selectedGender: state.selectedGender,
        selectedExperience: state.selectedExperience,
        selectedMuscleStrength: state.selectedMuscleStrength,
      }),
    },
  ),
);

export default useDosingStore;

import CreatePriceAlert from './CreatePriceAlert';

// Thin shim kept for backwards-compatibility with existing call sites
// (e.g. PriceAlertButton). All price-alert creation flows should route
// through CreatePriceAlert so the brand-separated procedure list and the
// Places-autocompleted location widget stay in a single component.
export default function PriceAlertModal({
  onClose,
  defaultProcedure,
  defaultBrand,
  defaultCity,
  defaultState,
}) {
  return (
    <CreatePriceAlert
      onClose={onClose}
      defaultProcedure={defaultProcedure}
      defaultBrand={defaultBrand}
      defaultCity={defaultCity}
      defaultState={defaultState}
    />
  );
}

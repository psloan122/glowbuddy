import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import ProcedurePriceBlock from '../ProcedurePriceBlock';
import FinancingWidget from '../FinancingWidget';
import { getStalenessPercentage } from '../../lib/freshness';
import { groupForProviderDisplay } from '../../lib/priceUtils';
import useProcedurePrices from '../../hooks/useProcedurePrices';

export default function PricesTab({
  // verifiedPricing prop is still accepted so the parent call site doesn't
  // need to change, but PricesTab now owns its own data fetch via the hook.
  communityData,
  provider,
  user,
  isProviderOwner,
  onDisputeTarget,
}) {
  const { advertised, loading } = useProcedurePrices(provider?.id);

  // Group advertised provider_pricing rows by procedure_type.
  // groupForProviderDisplay normalizes each row, folds visit prices into unit
  // rows, and drops any hidden/suppressed rows.
  const groupedAdvertised = groupForProviderDisplay(advertised);

  // Group community submissions (procedures table) by procedure_type.
  const communityByType = {};
  for (const row of communityData) {
    const pt = row.procedure_type;
    if (!communityByType[pt]) communityByType[pt] = [];
    communityByType[pt].push(row);
  }

  // All unique procedure types present in either source.
  const allTypes = [
    ...new Set([
      ...Object.keys(groupedAdvertised),
      ...Object.keys(communityByType),
    ]),
  ];

  // Estimated cost for the financing widget (avg across all advertised prices).
  const avgAdvertisedCost =
    advertised.length > 0
      ? advertised.reduce((sum, r) => sum + Number(r.price), 0) / advertised.length
      : communityData.length > 0
        ? communityData.reduce((sum, r) => sum + Number(r.price_paid || 0), 0) / communityData.length
        : null;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glow-card p-4 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-20 mb-4" />
            <div className="h-5 bg-gray-100 rounded w-36" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Staleness warning when most community prices are old */}
      {communityData.length > 0 && getStalenessPercentage(communityData) > 50 && (
        <div
          className="flex items-start gap-2.5 rounded-xl p-3 text-sm"
          style={{ background: '#FFFBEB', border: '1px solid rgba(217, 119, 6, 0.2)' }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: '#D97706' }} />
          <p style={{ color: '#92400E' }}>
            Most community prices here are over 6 months old and may no longer be accurate.
            <Link
              to={`/log?provider=${encodeURIComponent(provider?.name || '')}&city=${encodeURIComponent(
                provider?.city || ''
              )}&state=${encodeURIComponent(provider?.state || '')}`}
              className="font-medium ml-1 hover:underline"
              style={{ color: '#B45309' }}
            >
              Share a fresh price &rarr;
            </Link>
          </p>
        </div>
      )}

      {allTypes.length > 0 ? (
        allTypes.map((pt) => (
          <ProcedurePriceBlock
            key={pt}
            procedureType={pt}
            advertisedRows={groupedAdvertised[pt]?.items || []}
            communityRows={communityByType[pt] || []}
            provider={provider}
            isProviderOwner={isProviderOwner}
            onDisputeTarget={onDisputeTarget}
          />
        ))
      ) : (
        <div className="glow-card p-8 text-center">
          <p className="font-display italic text-[18px] text-text-secondary">
            No prices yet for this provider.
          </p>
          {provider && (
            <Link
              to={`/log?provider_id=${provider.id || ''}&provider=${encodeURIComponent(
                provider.name || ''
              )}&city=${encodeURIComponent(provider.city || '')}&state=${encodeURIComponent(
                provider.state || ''
              )}`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: '#C94F78' }}
            >
              Be the first to add a price
            </Link>
          )}
        </div>
      )}

      {/* Financing widget — shown when we have a reasonable cost estimate */}
      {avgAdvertisedCost != null && (
        <FinancingWidget
          procedureName={allTypes[0]}
          estimatedCost={avgAdvertisedCost}
          providerId={provider?.id}
          variant="full"
        />
      )}
    </div>
  );
}

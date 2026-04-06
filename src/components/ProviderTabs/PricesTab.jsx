import { Link } from 'react-router-dom';
import { Flag, ShieldCheck, Users, AlertTriangle } from 'lucide-react';
import ProcedureCard from '../ProcedureCard';
import FinancingWidget from '../FinancingWidget';
import { getStalenessPercentage } from '../../lib/freshness';

export default function PricesTab({
  verifiedPricing,
  communityData,
  provider,
  user,
  isProviderOwner,
  onDisputeTarget,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left column: Provider's Listed Prices */}
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <ShieldCheck size={20} className="text-verified" />
          Published by {provider?.name || 'this provider'}
        </h2>
        <p className="text-sm text-text-secondary mb-4">Official prices &middot; Updated by provider</p>

        {verifiedPricing.length > 0 ? (
          <div className="glow-card overflow-hidden">
            <div className="divide-y divide-gray-100">
              {verifiedPricing.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {item.procedure_type}
                    </p>
                    {item.units_or_volume && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {item.units_or_volume}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text-primary">
                      ${Number(item.price).toLocaleString()}
                    </p>
                    {item.price_label && (
                      <p className="text-xs text-text-secondary">
                        {item.price_label}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="glow-card p-6 text-center">
            <p className="text-text-secondary text-sm">
              This provider hasn&apos;t uploaded their menu yet.
            </p>
          </div>
        )}

        {/* Financing widget */}
        {(() => {
          const avgPrice = verifiedPricing.length > 0
            ? verifiedPricing.reduce((sum, item) => sum + Number(item.price), 0) / verifiedPricing.length
            : null;
          return (
            <FinancingWidget
              procedureName={verifiedPricing[0]?.procedure_type}
              estimatedCost={avgPrice}
              providerId={provider?.id}
              variant="full"
            />
          );
        })()}
      </div>

      {/* Right column: Community Prices */}
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <Users size={20} className="text-community" />
          Reported by patients
        </h2>
        <p className="text-sm text-text-secondary mb-4">Real prices shared by patients &middot; Not advertised rates</p>

        {/* Staleness warning when >50% of community prices are stale */}
        {communityData.length > 0 && getStalenessPercentage(communityData) > 50 && (
          <div
            className="flex items-start gap-2.5 rounded-xl p-3 mb-4 text-sm"
            style={{ background: '#FFFBEB', border: '1px solid rgba(217, 119, 6, 0.2)' }}
          >
            <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: '#D97706' }} />
            <p style={{ color: '#92400E' }}>
              Most community prices here are over 6 months old and may no longer be accurate.
              <Link
                to={`/log?provider=${encodeURIComponent(provider?.name || '')}&city=${encodeURIComponent(provider?.city || '')}&state=${encodeURIComponent(provider?.state || '')}`}
                className="font-medium ml-1 hover:underline"
                style={{ color: '#B45309' }}
              >
                Share a fresh price &rarr;
              </Link>
            </p>
          </div>
        )}

        {communityData.length > 0 ? (
          <div className="flex flex-col gap-4">
            {communityData.map((procedure, index) => (
              <div key={procedure.id} className="relative">
                <ProcedureCard procedure={procedure} index={index} />

                {user && isProviderOwner && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDisputeTarget(procedure);
                    }}
                    className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 text-xs text-text-secondary bg-white/90 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-rose-accent transition-colors z-10"
                    title="Flag this price"
                  >
                    <Flag size={12} />
                    Flag
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="glow-card p-6 text-center">
            <p className="text-text-secondary text-sm">
              No community prices yet for this provider.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

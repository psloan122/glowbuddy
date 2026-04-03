import { Flag, ShieldCheck, Users } from 'lucide-react';
import ProcedureCard from '../ProcedureCard';

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
        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
          <ShieldCheck size={20} className="text-verified" />
          Provider&apos;s Listed Prices
        </h2>

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
      </div>

      {/* Right column: Community Prices */}
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
          <Users size={20} className="text-community" />
          What Patients Actually Paid
        </h2>

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

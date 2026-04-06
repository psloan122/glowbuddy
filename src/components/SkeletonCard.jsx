const shimmerStyle = {
  background: 'linear-gradient(90deg, #F3F4F6 0px, #E5E7EB 40px, #F3F4F6 80px)',
  backgroundSize: '300px 100%',
  animation: 'shimmer 1.5s infinite',
};

function Bar({ width = '100%', height = 12, className = '' }) {
  return (
    <div
      className={`rounded ${className}`}
      style={{ ...shimmerStyle, width, height }}
    />
  );
}

/**
 * Skeleton loading card that mimics a ProcedureCard.
 * Uses shimmer animation instead of spinners.
 */
export default function SkeletonCard() {
  return (
    <div className="glow-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          <Bar width="60%" height={14} />
          <Bar width="40%" height={10} />
          <Bar width="80%" height={10} />
        </div>
        <div className="shrink-0">
          <Bar width={64} height={28} />
          <Bar width={40} height={8} className="mt-1.5 ml-auto" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Bar width={60} height={18} />
        <Bar width={70} height={18} />
      </div>
    </div>
  );
}

/**
 * Grid of skeleton cards for feed loading states.
 */
export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

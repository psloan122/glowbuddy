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

export function SectionSkeleton({ lines = 3, title = true }) {
  return (
    <div className="glow-card p-5">
      {title && <Bar width="40%" height={16} className="mb-4" />}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Bar key={i} width={`${80 - i * 10}%`} height={12} />
        ))}
      </div>
    </div>
  );
}

export function AlertSkeleton() {
  return (
    <div className="glow-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <Bar width="50%" height={14} />
          <Bar width="30%" height={10} />
        </div>
        <Bar width={44} height={24} />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glow-card p-4">
          <div className="space-y-2.5">
            <Bar width="60%" height={14} />
            <Bar width="40%" height={10} />
            <Bar width="80%" height={10} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Bar width={60} height={18} />
            <Bar width={70} height={18} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="glow-card p-5">
      <Bar width="50%" height={16} className="mb-4" />
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center space-y-2">
            <Bar width="60%" height={24} className="mx-auto" />
            <Bar width="80%" height={10} className="mx-auto" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Bar width="90%" height={10} />
        <Bar width="70%" height={10} />
      </div>
    </div>
  );
}

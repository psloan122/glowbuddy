import { useRef, useState, useEffect } from 'react';
import useCountUp from '../hooks/useCountUp';

function AnimatedStat({ label, rawValue, prefix = '', decimals = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const intTarget = decimals > 0 ? Math.floor(rawValue) : rawValue;
  const animated = useCountUp(intTarget, { enabled: visible });

  let display;
  if (decimals > 0 && visible) {
    display = animated >= intTarget
      ? `${prefix}${rawValue.toFixed(decimals)}`
      : `${prefix}${animated.toLocaleString()}`;
  } else {
    display = `${prefix}${animated.toLocaleString()}`;
  }

  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      <span className="text-xs uppercase tracking-wide text-text-secondary mb-1">
        {label}
      </span>
      <span className="text-2xl font-bold text-text-primary tabular-nums">
        {display}
      </span>
    </div>
  );
}

export default function PriceStatsBar({ stats, city, localCount }) {
  return (
    <div className="bg-rose-light/50 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-around gap-4">
        <AnimatedStat
          label="Total Submissions"
          rawValue={stats.totalSubmissions}
        />
        <AnimatedStat
          label="Avg Botox / Unit"
          rawValue={stats.avgBotoxUnit}
          prefix="$"
          decimals={2}
        />
        <AnimatedStat
          label="Avg Lip Filler"
          rawValue={stats.avgLipFiller}
          prefix="$"
        />
        {city && localCount != null && (
          <AnimatedStat
            label={`Near ${city}`}
            rawValue={localCount}
          />
        )}
      </div>
    </div>
  );
}

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
      <span className="text-[11px] tracking-[0.5px] text-text-secondary/70 mb-1">
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
    <div
      className="bg-rose-light/50 rounded-xl p-4"
      style={{ borderTop: '0.5px solid rgba(201, 79, 120, 0.15)' }}
    >
      <div className="flex flex-wrap items-center justify-around gap-4">
        <AnimatedStat
          label="total submissions"
          rawValue={stats.totalSubmissions}
        />
        <AnimatedStat
          label="avg botox / unit"
          rawValue={stats.avgBotoxUnit}
          prefix="$"
          decimals={2}
        />
        <AnimatedStat
          label="avg lip filler"
          rawValue={stats.avgLipFiller}
          prefix="$"
        />
        <AnimatedStat
          label="avg RF microneedling"
          rawValue={stats.avgRfMicroneedling || 400}
          prefix="$"
        />
        {city && localCount != null && (
          <AnimatedStat
            label={`near ${city}`}
            rawValue={localCount}
          />
        )}
      </div>
    </div>
  );
}

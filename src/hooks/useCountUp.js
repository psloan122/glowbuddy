import { useState, useEffect, useRef, useCallback } from 'react';

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

export default function useCountUp(target, { duration = 1200, enabled = true } = {}) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  const animate = useCallback(() => {
    if (!startTimeRef.current) startTimeRef.current = performance.now();

    const elapsed = performance.now() - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutQuart(progress);

    setCurrent(Math.round(easedProgress * target));

    if (progress < 1) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [target, duration]);

  useEffect(() => {
    if (!enabled || target === 0) {
      setCurrent(enabled ? 0 : target);
      return;
    }

    startTimeRef.current = null;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, enabled, animate]);

  return current;
}

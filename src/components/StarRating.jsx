import { useState } from 'react';
import { Star } from 'lucide-react';

const LABELS = ['', 'Poor', 'Below average', 'Average', 'Good', 'Excellent'];

export default function StarRating({
  value = 0,
  onChange,
  size = 20,
  readOnly = false,
  showLabel = false,
}) {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value;

  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readOnly && setHoverValue(star)}
            onMouseLeave={() => !readOnly && setHoverValue(0)}
            className={`transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={
                star <= displayValue
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-300'
              }
            />
          </button>
        ))}
      </div>
      {showLabel && displayValue > 0 && (
        <span className="text-sm text-text-secondary ml-1.5">
          {LABELS[displayValue]}
        </span>
      )}
    </div>
  );
}

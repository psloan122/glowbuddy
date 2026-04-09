import { Link } from 'react-router-dom';
import { MapPin, Plus } from 'lucide-react';

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardHeader({ displayName, email, city, state }) {
  const firstName = displayName
    ? displayName.split(' ')[0]
    : 'there';

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-[24px] font-medium text-text-primary leading-tight">
          {getGreeting()}, {firstName}
        </h1>
        {city && state ? (
          <Link
            to="/browse"
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-rose-accent transition-colors mt-1"
          >
            <MapPin size={14} />
            {city}, {state}
            <span className="text-xs ml-0.5">&#9998;</span>
          </Link>
        ) : (
          <Link
            to="/browse"
            className="inline-flex items-center gap-1 text-sm text-rose-accent hover:text-rose-dark transition-colors mt-1"
          >
            <MapPin size={14} />
            Set your location
          </Link>
        )}
      </div>

      <Link
        to="/log"
        className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white hover:opacity-90 transition"
        style={{ backgroundColor: '#C94F78' }}
      >
        <Plus size={16} />
        Share what you paid
      </Link>
    </div>
  );
}

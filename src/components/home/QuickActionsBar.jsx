import { Link } from 'react-router-dom';
import { PlusCircle, Bell, BarChart3, UserPlus } from 'lucide-react';

const ACTIONS = [
  { to: '/log', icon: PlusCircle, label: 'Log a price' },
  { to: '/alerts', icon: Bell, label: 'Set alert' },
  { to: '/prices', icon: BarChart3, label: 'City report' },
  { to: '/refer', icon: UserPlus, label: 'Invite friend' },
];

export default function QuickActionsBar() {
  return (
    <>
      {/* Desktop: inline pill row */}
      <div className="hidden lg:flex items-center gap-2">
        {ACTIONS.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-text-primary hover:border-rose-accent hover:text-rose-accent transition-colors"
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </div>

      {/* Mobile: fixed bottom bar */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around px-2 h-14">
          {ACTIONS.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] text-[#9CA3AF] hover:text-[#C94F78] transition-colors"
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

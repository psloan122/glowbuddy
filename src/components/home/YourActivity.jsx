import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { StatsSkeleton } from './DashboardSkeleton';
import { getProcedureLabel } from '../../lib/procedureLabel';

export default function YourActivity({ activity, loading }) {
  if (loading) return <StatsSkeleton />;

  const { pricesShared = 0, savedVsAvg = 0, isPioneer = false, recentSubmissions = [] } = activity || {};

  const savedPositive = savedVsAvg >= 0;

  return (
    <div className="glow-card p-5">
      <h2 className="text-lg font-bold text-text-primary mb-4">Your Know Before You Glow Activity</h2>

      {/* 3-column stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-xl font-bold text-text-primary">{pricesShared}</p>
          <p className="text-[11px] text-text-secondary">Prices shared</p>
        </div>
        <div className="text-center">
          <p className={`text-xl font-bold ${savedPositive ? 'text-verified' : 'text-amber-600'}`}>
            {savedPositive ? '↓' : '↑'} ${Math.abs(savedVsAvg).toLocaleString()}
          </p>
          <p className="text-[11px] text-text-secondary">
            {savedPositive ? 'Saved vs avg' : 'Above avg'}
          </p>
        </div>
        <div className="text-center">
          {isPioneer ? (
            <>
              <p className="text-xl">&#127941;</p>
              <p className="text-[11px] text-text-secondary font-medium">Pioneer</p>
            </>
          ) : (
            <>
              <p className="text-xl text-text-secondary/40">&#127941;</p>
              <p className="text-[11px] text-text-secondary">Not yet</p>
              <Link to="/rewards" className="text-[10px] text-rose-accent hover:text-rose-dark">
                How to earn &rarr;
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Recent timeline */}
      {recentSubmissions.length > 0 ? (
        <div className="border-t border-gray-50 pt-3 space-y-2">
          {recentSubmissions.slice(0, 5).map((s) => (
            <div key={s.id} className="flex items-center justify-between text-xs">
              <span className="text-text-primary font-medium truncate flex-1">
                {getProcedureLabel(s.procedure_type, s.brand)}
              </span>
              <span className="text-text-secondary shrink-0 ml-2">
                ${Number(s.price_paid).toLocaleString()}
              </span>
              <span className="text-text-secondary/60 shrink-0 ml-2 w-20 text-right">
                {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-t border-gray-50 pt-3 text-center">
          <p className="text-sm text-text-secondary mb-2">Share your first price to start tracking</p>
          <Link
            to="/log"
            className="text-sm font-semibold text-rose-accent hover:text-rose-dark transition-colors"
          >
            Share what you paid &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

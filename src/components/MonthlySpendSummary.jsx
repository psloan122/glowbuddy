import { DollarSign, TrendingUp, Calendar } from "lucide-react";

export default function MonthlySpendSummary({ entries = [] }) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const oneYearAgo = new Date(now);
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);

  const thisMonthSpend = entries.reduce((sum, entry) => {
    const d = new Date(entry.date_received);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      return sum + (Number(entry.price_paid) || 0);
    }
    return sum;
  }, 0);

  const last12Months = entries.reduce((sum, entry) => {
    const d = new Date(entry.date_received);
    if (d >= oneYearAgo && d <= now) {
      return sum + (Number(entry.price_paid) || 0);
    }
    return sum;
  }, 0);

  const avgPerMonth = Math.round(last12Months / 12);

  const stats = [
    {
      label: "This Month",
      value: thisMonthSpend,
      icon: Calendar,
    },
    {
      label: "Last 12 Months",
      value: last12Months,
      icon: TrendingUp,
    },
    {
      label: "Avg / Month",
      value: avgPerMonth,
      icon: DollarSign,
    },
  ];

  return (
    <div className="glow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="text-rose-accent" size={20} />
        <h3 className="font-semibold text-lg">Your Routine</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-warm-gray rounded-xl p-3 flex flex-col gap-1"
            >
              <Icon className="text-rose-accent" size={16} />
              <span className="font-bold text-lg">${stat.value.toLocaleString()}</span>
              <span className="text-xs text-text-secondary">{stat.label}</span>
            </div>
          );
        })}
      </div>

      <p className="text-sm italic text-text-secondary mt-4">
        Your routine costs ~${avgPerMonth.toLocaleString()}/month
      </p>
    </div>
  );
}

import { Bell } from "lucide-react";

export default function AlertMatchBadge({ procedureType, price, userAlerts, city, state }) {
  if (!userAlerts || userAlerts.length === 0) return null;

  const match = userAlerts.find(
    (alert) =>
      alert.is_active &&
      alert.procedure_type === procedureType &&
      price <= alert.max_price &&
      (!alert.city || alert.city === city) &&
      (!alert.state || alert.state === state)
  );

  if (!match) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <Bell size={10} />
      Matches your alert!
    </span>
  );
}

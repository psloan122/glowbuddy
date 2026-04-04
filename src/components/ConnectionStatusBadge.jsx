import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function ConnectionStatusBadge({ status }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">
        <CheckCircle size={12} />
        Connected
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">
        <AlertTriangle size={12} />
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-text-secondary">
      <Clock size={12} />
      Not Connected
    </span>
  );
}

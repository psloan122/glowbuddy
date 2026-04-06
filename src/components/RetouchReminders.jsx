import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';

export default function RetouchReminders() {
  const { user } = useContext(AuthContext);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    if (!user) return;

    async function fetchReminders() {
      const { data } = await supabase
        .from('treatment_log')
        .select('treatment_name, next_recommended_date, date_received')
        .eq('user_id', user.id)
        .not('next_recommended_date', 'is', null)
        .order('next_recommended_date', { ascending: true });

      if (!data || data.length === 0) return;

      // Group by treatment_name, keeping the most recent entry per treatment
      const latestByTreatment = new Map();
      for (const entry of data) {
        const existing = latestByTreatment.get(entry.treatment_name);
        if (
          !existing ||
          new Date(entry.date_received) > new Date(existing.date_received)
        ) {
          latestByTreatment.set(entry.treatment_name, entry);
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const processed = [];
      for (const [treatmentName, entry] of latestByTreatment) {
        const dueDate = new Date(entry.next_recommended_date);
        dueDate.setHours(0, 0, 0, 0);
        const diffMs = dueDate - today;
        const daysUntilDue = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) {
          processed.push({
            treatmentName,
            daysUntilDue,
            status: 'OVERDUE',
          });
        } else if (daysUntilDue <= 21) {
          processed.push({
            treatmentName,
            daysUntilDue,
            status: 'DUE_SOON',
          });
        }
      }

      // Sort: overdue first, then due soonest
      processed.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      setReminders(processed);
    }

    fetchReminders();
  }, [user?.id]);

  if (!user) return null;
  if (reminders.length === 0) return null;

  function getStatusText(reminder) {
    if (reminder.status === 'OVERDUE') {
      const overdueDays = Math.abs(reminder.daysUntilDue);
      return `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`;
    }

    const days = reminder.daysUntilDue;
    if (days >= 14) {
      const weeks = Math.round(days / 7);
      return `Due in ${weeks} week${weeks !== 1 ? 's' : ''}`;
    }
    return `Due in ${days} day${days !== 1 ? 's' : ''}`;
  }

  return (
    <div className="glow-card p-4 mb-4">
      <h3 className="font-semibold text-sm mb-3">Retouch Reminders</h3>
      <div className="space-y-2">
        {reminders.map((reminder) => (
          <Link
            key={reminder.treatmentName}
            to="/my-treatments"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {reminder.status === 'OVERDUE' ? (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {reminder.treatmentName}
              </p>
              <p
                className={`text-xs ${
                  reminder.status === 'OVERDUE'
                    ? 'text-red-600'
                    : 'text-amber-600'
                }`}
              >
                {getStatusText(reminder)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

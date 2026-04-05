import { Link } from 'react-router-dom';
import { Briefcase, Sparkles, CalendarDays, MessageCircle } from 'lucide-react';

const TYPE_CONFIG = {
  moved: { icon: Briefcase, bg: '#FEF3C7', color: '#92400E', cta: 'See new location' },
  special: { icon: Sparkles, bg: '#E0F2FE', color: '#0369A1', cta: 'View Special' },
  availability: { icon: CalendarDays, bg: '#D1FAE5', color: '#065F46', cta: 'Book' },
  announcement: { icon: MessageCircle, bg: '#F3F4F6', color: '#6B7280', cta: null },
};

export default function InjectorUpdateCard({ update, injector }) {
  const config = TYPE_CONFIG[update.update_type] || TYPE_CONFIG.announcement;
  const Icon = config.icon;
  const displayName = injector?.display_name || injector?.name || 'Injector';

  const linkTo = update.update_type === 'moved' && update.provider_id
    ? `/provider/${update.provider_id}`
    : injector?.slug ? `/injectors/${injector.slug}` : '#';

  return (
    <div className="glow-card p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: config.bg }}>
          <Icon size={14} style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary">
            <span className="font-semibold">{displayName}</span>{' '}{update.title}
          </p>
          {update.body && <p className="text-sm text-text-secondary mt-1">{update.body}</p>}
          {config.cta && (
            <Link to={linkTo} className="inline-block mt-2 text-sm font-medium transition" style={{ color: config.color }}>
              {config.cta} &rarr;
            </Link>
          )}
          <p className="text-[10px] text-text-secondary mt-1.5">{new Date(update.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

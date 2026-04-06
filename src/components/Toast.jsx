import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const STYLES = {
  success: {
    bg: '#E1F5EE',
    border: '#A7F3D0',
    icon: '#0F6E56',
    text: '#065F46',
    Icon: CheckCircle,
  },
  error: {
    bg: '#FEE2E2',
    border: '#FECACA',
    icon: '#DC2626',
    text: '#991B1B',
    Icon: AlertCircle,
  },
  info: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    icon: '#2563EB',
    text: '#1E40AF',
    Icon: Info,
  },
};

export default function Toast({ message, type = 'success', onClose, duration = 5000 }) {
  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const style = STYLES[type] || STYLES.info;
  const { Icon } = style;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
      <div
        className="flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg max-w-md"
        style={{ backgroundColor: style.bg, border: `1px solid ${style.border}` }}
      >
        <Icon size={18} style={{ color: style.icon }} className="shrink-0" />
        <p className="text-sm font-medium" style={{ color: style.text }}>
          {message}
        </p>
        <button
          onClick={onClose}
          className="shrink-0 ml-1 opacity-60 hover:opacity-100 transition"
          style={{ color: style.text }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

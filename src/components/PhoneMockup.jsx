import ProcedureIcon from './ProcedureIcon';
import ProviderAvatar from './ProviderAvatar';

const MOCK_CARDS = [
  { type: 'Botox', label: 'Botox', price: '$12/unit', provider: 'Dr. Kim' },
  { type: 'Lip Filler', label: 'Lip Filler', price: '$650', provider: 'SkinRx Med Spa' },
  { type: 'Hydrafacial', label: 'HydraFacial', price: '$189', provider: 'Glow Studio' },
  { type: 'Chemical Peel', label: 'Chemical Peel', price: '$150', provider: 'Dr. Patel' },
  { type: 'Microneedling', label: 'Microneedling', price: '$325', provider: 'Radiance Clinic' },
  { type: 'Cheek Filler', label: 'Cheek Filler', price: '$750', provider: 'Dr. Chen' },
];

function MiniCard({ type, label, price, provider }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-gray-100">
      <ProcedureIcon type={type} size={20} className="text-rose-dark flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-primary truncate">{label}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <ProviderAvatar name={provider} size={14} />
          <span className="text-[10px] text-text-secondary truncate">{provider}</span>
        </div>
      </div>
      <span className="text-sm font-bold text-rose-dark whitespace-nowrap">{price}</span>
    </div>
  );
}

export default function PhoneMockup() {
  return (
    <div
      className="relative mx-auto bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl"
      style={{ width: 260, aspectRatio: '9 / 19.5' }}
    >
      {/* Notch */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-b-2xl z-10" />

      {/* Screen */}
      <div className="relative h-full bg-warm-white rounded-[2rem] overflow-hidden">
        {/* Status bar filler */}
        <div className="h-8" />

        {/* Screen header */}
        <div className="px-4 pb-2">
          <p className="text-[10px] font-bold text-text-primary tracking-wide">Know Before You Glow</p>
          <p className="text-[8px] text-text-secondary">Recent prices near you</p>
        </div>

        {/* Scrolling cards container */}
        <div className="phone-scroll-container px-3 flex flex-col gap-2">
          {/* Duplicate cards for seamless loop */}
          {[...MOCK_CARDS, ...MOCK_CARDS].map((card, i) => (
            <MiniCard key={i} {...card} />
          ))}
        </div>
      </div>
    </div>
  );
}

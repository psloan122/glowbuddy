export default function PriceStatsBar({ stats }) {
  const items = [
    {
      label: 'Total Submissions',
      value: Number(stats.totalSubmissions).toLocaleString(),
    },
    {
      label: 'Avg Botox / Unit',
      value: `$${Number(stats.avgBotoxUnit).toFixed(2)}`,
    },
    {
      label: 'Avg Lip Filler',
      value: `$${Number(stats.avgLipFiller).toLocaleString()}`,
    },
  ];

  return (
    <div className="bg-rose-light/50 rounded-xl p-4">
      <div className="flex items-center justify-around gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center text-center">
            <span className="text-xs uppercase tracking-wide text-text-secondary mb-1">
              {item.label}
            </span>
            <span className="text-2xl font-bold text-text-primary">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { providerProfileUrl } from '../../lib/slugify';

export default function AffordableProviderCard({ provider }) {
  const { name, avgPrice, count, verified, slug, city, state } = provider;
  const href = providerProfileUrl(slug, name, city, state);

  const content = (
    <div className="glow-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-text-primary text-sm leading-tight">{name}</h4>
        {verified && (
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-verified bg-verified/10 px-1.5 py-0.5 rounded-full shrink-0 ml-2">
            <ShieldCheck size={12} />
            Verified
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-rose-accent">${avgPrice.toLocaleString()}</p>
      <p className="text-xs text-text-secondary mt-1">{count} submission{count !== 1 ? 's' : ''}</p>
    </div>
  );

  if (href) {
    return <Link to={href} className="block hover:no-underline">{content}</Link>;
  }

  return content;
}

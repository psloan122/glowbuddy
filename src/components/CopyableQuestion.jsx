import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyableQuestion({ question }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(question);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="glow-card w-full text-left px-4 py-3 flex items-center justify-between gap-3 group hover:border-sky-200 transition"
    >
      <span className="text-sm text-text-primary">{question}</span>
      <span className="shrink-0 text-text-secondary group-hover:text-sky-700 transition">
        {copied ? <Check size={16} className="text-sky-700" /> : <Copy size={16} />}
      </span>
    </button>
  );
}

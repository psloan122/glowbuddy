import { useState, useEffect } from 'react';
import { getBalance } from '../lib/creditLogic';

export default function CreditBalance({ userId }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    getBalance(userId).then(({ balance: b }) => {
      setBalance(b);
      setLoading(false);
    });
  }, [userId]);

  if (loading || balance === null || balance === 0) return null;

  const dollarValue = (balance / 100).toFixed(2);

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: '#FEF3C7', color: '#92400E' }}
    >
      <span style={{ color: '#D97706' }}>&#10022;</span>
      {balance.toLocaleString()} credits &middot; ${dollarValue}
    </span>
  );
}

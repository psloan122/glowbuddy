import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SavingsCalculator from '../components/SavingsCalculator';

export default function Calculator() {
  useEffect(() => {
    document.title = 'Savings Calculator | GlowBuddy';
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          How much could you save?
        </h1>
        <p className="text-text-secondary">
          Compare your prices to real data from patients in your city.
        </p>
      </div>

      <SavingsCalculator variant="full" />

      <div className="text-center mt-8">
        <p className="text-sm text-text-secondary mb-3">
          Powered by crowdsourced prices from real patients.
        </p>
        <Link
          to="/browse"
          className="text-sm font-medium text-rose-accent hover:text-rose-dark transition-colors"
        >
          Find all prices &rarr;
        </Link>
      </div>
    </div>
  );
}

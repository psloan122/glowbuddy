import { Link } from 'react-router-dom';
import { Share2, ArrowRight } from 'lucide-react';
import { procedureToSlug } from '../lib/constants';

export default function PriceReportCard({ submission, stateAvg, nationalAvg }) {
  const price = Number(submission.price);
  const procedureSlug = procedureToSlug(submission.procedure_type);

  let stateComparison = null;
  if (stateAvg != null && stateAvg > 0) {
    const diff = ((price - stateAvg) / stateAvg) * 100;
    const absDiff = Math.abs(diff).toFixed(0);
    const isAbove = diff > 0;
    stateComparison = {
      text: `${absDiff}% ${isAbove ? 'above' : 'below'} average in ${submission.state}`,
      isAbove,
    };
  }

  function handleShare() {
    alert('Screenshot to share!');
  }

  return (
    <div
      id="price-report"
      className="bg-gradient-to-br from-rose-light to-white rounded-2xl p-6 border border-rose-accent/20"
    >
      <h3 className="text-lg font-bold text-text-primary mb-4">
        Your Price Report
      </h3>

      <p className="text-sm text-text-primary mb-3">
        You paid{' '}
        <span className="font-bold text-lg">
          ${price.toLocaleString()}
        </span>{' '}
        for{' '}
        <span className="font-semibold">{submission.procedure_type}</span>
        {submission.city && ` in ${submission.city}`}
      </p>

      {stateComparison && (
        <p
          className={`text-sm font-medium mb-2 ${
            stateComparison.isAbove ? 'text-red-500' : 'text-verified'
          }`}
        >
          {stateComparison.text}
        </p>
      )}

      {nationalAvg != null && nationalAvg > 0 && (
        <p className="text-sm text-text-secondary mb-4">
          National average:{' '}
          <span className="font-semibold">
            ${Number(nationalAvg).toLocaleString()}
          </span>
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button
          onClick={handleShare}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors text-sm"
        >
          <Share2 size={16} />
          Share your report
        </button>

        <Link
          to={`/procedure/${procedureSlug}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          See all {submission.procedure_type} prices near you
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

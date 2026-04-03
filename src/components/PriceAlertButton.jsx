import { useState } from 'react';
import { Bell } from 'lucide-react';
import PriceAlertModal from './PriceAlertModal';

export default function PriceAlertButton({ procedureType, city, state }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-text-primary text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
      >
        <Bell size={14} />
        Set Price Alert
      </button>
      {showModal && (
        <PriceAlertModal
          onClose={() => setShowModal(false)}
          defaultProcedure={procedureType}
          defaultCity={city}
          defaultState={state}
        />
      )}
    </>
  );
}

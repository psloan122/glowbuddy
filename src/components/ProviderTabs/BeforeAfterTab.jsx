import { useState } from 'react';
import { Link } from 'react-router-dom';
import BeforeAfterCard from '../BeforeAfterCard';
import { PROCEDURE_TYPES } from '../../lib/constants';

const PAGE_SIZE = 12;

export default function BeforeAfterTab({
  photos,
  injectors,
  provider,
  isProviderOwner,
}) {
  const [filterProcedure, setFilterProcedure] = useState('');
  const [filterInjector, setFilterInjector] = useState('');
  const [filterUploader, setFilterUploader] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Apply filters
  let filtered = photos;
  if (filterProcedure) {
    filtered = filtered.filter((p) => p.procedure_type === filterProcedure);
  }
  if (filterInjector) {
    filtered = filtered.filter((p) => p.injector_id === filterInjector);
  }
  if (filterUploader) {
    filtered = filtered.filter((p) => p.uploaded_by === filterUploader);
  }

  const visible = filtered.slice(0, visibleCount);

  // Get unique procedure types from photos
  const procedureTypes = [
    ...new Set(photos.map((p) => p.procedure_type).filter(Boolean)),
  ];

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterProcedure}
          onChange={(e) => {
            setFilterProcedure(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-text-primary focus:border-rose-accent outline-none transition"
        >
          <option value="">All Procedures</option>
          {procedureTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        {injectors.length > 1 && (
          <select
            value={filterInjector}
            onChange={(e) => {
              setFilterInjector(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-text-primary focus:border-rose-accent outline-none transition"
          >
            <option value="">All Injectors</option>
            {injectors.map((inj) => (
              <option key={inj.id} value={inj.id}>
                {inj.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={filterUploader}
          onChange={(e) => {
            setFilterUploader(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-text-primary focus:border-rose-accent outline-none transition"
        >
          <option value="">All Sources</option>
          <option value="provider">Provider</option>
          <option value="patient">Patient</option>
        </select>
      </div>

      {/* Grid */}
      {visible.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((photo) => (
              <BeforeAfterCard key={photo.id} photo={photo} />
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div className="text-center mt-6">
              <button
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-6 py-2.5 border border-gray-200 text-text-primary text-sm font-medium rounded-xl hover:bg-gray-50 transition"
              >
                Load more
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="glow-card p-8 text-center">
          <p className="text-text-secondary mb-3">
            No before & after photos yet.
          </p>
          {isProviderOwner ? (
            <Link
              to="/business/dashboard"
              className="text-rose-accent font-medium hover:text-rose-dark transition"
            >
              Upload photos from your dashboard
            </Link>
          ) : provider && !provider.is_claimed ? (
            <Link
              to="/business/claim"
              className="text-rose-accent font-medium hover:text-rose-dark transition"
            >
              Claim this listing to upload photos
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

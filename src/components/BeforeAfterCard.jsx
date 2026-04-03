export default function BeforeAfterCard({ photo, onClick }) {
  return (
    <div
      onClick={() => onClick?.(photo)}
      className="glow-card overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Side-by-side images */}
      <div className="grid grid-cols-2 gap-0.5">
        <div className="relative">
          <img
            src={photo.before_url}
            alt="Before"
            className="w-full h-40 object-cover"
          />
          <span className="absolute bottom-1 left-1 text-[10px] font-medium bg-black/50 text-white px-1.5 py-0.5 rounded">
            Before
          </span>
        </div>
        <div className="relative">
          <img
            src={photo.after_url}
            alt="After"
            className="w-full h-40 object-cover"
          />
          <span className="absolute bottom-1 left-1 text-[10px] font-medium bg-black/50 text-white px-1.5 py-0.5 rounded">
            After
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {photo.procedure_type && (
            <span className="text-xs bg-rose-light text-rose-dark px-2 py-0.5 rounded-full">
              {photo.procedure_type}
            </span>
          )}
          {photo.treatment_area && (
            <span className="text-xs bg-warm-gray text-text-secondary px-2 py-0.5 rounded-full">
              {photo.treatment_area}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          {photo.injectors?.name && (
            <p className="text-xs text-text-secondary">
              By {photo.injectors.name}
            </p>
          )}
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              photo.uploaded_by === 'provider'
                ? 'bg-verified/10 text-verified'
                : 'bg-blue-50 text-blue-600'
            }`}
          >
            {photo.uploaded_by === 'provider' ? 'Provider' : 'Patient'}
          </span>
        </div>

        {photo.caption && (
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">
            {photo.caption}
          </p>
        )}
      </div>
    </div>
  );
}

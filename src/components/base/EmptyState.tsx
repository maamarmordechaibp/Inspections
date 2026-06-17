interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Consistent empty-state placeholder used across list and detail views.
 */
export default function EmptyState({
  icon = 'ri-inbox-line',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}
      role="status"
    >
      <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-4">
        <i className={`${icon} text-2xl text-gray-300`} aria-hidden="true"></i>
      </div>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-1 max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-navy text-white text-sm font-semibold transition-all hover:bg-brand-navy/90 cursor-pointer whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

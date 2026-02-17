'use client';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-6xl">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 md:text-xl">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-gray-600 md:text-base">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 md:text-base"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

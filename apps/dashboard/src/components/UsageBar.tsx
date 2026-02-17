'use client';

interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
  unit?: string;
}

/**
 * Displays a labeled progress bar showing used / limit quota.
 * Turns orange at 80%, red at 95%.
 */
export default function UsageBar({ label, used, limit, unit = 'messages' }: UsageBarProps) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remaining = Math.max(0, limit - used);

  const barColor =
    pct >= 95
      ? 'bg-red-500'
      : pct >= 80
        ? 'bg-orange-400'
        : 'bg-blue-500';

  const textColor =
    pct >= 95
      ? 'text-red-600'
      : pct >= 80
        ? 'text-orange-500'
        : 'text-gray-600';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`font-semibold ${textColor}`}>
          {used.toLocaleString()} / {limit.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
        />
      </div>
      <p className="text-xs text-gray-400">
        {remaining.toLocaleString()} {unit} remaining ({100 - pct}%)
      </p>
    </div>
  );
}

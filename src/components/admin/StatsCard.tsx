'use client';

interface StatsCardProps {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  trend?: {
    value: number;
    label: string;
  };
}

export default function StatsCard({
  icon: Icon,
  label,
  value,
  sub,
  color = '#6366f1',
  trend,
}: StatsCardProps) {
  return (
    <div className="card p-5">
      {/* Icon */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Icon size={20} color={color} />
        </div>

        {/* Trend badge */}
        {trend && (
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{
              background: trend.value >= 0
                ? 'rgba(16,185,129,0.1)'
                : 'rgba(239,68,68,0.1)',
              color: trend.value >= 0 ? '#10b981' : '#ef4444',
            }}
          >
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>

      {/* Value */}
      <p
        className="text-3xl font-bold mb-1"
        style={{ color: 'var(--text)' }}
      >
        {value}
      </p>

      {/* Label */}
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </p>

      {/* Sub text */}
      {sub && (
        <p
          className="text-xs mt-1"
          style={{ color: 'var(--text-subtle)' }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
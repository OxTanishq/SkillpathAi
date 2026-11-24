import React from 'react';

export const CircularProgressRing: React.FC<{
  percent: number;
  size?: number;
  label: string;
  sublabel: string;
}> = ({ percent, size = 116, label, sublabel }) => {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-black/10 dark:text-white/10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-lg font-bold tabular-nums">
          {percent}%
        </div>
      </div>
      <div>
        <div className="font-display text-sm font-semibold text-slate-900 dark:text-white">
          {label}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{sublabel}</div>
      </div>
    </div>
  );
};

export const WeeklyActivityBarChart: React.FC<{
  data: Array<{ label: string; minutes: number }>;
}> = ({ data }) => {
  const maxVal = Math.max(30, ...data.map((d) => d.minutes));

  return (
    <div className="space-y-3">
      <div className="flex h-36 items-end gap-2.5 pt-4">
        {data.map((d) => {
          const heightPct = Math.round((d.minutes / maxVal) * 100);
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
              <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400 tabular-nums">
                {d.minutes > 0 ? `${d.minutes}m` : '0'}
              </span>
              <div className="w-full flex-1 flex items-end rounded-lg bg-black/[0.04] dark:bg-white/[0.04] p-0.5">
                <div
                  className="w-full rounded-md bg-gradient-to-t from-[#6366F1] to-[#38BDF8] transition-all duration-500"
                  style={{ height: `${Math.max(d.minutes > 0 ? 10 : 3, heightPct)}%` }}
                  title={`${d.label}: ${d.minutes} minutes`}
                />
              </div>
              <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const StageProgressLineChart: React.FC<{
  stages: Array<{ label: string; completed: number; total: number; percent: number }>;
}> = ({ stages }) => {
  if (stages.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-slate-500 dark:text-zinc-400">
        No stages available yet.
      </div>
    );
  }

  const width = 420;
  const height = 140;
  const padX = 28;
  const padY = 20;
  const stepX = stages.length > 1 ? (width - padX * 2) / (stages.length - 1) : 0;

  const points = stages.map((st, idx) => {
    const x = padX + idx * stepX;
    const y = height - padY - (st.percent / 100) * (height - padY * 2);
    return { x, y, ...st };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 overflow-visible">
        {[0, 50, 100].map((pct) => {
          const y = height - padY - (pct / 100) * (height - padY * 2);
          return (
            <g key={pct}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.08"
              />
              <text
                x={4}
                y={y + 3}
                className="fill-slate-400 dark:fill-zinc-500 font-mono text-[9px]"
              >
                {pct}%
              </text>
            </g>
          );
        })}
        {points.length > 1 && (
          <polyline
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polyline}
          />
        )}
        {points.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="#38BDF8" stroke="#050507" strokeWidth="1.5" />
            <text
              x={p.x}
              y={height - 3}
              textAnchor="middle"
              className="fill-slate-500 dark:fill-zinc-400 font-mono text-[9px]"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export const ActivityHeatmap: React.FC<{
  entries: Array<{ activityDate: string; minutesSpent: number }>;
}> = ({ entries }) => {
  const byDate = new Map<string, number>();
  for (const e of entries) {
    byDate.set(e.activityDate, (byDate.get(e.activityDate) ?? 0) + e.minutesSpent);
  }

  const today = new Date();
  const cells: Array<{ date: string; minutes: number }> = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, minutes: byDate.get(key) ?? 0 });
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => {
          const level =
            cell.minutes === 0
              ? 'bg-black/5 dark:bg-white/5'
              : cell.minutes < 30
                ? 'bg-[#8B5CF6]/30'
                : cell.minutes < 60
                  ? 'bg-[#8B5CF6]/65'
                  : 'bg-[#38BDF8]';
          return (
            <div
              key={cell.date}
              title={`${cell.date}: ${cell.minutes} minutes`}
              className={`aspect-square rounded-md ${level} transition-colors`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
        <span>Last 28 days</span>
        <span>Rest days are healthy &amp; expected</span>
      </div>
    </div>
  );
};

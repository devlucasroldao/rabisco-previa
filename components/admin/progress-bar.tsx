export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-[12px] text-muted">
      <progress
        value={percent}
        max={100}
        aria-label={label}
        className="h-1.5 flex-1 overflow-hidden rounded-full [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-surface [&::-webkit-progress-value]:bg-accent"
      />
      <span className="w-9 text-right tabular-nums">{percent}%</span>
    </div>
  );
}

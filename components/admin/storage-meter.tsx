import {
  meterLabel,
  meterLevel,
  STORAGE_LIMIT_BYTES,
  usagePercent,
} from "@/lib/storage-rules";

const barColor = {
  normal: "bg-muted",
  warning: "bg-amber-500",
  danger: "bg-red-600",
};

// Quanto do 1 GB do bucket já foi usado, com a barra fina embaixo.
export function StorageMeter({ bytes }: { bytes: number }) {
  const percent = usagePercent(bytes);
  const label = meterLabel(bytes);
  return (
    <div className="w-[230px] text-[12px] text-muted">
      <p className="tabular-nums">{label}</p>
      <div
        role="meter"
        aria-label="Armazenamento usado"
        aria-valuemin={0}
        aria-valuemax={STORAGE_LIMIT_BYTES}
        aria-valuenow={bytes}
        aria-valuetext={label}
        className="mt-1 h-1 overflow-hidden rounded-full bg-surface"
      >
        <div
          className={`h-full ${barColor[meterLevel(percent)]}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

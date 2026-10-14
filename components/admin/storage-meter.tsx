import Link from "next/link";
import {
  meterLabel,
  meterLevel,
  meterShortLabel,
  STORAGE_LIMIT_BYTES,
  usagePercent,
} from "@/lib/storage-rules";

// Cor do preenchimento por faixa. Acima de 70% também aparece o texto
// "quase cheio", pra cor não ser o único sinal.
const barColor = {
  normal: "bg-fg-muted",
  warning: "bg-highlight",
  danger: "bg-danger",
};

// Medidor compacto da barra lateral, com o atalho pra limpeza.
export function StorageMeter({ bytes }: { bytes: number }) {
  const percent = usagePercent(bytes);
  const level = meterLevel(percent);
  const label = meterLabel(bytes);
  return (
    <div className="px-3 py-2 text-[12px] text-fg-muted">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-fg">Armazenamento</span>
        <span className="tabular-nums">{meterShortLabel(bytes)}</span>
      </div>
      <div
        role="meter"
        aria-label="Armazenamento usado"
        aria-valuemin={0}
        aria-valuemax={STORAGE_LIMIT_BYTES}
        aria-valuenow={bytes}
        aria-valuetext={label}
        className="mt-1.5 h-1 overflow-hidden rounded-full bg-active"
      >
        <div
          className={`h-full rounded-full ${barColor[level]}`}
          style={{ width: `${Math.max(1, Math.min(100, percent))}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {level !== "normal" && (
          <span className={level === "danger" ? "font-semibold text-danger" : "font-semibold text-fg"}>
            {level === "danger" ? "Quase cheio" : "Acima de 70%"}
          </span>
        )}
        <Link
          href="/admin/armazenamento"
          className="ml-auto rounded-sm text-accent hover:underline"
        >
          Liberar espaço
        </Link>
      </div>
    </div>
  );
}

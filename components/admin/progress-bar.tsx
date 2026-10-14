// Barra de progresso real (envio e compressão). Anima só com transform, pra
// não engasgar em celular de entrada; com movimento reduzido, só pula.
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.min(1, Math.max(0, value));
  const percent = Math.round(clamped * 100);
  return (
    <div className="flex items-center gap-2 text-[12px] text-fg-muted">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-active"
      >
        <div
          className="admin-progress-fill h-full origin-left rounded-full bg-accent"
          style={{ transform: `scaleX(${clamped})` }}
        />
      </div>
      <span className="w-9 text-right tabular-nums">{percent}%</span>
    </div>
  );
}

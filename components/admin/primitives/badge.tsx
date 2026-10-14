import { AlertTriangle, CircleCheck, CircleSlash, Clock } from "lucide-react";

type Tone = "neutral" | "warning" | "success" | "danger";

const tones: Record<Tone, string> = {
  neutral: "border-border bg-bg-subtle text-fg-muted",
  warning: "border-transparent bg-highlight-subtle text-highlight-fg",
  success: "border-transparent bg-success-subtle text-success",
  danger: "border-transparent bg-danger-subtle text-danger",
};

const icons: Record<Tone, React.ReactNode> = {
  neutral: <Clock size={12} aria-hidden="true" />,
  warning: <AlertTriangle size={12} aria-hidden="true" />,
  success: <CircleCheck size={12} aria-hidden="true" />,
  danger: <CircleSlash size={12} aria-hidden="true" />,
};

// Selo com ícone e texto: a cor nunca é o único sinal.
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[12px] font-semibold ${tones[tone]}`}
    >
      {icons[tone]}
      {children}
    </span>
  );
}

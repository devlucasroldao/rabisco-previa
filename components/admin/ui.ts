// Classes compartilhadas pelos formulários do painel. As cores vêm dos tokens
// de app/admin/theme.css; nada de valor de cor solto aqui.

export const labelClass = "block text-[13px] font-semibold text-fg";

export const inputClass =
  "mt-1 min-h-10 w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-[14px] text-fg placeholder:text-fg-muted transition-colors duration-(--dur-fast) hover:border-fg-muted focus-visible:border-accent disabled:opacity-60";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md text-[14px] font-semibold whitespace-nowrap transition-colors duration-(--dur-fast) disabled:cursor-default disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-accent px-4 text-accent-fg hover:bg-accent-hover",
  secondary: "border border-border bg-bg px-3 text-fg hover:bg-hover",
  ghost: "px-3 text-fg hover:bg-hover",
  // Destrutivo fora do dialog: contornado, com ícone. O sólido fica só no
  // botão de confirmar dentro do dialog (dangerSolidButtonClass).
  danger: "border border-border bg-bg px-3 text-danger hover:bg-danger-subtle",
};

export function buttonClass(variant: Variant = "secondary"): string {
  return `${base} ${variants[variant]}`;
}

export const dangerSolidButtonClass = `${base} bg-danger px-4 text-(--danger-fg) hover:opacity-90`;

export const iconButtonClass =
  "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted transition-colors duration-(--dur-fast) hover:bg-hover hover:text-fg disabled:cursor-default disabled:opacity-60";

export const primaryButtonClass = buttonClass("primary");
export const secondaryButtonClass = buttonClass("secondary");

export const errorClass = "text-[13px] text-danger";

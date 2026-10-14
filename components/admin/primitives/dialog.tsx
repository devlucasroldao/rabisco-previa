"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { iconButtonClass } from "../ui";

type Variant = "dialog" | "sheet" | "panel";

const shapes: Record<Variant, string> = {
  dialog:
    "admin-dialog w-[min(460px,calc(100vw-32px))] rounded-lg border border-border bg-bg shadow-md",
  // Gaveta da esquerda (menu no celular).
  sheet:
    "admin-sheet m-0 h-dvh max-h-dvh w-[288px] max-w-[85vw] border-r border-border bg-sidebar",
  // Painel da direita (editar cliente, novo post).
  panel:
    "admin-panel m-0 ml-auto h-dvh max-h-dvh w-[min(600px,100vw)] max-w-full border-l border-border bg-bg shadow-md",
};

// <dialog> nativo: o navegador prende o foco, fecha com Esc e desenha o
// backdrop. A animação de entrada e saída é CSS (theme.css), desligada com
// prefers-reduced-motion.
export function Dialog({
  open,
  onClose,
  title,
  description,
  variant = "dialog",
  dismissible = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  variant?: Variant;
  // false enquanto algo está em andamento (envio, exclusão): Esc e clique
  // fora não fecham.
  dismissible?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // O foco volta pra quem abriu.
  function onDialogClose() {
    if (opener.current instanceof HTMLElement && opener.current.isConnected) {
      opener.current.focus();
    }
    if (open) onClose();
  }

  const headed = variant !== "sheet";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onDialogClose}
      onCancel={(event) => {
        if (!dismissible) event.preventDefault();
      }}
      // Clique no backdrop (fora da caixa) fecha.
      onClick={(event) => {
        if (event.target === event.currentTarget && dismissible) onClose();
      }}
      className={`${shapes[variant]} p-0 text-fg`}
    >
      <div
        className={
          variant === "dialog" ? "p-5" : variant === "panel" ? "flex h-full flex-col" : "flex h-full flex-col"
        }
      >
        <div
          className={
            !headed
              ? "sr-only"
              : variant === "panel"
                ? "flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4"
                : "mb-2 flex items-start justify-between gap-4"
          }
        >
          <div className="min-w-0">
            <h2 id={titleId} className="text-[18px] leading-tight font-semibold">
              {title}
            </h2>
            {description && variant === "panel" && (
              <div id={descriptionId} className="mt-1 text-[13px] text-fg-muted">
                {description}
              </div>
            )}
          </div>
          {headed && (
            <button
              type="button"
              onClick={onClose}
              disabled={!dismissible}
              aria-label="Fechar"
              className={`${iconButtonClass} -mt-2 -mr-2`}
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        {description && variant === "dialog" && (
          <div id={descriptionId} className="mb-4 text-[14px] leading-[1.5] text-fg-muted">
            {description}
          </div>
        )}
        {variant === "panel" ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        ) : (
          children
        )}
      </div>
    </dialog>
  );
}

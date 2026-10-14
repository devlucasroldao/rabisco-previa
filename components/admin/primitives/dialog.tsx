"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { iconButtonClass } from "../ui";

// <dialog> nativo: o navegador prende o foco, fecha com Esc e desenha o
// backdrop. A animação de entrada e saída é CSS (admin-dialog e admin-sheet
// em theme.css), desligada com prefers-reduced-motion.
export function Dialog({
  open,
  onClose,
  title,
  description,
  variant = "dialog",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  // "sheet" é a gaveta lateral (menu no celular, painéis de edição).
  variant?: "dialog" | "sheet";
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
    if (opener.current instanceof HTMLElement) opener.current.focus();
    if (open) onClose();
  }

  const shape =
    variant === "sheet"
      ? "admin-sheet m-0 h-dvh max-h-dvh w-[288px] max-w-[85vw] border-r border-border bg-sidebar"
      : "admin-dialog w-[min(440px,calc(100vw-32px))] rounded-lg border border-border bg-bg shadow-md";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onDialogClose}
      // Clique no backdrop (fora da caixa) fecha.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`${shape} p-0 text-fg`}
    >
      <div className={variant === "sheet" ? "flex h-full flex-col" : "p-5"}>
        <div
          className={
            variant === "sheet"
              ? "sr-only"
              : "mb-2 flex items-start justify-between gap-4"
          }
        >
          <h2 id={titleId} className="text-[18px] leading-tight font-semibold">
            {title}
          </h2>
          {variant === "dialog" && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className={`${iconButtonClass} -mt-2 -mr-2`}
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        {description && (
          <div id={descriptionId} className="mb-4 text-[14px] leading-[1.5] text-fg-muted">
            {description}
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}

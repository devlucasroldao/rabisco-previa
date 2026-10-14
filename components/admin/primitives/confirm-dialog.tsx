"use client";

import { Trash2 } from "lucide-react";
import { Dialog } from "./dialog";
import { buttonClass, dangerSolidButtonClass, errorClass } from "../ui";

// Confirmação de ação destrutiva: explica a consequência e o botão sólido em
// --danger só existe aqui dentro.
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  pendingLabel,
  pending = false,
  error,
  onConfirm,
  icon = <Trash2 size={16} aria-hidden="true" />,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={title}
      description={description}
      dismissible={!pending}
    >
      {children}
      {error && (
        <p role="alert" className={`mb-3 ${errorClass}`}>
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} disabled={pending} className={buttonClass("secondary")}>
          Cancelar
        </button>
        <button type="button" onClick={onConfirm} disabled={pending} className={dangerSolidButtonClass}>
          {icon}
          {pending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

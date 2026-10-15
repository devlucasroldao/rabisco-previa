"use client";

import { Toaster as Sonner } from "sonner";

// Toasts no canto (embaixo à direita; no celular, embaixo e centralizado).
// Sem estilo próprio do sonner: as cores vêm dos tokens de .admin.
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      offset={20}
      mobileOffset={16}
      visibleToasts={3}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "admin-toast flex w-[min(360px,calc(100vw-32px))] items-start gap-3 rounded-lg border border-border bg-bg p-3.5 text-[14px] text-fg shadow-md",
          title: "font-semibold",
          description: "mt-0.5 text-[13px] leading-[1.45] text-fg-muted",
          icon: "mt-0.5 shrink-0",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-danger",
        },
      }}
    />
  );
}

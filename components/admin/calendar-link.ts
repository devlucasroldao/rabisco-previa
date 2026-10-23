"use client";

import { toast } from "sonner";

export const CALENDAR_INACTIVE_WARNING =
  "O link está desativado: quem abrir vê “Este calendário não existe ou foi removido”. Reative pra ele voltar a funcionar.";

export function calendarUrl(token: string): string {
  return `${window.location.origin}/c/${token}`;
}

export async function copyCalendarLink(token: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(calendarUrl(token));
    toast.success("Link copiado", {
      id: "link-copiado",
      description: "Cole no WhatsApp do cliente.",
    });
    return true;
  } catch {
    toast.error("Não deu pra copiar o link.");
    return false;
  }
}

// O id evita dois avisos iguais empilhados (copiar e depois ver como cliente).
export function calendarInactiveToast() {
  toast.error(CALENDAR_INACTIVE_WARNING, { id: "link-inativo" });
}

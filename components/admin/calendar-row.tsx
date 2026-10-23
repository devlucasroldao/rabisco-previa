"use client";

import { ExternalLink, FolderOpen, Link2, Link2Off, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCalendar, setCalendarActive } from "@/app/admin/actions";
import type { AdminCalendar } from "@/lib/admin-calendar-data";
import { formatMonthShort } from "@/lib/calendar-constants";
import { ActionMenu } from "./primitives/action-menu";
import { Badge } from "./primitives/badge";
import { ConfirmDialog } from "./primitives/confirm-dialog";

function calendarUrl(token: string): string {
  return `${window.location.origin}/c/${token}`;
}

async function copyCalendarLink(token: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(calendarUrl(token));
    toast.success("Link copiado", { id: "link-copiado", description: "Cole no WhatsApp do cliente." });
    return true;
  } catch {
    toast.error("Não deu pra copiar o link.");
    return false;
  }
}

function inactiveToast() {
  toast.error(
    'O link está desativado: quem abrir vê “Este calendário não existe ou foi removido”. Reative pra ele voltar a funcionar.',
    { id: "link-inativo" },
  );
}

export function CalendarRow({ calendar }: { calendar: AdminCalendar }) {
  const router = useRouter();
  const { id, title, month, token, active, itemCount } = calendar;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleActive() {
    startTransition(async () => {
      const result = await setCalendarActive(id, !active);
      if (result.error) toast.error(result.error);
      else toast.success(active ? "Link desativado." : "Link reativado.");
    });
  }

  function remove() {
    setConfirming(false);
    setDeleting(true);
    startTransition(async () => {
      const result = await deleteCalendar(id);
      if (result.error) {
        setDeleting(false);
        toast.error(`"${title}" não foi excluído.`, { description: result.error });
      } else {
        toast.success(`"${title}" excluído.`);
      }
    });
  }

  return (
    <li
      aria-busy={deleting || undefined}
      className={`admin-list-in flex items-center gap-2 py-2 transition-opacity duration-(--dur-base) ${
        deleting ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <Link
        href={`/admin/calendarios/${id}`}
        className="flex min-h-14 min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-1.5 transition-colors duration-(--dur-fast) hover:bg-hover"
      >
        <span className="min-w-0 flex-1 basis-48">
          <span className="block truncate text-[14px] font-semibold">{title}</span>
          <span className="block text-[13px] text-fg-muted tabular-nums">
            {deleting
              ? "Excluindo…"
              : `${itemCount} ${itemCount === 1 ? "item" : "itens"} · ${formatMonthShort(month)}`}
          </span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          <Badge tone={active ? "success" : "danger"}>{active ? "Link ativo" : "Link desativado"}</Badge>
        </span>
      </Link>
      <ActionMenu
        label={`Ações de ${title}`}
        disabled={pending}
        actions={[
          { label: "Abrir", icon: <FolderOpen size={16} />, onSelect: () => router.push(`/admin/calendarios/${id}`) },
          {
            label: "Copiar link",
            icon: <Link2 size={16} />,
            onSelect: () => (active ? void copyCalendarLink(token) : inactiveToast()),
          },
          {
            label: "Ver como cliente",
            icon: <ExternalLink size={16} />,
            onSelect: () => (active ? window.open(`/c/${token}`, "_blank", "noreferrer") : inactiveToast()),
          },
          active
            ? { label: "Desativar link", icon: <Link2Off size={16} />, onSelect: toggleActive }
            : { label: "Reativar link", icon: <Link2 size={16} />, onSelect: toggleActive },
          { label: "Excluir", icon: <Trash2 size={16} />, onSelect: () => setConfirming(true), danger: true },
        ]}
      />
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Excluir "${title}"?`}
        description="O link para de funcionar e os itens do calendário são apagados. Não dá pra desfazer."
        confirmLabel="Excluir"
        pendingLabel="Excluindo…"
        onConfirm={remove}
      />
    </li>
  );
}

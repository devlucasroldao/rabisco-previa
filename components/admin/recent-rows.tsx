"use client";

import { ExternalLink, FolderOpen, Link2, Link2Off, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteCalendar,
  deletePresentation,
  setCalendarActive,
  setPresentationActive,
} from "@/app/admin/actions";
import type { RecentCalendar } from "@/lib/admin-calendar-data";
import type { RecentPresentation } from "@/lib/admin-data";
import { formatMonthShort } from "@/lib/calendar-constants";
import { ageLabel } from "@/lib/storage-rules";
import { calendarInactiveToast, copyCalendarLink } from "./calendar-link";
import { copyPresentationLink } from "./copy-link-button";
import { inactiveToast } from "./link-controls";
import type { MenuAction } from "./primitives/action-menu";
import { ActionMenu } from "./primitives/action-menu";
import { Badge } from "./primitives/badge";
import { ConfirmDialog } from "./primitives/confirm-dialog";

// Moldura comum das duas listas do início: o título abre, o resto fica no "⋯".
// As mesmas ações da página do cliente, pra não ter que entrar no cliente só
// pra desativar um link.
function RecentRow({
  href,
  title,
  subtitle,
  active,
  actions,
  confirm,
  deleting,
}: {
  href: string;
  title: string;
  subtitle: string;
  active: boolean;
  actions: MenuAction[];
  confirm: React.ReactNode;
  deleting: boolean;
}) {
  return (
    <li
      aria-busy={deleting || undefined}
      className={`admin-list-in flex items-center gap-2 transition-opacity duration-(--dur-base) ${
        deleting ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <Link
        href={href}
        className="flex min-h-16 min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 rounded-md px-2 py-3 transition-colors duration-(--dur-fast) hover:bg-hover"
      >
        <span className="min-w-0 flex-1 basis-56">
          <span className="block truncate text-[14px] font-semibold">{title}</span>
          <span className="block truncate text-[13px] text-fg-muted">
            {deleting ? "Excluindo…" : subtitle}
          </span>
        </span>
        <Badge tone={active ? "success" : "danger"}>
          {active ? "Link ativo" : "Link desativado"}
        </Badge>
      </Link>
      <ActionMenu label={`Ações de ${title}`} actions={actions} />
      {confirm}
    </li>
  );
}

export function RecentPresentationRow({
  presentation,
}: {
  presentation: RecentPresentation;
}) {
  const router = useRouter();
  const { id, title, token, active, clientName, postCount, ageDays } = presentation;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

  function toggleActive() {
    startTransition(async () => {
      const result = await setPresentationActive(id, !active);
      if (result.error) toast.error(result.error);
      else toast.success(active ? "Link desativado." : "Link reativado.");
    });
  }

  function remove() {
    setConfirming(false);
    setDeleting(true);
    startTransition(async () => {
      const result = await deletePresentation(id);
      if (result.error) {
        setDeleting(false);
        toast.error(`"${title}" não foi excluída.`, { description: result.error });
      } else {
        toast.success(`"${title}" excluída.`);
      }
    });
  }

  return (
    <RecentRow
      href={`/admin/apresentacoes/${id}`}
      title={title}
      subtitle={`${clientName} · ${postCount} ${postCount === 1 ? "post" : "posts"}${
        ageDays !== null ? ` · ${ageLabel(ageDays)}` : ""
      }`}
      active={active}
      deleting={deleting}
      actions={[
        {
          label: "Abrir",
          icon: <FolderOpen size={16} />,
          onSelect: () => router.push(`/admin/apresentacoes/${id}`),
        },
        {
          label: "Copiar link",
          icon: <Link2 size={16} />,
          onSelect: () => (active ? void copyPresentationLink(token) : inactiveToast()),
        },
        {
          label: "Ver como cliente",
          icon: <ExternalLink size={16} />,
          onSelect: () =>
            active ? window.open(`/p/${token}`, "_blank", "noreferrer") : inactiveToast(),
        },
        active
          ? { label: "Desativar link", icon: <Link2Off size={16} />, onSelect: toggleActive }
          : { label: "Reativar link", icon: <Link2 size={16} />, onSelect: toggleActive },
        {
          label: "Excluir",
          icon: <Trash2 size={16} />,
          onSelect: () => setConfirming(true),
          danger: true,
        },
      ]}
      confirm={
        <ConfirmDialog
          open={confirming}
          onClose={() => setConfirming(false)}
          title={`Excluir "${title}"?`}
          description="O link para de funcionar e os posts, stories e arquivos são apagados. Não dá pra desfazer."
          confirmLabel="Excluir"
          pendingLabel="Excluindo…"
          onConfirm={remove}
        />
      }
    />
  );
}

export function RecentCalendarRow({ calendar }: { calendar: RecentCalendar }) {
  const router = useRouter();
  const { id, title, month, token, active, clientName, itemCount } = calendar;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

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
    <RecentRow
      href={`/admin/calendarios/${id}`}
      title={title}
      subtitle={`${clientName} · ${itemCount} ${
        itemCount === 1 ? "item" : "itens"
      } · ${formatMonthShort(month)}`}
      active={active}
      deleting={deleting}
      actions={[
        {
          label: "Abrir",
          icon: <FolderOpen size={16} />,
          onSelect: () => router.push(`/admin/calendarios/${id}`),
        },
        {
          label: "Copiar link",
          icon: <Link2 size={16} />,
          onSelect: () =>
            active ? void copyCalendarLink(token) : calendarInactiveToast(),
        },
        {
          label: "Ver como cliente",
          icon: <ExternalLink size={16} />,
          onSelect: () =>
            active
              ? window.open(`/c/${token}`, "_blank", "noreferrer")
              : calendarInactiveToast(),
        },
        active
          ? { label: "Desativar link", icon: <Link2Off size={16} />, onSelect: toggleActive }
          : { label: "Reativar link", icon: <Link2 size={16} />, onSelect: toggleActive },
        {
          label: "Excluir",
          icon: <Trash2 size={16} />,
          onSelect: () => setConfirming(true),
          danger: true,
        },
      ]}
      confirm={
        <ConfirmDialog
          open={confirming}
          onClose={() => setConfirming(false)}
          title={`Excluir "${title}"?`}
          description="O link para de funcionar e os itens do calendário são apagados. Não dá pra desfazer."
          confirmLabel="Excluir"
          pendingLabel="Excluindo…"
          onConfirm={remove}
        />
      }
    />
  );
}

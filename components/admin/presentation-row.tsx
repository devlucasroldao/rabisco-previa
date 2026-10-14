"use client";

import { ExternalLink, FolderOpen, Link2, Link2Off, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePresentation, setPresentationActive } from "@/app/admin/actions";
import type { AdminPresentation } from "@/lib/admin-data";
import { megabytes } from "@/lib/media";
import { ageLabel, isOld } from "@/lib/storage-rules";
import { copyPresentationLink } from "./copy-link-button";
import { inactiveToast } from "./link-controls";
import { ActionMenu } from "./primitives/action-menu";
import { Badge } from "./primitives/badge";
import { ConfirmDialog } from "./primitives/confirm-dialog";

// Linha de apresentação na página do cliente: o título abre a apresentação e
// o resto fica no "⋯".
export function PresentationRow({ presentation }: { presentation: AdminPresentation }) {
  const router = useRouter();
  const { id, title, token, active, postCount, ageDays, bytes } = presentation;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, startTransition] = useTransition();
  const age = ageLabel(ageDays);

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
    <li
      aria-busy={deleting || undefined}
      className={`admin-list-in flex items-center gap-2 py-2 transition-opacity duration-(--dur-base) ${
        deleting ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <Link
        href={`/admin/apresentacoes/${id}`}
        className="flex min-h-14 min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-1.5 transition-colors duration-(--dur-fast) hover:bg-hover"
      >
        <span className="min-w-0 flex-1 basis-48">
          <span className="block truncate text-[14px] font-semibold">{title}</span>
          <span className="block text-[13px] text-fg-muted tabular-nums">
            {deleting
              ? "Excluindo…"
              : `${postCount} ${postCount === 1 ? "post" : "posts"} · ${megabytes(bytes)}${age ? ` · ${age}` : ""}`}
          </span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          {isOld(ageDays) && <Badge tone="warning">Antiga</Badge>}
          <Badge tone={active ? "success" : "danger"}>{active ? "Link ativo" : "Link desativado"}</Badge>
        </span>
      </Link>
      <ActionMenu
        label={`Ações de ${title}`}
        disabled={pending}
        actions={[
          { label: "Abrir", icon: <FolderOpen size={16} />, onSelect: () => router.push(`/admin/apresentacoes/${id}`) },
          {
            label: "Copiar link",
            icon: <Link2 size={16} />,
            onSelect: () => (active ? void copyPresentationLink(token) : inactiveToast()),
          },
          {
            label: "Ver como cliente",
            icon: <ExternalLink size={16} />,
            onSelect: () => (active ? window.open(`/p/${token}`, "_blank", "noreferrer") : inactiveToast()),
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
        description="O link para de funcionar e os posts, stories e arquivos são apagados. Não dá pra desfazer."
        confirmLabel="Excluir"
        pendingLabel="Excluindo…"
        onConfirm={remove}
      />
    </li>
  );
}

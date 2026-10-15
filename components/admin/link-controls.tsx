"use client";

import { ExternalLink, Link2Off, Link2, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { regeneratePresentationLink, setPresentationActive } from "@/app/admin/actions";
import { CopyLinkButton } from "./copy-link-button";
import { ActionMenu } from "./primitives/action-menu";
import { Badge } from "./primitives/badge";
import { ConfirmDialog } from "./primitives/confirm-dialog";
import { buttonClass } from "./ui";

export const INACTIVE_WARNING =
  "O link está desativado: quem abrir vê “Esta prévia não existe ou foi removida”. Reative pra ele voltar a funcionar.";

const REGENERATE_WARNING =
  "O link antigo deixa de funcionar. Quem o recebeu precisará do novo.";

// O id evita dois avisos iguais empilhados (copiar e depois ver como cliente).
export function inactiveToast() {
  toast.error(INACTIVE_WARNING, { id: "link-inativo" });
}

// Cabeçalho da apresentação: estado do link, UMA ação primária (copiar), UMA
// secundária (ver como cliente) e o menu "⋯" com desativar/reativar e
// regenerar (que pede confirmação).
export function LinkControls({
  presentationId,
  token,
  active,
}: {
  presentationId: string;
  token: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function toggleActive() {
    startTransition(async () => {
      const result = await setPresentationActive(presentationId, !active);
      if (result.error) toast.error(result.error);
      else toast.success(active ? "Link desativado." : "Link reativado.");
    });
  }

  function regenerate() {
    startTransition(async () => {
      const result = await regeneratePresentationLink(presentationId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConfirming(false);
      toast.success("Link regenerado. Copie o novo pra enviar.");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={active ? "success" : "danger"}>{active ? "Link ativo" : "Link desativado"}</Badge>
      <CopyLinkButton token={token} onBlocked={active ? undefined : inactiveToast} />
      {active ? (
        <a href={`/p/${token}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
          <ExternalLink size={16} aria-hidden="true" />
          Ver como cliente
        </a>
      ) : (
        <button type="button" onClick={inactiveToast} className={buttonClass("secondary")}>
          <ExternalLink size={16} aria-hidden="true" />
          Ver como cliente
        </button>
      )}
      <ActionMenu
        label="Ações do link"
        disabled={pending}
        actions={[
          active
            ? { label: "Desativar link", icon: <Link2Off size={16} />, onSelect: toggleActive }
            : { label: "Reativar link", icon: <Link2 size={16} />, onSelect: toggleActive },
          {
            label: "Regenerar link",
            icon: <RefreshCw size={16} />,
            onSelect: () => setConfirming(true),
            danger: true,
          },
        ]}
      />
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Regenerar o link?"
        description={REGENERATE_WARNING}
        confirmLabel="Regenerar"
        pendingLabel="Regenerando…"
        pending={pending}
        icon={<RefreshCw size={16} aria-hidden="true" />}
        onConfirm={regenerate}
      />
    </div>
  );
}

"use client";

import { ExternalLink, Link2, Link2Off } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { setCalendarActive } from "@/app/admin/actions";
import { calendarInactiveToast, copyCalendarLink } from "./calendar-link";
import { ActionMenu } from "./primitives/action-menu";
import { Badge } from "./primitives/badge";
import { buttonClass } from "./ui";

export function CalendarLinkControls({
  calendarId,
  token,
  active,
}: {
  calendarId: string;
  token: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggleActive() {
    startTransition(async () => {
      const result = await setCalendarActive(calendarId, !active);
      if (result.error) toast.error(result.error);
      else toast.success(active ? "Link desativado." : "Link reativado.");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={active ? "success" : "danger"}>{active ? "Link ativo" : "Link desativado"}</Badge>
      <button
        type="button"
        onClick={() => (active ? void copyCalendarLink(token) : calendarInactiveToast())}
        className={buttonClass("primary")}
      >
        <Link2 size={16} aria-hidden="true" />
        Copiar link
      </button>
      {active ? (
        <a href={`/c/${token}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
          <ExternalLink size={16} aria-hidden="true" />
          Ver como cliente
        </a>
      ) : (
        <button type="button" onClick={calendarInactiveToast} className={buttonClass("secondary")}>
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
        ]}
      />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import {
  regeneratePresentationLink,
  setPresentationActive,
} from "@/app/admin/actions";
import { CopyLinkButton } from "./copy-link-button";
import { errorClass, secondaryButtonClass } from "./ui";

const INACTIVE_WARNING =
  "O link está desativado: quem abrir vê “Esta prévia não existe ou foi removida”. Reative pra ele voltar a funcionar.";

const REGENERATE_WARNING =
  "O link antigo deixa de funcionar. Quem o recebeu precisará do novo.";

// Copiar, ver como cliente, desativar/reativar e (dentro da apresentação)
// regenerar o link.
export function LinkControls({
  presentationId,
  token,
  active,
  regenerate = false,
}: {
  presentationId: string;
  token: string;
  active: boolean;
  regenerate?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [regenerated, setRegenerated] = useState(false);

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    setError(null);
    setWarning(false);
    setRegenerated(false);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else after?.();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!active && (
          <span className="rounded border border-red-300 bg-red-50 px-1.5 text-[11px] font-semibold text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Link desativado
          </span>
        )}
        {active ? (
          <>
            <CopyLinkButton token={token} />
            <a
              href={`/p/${token}`}
              target="_blank"
              rel="noreferrer"
              className={secondaryButtonClass}
            >
              Ver como cliente
            </a>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setWarning(true)}
              className={`${secondaryButtonClass} text-muted`}
            >
              Copiar link
            </button>
            <button
              type="button"
              onClick={() => setWarning(true)}
              className={`${secondaryButtonClass} text-muted`}
            >
              Ver como cliente
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => run(() => setPresentationActive(presentationId, !active))}
          disabled={pending}
          className={secondaryButtonClass}
        >
          {pending ? "Salvando…" : active ? "Desativar link" : "Reativar link"}
        </button>
        {regenerate && (
          <button
            type="button"
            onClick={() => {
              setConfirming(true);
              setRegenerated(false);
            }}
            disabled={pending || confirming}
            className={secondaryButtonClass}
          >
            Regenerar link
          </button>
        )}
      </div>

      {confirming && (
        <div
          role="group"
          aria-label="Confirmar a troca do link"
          className="max-w-[420px] rounded-md border border-line bg-surface px-3 py-2 text-[13px]"
        >
          <p>{REGENERATE_WARNING}</p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className={secondaryButtonClass}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() =>
                run(
                  () => regeneratePresentationLink(presentationId),
                  () => {
                    setConfirming(false);
                    setRegenerated(true);
                  },
                )
              }
              disabled={pending}
              className={`${secondaryButtonClass} text-red-600 dark:text-red-400`}
            >
              {pending ? "Regenerando…" : "Regenerar"}
            </button>
          </div>
        </div>
      )}

      {regenerated && (
        <p role="status" className="text-[13px] text-muted">
          Link regenerado. Copie o novo pra enviar.
        </p>
      )}
      {warning && !active && (
        <p role="alert" className={`max-w-[420px] text-right ${errorClass}`}>
          {INACTIVE_WARNING}
        </p>
      )}
      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
    </div>
  );
}

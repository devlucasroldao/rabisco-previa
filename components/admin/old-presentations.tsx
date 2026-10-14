"use client";

import { useState, useTransition } from "react";
import { deleteOldPresentations, type CleanupResult } from "@/app/admin/actions";
import type { OldPresentation } from "@/lib/admin-data";
import { megabytes } from "@/lib/media";
import {
  ageLabel,
  batchConfirmation,
  batchTotal,
  presentationCount,
} from "@/lib/storage-rules";
import { errorClass, primaryButtonClass, secondaryButtonClass } from "./ui";

// Lista das apresentações com mais de 21 dias, pra apagar em lote. Nada sai
// sem a confirmação em tela.
export function OldPresentations({ presentations }: { presentations: OldPresentation[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [pending, startTransition] = useTransition();

  // Depois de apagar, a lista nova chega do servidor sem os ids que saíram.
  const chosen = presentations.filter((item) => selected.has(item.id));
  const total = batchTotal(chosen);

  function toggle(id: string, checked: boolean) {
    setResult(null);
    setConfirming(false);
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function confirm() {
    const ids = chosen.map((item) => item.id);
    startTransition(async () => {
      const outcome = await deleteOldPresentations(ids);
      setResult(outcome);
      setConfirming(false);
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-3">
      {presentations.length === 0 ? (
        <p className="text-[14px] text-muted">
          Nenhuma apresentação passou de 21 dias.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {presentations.map((item) => (
            <li key={item.id}>
              <label className="flex items-center gap-3 py-2.5 text-[14px]">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={(event) => toggle(item.id, event.target.checked)}
                  disabled={pending}
                  aria-label={`Selecionar ${item.clientName}: ${item.title}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.title}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {item.clientName}
                  </span>
                </span>
                <span className="text-[13px] text-muted tabular-nums">
                  {ageLabel(item.ageDays)} · {megabytes(item.bytes)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {presentations.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[13px] tabular-nums">
            {presentationCount(total.count)}, {megabytes(total.bytes)}
          </p>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setConfirming(true);
            }}
            disabled={pending || total.count === 0 || confirming}
            className={secondaryButtonClass}
          >
            Apagar selecionadas
          </button>
        </div>
      )}

      {confirming && (
        <div
          role="alertdialog"
          aria-label="Confirmar exclusão"
          className="space-y-3 rounded-md border border-red-300 p-3 dark:border-red-800"
        >
          <p className="text-[14px]">{batchConfirmation(chosen)}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={confirm}
              disabled={pending}
              className={`${primaryButtonClass} bg-red-600`}
            >
              {pending ? "Apagando…" : "Apagar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className={secondaryButtonClass}
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-1">
          {result.error ? (
            <p role="alert" className={errorClass}>
              {result.error}
            </p>
          ) : (
            <p role="status" className="text-[13px]">
              {result.deleted === 1
                ? "1 apresentação apagada"
                : `${result.deleted} apresentações apagadas`}
              , {megabytes(result.freedBytes)} liberados.
            </p>
          )}
          {result.failures.map((failure, index) => (
            <p key={index} role="alert" className={errorClass}>
              &quot;{failure.title}&quot; não foi apagada: {failure.error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

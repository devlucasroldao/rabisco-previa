"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteOldPresentations, type CleanupResult } from "@/app/admin/actions";
import type { OldPresentation } from "@/lib/admin-data";
import { megabytes } from "@/lib/media";
import {
  ageLabel,
  batchConfirmation,
  batchTotal,
  presentationCount,
} from "@/lib/storage-rules";
import { ConfirmDialog } from "./primitives/confirm-dialog";
import { EmptyState } from "./primitives/empty-state";
import { buttonClass, errorClass } from "./ui";

const checkboxClass = "size-4 shrink-0 cursor-pointer accent-(--accent)";

// Apresentações com mais de 21 dias, pra apagar em lote. Nada sai sem a
// confirmação, e nada é apagado sozinho.
export function OldPresentations({ presentations }: { presentations: OldPresentation[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [pending, startTransition] = useTransition();

  // Depois de apagar, a lista nova chega do servidor sem os ids que saíram.
  const chosen = presentations.filter((item) => selected.has(item.id));
  const total = batchTotal(chosen);
  const allChosen = presentations.length > 0 && chosen.length === presentations.length;

  function toggle(id: string, checked: boolean) {
    setResult(null);
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
      if (!outcome.error && outcome.deleted > 0) {
        toast.success(
          `${outcome.deleted === 1 ? "1 apresentação apagada" : `${outcome.deleted} apresentações apagadas`}, ${megabytes(outcome.freedBytes)} liberados.`,
        );
      }
    });
  }

  if (presentations.length === 0 && !result) {
    return (
      <EmptyState title="Nada pra limpar">
        Nenhuma apresentação passou de 21 dias.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {presentations.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex min-h-11 items-center gap-3 border-b border-border bg-bg-subtle px-3 text-[12px] font-semibold text-fg-muted">
            <input
              type="checkbox"
              checked={allChosen}
              onChange={(event) =>
                setSelected(event.target.checked ? new Set(presentations.map((item) => item.id)) : new Set())
              }
              disabled={pending}
              aria-label="Selecionar todas"
              className={checkboxClass}
            />
            <span className="flex-1">Apresentação</span>
            <span className="w-24 text-right">Idade</span>
            <span className="w-20 text-right">Tamanho</span>
          </div>
          <ul className="divide-y divide-border">
            {presentations.map((item) => (
              <li key={item.id} className="admin-list-in">
                <label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2 text-[14px] transition-colors duration-(--dur-fast) hover:bg-hover has-checked:bg-accent-subtle">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={(event) => toggle(item.id, event.target.checked)}
                    disabled={pending}
                    aria-label={`Selecionar ${item.clientName}: ${item.title}`}
                    className={checkboxClass}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{item.title}</span>
                    <span className="block truncate text-[13px] text-fg-muted">{item.clientName}</span>
                  </span>
                  <span className="w-24 text-right text-[13px] text-fg-muted tabular-nums">
                    {ageLabel(item.ageDays)}
                  </span>
                  <span className="w-20 text-right text-[13px] tabular-nums">{megabytes(item.bytes)}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {presentations.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bg-subtle px-4 py-3">
          <p className="text-[14px] tabular-nums">
            <span className="font-semibold">
              {presentationCount(total.count)}, {megabytes(total.bytes)}
            </span>
            {total.count > 0 && <span className="text-fg-muted"> pra liberar</span>}
          </p>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setConfirming(true);
            }}
            disabled={pending || total.count === 0}
            className={buttonClass("danger")}
          >
            <Trash2 size={16} aria-hidden="true" />
            Apagar selecionadas
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Confirmar exclusão"
        description={batchConfirmation(chosen)}
        confirmLabel="Apagar"
        pendingLabel="Apagando…"
        pending={pending}
        onConfirm={confirm}
      />

      {result && (
        <div className="space-y-1">
          {/* O sucesso vai no toast; aqui ficam só os erros. */}
          {result.error && (
            <p role="alert" className={errorClass}>
              {result.error}
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

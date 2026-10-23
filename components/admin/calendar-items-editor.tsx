"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteCalendarItem,
  saveCalendarItem,
} from "@/app/admin/actions";
import { CALENDAR_DESCRIPTION_MAX_LENGTH } from "@/lib/calendar-constants";
import type { AdminCalendarItem } from "@/lib/admin-calendar-data";
import type { ContentType } from "@/lib/types";
import { EmptyState } from "./primitives/empty-state";
import { ConfirmDialog } from "./primitives/confirm-dialog";
import {
  buttonClass,
  errorClass,
  iconButtonClass,
  inputClass,
  primaryButtonClass,
} from "./ui";

const CONTENT_TYPES: { value: ContentType; label: string; emoji: string }[] = [
  { value: "post", label: "Post", emoji: "📸" },
  { value: "carrossel", label: "Carrossel", emoji: "🖼️" },
  { value: "reels", label: "Reels", emoji: "🎬" },
  { value: "story", label: "Story", emoji: "📱" },
  { value: "campanha", label: "Campanha", emoji: "📣" },
];

const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
  post: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  carrossel: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  reels: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  story: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  campanha: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

function formatDay(dateStr: string): { day: number; weekday: string } {
  const [year, month, dayNum] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, dayNum);
  const weekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  return { day: dayNum, weekday: weekdays[date.getDay()] };
}

function groupByDay(items: AdminCalendarItem[]): Map<string, AdminCalendarItem[]> {
  const groups = new Map<string, AdminCalendarItem[]>();
  for (const item of items) {
    const existing = groups.get(item.day);
    if (existing) existing.push(item);
    else groups.set(item.day, [item]);
  }
  return groups;
}

function ItemForm({
  calendarId,
  month,
  editing,
  onDone,
}: {
  calendarId: string;
  month: string; // "YYYY-MM-01"
  editing?: AdminCalendarItem;
  onDone: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Limites de data do mês
  const [year, monthNum] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  const minDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const maxDate = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveCalendarItem({
        calendarId,
        itemId: editing?.id,
        day: String(formData.get("day") ?? ""),
        contentType: String(formData.get("contentType") ?? ""),
        description: String(formData.get("description") ?? ""),
      });
      if (result.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        onDone();
        toast.success(editing ? "Item atualizado." : "Item adicionado.");
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-32 text-[13px] font-semibold">
          Dia
          <input
            type="date"
            name="day"
            required
            min={minDate}
            max={maxDate}
            defaultValue={editing?.day ?? ""}
            className={inputClass}
          />
        </label>
        <label className="min-w-36 text-[13px] font-semibold">
          Tipo
          <select
            name="contentType"
            required
            defaultValue={editing?.contentType ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Selecione
            </option>
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-56 flex-1 text-[13px] font-semibold">
          Descrição
          <input
            name="description"
            required
            maxLength={CALENDAR_DESCRIPTION_MAX_LENGTH}
            defaultValue={editing?.description ?? ""}
            placeholder="ex.: Antes e depois — projeto residencial"
            className={inputClass}
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? "Salvando…" : editing ? "Salvar" : "Adicionar"}
          </button>
          {editing && (
            <button type="button" onClick={onDone} disabled={pending} className={buttonClass("secondary")}>
              Cancelar
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className={`mt-2 ${errorClass}`}>
          {error}
        </p>
      )}
    </form>
  );
}

function ItemRow({
  item,
  calendarId,
  month,
}: {
  item: AdminCalendarItem;
  calendarId: string;
  month: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, startTransition] = useTransition();
  const config = CONTENT_TYPES.find((t) => t.value === item.contentType);

  function remove() {
    setConfirming(false);
    setDeleting(true);
    startTransition(async () => {
      const result = await deleteCalendarItem(item.id);
      if (result.error) {
        setDeleting(false);
        toast.error(result.error);
      } else {
        toast.success("Item excluído.");
      }
    });
  }

  if (editing) {
    return (
      <li className="py-2">
        <ItemForm
          calendarId={calendarId}
          month={month}
          editing={item}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li
      aria-busy={deleting || undefined}
      className={`flex items-center gap-2 rounded-md px-2 py-2 transition-opacity ${
        deleting ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
          CONTENT_TYPE_COLORS[item.contentType]
        }`}
      >
        {config?.emoji} {config?.label}
      </span>
      <span className="min-w-0 flex-1 text-[14px]">{item.description}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={pending}
        className={`${iconButtonClass} text-fg-muted`}
        aria-label="Editar"
      >
        ✏️
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className={`${iconButtonClass} text-fg-muted`}
        aria-label="Excluir"
      >
        <Trash2 size={15} />
      </button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Excluir este item?"
        description={`"${item.description}" será removido do calendário.`}
        confirmLabel="Excluir"
        pendingLabel="Excluindo…"
        onConfirm={remove}
      />
    </li>
  );
}

export function CalendarItemsEditor({
  calendarId,
  month,
  items,
}: {
  calendarId: string;
  month: string;
  items: AdminCalendarItem[];
}) {
  const [adding, setAdding] = useState(false);
  const dayGroups = groupByDay(items);
  const sortedDays = [...dayGroups.keys()].sort();

  return (
    <div className="space-y-6">
      {/* Botão de adicionar */}
      {adding ? (
        <ItemForm
          calendarId={calendarId}
          month={month}
          onDone={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={primaryButtonClass}
        >
          <Plus size={16} aria-hidden="true" />
          Novo item
        </button>
      )}

      {/* Lista agrupada por dia */}
      {items.length === 0 && !adding ? (
        <EmptyState title="Nenhum item ainda">
          Clique em "Novo item" para começar a montar o calendário do mês.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {sortedDays.map((day) => {
            const { day: dayNum, weekday } = formatDay(day);
            const dayItems = dayGroups.get(day)!;
            return (
              <div key={day} className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-[22px] font-bold leading-none tabular-nums">
                    {dayNum}
                  </span>
                  <span className="text-[13px] font-semibold tracking-wide text-fg-muted">
                    {weekday}
                  </span>
                  <span className="text-[12px] text-fg-muted">
                    · {dayItems.length} {dayItems.length === 1 ? "item" : "itens"}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {dayItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      calendarId={calendarId}
                      month={month}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

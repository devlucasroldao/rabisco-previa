"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCalendarItem, saveCalendarItem } from "@/app/admin/actions";
import { ContentTypeBadge, ContentTypeIcon } from "@/components/content-type-badge";
import type { AdminCalendarItem } from "@/lib/admin-calendar-data";
import {
  CALENDAR_DESCRIPTION_MAX_LENGTH,
  CALENDAR_ITEM_TITLE_MAX_LENGTH,
  CONTENT_TYPES,
  CONTENT_TYPE_LABEL,
  dayNumberOf,
  dayOfMonth,
  daysBetween,
  daysInMonth,
  weekdayOf,
} from "@/lib/calendar-constants";
import type { ContentType } from "@/lib/types";
import { ConfirmDialog } from "./primitives/confirm-dialog";
import { EmptyState } from "./primitives/empty-state";
import {
  buttonClass,
  errorClass,
  iconButtonClass,
  inputClass,
  primaryButtonClass,
} from "./ui";

// Campanha com dia final repete nos dias do intervalo — só na exibição, o
// item no banco continua sendo um só (editar/excluir valem em qualquer dia).
function groupByDay(items: AdminCalendarItem[]): Map<string, AdminCalendarItem[]> {
  const groups = new Map<string, AdminCalendarItem[]>();
  for (const item of items) {
    const occurrences = item.endDay ? daysBetween(item.day, item.endDay) : [item.day];
    for (const day of occurrences) {
      const existing = groups.get(day);
      if (existing) existing.push(item);
      else groups.set(day, [item]);
    }
  }
  return groups;
}

// O mês já está travado pelo calendário, então o campo pede só o dia.
function ItemForm({
  calendarId,
  month,
  editing,
  onDone,
}: {
  calendarId: string;
  month: string;
  editing?: AdminCalendarItem;
  onDone: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ContentType | "">(
    editing?.contentType ?? "",
  );
  const total = daysInMonth(month);
  const days = Array.from({ length: total }, (_, index) => index + 1);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const rawEndDay = formData.get("endDay");
      const endDay =
        rawEndDay && String(rawEndDay)
          ? dayOfMonth(month, Number(rawEndDay))
          : "";
      const result = await saveCalendarItem({
        calendarId,
        itemId: editing?.id,
        day: dayOfMonth(month, Number(formData.get("day"))),
        endDay,
        contentType: String(formData.get("contentType") ?? ""),
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
      });
      if (result.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setContentType("");
        onDone();
        toast.success(editing ? "Item atualizado." : "Item adicionado.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="space-y-3 rounded-xl border border-border bg-bg-subtle p-4"
    >
      <div className="flex flex-wrap gap-3">
        <label className="w-28 text-[13px] font-semibold">
          Dia
          <select
            name="day"
            required
            defaultValue={editing ? dayNumberOf(editing.day) : ""}
            className={inputClass}
          >
            <option value="" disabled>
              —
            </option>
            {days.map((day) => (
              <option key={day} value={day}>
                {day} · {weekdayOf(dayOfMonth(month, day))}
              </option>
            ))}
          </select>
        </label>
        {contentType === "campanha" && (
          <label className="w-28 text-[13px] font-semibold">
            Dia final{" "}
            <span className="font-normal text-fg-muted">· opcional</span>
            <select
              name="endDay"
              defaultValue={editing?.endDay ? dayNumberOf(editing.endDay) : ""}
              className={inputClass}
            >
              <option value="">—</option>
              {days.map((day) => (
                <option key={day} value={day}>
                  {day} · {weekdayOf(dayOfMonth(month, day))}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="w-44 text-[13px] font-semibold">
          Tipo
          <span className="relative block">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg-muted"
            >
              {contentType && <ContentTypeIcon type={contentType} size={15} />}
            </span>
            <select
              name="contentType"
              required
              value={contentType}
              onChange={(event) =>
                setContentType(event.target.value as ContentType)
              }
              className={`${inputClass} ${contentType ? "pl-8" : ""}`}
            >
              <option value="" disabled>
                Selecione
              </option>
              {CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CONTENT_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="min-w-56 flex-1 text-[13px] font-semibold">
          Título
          <input
            name="title"
            required
            maxLength={CALENDAR_ITEM_TITLE_MAX_LENGTH}
            defaultValue={editing?.title ?? ""}
            placeholder="ex.: Antes e depois — projeto residencial"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-[13px] font-semibold">
        Descrição{" "}
        <span className="font-normal text-fg-muted">
          · opcional, o cliente vê ao tocar no item
        </span>
        <textarea
          name="description"
          rows={8}
          maxLength={CALENDAR_DESCRIPTION_MAX_LENGTH}
          defaultValue={editing?.description ?? ""}
          placeholder="Contexto, referências, o que precisa ser aprovado…"
          className={`${inputClass} min-h-40 resize-y leading-[1.5]`}
        />
      </label>

      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Salvando…" : editing ? "Salvar" : "Adicionar"}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={pending}
          className={buttonClass("secondary")}
        >
          Cancelar
        </button>
      </div>
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
      className={`flex items-start gap-3 py-2.5 transition-opacity duration-(--dur-base) ${
        deleting ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <span className="pt-0.5">
        <ContentTypeBadge type={item.contentType} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium">
          {item.title}
          {item.endDay && (
            <span className="ml-1.5 font-normal text-fg-muted">
              · até {dayNumberOf(item.endDay)}
            </span>
          )}
        </span>
        {item.description && (
          <span className="mt-0.5 block truncate text-[13px] text-fg-muted">
            {item.description}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={pending}
        className={iconButtonClass}
        aria-label={`Editar ${item.title}`}
      >
        <Pencil size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className={iconButtonClass}
        aria-label={`Excluir ${item.title}`}
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Excluir este item?"
        description={`"${item.title}" sai do calendário. Não dá pra desfazer.`}
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
    <div className="space-y-5">
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

      {items.length === 0 ? (
        !adding && (
          <EmptyState title="Nenhum item ainda">
            Escolha o dia, o tipo e dê um título. A descrição é opcional — use
            quando o cliente precisar de contexto.
          </EmptyState>
        )
      ) : (
        <div className="space-y-3">
          {sortedDays.map((day) => (
            <div key={day} className="rounded-xl border border-border px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[20px] font-semibold leading-none tabular-nums">
                  {dayNumberOf(day)}
                </span>
                <span className="text-[12px] font-semibold tracking-wide text-fg-muted">
                  {weekdayOf(day)}
                </span>
              </div>
              <ul className="mt-1 divide-y divide-border">
                {dayGroups.get(day)!.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    calendarId={calendarId}
                    month={month}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

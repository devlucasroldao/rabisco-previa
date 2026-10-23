"use client";

import { useActionState } from "react";
import { createCalendar, type FormState } from "@/app/admin/actions";
import { CALENDAR_TITLE_MAX_LENGTH } from "@/lib/calendar-constants";
import { errorClass, inputClass, primaryButtonClass } from "./ui";

const initialState: FormState = {};

/**
 * Gera o valor "YYYY-MM-01" do mês corrente (para o default do campo).
 */
function currentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function CalendarForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(createCalendar, initialState);

  return (
    <form action={action} className="max-w-[520px]">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-40 text-[13px] font-semibold">
          Mês
          <input
            type="month"
            name="month"
            required
            defaultValue={currentMonth().slice(0, 7)}
            className={inputClass}
          />
        </label>
        <label className="min-w-44 flex-1 text-[13px] font-semibold">
          Título <span className="font-normal text-fg-muted">· opcional</span>
          <input
            name="title"
            maxLength={CALENDAR_TITLE_MAX_LENGTH}
            placeholder="em branco, usa o mês"
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Criando…" : "Novo calendário"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className={`mt-2 ${errorClass}`}>
          {state.error}
        </p>
      )}
    </form>
  );
}

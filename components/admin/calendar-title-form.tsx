"use client";

import { Pencil } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { renameCalendar, type FormState } from "@/app/admin/actions";
import { CALENDAR_TITLE_MAX_LENGTH } from "@/lib/calendar-constants";
import { Dialog } from "./primitives/dialog";
import { buttonClass, errorClass, iconButtonClass, inputClass, labelClass } from "./ui";

const initialState: FormState = {};

export function CalendarTitleForm({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (previous: FormState, form: FormData) => {
    const result = await renameCalendar(previous, form);
    if (result.saved) {
      setOpen(false);
      toast.success("Título salvo.");
    }
    return result;
  }, initialState);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Renomear o calendário"
        className={iconButtonClass}
      >
        <Pencil size={17} aria-hidden="true" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Renomear o calendário" dismissible={!pending}>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <label className={labelClass}>
            Título
            <input
              name="title"
              required
              maxLength={CALENDAR_TITLE_MAX_LENGTH}
              defaultValue={title}
              placeholder="ex.: Outubro 2026"
              className={inputClass}
            />
          </label>
          {state.error && (
            <p role="alert" className={errorClass}>
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} disabled={pending} className={buttonClass("secondary")}>
              Cancelar
            </button>
            <button type="submit" disabled={pending} className={buttonClass("primary")}>
              {pending ? "Salvando…" : "Salvar título"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

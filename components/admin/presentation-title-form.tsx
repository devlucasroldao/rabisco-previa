"use client";

import { useActionState } from "react";
import { renamePresentation, type FormState } from "@/app/admin/actions";
import { TITLE_MAX_LENGTH } from "@/lib/media";
import { errorClass, inputClass, secondaryButtonClass } from "./ui";

const initialState: FormState = {};

export function PresentationTitleForm({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [state, action, pending] = useActionState(
    renamePresentation,
    initialState,
  );

  return (
    <form action={action} className="max-w-[520px]">
      <input type="hidden" name="id" value={id} />
      <div className="flex items-end gap-3">
        <label className="flex-1 text-[13px] font-medium">
          Título
          <input
            name="title"
            required
            maxLength={TITLE_MAX_LENGTH}
            defaultValue={title}
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          {pending ? "Salvando…" : "Salvar título"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className={`mt-2 ${errorClass}`}>
          {state.error}
        </p>
      )}
      {state.saved && !pending && (
        <p role="status" className="mt-2 text-[13px] text-muted">
          Título salvo.
        </p>
      )}
    </form>
  );
}

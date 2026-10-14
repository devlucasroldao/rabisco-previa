"use client";

import { useActionState } from "react";
import { createPresentation, type FormState } from "@/app/admin/actions";
import { TITLE_MAX_LENGTH } from "@/lib/media";
import { errorClass, inputClass, primaryButtonClass } from "./ui";

const initialState: FormState = {};

export function PresentationForm({ clientId }: { clientId: string }) {
  // Quando dá certo, a action redireciona pra tela de posts da apresentação.
  const [state, action, pending] = useActionState(
    createPresentation,
    initialState,
  );

  return (
    <form action={action} className="max-w-[520px]">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1 text-[13px] font-semibold">
          Título da nova apresentação
          <input
            name="title"
            required
            maxLength={TITLE_MAX_LENGTH}
            placeholder="ex.: Semana 20–26 out"
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Criando…" : "Nova apresentação"}
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

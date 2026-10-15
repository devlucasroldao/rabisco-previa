"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { changePassword, type PasswordState } from "@/app/admin/actions";
import { PASSWORD_MIN_LENGTH } from "@/lib/presentation-rules";
import { errorClass, inputClass, labelClass, primaryButtonClass } from "./ui";

const initialState: PasswordState = {};

export function PasswordForm() {
  const [state, action, pending] = useActionState(
    async (previous: PasswordState, form: FormData) => {
      const result = await changePassword(previous, form);
      if (result.saved) toast.success("Senha trocada. Use a nova no próximo login.");
      return result;
    },
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <label className={labelClass}>
        Senha atual
        <input
          name="current"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Nova senha
        <input
          name="next"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          className={inputClass}
        />
        <span className="mt-1 block text-[12px] font-normal text-fg-muted">
          Pelo menos {PASSWORD_MIN_LENGTH} caracteres.
        </span>
      </label>
      <label className={labelClass}>
        Confirme a nova senha
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          className={inputClass}
        />
      </label>
      {state.error && (
        <p role="alert" className={errorClass}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Trocando…" : "Trocar senha"}
      </button>
    </form>
  );
}

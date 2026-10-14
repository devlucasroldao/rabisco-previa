"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "@/app/admin/actions";
import { PASSWORD_MIN_LENGTH } from "@/lib/presentation-rules";
import { errorClass, inputClass, labelClass, primaryButtonClass } from "./ui";

const initialState: PasswordState = {};

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialState);

  return (
    <form action={action} className="max-w-[420px] space-y-4">
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
        <span className="mt-1 block text-[12px] font-normal text-muted">
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
      {state.saved && !pending && (
        <p role="status" className="text-[13px]">
          Senha trocada. Use a nova no próximo login.
        </p>
      )}
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Trocando…" : "Trocar senha"}
      </button>
    </form>
  );
}

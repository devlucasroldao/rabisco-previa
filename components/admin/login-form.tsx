"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/actions";
import { errorClass, inputClass, labelClass, primaryButtonClass } from "./ui";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action} className="mt-6 space-y-4 text-left">
      <label className={labelClass}>
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Senha
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      {state.error && (
        <p role="alert" className={errorClass}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`w-full ${primaryButtonClass}`}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

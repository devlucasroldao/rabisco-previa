"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteClient } from "@/app/admin/actions";
import { dangerSolidButtonClass, errorClass, inputClass, labelClass } from "./ui";

// Conteúdo do dialog de excluir cliente: pede o @ digitado antes de liberar.
export function DeleteClient({ id, handle }: { id: string; handle: string }) {
  const [pending, startTransition] = useTransition();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim().replace(/^@/, "").toLowerCase() === handle.toLowerCase();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      // Quando dá certo, a action redireciona pro início.
      const result = await deleteClient({ id, confirmation: typed });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className={labelClass}>
        Digite <span className="font-bold">{handle}</span> para confirmar
        <input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          className={inputClass}
        />
      </label>
      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={!matches || pending} className={dangerSolidButtonClass}>
          <Trash2 size={16} aria-hidden="true" />
          {pending ? "Excluindo…" : "Excluir cliente"}
        </button>
      </div>
    </form>
  );
}

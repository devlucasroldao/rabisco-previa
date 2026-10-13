"use client";

import { useState, useTransition } from "react";
import { deleteClient } from "@/app/admin/actions";
import { errorClass, inputClass, labelClass, secondaryButtonClass } from "./ui";

export function DeleteClient({ id, handle }: { id: string; handle: string }) {
  const [pending, startTransition] = useTransition();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  const matches =
    typed.trim().replace(/^@/, "").toLowerCase() === handle.toLowerCase();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      // Quando dá certo, a action redireciona pra lista de clientes.
      const result = await deleteClient({ id, confirmation: typed });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-[520px] space-y-3">
      <p className="text-[13px] text-muted">
        Apaga o cliente, todas as apresentações dele, os posts e os arquivos. Os
        links já enviados param de funcionar. Não dá pra desfazer.
      </p>
      <label className={labelClass}>
        Digite <span className="font-semibold">{handle}</span> para confirmar
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
      <button
        type="submit"
        disabled={!matches || pending}
        className={`${secondaryButtonClass} text-red-600 dark:text-red-400`}
      >
        {pending ? "Excluindo…" : "Excluir cliente"}
      </button>
    </form>
  );
}

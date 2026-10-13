"use client";

import { useState, useTransition } from "react";
import { deletePresentation } from "@/app/admin/actions";
import { errorClass, secondaryButtonClass } from "./ui";

export function DeletePresentationButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    const ok = window.confirm(
      `Excluir "${title}"? O link para de funcionar e os posts e arquivos são apagados.`,
    );
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await deletePresentation(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <>
      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={secondaryButtonClass}
      >
        {pending ? "Excluindo…" : "Excluir"}
      </button>
    </>
  );
}

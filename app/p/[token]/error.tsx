"use client";

import { useEffect } from "react";
import { Message } from "@/components/message";

export default function PresentationError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Message title="Não foi possível carregar a prévia">
      Tente de novo em instantes.{" "}
      <button
        type="button"
        onClick={() => retry()}
        className="min-h-11 cursor-pointer font-semibold text-accent"
      >
        Tentar de novo
      </button>
    </Message>
  );
}

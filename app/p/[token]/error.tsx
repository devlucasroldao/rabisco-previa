"use client";

import { useEffect } from "react";
import { PublicPage } from "@/components/public-page";

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
    <PublicPage
      title="Não foi possível carregar a prévia"
      action={
        <button
          type="button"
          onClick={() => retry()}
          className="min-h-11 cursor-pointer rounded-md px-4 font-semibold text-pub-link hover:underline"
        >
          Tentar de novo
        </button>
      }
    >
      Tente de novo em instantes. Se continuar, peça um novo link à Rabisco.
    </PublicPage>
  );
}

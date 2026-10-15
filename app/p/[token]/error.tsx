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
          className="min-h-11 cursor-pointer rounded-md bg-pub-button-bg px-5 text-[16px] font-semibold text-pub-button-text hover:opacity-90"
        >
          Tentar de novo
        </button>
      }
    >
      Tente de novo em instantes. Se continuar, peça um novo link à Rabisco.
    </PublicPage>
  );
}

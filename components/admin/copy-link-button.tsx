"use client";

import { useState } from "react";
import { secondaryButtonClass } from "./ui";

export function CopyLinkButton({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${token}`);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={secondaryButtonClass}
    >
      {status === "copied"
        ? "Link copiado"
        : status === "failed"
          ? "Não deu pra copiar"
          : "Copiar link"}
    </button>
  );
}

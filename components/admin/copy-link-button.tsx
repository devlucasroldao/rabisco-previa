"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { buttonClass } from "./ui";

export function presentationUrl(token: string): string {
  return `${window.location.origin}/p/${token}`;
}

export async function copyPresentationLink(token: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(presentationUrl(token));
    toast.success("Link copiado", { id: "link-copiado", description: "Cole no WhatsApp do cliente." });
    return true;
  } catch {
    toast.error("Não deu pra copiar o link.");
    return false;
  }
}

// Ação primária da apresentação: o botão mostra "Copiado" e o toast confirma.
export function CopyLinkButton({
  token,
  variant = "primary",
  onBlocked,
}: {
  token: string;
  variant?: "primary" | "secondary";
  // Link desativado: em vez de copiar, explica por quê.
  onBlocked?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (onBlocked) {
      onBlocked();
      return;
    }
    if (await copyPresentationLink(token)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button type="button" onClick={copy} className={buttonClass(variant)}>
      {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copiado" : "Copiar link"}</span>
    </button>
  );
}

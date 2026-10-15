"use client";

import { useEffect } from "react";
import { parseTheme, resolveTheme, THEME_STORAGE_KEY } from "@/lib/admin-theme";
import { STORAGE_PENDING, STORAGE_UNAVAILABLE, useStored } from "@/lib/story-storage";

// Mantém o data-admin-theme do <html> em dia depois do script inicial: troca
// feita no menu, mudança do sistema com "Sistema" escolhido e outra aba.
// Ao sair do painel, tira o atributo pra não vazar pra outra tela.
export function ThemeController() {
  const raw = useStored(THEME_STORAGE_KEY);
  const choice = parseTheme(
    raw === STORAGE_PENDING || raw === STORAGE_UNAVAILABLE ? null : raw,
  );

  useEffect(() => {
    // Antes de ler o aparelho, quem manda é o script inicial.
    if (raw === STORAGE_PENDING) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.setAttribute(
        "data-admin-theme",
        resolveTheme(choice, query.matches),
      );
    apply();
    if (choice !== "system") return;
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [choice, raw]);

  useEffect(() => () => document.documentElement.removeAttribute("data-admin-theme"), []);

  return null;
}

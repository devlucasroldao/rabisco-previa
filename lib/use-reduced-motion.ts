"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

// O CSS desliga o que é decoração sozinho; este hook é pro que só o JS decide,
// como o comportamento de um scroll programático. No servidor assume false,
// que é o caso comum — e nunca anima nada antes da hidratação.
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

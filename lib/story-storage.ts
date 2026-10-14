import { useSyncExternalStore } from "react";

// localStorage como fonte externa do React: o servidor não tem, o navegador
// pode recusar (aba anônima, cota cheia, bloqueio do usuário) e outra aba pode
// mudar o valor. Toda leitura e escrita fica dentro de try/catch.

// O localStorage não respondeu.
export const STORAGE_UNAVAILABLE = "\u0000indisponível";
// Ainda no servidor ou na hidratação: nada foi lido.
export const STORAGE_PENDING = "\u0000pendente";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}

export function writeStored(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  } finally {
    for (const listener of listeners) listener();
  }
}

export function useStored(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => readStored(key),
    () => STORAGE_PENDING,
  );
}

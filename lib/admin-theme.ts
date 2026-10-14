// Tema do painel: Claro, Escuro ou Sistema, guardado no navegador.

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "rabisco-previa:tema";

export const THEME_LABELS: Record<ThemeChoice, string> = {
  light: "Claro",
  dark: "Escuro",
  system: "Sistema",
};

export function parseTheme(raw: string | null): ThemeChoice {
  return raw === "light" || raw === "dark" ? raw : "system";
}

export function resolveTheme(choice: ThemeChoice, systemDark: boolean): "light" | "dark" {
  return choice === "system" ? (systemDark ? "dark" : "light") : choice;
}

// Roda inline antes da primeira pintura (sem flash de tema errado). Fica
// pequeno e sem dependência; o try/catch cobre localStorage bloqueado.
export const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})}catch(e){}var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-admin-theme",d?"dark":"light")})()`;

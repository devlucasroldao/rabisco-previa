// Confere o contraste (WCAG 2.x) dos pares de cor usados no painel, lendo os
// tokens direto de app/admin/theme.css. Uso: pnpm check:contrast
//
// AA: 4.5:1 pra texto normal, 3:1 pra texto grande e componentes de UI
// (borda de campo, anel de foco). Sai com erro se algum par obrigatório
// falhar.

import { readFileSync } from "node:fs";

const css = readFileSync("app/admin/theme.css", "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Bloco ${selector} não encontrado em theme.css`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const tokens: Record<string, string> = {};
  for (const match of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    tokens[match[1]] = match[2].toLowerCase();
  }
  return tokens;
}

const light = block(".admin");
const themes = {
  claro: light,
  escuro: { ...light, ...block('html[data-admin-theme="dark"] .admin') },
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [frente, fundo, mínimo (0 = só informativo), onde aparece]
const pairs: [string, string, number, string][] = [
  ...["bg", "bg-subtle", "bg-sidebar", "bg-hover", "bg-active"].flatMap(
    (bg): [string, string, number, string][] => [
      ["text", bg, 4.5, "texto"],
      ["text-muted", bg, 4.5, "texto de apoio"],
    ],
  ),
  ["accent", "bg", 4.5, "link e botão ghost"],
  ["accent", "bg-sidebar", 4.5, "link na barra lateral"],
  ["accent", "accent-subtle", 4.5, "item selecionado"],
  ["accent-fg", "accent", 4.5, "botão primário"],
  ["accent-fg", "accent-hover", 4.5, "botão primário (hover)"],
  ["highlight-fg", "highlight-subtle", 4.5, "selo de aviso (Antiga)"],
  ["danger", "bg", 4.5, "ação destrutiva contornada"],
  ["danger", "danger-subtle", 4.5, "erro em destaque"],
  ["danger-fg", "danger", 4.5, "botão sólido no dialog"],
  ["success", "bg", 4.5, "texto de sucesso"],
  ["success", "success-subtle", 4.5, "chip Ativa"],
  ["ring", "bg", 3, "anel de foco"],
  ["ring", "bg-sidebar", 3, "anel de foco na barra lateral"],
  ["border-strong", "bg", 3, "borda de campo"],
  ["cream", "brand", 3, "frase do login (texto grande)"],
  ["avatar-b-fg", "avatar-b-bg", 4.5, "inicial no avatar mostarda"],
  ["border", "bg", 0, "divisória (decorativa)"],
  ["text-faint", "bg", 0, "desabilitado (isento)"],
];

let failures = 0;
console.log("tema    frente/fundo                       razão   mín   resultado   uso");
for (const [theme, tokens] of Object.entries(themes)) {
  for (const [fg, bg, min, use] of pairs) {
    const value = ratio(tokens[fg], tokens[bg]);
    const ok = min === 0 || value >= min;
    if (!ok) failures++;
    const verdict = min === 0 ? "info" : ok ? "aprovado" : "FALHOU";
    console.log(
      `${theme.padEnd(7)} ${`--${fg} / --${bg}`.padEnd(34)} ${value.toFixed(2).padStart(5)}  ${min ? String(min).padStart(3) : "  -"}   ${verdict.padEnd(10)}  ${use}`,
    );
  }
}
// Páginas públicas e tela do cliente: seguem o tema do aparelho.
function deviceThemes(file: string, selector: string) {
  const text = readFileSync(file, "utf8");
  const read = (body: string) => {
    const tokens: Record<string, string> = {};
    for (const match of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
      tokens[match[1]] = match[2].toLowerCase();
    }
    return tokens;
  };
  const lightStart = text.indexOf(`${selector} {`);
  const light = read(text.slice(lightStart, text.indexOf("\n}", lightStart)));
  const media = text.indexOf("@media (prefers-color-scheme: dark)");
  const darkStart = text.indexOf(`${selector} {`, media);
  const dark = read(text.slice(darkStart, text.indexOf("}", darkStart)));
  return { claro: light, escuro: { ...light, ...dark } };
}

const devicePairs: [string, Record<string, Record<string, string>>, [string, string, number, string][]][] = [
  [
    "público",
    deviceThemes("app/public-theme.css", ".public-page"),
    [
      ["pub-text", "pub-bg", 4.5, "título e texto"],
      ["pub-muted", "pub-bg", 4.5, "apoio e assinatura"],
      ["pub-link", "pub-bg", 4.5, "botão Tentar de novo"],
      ["pub-ring", "pub-bg", 3, "anel de foco"],
    ],
  ],
  [
    "cliente",
    deviceThemes("app/globals.css", ":root"),
    [["muted", "background", 4.5, "assinatura no rodapé do grid e do post"]],
  ],
];

for (const [scope, scopeThemes, list] of devicePairs) {
  for (const [theme, tokens] of Object.entries(scopeThemes)) {
    for (const [fg, bg, min, use] of list) {
      const value = ratio(tokens[fg], tokens[bg]);
      const ok = value >= min;
      if (!ok) failures++;
      console.log(
        `${`${scope} ${theme}`.padEnd(15)} ${`--${fg} / --${bg}`.padEnd(26)} ${value.toFixed(2).padStart(5)}  ${String(min).padStart(3)}   ${(ok ? "aprovado" : "FALHOU").padEnd(10)}  ${use}`,
      );
    }
  }
}

if (failures) {
  console.error(`\n${failures} par(es) abaixo do mínimo.`);
  process.exit(1);
}
console.log("\nTodos os pares obrigatórios passam no AA.");

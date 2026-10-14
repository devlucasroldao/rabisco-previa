// Regras dos stories, compartilhadas entre a tela do cliente, o painel e o
// servidor. Sem React, banco ou navegador aqui: é o que o pnpm test cobre.

import type { Story } from "./types";

export const STORY_MAX_PER_PRESENTATION = 30;
// Limite do arquivo original, antes do redimensionamento pra 1080 px.
export const STORY_INPUT_MAX_BYTES = 20 * 1024 * 1024;
// Tempo de cada story na tela, com avanço automático.
export const STORY_DURATION_MS = 5000;
// Segurar por mais que isso pausa; menos é um toque.
export const STORY_HOLD_MS = 200;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isStoryDay(value: string): boolean {
  if (!DAY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// O dia vem do banco como "YYYY-MM-DD", sem hora. Formatar em UTC evita que um
// fuso a oeste de Greenwich mostre o dia anterior.
function utcDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

const weekdayLong = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" });
const weekdayShort = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});
const dayOfMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", timeZone: "UTC" });

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "Segunda, 12/10"
export function formatStoryDay(day: string): string {
  const date = utcDate(day);
  const weekday = weekdayLong.format(date).replace(/-feira$/, "");
  return `${capitalize(weekday)}, ${dayMonth.format(date)}`;
}

// "Seg 12", pros atalhos de dia do visualizador.
export function formatStoryChip(day: string): string {
  const date = utcDate(day);
  const weekday = weekdayShort.format(date).replace(/\.$/, "");
  return `${capitalize(weekday)} ${dayOfMonth.format(date)}`;
}

// Ordem de exibição: dia, depois position. O número é global, de 1 a T, e
// sai dessa ordem (a position do banco nunca é renumerada).
export function sortStories<T extends { day: string; position: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    a.day === b.day ? a.position - b.position : a.day < b.day ? -1 : 1,
  );
}

export function numberStories(
  rows: { id: string; day: string; position: number; url: string }[],
): Story[] {
  return sortStories(rows).map((row, index) => ({
    id: row.id,
    day: row.day,
    number: index + 1,
    url: row.url,
  }));
}

export type StoryDay<T> = { day: string; stories: T[] };

// Agrupa mantendo a ordem (a lista já precisa estar ordenada).
export function groupByDay<T extends { day: string }>(stories: T[]): StoryDay<T>[] {
  const groups: StoryDay<T>[] = [];
  for (const story of stories) {
    const last = groups.at(-1);
    if (last && last.day === story.day) last.stories.push(story);
    else groups.push({ day: story.day, stories: [story] });
  }
  return groups;
}

// Onde o story N está: o dia, a posição dentro do dia e o tamanho do dia.
export function storyPlace(stories: Story[], number: number) {
  const story = stories[number - 1];
  const sameDay = stories.filter((item) => item.day === story.day);
  return {
    story,
    day: story.day,
    indexInDay: sameDay.findIndex((item) => item.number === number),
    dayCount: sameDay.length,
  };
}

// Depois do último story de um dia vem o primeiro do dia seguinte; depois do
// último de todos, null (o visualizador fecha).
export function nextStory(total: number, number: number): number | null {
  return number < total ? number + 1 : null;
}

export function previousStory(number: number): number {
  return Math.max(1, number - 1);
}

export function firstOfDay(stories: Story[], day: string): number {
  return stories.find((story) => story.day === day)?.number ?? 1;
}

export function storyLabel(stories: Story[], number: number): string {
  return `${formatStoryDay(stories[number - 1].day)} · Story ${number} de ${stories.length}`;
}

// Com 1 post só, a apresentação abre direto no post. Com stories, o grid
// aparece, pra o avatar (que abre os stories) ficar acessível.
export function skipsGrid(postCount: number, storyCount: number): boolean {
  return postCount === 1 && storyCount === 0;
}

export function contentCounter(postCount: number, storyCount: number): string {
  const posts = `${postCount} ${postCount === 1 ? "conteúdo" : "conteúdos"}`;
  if (storyCount === 0) return posts;
  return `${posts} · ${storyCount} ${storyCount === 1 ? "story" : "stories"}`;
}

// Stories vistos --------------------------------------------------------------

// Por token: cada apresentação tem token novo, então a cada semana o anel
// volta colorido.
export function seenStorageKey(token: string): string {
  return `rabisco-previa:stories-visto:${token}`;
}

export const HINT_STORAGE_KEY = "rabisco-previa:stories-dica";

// O valor guardado é uma lista JSON de números. Qualquer coisa estranha vale
// como nada visto.
export function parseSeen(raw: string | null): Set<number> {
  if (!raw) return new Set();
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return new Set();
    return new Set(value.filter((item): item is number => Number.isInteger(item) && item > 0));
  } catch {
    return new Set();
  }
}

export function addSeen(raw: string | null, number: number): string {
  const seen = parseSeen(raw);
  seen.add(number);
  return JSON.stringify([...seen].sort((a, b) => a - b));
}

export function allSeen(seen: Set<number>, total: number): boolean {
  if (total === 0) return false;
  for (let number = 1; number <= total; number++) {
    if (!seen.has(number)) return false;
  }
  return true;
}

export function avatarLabel(total: number, everythingSeen: boolean): string {
  return everythingSeen
    ? `Ver stories da semana (${total}, todos vistos)`
    : `Ver stories da semana (${total})`;
}

// Balão "Toque na foto…": só com stories, uma vez por aparelho, nunca com
// tudo visto e nunca depois de dispensado ou de abrir os stories nesta visita.
export function showsHint({
  storyCount,
  everythingSeen,
  dismissed,
  closedNow,
}: {
  storyCount: number;
  everythingSeen: boolean;
  // null quando o localStorage não respondeu: aí o balão aparece sempre.
  dismissed: boolean | null;
  closedNow: boolean;
}): boolean {
  if (storyCount === 0 || everythingSeen || closedNow) return false;
  return dismissed !== true;
}

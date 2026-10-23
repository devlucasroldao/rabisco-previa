import type { ContentType } from "./types";

export const CALENDAR_TITLE_MAX_LENGTH = 60;
export const CALENDAR_ITEM_TITLE_MAX_LENGTH = 80;
export const CALENDAR_DESCRIPTION_MAX_LENGTH = 2000;

export const CONTENT_TYPES: ContentType[] = [
  "post",
  "carrossel",
  "reels",
  "story",
  "campanha",
  "anuncio",
  "enquete",
];

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  post: "Post",
  carrossel: "Carrossel",
  reels: "Reels",
  story: "Story",
  campanha: "Campanha",
  anuncio: "Anúncio",
  enquete: "Enquete",
};

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

/** "2026-10-01" → "Outubro 2026". */
export function formatMonthYear(month: string): string {
  const [year, index] = month.split("-").map(Number);
  return `${MONTHS[index - 1]} ${year}`;
}

/** "2026-10-01" → "Out 2026". */
export function formatMonthShort(month: string): string {
  const [year, index] = month.split("-").map(Number);
  return `${MONTHS_SHORT[index - 1]} ${year}`;
}

/** Dia da semana sem passar por fuso: o Date local bastaria, mas a data vem
 *  como texto e `new Date("2026-10-12")` seria lida como UTC. */
export function weekdayOf(day: string): string {
  const [year, month, dayNumber] = day.split("-").map(Number);
  return WEEKDAYS[new Date(year, month - 1, dayNumber).getDay()];
}

/** Quantos dias tem o mês de "2026-10-01". */
export function daysInMonth(month: string): number {
  const [year, index] = month.split("-").map(Number);
  return new Date(year, index, 0).getDate();
}

/** Em que coluna (0 = domingo) o dia 1 cai. */
export function firstWeekdayOf(month: string): number {
  const [year, index] = month.split("-").map(Number);
  return new Date(year, index - 1, 1).getDay();
}

/** Número do dia em "2026-10-12" → 12. */
export function dayNumberOf(day: string): number {
  return Number(day.slice(8, 10));
}

/** Dia 12 do mês "2026-10-01" → "2026-10-12". */
export function dayOfMonth(month: string, day: number): string {
  return `${month.slice(0, 7)}-${String(day).padStart(2, "0")}`;
}

/** "2026-10-12" → "12 de outubro de 2026", pro detalhe do item. */
export function formatFullDate(day: string): string {
  const [year, month, dayNumber] = day.split("-").map(Number);
  return `${dayNumber} de ${MONTHS[month - 1].toLowerCase()} de ${year}`;
}

/** "2026-11-16", "2026-11-30" → "16 a 30 de novembro de 2026", pro detalhe
 *  de uma campanha com intervalo (sempre no mesmo mês). */
export function formatDateRange(start: string, end: string): string {
  const [year, month, startDay] = start.split("-").map(Number);
  const endDay = dayNumberOf(end);
  return `${startDay} a ${endDay} de ${MONTHS[month - 1].toLowerCase()} de ${year}`;
}

/** Todos os dias de "start" até "end", inclusive (mesmo formato "YYYY-MM-DD").
 *  Usado pra campanha: o item se repete em cada dia do intervalo. */
export function daysBetween(start: string, end: string): string[] {
  const [startDay] = [dayNumberOf(start)];
  const [endDay] = [dayNumberOf(end)];
  const month = start.slice(0, 7);
  const days: string[] = [];
  for (let day = startDay; day <= endDay; day++) {
    days.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  return days;
}

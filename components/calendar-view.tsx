"use client";

import { ChevronDown, LayoutGrid } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContentTypeBadge } from "@/components/content-type-badge";
import { CreatorCredit } from "@/components/creator-credit";
import {
  CONTENT_TYPE_LABEL,
  dayNumberOf,
  dayOfMonth,
  daysBetween,
  daysInMonth,
  firstWeekdayOf,
  formatDateRange,
  formatFullDate,
  formatMonthYear,
  WEEKDAYS,
  weekdayOf,
} from "@/lib/calendar-constants";
import type { Calendar, CalendarItem } from "@/lib/types";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// Campanha com dia final repete em cada dia do intervalo: o mesmo item
// aparece na grade do mês e na lista em todo dia entre `day` e `endDay`.
function groupByDay(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const groups = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const occurrences = item.endDay ? daysBetween(item.day, item.endDay) : [item.day];
    for (const day of occurrences) {
      const existing = groups.get(day);
      if (existing) existing.push(item);
      else groups.set(day, [item]);
    }
  }
  return groups;
}

// Grade do mês inteiro: serve de índice. Os dias com conteúdo ganham um ponto e
// levam até o bloco correspondente na lista — o mês vazio também fica visível,
// que é o que a lista sozinha não mostra.
function MonthGrid({
  month,
  daysWithItems,
  onPick,
}: {
  month: string;
  daysWithItems: Set<string>;
  onPick: (day: string) => void;
}) {
  const total = daysInMonth(month);
  const offset = firstWeekdayOf(month);
  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, index) => index + 1),
  ];

  return (
    <div className="px-4">
      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAYS.map((weekday) => (
          <span
            key={weekday}
            aria-hidden="true"
            className="pb-1 text-center text-[10px] font-semibold tracking-wide text-muted"
          >
            {weekday}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`empty-${index}`} />;

          const date = dayOfMonth(month, day);
          const has = daysWithItems.has(date);
          return (
            <div key={date} className="flex justify-center">
              {has ? (
                <button
                  type="button"
                  onClick={() => onPick(date)}
                  aria-label={`Ir para ${formatFullDate(date)}`}
                  className="flex size-9 flex-col items-center justify-center gap-[3px] rounded-lg font-semibold text-foreground transition-colors duration-150 hover:bg-surface"
                >
                  <span className="text-[13px] leading-none tabular-nums">
                    {day}
                  </span>
                  <span className="size-1 rounded-full bg-accent" />
                </button>
              ) : (
                <span className="flex size-9 flex-col items-center justify-center gap-[3px] text-muted">
                  <span className="text-[13px] leading-none tabular-nums">
                    {day}
                  </span>
                  <span className="size-1" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Itens sem descrição são só a linha; com descrição, viram botão que abre as
// propriedades e o texto embaixo — sem tirar o cliente da lista.
function Item({ item }: { item: CalendarItem }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(item.description);

  const head = (
    <>
      <ContentTypeBadge type={item.contentType} />
      <span className="min-w-0 flex-1 text-left text-[14px] leading-[1.4]">
        {item.title}
      </span>
    </>
  );

  if (!hasDetail) {
    return (
      <div className="flex items-start gap-3 rounded-lg bg-background px-3 py-2.5">
        {head}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-background">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-surface"
      >
        {head}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`mt-0.5 shrink-0 text-muted transition-transform duration-(--dur-base) ease-(--ease) ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {/* Fica sempre no DOM pra altura poder transicionar; inert tira o
          conteúdo fechado do foco e dos leitores de tela. */}
      <div className="public-reveal" data-open={open}>
        <div>
          <div inert={!open} className="border-t border-line px-3 pt-3 pb-3.5">
            <dl className="mb-3 space-y-1.5">
              <div className="flex gap-2 text-[12px]">
                <dt className="w-16 shrink-0 text-muted">Tipo</dt>
                <dd className="font-medium">
                  {CONTENT_TYPE_LABEL[item.contentType]}
                </dd>
              </div>
              <div className="flex gap-2 text-[12px]">
                <dt className="w-16 shrink-0 text-muted">Data</dt>
                <dd className="font-medium">
                  {item.endDay
                    ? formatDateRange(item.day, item.endDay)
                    : formatFullDate(item.day)}
                </dd>
              </div>
            </dl>
            <p className="text-[13px] leading-[1.6] whitespace-pre-line">
              {item.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarView({ calendar }: { calendar: Calendar }) {
  const { client, items, month } = calendar;
  const dayGroups = groupByDay(items);
  const sortedDays = [...dayGroups.keys()].sort();
  const daysWithItems = new Set(sortedDays);
  const hasAnyDetail = items.some((item) => item.description);

  // Depois de rolar, o bloco pisca uma vez: sem isso o salto parece não ter
  // acontecido quando o dia de destino já estava perto da dobra.
  const reducedMotion = useReducedMotion();
  const [flashing, setFlashing] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const dayRefs = useRef(new Map<string, HTMLDivElement>());
  const registerDay = useCallback((day: string, node: HTMLDivElement | null) => {
    if (node) dayRefs.current.set(day, node);
    else dayRefs.current.delete(day);
  }, []);

  const goToDay = useCallback(
    (day: string) => {
      dayRefs.current.get(day)?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      });
      window.clearTimeout(flashTimer.current);
      setFlashing(day);
      flashTimer.current = window.setTimeout(() => setFlashing(null), 900);
    },
    [reducedMotion],
  );

  // "Ver calendário completo": sobe pro topo de verdade — é lá que fica a
  // grade do mês — tanto do cabeçalho fixo quanto do fim da lista de dias.
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }, [reducedMotion]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-[470px]">
        <header className="sticky top-0 z-10 border-b border-line bg-background">
          <div className="flex h-11 items-center justify-between px-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
              Calendário do mês
            </p>
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              <LayoutGrid size={13} aria-hidden="true" />
              Ver calendário completo
            </button>
          </div>
        </header>

        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={client.avatarUrl}
              alt={`Foto de perfil de ${client.name}`}
              width={48}
              height={48}
              className="size-12 rounded-full border border-line object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold">{client.handle}</p>
              <p className="text-[13px] text-muted">{client.name}</p>
            </div>
            <p className="shrink-0 text-[12px] text-muted">
              {items.length} {items.length === 1 ? "item" : "itens"} · Rabisco
            </p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <h1 className="text-[24px] leading-tight font-bold">
            {formatMonthYear(month)}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Planejamento de conteúdo
            {hasAnyDetail && " · toque num item pra ver os detalhes"}
          </p>
        </div>

        <MonthGrid
          month={month}
          daysWithItems={daysWithItems}
          onPick={goToDay}
        />

        <div className="mt-5 space-y-1 px-4 pb-6">
          {sortedDays.map((day, index) => (
            <div
              key={day}
              ref={(node) => registerDay(day, node)}
              style={{ "--i": index } as React.CSSProperties}
              data-flash={flashing === day}
              className="public-in public-day scroll-mt-16 rounded-xl bg-surface p-4"
            >
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-[28px] leading-none font-bold tabular-nums">
                  {dayNumberOf(day)}
                </span>
                <span className="text-[13px] font-semibold tracking-wide text-muted">
                  {weekdayOf(day)}
                </span>
              </div>
              <div className="space-y-2">
                {dayGroups.get(day)!.map((item) => (
                  <Item key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {sortedDays.length > 3 && (
          <div className="px-4 pb-5 text-center">
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white"
            >
              <LayoutGrid size={14} aria-hidden="true" />
              Voltar ao calendário completo
            </button>
          </div>
        )}

        <footer className="border-t border-line px-4 pt-5 pb-[calc(24px+env(safe-area-inset-bottom))] text-center">
          <p className="text-[13px] leading-[1.4] text-muted">
            Este é o planejamento do mês. Para ajustes ou sugestões, fale com a
            Rabisco pelo WhatsApp.
          </p>
          <CreatorCredit className="mt-3 text-muted" />
          <p className="mt-2 text-[11px] text-muted">
            Calendário preparado pela Rabisco
          </p>
        </footer>
      </div>
    </div>
  );
}

"use client";

import { CreatorCredit } from "@/components/creator-credit";
import type { Calendar, CalendarItem, ContentType } from "@/lib/types";

const CONTENT_TYPE_CONFIG: Record<
  ContentType,
  { label: string; emoji: string; color: string }
> = {
  post: { label: "Post", emoji: "📸", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  carrossel: { label: "Carrossel", emoji: "🖼️", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  reels: { label: "Reels", emoji: "🎬", color: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  story: { label: "Story", emoji: "📱", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  campanha: { label: "Campanha", emoji: "📣", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};

function formatMonthYear(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[month - 1]} ${year}`;
}

function formatDay(dateStr: string): { day: number; weekday: string } {
  const [year, month, dayNum] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, dayNum);
  const weekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  return { day: dayNum, weekday: weekdays[date.getDay()] };
}

function groupByDay(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const groups = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const existing = groups.get(item.day);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(item.day, [item]);
    }
  }
  return groups;
}

export function CalendarView({ calendar }: { calendar: Calendar }) {
  const { client, items } = calendar;
  const dayGroups = groupByDay(items);
  const sortedDays = [...dayGroups.keys()].sort();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-[470px]">
        {/* Barra de topo */}
        <header className="sticky top-0 z-10 border-b border-line bg-background">
          <div className="flex h-11 items-center justify-between px-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <span
                className="size-2 rounded-full bg-accent"
                aria-hidden="true"
              />
              Calendário do mês
            </p>
            <p className="text-[12px] text-muted">
              {items.length} {items.length === 1 ? "item" : "itens"} · Rabisco
            </p>
          </div>
        </header>

        {/* Perfil do cliente */}
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
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold">{client.handle}</p>
              <p className="text-[13px] text-muted">{client.name}</p>
            </div>
          </div>
        </div>

        {/* Título do mês */}
        <div className="px-4 pb-5">
          <h1 className="text-[24px] font-bold leading-tight">
            {formatMonthYear(calendar.month)}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Planejamento de conteúdo
          </p>
        </div>

        {/* Lista de dias */}
        <div className="space-y-1 px-4 pb-6">
          {sortedDays.map((day) => {
            const { day: dayNum, weekday } = formatDay(day);
            const dayItems = dayGroups.get(day)!;
            return (
              <div key={day} className="rounded-xl bg-surface p-4">
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="text-[28px] font-bold leading-none tabular-nums">
                    {dayNum}
                  </span>
                  <span className="text-[13px] font-semibold tracking-wide text-muted">
                    {weekday}
                  </span>
                </div>
                <div className="space-y-2">
                  {dayItems.map((item) => {
                    const config = CONTENT_TYPE_CONFIG[item.contentType];
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 rounded-lg bg-background px-3 py-2.5"
                      >
                        <span
                          className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${config.color}`}
                        >
                          <span aria-hidden="true">{config.emoji}</span>
                          {config.label}
                        </span>
                        <p className="min-w-0 flex-1 text-[14px] leading-[1.4]">
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé */}
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

"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/icons";
import {
  firstOfDay,
  formatStoryChip,
  groupByDay,
  nextStory,
  previousStory,
  STORY_DURATION_MS,
  STORY_HOLD_MS,
  storyLabel,
  storyPlace,
} from "@/lib/stories";
import type { Story } from "@/lib/types";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const SWIPE_CLOSE_PX = 80;

export function StoryViewer({
  stories,
  number,
  onNavigate,
  onClose,
  onSeen,
}: {
  stories: Story[];
  number: number;
  onNavigate: (number: number) => void;
  onClose: () => void;
  onSeen: (number: number) => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const [holding, setHolding] = useState(false);
  // Número do story cuja imagem já carregou: o tempo só corre depois disso.
  const [loaded, setLoaded] = useState<number | null>(null);
  const press = useRef<{ x: number; y: number; timer: number; held: boolean } | null>(null);
  // Depois de segurar pra pausar, o clique que vem junto não navega.
  const swallowClick = useRef(false);

  const { story, day, indexInDay } = storyPlace(stories, number);
  const label = storyLabel(stories, number);
  const days = groupByDay(stories);
  const total = stories.length;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Pré-carrega a próxima arte.
  useEffect(() => {
    const next = stories[number];
    if (next) new Image().src = next.url;
  }, [stories, number]);

  // Avançar a partir de um story conta como visto.
  function advance() {
    onSeen(number);
    const next = nextStory(total, number);
    if (next === null) onClose();
    else onNavigate(next);
  }

  function back() {
    onNavigate(previousStory(number));
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      advance();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      back();
    } else if (event.key === "Tab") {
      // Foco preso na sobreposição.
      const focusable = dialog.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled])",
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function onPointerDown(event: React.PointerEvent) {
    const timer = window.setTimeout(() => {
      if (press.current) press.current.held = true;
      setHolding(true);
    }, STORY_HOLD_MS);
    press.current = { x: event.clientX, y: event.clientY, timer, held: false };
  }

  function onPointerUp(event: React.PointerEvent) {
    const current = press.current;
    press.current = null;
    if (!current) return;
    window.clearTimeout(current.timer);
    setHolding(false);
    const dy = event.clientY - current.y;
    const dx = Math.abs(event.clientX - current.x);
    if (dy > SWIPE_CLOSE_PX && dx < dy) {
      swallowClick.current = true;
      onClose();
      return;
    }
    swallowClick.current = current.held;
  }

  function onPointerCancel() {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
    setHolding(false);
  }

  function tap(action: () => void) {
    return () => {
      if (swallowClick.current) {
        swallowClick.current = false;
        return;
      }
      action();
    };
  }

  const running = !reducedMotion && !holding && loaded === number;
  const dayStories = stories.filter((item) => item.day === day);

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="public-overlay-in fixed inset-0 z-50 flex flex-col bg-black text-white select-none"
    >
      <div className="mx-auto flex w-full max-w-[470px] flex-1 flex-col overflow-hidden">
        <header className="shrink-0 px-2 pt-[calc(8px+env(safe-area-inset-top))]">
          <div className="flex gap-1" aria-hidden="true">
            {dayStories.map((item, index) => (
              <span key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/35">
                <span
                  // A chave muda a cada story, então a animação recomeça do zero.
                  key={index === indexInDay ? `${number}-ativo` : item.id}
                  className="block h-full origin-left bg-white"
                  style={
                    index < indexInDay
                      ? undefined
                      : index > indexInDay
                        ? { transform: "scaleX(0)" }
                        : reducedMotion
                          ? undefined
                          : {
                              transform: "scaleX(0)",
                              animation: `story-progress ${STORY_DURATION_MS}ms linear forwards`,
                              animationPlayState: running ? "running" : "paused",
                            }
                  }
                  onAnimationEnd={index === indexInDay ? advance : undefined}
                />
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 pl-2">
            <p className="flex-1 text-[13px] font-semibold" aria-live="polite">
              {label}
            </p>
            <button
              ref={closeButton}
              type="button"
              onClick={onClose}
              aria-label="Fechar os stories"
              className="flex size-11 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white"
            >
              <CloseIcon />
            </button>
          </div>
          {days.length > 1 && (
            <nav aria-label="Dias" className="flex gap-2 overflow-x-auto px-2 pb-2">
              {days.map((group) => {
                const current = group.day === day;
                return (
                  <button
                    key={group.day}
                    type="button"
                    onClick={() => onNavigate(firstOfDay(stories, group.day))}
                    aria-current={current ? "true" : undefined}
                    className={`h-8 shrink-0 cursor-pointer rounded-full px-3 text-[12px] font-semibold focus-visible:outline-2 focus-visible:outline-white ${
                      current ? "bg-white text-black" : "bg-white/15 text-white"
                    }`}
                  >
                    {formatStoryChip(group.day)}
                  </button>
                );
              })}
            </nav>
          )}
        </header>

        <div
          className="relative min-h-0 flex-1 touch-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerCancel}
          onContextMenu={(event) => event.preventDefault()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={story.id}
            src={story.url}
            alt={`Story ${number} de ${total}`}
            onLoad={() => setLoaded(number)}
            // Imagem quebrada não pode travar o avanço.
            onError={() => setLoaded(number)}
            draggable={false}
            className="absolute inset-0 m-auto aspect-[9/16] max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            onClick={tap(back)}
            disabled={number === 1}
            aria-label="Story anterior"
            className="absolute inset-y-0 left-0 w-1/3 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white disabled:cursor-default"
          />
          <button
            type="button"
            onClick={tap(advance)}
            aria-label={number === total ? "Fechar os stories" : "Próximo story"}
            className="absolute inset-y-0 right-0 w-1/3 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
          />
        </div>

        <p className="shrink-0 px-4 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))] text-center text-[12px] text-white/75">
          Pra pedir ajuste, mande no WhatsApp o número do story.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronIcon } from "@/components/icons";
import type { Media } from "@/lib/types";

const SWIPE_THRESHOLD = 40;

/** Fallback enquanto a primeira imagem ainda não carregou. */
const DEFAULT_RATIO = 4 / 5;

export function Carousel({ media, alt }: { media: Media[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const startX = useRef<number | null>(null);
  const ratioDetected = useRef(false);

  const last = media.length - 1;

  function goTo(next: number) {
    setIndex(Math.min(last, Math.max(0, next)));
  }

  // Detecta o aspect ratio real a partir da primeira imagem carregada.
  const handleFirstLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (ratioDetected.current) return;
      const img = e.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        ratioDetected.current = true;
        setRatio(img.naturalWidth / img.naturalHeight);
      }
    },
    [],
  );

  function onTouchStart(event: React.TouchEvent) {
    if (event.touches.length !== 1) return;
    startX.current = event.touches[0].clientX;
    setDrag(0);
  }

  function onTouchMove(event: React.TouchEvent) {
    if (startX.current === null) return;
    const delta = event.touches[0].clientX - startX.current;
    // Resistência nas pontas, onde não há slide pra revelar.
    const atEdge = (index === 0 && delta > 0) || (index === last && delta < 0);
    setDrag(atEdge ? delta / 3 : delta);
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (startX.current === null) return;
    const delta = event.changedTouches[0].clientX - startX.current;
    if (delta <= -SWIPE_THRESHOLD) goTo(index + 1);
    else if (delta >= SWIPE_THRESHOLD) goTo(index - 1);
    startX.current = null;
    setDrag(null);
  }

  function onTouchCancel() {
    startX.current = null;
    setDrag(null);
  }

  return (
    <div>
      <div
        role="group"
        aria-roledescription="carrossel"
        aria-label={alt}
        className="relative touch-pan-y overflow-hidden bg-surface"
        style={{ aspectRatio: ratio }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        <div
          className="flex h-full"
          style={{
            transform: `translateX(calc(${-index * 100}% + ${drag ?? 0}px))`,
            transition: drag === null ? "transform .3s" : "none",
          }}
        >
          {media.map((item, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.url}
              src={item.url}
              alt={`${alt}, imagem ${i + 1} de ${media.length}`}
              aria-hidden={i !== index}
              draggable={false}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              onLoad={i === 0 ? handleFirstLoad : undefined}
              className="size-full shrink-0 object-cover select-none"
            />
          ))}
        </div>

        <span
          aria-hidden="true"
          className="absolute top-3 right-3 rounded-full bg-[rgba(0,0,0,.72)] px-2.5 py-1 text-[12px] leading-none font-semibold text-white"
        >
          {index + 1}/{media.length}
        </span>
        <span className="sr-only" aria-live="polite">
          Imagem {index + 1} de {media.length}
        </span>

        {index > 0 && (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Imagem anterior"
            className="group absolute top-1/2 left-0 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center"
          >
            <ArrowCircle direction="left" />
          </button>
        )}
        {index < last && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Próxima imagem"
            className="group absolute top-1/2 right-0 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center"
          >
            <ArrowCircle direction="right" />
          </button>
        )}
      </div>

      <div
        aria-hidden="true"
        className="flex justify-center gap-1 pt-3"
      >
        {media.map((item, i) => (
          <span
            key={item.url}
            className={`size-1.5 rounded-full ${i === index ? "bg-accent" : "bg-line"}`}
          />
        ))}
      </div>
    </div>
  );
}

function ArrowCircle({ direction }: { direction: "left" | "right" }) {
  return (
    <span className="flex size-[30px] items-center justify-center rounded-full bg-white text-[#0c1014] shadow-[0_1px_4px_rgba(0,0,0,.3)] group-focus-visible:outline-2 group-focus-visible:outline-accent">
      <ChevronIcon direction={direction} size={16} />
    </span>
  );
}

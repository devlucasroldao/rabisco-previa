"use client";

import { useEffect, useRef } from "react";
import { Carousel } from "@/components/carousel";
import { CreatorCredit } from "@/components/creator-credit";
import { ChevronIcon } from "@/components/icons";
import { postTypeLabel, splitCaption } from "@/lib/post";
import type { Client, Post } from "@/lib/types";

export function PostViewer({
  client,
  post,
  number,
  total,
  onNavigate,
  onClose,
  compressedNote = false,
}: {
  client: Client;
  post: Post;
  number: number;
  total: number;
  onNavigate: (number: number) => void;
  // Ausente quando a apresentação tem um post só e não há grid pra voltar.
  onClose?: () => void;
  // O aviso do rodapé do grid, pra quando o grid não aparece (Reels único).
  compressedNote?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    scroller.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [number]);

  const { body, hashtags } = splitCaption(post.caption);
  const alt = `Post ${number} de ${client.name}`;

  return (
    <div
      ref={scroller}
      role={onClose ? "dialog" : "main"}
      aria-modal={onClose ? true : undefined}
      aria-label={`Post ${number} de ${total}`}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose?.();
      }}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background outline-none"
    >
      <div className="mx-auto max-w-[470px]">
        <header className="sticky top-0 z-10 grid h-[52px] grid-cols-[44px_1fr_44px] items-center border-b border-line bg-background px-1">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Voltar para os posts"
              className="flex size-11 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-accent"
            >
              <ChevronIcon direction="left" />
            </button>
          ) : (
            <span />
          )}
          <div className="text-center">
            <p className="text-[15px] leading-tight font-bold">
              Post {number} de {total}
            </p>
            <p className="text-[12px] leading-tight text-muted">
              {postTypeLabel(post)}
            </p>
          </div>
        </header>

        <div className="flex items-center gap-2.5 px-4 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={client.avatarUrl}
            alt={`Foto de perfil de ${client.name}`}
            width={32}
            height={32}
            className="size-8 rounded-full border border-line object-cover"
          />
          <p className="text-[14px] font-semibold">{client.handle}</p>
        </div>

        <PostMedia key={post.id} post={post} alt={alt} />

        <div className="px-4 pt-3 pb-[calc(24px+env(safe-area-inset-bottom))]">
          <div className="text-[14px] leading-[1.45]">
            <p className="break-words whitespace-pre-line">
              <span className="font-semibold">{client.handle}</span> {body}
            </p>
            {hashtags.length > 0 && (
              <p className="mt-1 break-words text-hashtag">
                {hashtags.join(" ")}
              </p>
            )}
          </div>

          <p className="mt-5 rounded-[12px] bg-surface px-4 py-3 text-[13px] leading-[1.45]">
            Quer ajustar algo? Tire um print desta tela e mande no WhatsApp com{" "}
            <strong className="font-semibold">“Post {number}: …”</strong> e o
            que quer mudar.
          </p>

          {compressedNote && (
            <p className="mt-3 text-center text-[11px] text-muted">
              Os vídeos desta prévia estão comprimidos. O arquivo final é publicado
              em qualidade total.
            </p>
          )}

          {total > 1 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigate(number - 1)}
                disabled={number === 1}
                className="h-11 cursor-pointer rounded-[10px] border border-line text-[14px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-35"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => onNavigate(number + 1)}
                disabled={number === total}
                className="h-11 cursor-pointer rounded-[10px] bg-accent text-[14px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-35"
              >
                Próximo
              </button>
            </div>
          )}

          {/* No fim da página, abaixo de Anterior/Próximo e fora do vídeo
              (inclusive no Reels único, que abre direto aqui). */}
          <CreatorCredit className="mt-4 text-muted" />
        </div>
      </div>
    </div>
  );
}

function PostMedia({ post, alt }: { post: Post; alt: string }) {
  const first = post.media[0];
  if (!first) return null;

  if (first.kind === "video") {
    return (
      <div className="flex justify-center bg-black">
        <video
          src={first.url}
          poster={first.poster}
          controls
          playsInline
          loop
          preload="metadata"
          aria-label={alt}
          // Desconta o topo e a linha do @ pra os controles caberem na tela.
          className="aspect-[9/16] max-h-[calc(100dvh-104px)] w-full object-contain"
        />
      </div>
    );
  }

  if (post.media.length > 1) {
    return <Carousel media={post.media} alt={alt} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={first.url}
      alt={alt}
      decoding="async"
      className="aspect-[4/5] w-full bg-surface object-cover"
    />
  );
}

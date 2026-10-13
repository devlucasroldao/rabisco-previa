import { CarouselIcon, GridIcon, ReelsIcon } from "@/components/icons";
import { postThumbnail, postTypeLabel } from "@/lib/post";
import type { Presentation } from "@/lib/types";

const COLUMNS = 3;
const EXTRA_ROWS = 2;

export function thumbnailId(number: number) {
  return `post-thumb-${number}`;
}

export function ProfileGrid({
  presentation,
  onOpen,
}: {
  presentation: Presentation;
  onOpen: (number: number) => void;
}) {
  const { client, posts } = presentation;

  // Completa a linha atual e acrescenta mais duas fileiras de silhuetas.
  const placeholders =
    ((COLUMNS - (posts.length % COLUMNS)) % COLUMNS) + COLUMNS * EXTRA_ROWS;

  return (
    <div className="mx-auto min-h-dvh max-w-[470px]">
      <div className="flex h-11 items-center justify-between border-b border-line px-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          Prévia da semana
        </p>
        <p className="text-[12px] text-muted">
          {posts.length} {posts.length === 1 ? "conteúdo" : "conteúdos"} ·
          Rabisco
        </p>
      </div>

      <header className="px-4 pt-5 pb-5">
        <div className="flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={client.avatarUrl}
            alt={`Foto de perfil de ${client.name}`}
            width={84}
            height={84}
            className="size-[84px] shrink-0 rounded-full border border-line object-cover"
          />
          <div className="min-w-0">
            <h1 className="truncate text-[20px] leading-tight font-bold">
              {client.handle}
            </h1>
            <p className="mt-0.5 text-[14px] text-muted">{client.name}</p>
          </div>
        </div>
        {client.bio && (
          <p className="mt-3 text-[14px] leading-[1.4] whitespace-pre-line">
            {client.bio}
          </p>
        )}
      </header>

      <div className="flex justify-center border-t border-line">
        <h2 className="-mt-px flex h-11 items-center gap-1.5 border-t border-foreground text-[12px] font-semibold tracking-[1px]">
          <GridIcon />
          PRÓXIMOS POSTS
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-[2px]">
        {posts.map((post, index) => {
          const number = index + 1;
          const thumbnail = postThumbnail(post);
          return (
            <button
              key={post.id}
              id={thumbnailId(number)}
              type="button"
              onClick={() => onOpen(number)}
              aria-label={`Abrir post ${number}, ${postTypeLabel(post)}`}
              className="relative aspect-[3/4] cursor-pointer overflow-hidden bg-surface focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-accent"
            >
              {thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnail}
                  alt=""
                  loading={index < 6 ? "eager" : "lazy"}
                  decoding="async"
                  className="absolute inset-0 size-full object-cover"
                />
              )}
              <span className="absolute top-1.5 left-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[rgba(0,0,0,.72)] px-1.5 text-[12px] leading-none font-bold text-white">
                {number}
              </span>
              {post.type === "carousel" && (
                <CarouselIcon className="absolute top-2 right-2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.5)]" />
              )}
              {post.type === "reels" && (
                <ReelsIcon className="absolute top-2 right-2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.5)]" />
              )}
            </button>
          );
        })}
        {Array.from({ length: placeholders }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="aspect-[3/4] bg-surface"
            style={{
              opacity:
                placeholders === 1
                  ? 0.8
                  : 0.8 - (0.7 * index) / (placeholders - 1),
            }}
          />
        ))}
      </div>

      <footer className="px-8 pt-6 pb-[calc(32px+env(safe-area-inset-bottom))] text-center text-muted">
        <p className="text-[13px] leading-[1.4]">
          Toque num conteúdo para ver em tela cheia. Pra pedir ajuste, mande no
          WhatsApp o número do post.
        </p>
        <p className="mt-3 text-[11px]">Prévia preparada pela Rabisco</p>
      </footer>
    </div>
  );
}

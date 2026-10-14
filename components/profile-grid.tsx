import { CarouselIcon, CloseIcon, GridIcon, ReelsIcon } from "@/components/icons";
import { postThumbnail, postTypeLabel } from "@/lib/post";
import { avatarLabel, contentCounter } from "@/lib/stories";
import type { Presentation } from "@/lib/types";

export const STORIES_AVATAR_ID = "stories-avatar";

// Só o anel imita a convenção dos stories; nada de logo, nome ou ícones.
const STORY_RING = "linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)";

export type StoriesEntry = {
  everythingSeen: boolean;
  hint: boolean;
  onOpen: () => void;
  onDismissHint: () => void;
};

const COLUMNS = 3;
const EXTRA_ROWS = 2;

export function thumbnailId(number: number) {
  return `post-thumb-${number}`;
}

export function ProfileGrid({
  presentation,
  onOpen,
  stories,
}: {
  presentation: Presentation;
  onOpen: (number: number) => void;
  // Ausente quando a apresentação não tem stories: o avatar fica como sempre.
  stories?: StoriesEntry;
}) {
  const { client, posts } = presentation;
  const storyCount = presentation.stories.length;

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
          {contentCounter(posts.length, storyCount)} · Rabisco
        </p>
      </div>

      <header className="px-4 pt-5 pb-5">
        <div className="relative flex items-center gap-5">
          {stories && storyCount > 0 ? (
            <StoriesAvatar
              src={client.avatarUrl}
              total={storyCount}
              entry={stories}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={client.avatarUrl}
              alt={`Foto de perfil de ${client.name}`}
              width={84}
              height={84}
              className="size-[84px] shrink-0 rounded-full border border-line object-cover"
            />
          )}
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
        {posts.some((post) => post.type === "reels") && (
          <p className="mt-1 text-[11px]">
            Os vídeos desta prévia estão comprimidos. O arquivo final é publicado
            em qualidade total.
          </p>
        )}
      </footer>
    </div>
  );
}

// Avatar com anel: colorido enquanto há story não visto, cinza quando todos
// foram vistos neste aparelho. O anel é decorativo; quem fala é o botão.
function StoriesAvatar({
  src,
  total,
  entry,
}: {
  src: string;
  total: number;
  entry: StoriesEntry;
}) {
  return (
    <>
      <button
        id={STORIES_AVATAR_ID}
        type="button"
        onClick={entry.onOpen}
        aria-label={avatarLabel(total, entry.everythingSeen)}
        className="relative size-[96px] shrink-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {/* 3 px de anel, 3 px de espaço e a foto de 84 px. */}
        <span
          aria-hidden="true"
          data-ring={entry.everythingSeen ? "visto" : "novo"}
          className="absolute inset-0 rounded-full"
          style={{
            background: entry.everythingSeen ? "var(--story-seen)" : STORY_RING,
          }}
        />
        <span aria-hidden="true" className="absolute inset-[3px] rounded-full bg-background" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={84}
          height={84}
          className="absolute inset-[6px] size-[84px] rounded-full border border-line object-cover"
        />
      </button>
      {entry.hint && (
        <div
          role="note"
          // Abaixo do avatar: cobre no máximo o começo da bio, nunca o @ nem o
          // nome, que ficam ao lado da foto.
          // Uma linha só e baixinho (o X passa da borda pra manter os 44 px de
          // alvo), pra tapar só a primeira linha da bio.
          className="absolute top-full left-0 z-10 mt-1 flex h-7 w-max max-w-full items-center rounded-[10px] bg-foreground pl-3 text-[13px] leading-none font-medium whitespace-nowrap text-background shadow-lg"
        >
          {/* Seta apontando pra cima, pro centro do avatar (96 px). */}
          <span
            aria-hidden="true"
            className="absolute -top-[6px] left-[42px] size-3 rotate-45 bg-foreground"
          />
          <span className="relative truncate">Toque na foto para ver os stories da semana</span>
          <button
            type="button"
            onClick={entry.onDismissHint}
            aria-label="Fechar a dica"
            className="relative -my-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-accent"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      )}
    </>
  );
}

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PostViewer } from "@/components/post-viewer";
import {
  ProfileGrid,
  STORIES_AVATAR_ID,
  thumbnailId,
} from "@/components/profile-grid";
import { StoryViewer } from "@/components/story-viewer";
import {
  STORAGE_PENDING,
  STORAGE_UNAVAILABLE,
  readStored,
  useStored,
  writeStored,
} from "@/lib/story-storage";
import {
  addSeen,
  allSeen,
  HINT_STORAGE_KEY,
  parseSeen,
  seenStorageKey,
  showsHint,
  skipsGrid,
} from "@/lib/stories";
import type { Presentation } from "@/lib/types";

function fromParam(value: string | null, total: number): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= total ? number : null;
}

export function PresentationView({
  presentation,
}: {
  presentation: Presentation;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openedFromGrid = useRef(false);
  const lastOpened = useRef<string | null>(null);

  const { client, posts, stories, token } = presentation;
  const total = posts.length;
  const single = skipsGrid(total, stories.length);

  // O post ou o story aberto mora na URL (?post=2, ?story=3): voltar no
  // navegador fecha o visualizador e o link pode ser compartilhado.
  const activeStory = fromParam(searchParams.get("story"), stories.length);
  const fromUrl = activeStory ? null : fromParam(searchParams.get("post"), total);
  const active = single ? 1 : fromUrl;

  // Stories vistos neste aparelho. Sem localStorage, o anel fica colorido.
  const seenKey = seenStorageKey(token);
  const seenRaw = useStored(seenKey);
  const seen = parseSeen(
    seenRaw === STORAGE_PENDING || seenRaw === STORAGE_UNAVAILABLE ? null : seenRaw,
  );
  const everythingSeen = allSeen(seen, stories.length);

  const hintRaw = useStored(HINT_STORAGE_KEY);
  const [hintClosed, setHintClosed] = useState(false);
  const hint = showsHint({
    storyCount: stories.length,
    everythingSeen,
    // Antes de ler o aparelho, o balão espera (não pisca na hidratação).
    dismissed:
      hintRaw === STORAGE_PENDING ? true : hintRaw === STORAGE_UNAVAILABLE ? null : hintRaw === "1",
    closedNow: hintClosed,
  });

  // Ao fechar, devolve o foco pra miniatura ou pro avatar que abriu.
  const opened = activeStory !== null ? "story" : active !== null ? `post-${active}` : null;
  useEffect(() => {
    if (opened !== null) {
      lastOpened.current = opened;
    } else if (lastOpened.current !== null) {
      const target =
        lastOpened.current === "story"
          ? STORIES_AVATAR_ID
          : thumbnailId(Number(lastOpened.current.slice(5)));
      document.getElementById(target)?.focus({ preventScroll: true });
      lastOpened.current = null;
    }
  }, [opened]);

  function open(number: number) {
    openedFromGrid.current = true;
    window.history.pushState(null, "", `?post=${number}`);
  }

  // Trocar de post ou de story substitui a entrada do histórico, então um
  // único "voltar" sempre leva ao grid.
  function navigate(number: number) {
    window.history.replaceState(null, "", `?post=${number}`);
  }

  function dismissHint() {
    setHintClosed(true);
    writeStored(HINT_STORAGE_KEY, "1");
  }

  // Abre no primeiro story ainda não visto (ou no primeiro, se viu todos).
  function openStories() {
    dismissHint();
    const first = stories.find((story) => !seen.has(story.number))?.number ?? 1;
    openedFromGrid.current = true;
    window.history.pushState(null, "", `?story=${first}`);
  }

  function navigateStory(number: number) {
    window.history.replaceState(null, "", `?story=${number}`);
  }

  function markSeen(number: number) {
    const current = readStored(seenKey);
    if (current === STORAGE_UNAVAILABLE) return;
    writeStored(seenKey, addSeen(current, number));
  }

  function close() {
    if (openedFromGrid.current) {
      openedFromGrid.current = false;
      window.history.back();
    } else {
      // Entrou direto pelo link: não há grid no histórico.
      window.history.replaceState(null, "", pathname);
    }
  }

  return (
    <>
      {!single && (
        <main inert={active !== null || activeStory !== null}>
          <ProfileGrid
            presentation={presentation}
            onOpen={open}
            stories={
              stories.length > 0
                ? { everythingSeen, hint, onOpen: openStories, onDismissHint: dismissHint }
                : undefined
            }
          />
        </main>
      )}
      {activeStory !== null && (
        <StoryViewer
          stories={stories}
          number={activeStory}
          onNavigate={navigateStory}
          onClose={close}
          onSeen={markSeen}
        />
      )}
      {active !== null && activeStory === null && (
        <PostViewer
          client={client}
          post={posts[active - 1]}
          number={active}
          total={total}
          onNavigate={navigate}
          onClose={single ? undefined : close}
          compressedNote={single && posts[0].type === "reels"}
        />
      )}
    </>
  );
}

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { PostViewer } from "@/components/post-viewer";
import { ProfileGrid, thumbnailId } from "@/components/profile-grid";
import type { Presentation } from "@/lib/types";

export function PresentationView({
  presentation,
}: {
  presentation: Presentation;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openedFromGrid = useRef(false);
  const lastOpened = useRef<number | null>(null);

  const { client, posts } = presentation;
  const total = posts.length;
  const single = total === 1;

  // O post aberto mora na URL (?post=2): voltar no navegador fecha o
  // visualizador e o link de um post específico pode ser compartilhado.
  const param = Number(searchParams.get("post"));
  const fromUrl =
    Number.isInteger(param) && param >= 1 && param <= total ? param : null;
  const active = single ? 1 : fromUrl;

  // Ao fechar, devolve o foco pra miniatura que estava aberta.
  useEffect(() => {
    if (active !== null) {
      lastOpened.current = active;
    } else if (lastOpened.current !== null) {
      document
        .getElementById(thumbnailId(lastOpened.current))
        ?.focus({ preventScroll: true });
      lastOpened.current = null;
    }
  }, [active]);

  function open(number: number) {
    openedFromGrid.current = true;
    window.history.pushState(null, "", `?post=${number}`);
  }

  // Trocar de post substitui a entrada do histórico, então um único "voltar"
  // sempre leva ao grid.
  function navigate(number: number) {
    window.history.replaceState(null, "", `?post=${number}`);
  }

  function close() {
    if (openedFromGrid.current) {
      openedFromGrid.current = false;
      window.history.back();
    } else {
      // Entrou direto pelo link do post: não há grid no histórico.
      window.history.replaceState(null, "", pathname);
    }
  }

  return (
    <>
      {!single && (
        <main inert={active !== null}>
          <ProfileGrid presentation={presentation} onOpen={open} />
        </main>
      )}
      {active !== null && (
        <PostViewer
          client={client}
          post={posts[active - 1]}
          number={active}
          total={total}
          onNavigate={navigate}
          onClose={single ? undefined : close}
        />
      )}
    </>
  );
}

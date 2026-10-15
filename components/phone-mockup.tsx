import { CarouselIcon, GridIcon, ReelsIcon } from "@/components/icons";

// Celular decorativo da página inicial: uma prévia fictícia no formato da tela
// do cliente (faixa, perfil com anel de story, aba e grid 3:4), só com HTML e
// CSS. Nada de imagem nova, marca de terceiros ou cliente real; o único
// arquivo usado é o monograma "r." que já existe. Server Component, sem JS.

// As mesmas cores do anel de story da tela do cliente (components/profile-grid.tsx).
const STORY_RING = "linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)";

type Tile = {
  bg: string;
  kind?: "carousel" | "reels";
  art: React.ReactNode;
};

// Artes abstratas nos tons da marca.
const tiles: Tile[] = [
  {
    bg: "bg-mock-cream",
    art: (
      <>
        <span className="absolute top-[30%] left-1/2 size-[44%] -translate-x-1/2 rounded-full bg-mock-terracota" />
        <span className="absolute right-[18%] bottom-[16%] left-[18%] h-[6%] rounded-full bg-mock-terracota-dark/70" />
      </>
    ),
  },
  {
    bg: "bg-mock-mustard",
    kind: "carousel",
    art: (
      <>
        <span className="absolute inset-x-[16%] top-[24%] h-[34%] rounded-[6px] bg-mock-screen" />
        <span className="absolute inset-x-[16%] top-[64%] h-[6%] rounded-full bg-mock-terracota-dark/60" />
        <span className="absolute top-[74%] right-[40%] left-[16%] h-[6%] rounded-full bg-mock-terracota-dark/40" />
      </>
    ),
  },
  {
    bg: "bg-mock-terracota-dark",
    kind: "reels",
    art: (
      <>
        <span className="absolute bottom-0 left-[12%] h-[58%] w-[34%] rounded-t-full bg-mock-terracota" />
        <span className="absolute right-[10%] bottom-0 h-[40%] w-[40%] rounded-t-full bg-mock-mustard" />
      </>
    ),
  },
  {
    bg: "bg-mock-screen",
    art: (
      <>
        <span className="absolute -bottom-[18%] left-1/2 size-[80%] -translate-x-1/2 rounded-full bg-mock-mustard" />
        <span className="absolute inset-x-[20%] top-[22%] h-[7%] rounded-full bg-mock-text/70" />
      </>
    ),
  },
  {
    bg: "bg-mock-terracota",
    kind: "carousel",
    art: (
      <>
        <span className="absolute top-[22%] left-[18%] size-[22%] rounded-full bg-mock-mustard" />
        <span className="absolute inset-x-[18%] bottom-[20%] h-[30%] rounded-[6px] border-2 border-mock-screen/80" />
      </>
    ),
  },
  {
    bg: "bg-mock-cream",
    art: (
      <span
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, var(--mock-terracota) 0 10%, transparent 10% 20%)",
          opacity: 0.85,
        }}
      />
    ),
  },
];

export function PhoneMockup() {
  return (
    <div
      aria-hidden="true"
      // No celular o mockup fica menor e é cortado só na base: o clip-path
      // deixa a sombra e o flutuar aparecerem em cima e dos lados.
      className="mx-auto h-[440px] w-[248px] [clip-path:inset(-60px_-60px_0_-60px)] md:h-auto md:w-[300px] md:[clip-path:none]"
    >
      <div className="pub-float">
        <div className="relative rounded-[44px] bg-mock-frame p-[10px] shadow-[0_24px_60px_rgb(43_37_34/0.35)]">
          {/* Ilha da câmera. */}
          <span className="absolute top-[18px] left-1/2 z-10 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-mock-frame" />
          <div className="overflow-hidden rounded-[34px] bg-mock-screen pt-9 text-mock-text">
            <div className="flex h-7 items-center justify-between border-b border-mock-line px-3 text-[8px]">
              <span className="flex items-center gap-1 font-semibold">
                <span className="size-1.5 rounded-full bg-mock-terracota" />
                Prévia da semana
              </span>
              <span className="text-mock-muted">6 conteúdos · Rabisco</span>
            </div>

            <div className="flex items-center gap-3 px-3 pt-3 pb-2.5">
              <span className="relative size-[54px] shrink-0 rounded-full" style={{ background: STORY_RING }}>
                <span className="absolute inset-[2px] rounded-full bg-mock-screen" />
                {/* eslint-disable-next-line @next/next/no-img-element -- monograma da marca, já existente */}
                <img
                  src="/brand/web/marca-64.png"
                  alt=""
                  width={46}
                  height={46}
                  className="absolute inset-[4px] size-[46px] rounded-full"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] leading-tight font-bold">suamarca</span>
                <span className="block text-[9px] text-mock-muted">Sua Marca</span>
              </span>
            </div>
            <div className="space-y-1 px-3 pb-3">
              <span className="block h-1.5 w-[78%] rounded-full bg-mock-line" />
              <span className="block h-1.5 w-[56%] rounded-full bg-mock-line" />
            </div>

            <div className="flex justify-center border-t border-mock-line">
              <span className="-mt-px flex h-7 items-center gap-1 border-t border-mock-text text-[7px] font-semibold tracking-[0.6px]">
                <GridIcon size={8} />
                PRÓXIMOS POSTS
              </span>
            </div>

            <div className="grid grid-cols-3 gap-[2px]">
              {tiles.map((tile, index) => (
                <span key={index} className={`relative aspect-[3/4] overflow-hidden ${tile.bg}`}>
                  {tile.art}
                  <span className="absolute top-1 left-1 flex size-[14px] items-center justify-center rounded-full bg-[rgba(0,0,0,.72)] text-[8px] font-bold text-white">
                    {index + 1}
                  </span>
                  {tile.kind === "carousel" && (
                    <CarouselIcon size={10} className="absolute top-1 right-1 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.5)]" />
                  )}
                  {tile.kind === "reels" && (
                    <ReelsIcon size={10} className="absolute top-1 right-1 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.5)]" />
                  )}
                </span>
              ))}
              {/* Silhuetas esmaecidas depois dos posts, como no grid real. */}
              {[0.55, 0.4, 0.28, 0.18, 0.1, 0.05].map((opacity) => (
                <span key={opacity} className="aspect-[3/4] bg-mock-line" style={{ opacity }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

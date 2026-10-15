import { bodyFont, displayFont } from "@/app/fonts";
import { CreatorCredit } from "@/components/creator-credit";

// Página pública com a marca (início, link inexistente, not-found, erro), no
// fundo terracota de app/public-theme.css. Sobre o terracota só vai texto
// grande; o texto pequeno (a assinatura) fica na faixa inferior.
export function PublicPage({
  title,
  children,
  action,
  aside,
}: {
  title: string;
  // Texto de apoio, sempre em tamanho grande (24 px).
  children?: React.ReactNode;
  action?: React.ReactNode;
  // Coluna da direita no desktop (o mockup da página inicial).
  aside?: React.ReactNode;
}) {
  return (
    <div
      className={`public-page flex min-h-dvh flex-col overflow-x-hidden ${bodyFont.variable} ${displayFont.variable}`}
    >
      <main className="flex flex-1 items-center">
        <div
          className={`mx-auto grid w-full max-w-[1120px] items-center gap-10 px-6 pt-12 pb-10 md:px-10 md:py-16 ${
            aside ? "md:grid-cols-[minmax(0,1fr)_auto] md:gap-16" : "max-w-[640px] justify-items-center text-center"
          }`}
        >
          <div className="min-w-0">
            {/* O fundo do PNG é exatamente --pub-bg: não aparece retângulo. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- arquivo estático da marca, 1x e 2x */}
            <img
              src="/brand/web/wordmark-publico-240.png"
              srcSet="/brand/web/wordmark-publico-240.png 1x, /brand/web/wordmark-publico-480.png 2x"
              alt="Rabisco"
              width={240}
              height={77}
              className={`h-auto w-[176px] md:w-[220px] ${aside ? "-ml-[12px] md:-ml-[15px]" : "mx-auto"}`}
            />
            <h1
              className={`mt-8 font-semibold text-balance ${
                aside ? "text-[40px] leading-[1.05] md:text-[56px]" : "text-[32px] leading-[1.1] md:text-[44px]"
              }`}
            >
              {title}
              <span aria-hidden="true" className="text-pub-dot">
                .
              </span>
            </h1>
            {children && (
              <div className="mt-5 space-y-3 text-[24px] leading-[1.3] text-balance">{children}</div>
            )}
            {action && <div className="mt-8">{action}</div>}
          </div>
          {aside}
        </div>
      </main>
      <footer className="border-t-2 border-pub-dot bg-pub-band pb-[max(4px,env(safe-area-inset-bottom))] text-pub-band-text">
        <CreatorCredit className="py-1" />
      </footer>
    </div>
  );
}

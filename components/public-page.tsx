import { bodyFont, displayFont } from "@/app/fonts";
import { CreatorCredit } from "@/components/creator-credit";

// Página pública com a marca (início, link inexistente, not-found, erro). Usa
// os tokens de app/public-theme.css e segue o tema do aparelho.
export function PublicPage({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={`public-page flex min-h-dvh flex-col ${bodyFont.variable} ${displayFont.variable}`}>
      {/* Filete mostarda no topo: o ornamento de marca recorrente. */}
      <span aria-hidden="true" className="h-0.5 bg-pub-dot" />
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <picture>
          {/* No escuro, o wordmark creme num bloco terracota. */}
          <source
            media="(prefers-color-scheme: dark)"
            srcSet="/brand/web/wordmark-bloco-160.png 1x, /brand/web/wordmark-bloco-320.png 2x"
            width={160}
            height={62}
          />
          <img
            src="/brand/web/wordmark-terracota-160.png"
            srcSet="/brand/web/wordmark-terracota-160.png 1x, /brand/web/wordmark-terracota-320.png 2x"
            alt="Rabisco"
            width={160}
            height={48}
            className="h-auto w-[140px] rounded-lg"
          />
        </picture>
        <h1 className="mt-10 text-[24px] leading-tight font-semibold text-balance">
          {title}
          <span aria-hidden="true" className="text-pub-dot">
            .
          </span>
        </h1>
        {children && (
          <div className="mt-3 text-[15px] leading-[1.5] text-pub-muted text-balance">{children}</div>
        )}
        {action && <div className="mt-6">{action}</div>}
      </main>
      <footer className="pb-[max(16px,env(safe-area-inset-bottom))] text-pub-muted">
        <CreatorCredit />
      </footer>
    </div>
  );
}

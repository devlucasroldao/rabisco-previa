import Link from "next/link";

// Título grande da página, com o ponto de marca, e o caminho discreto acima.
export function PageHeader({
  title,
  crumbs = [],
  leading,
  titleAction,
  actions,
  children,
}: {
  title: string;
  crumbs?: { label: string; href: string }[];
  // Antes do título (o avatar do cliente, por exemplo).
  leading?: React.ReactNode;
  // Logo depois do título (o lápis de renomear).
  titleAction?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {crumbs.length > 0 && (
        <nav aria-label="Caminho" className="-mt-2.5 mb-0 text-[13px] text-fg-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-1.5">
                <Link href={crumb.href} className="inline-flex min-h-10 items-center rounded-sm hover:text-fg hover:underline">
                  {crumb.label}
                </Link>
                <span aria-hidden="true">/</span>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {leading}
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-1">
          <h1 className="brand-dot min-w-0 text-[30px] leading-[1.15] font-semibold break-words">
            {title}
          </h1>
          {titleAction}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

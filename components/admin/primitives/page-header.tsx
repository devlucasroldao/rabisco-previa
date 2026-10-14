import Link from "next/link";

// Título grande da página, com o ponto de marca, e o caminho discreto acima.
export function PageHeader({
  title,
  crumbs = [],
  actions,
  children,
}: {
  title: string;
  crumbs?: { label: string; href: string }[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {crumbs.length > 0 && (
        <nav aria-label="Caminho" className="mb-2 text-[13px] text-fg-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-1.5">
                <Link href={crumb.href} className="rounded-sm hover:text-fg hover:underline">
                  {crumb.label}
                </Link>
                <span aria-hidden="true">/</span>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start gap-3">
        <h1 className="brand-dot min-w-0 flex-1 basis-64 text-[30px] leading-[1.15] font-semibold break-words">
          {title}
        </h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

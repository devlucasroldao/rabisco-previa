// Estado vazio com orientação do próximo passo.
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <p className="font-display text-[16px] font-semibold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-[420px] text-[14px] text-fg-muted">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

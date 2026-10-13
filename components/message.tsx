export function Message({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[470px] flex-col items-center justify-center px-8 text-center">
      <h1 className="text-[16px] font-semibold">{title}</h1>
      {children && <p className="mt-2 text-[14px] text-muted">{children}</p>}
      <p className="mt-6 text-[11px] text-muted">Rabisco</p>
    </main>
  );
}

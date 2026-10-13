export function Avatar({ url, size }: { url?: string | null; size: number }) {
  return (
    <span
      className="block shrink-0 overflow-hidden rounded-full border border-line bg-surface"
      style={{ width: size, height: size }}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- URL assinada, que expira
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
    </span>
  );
}

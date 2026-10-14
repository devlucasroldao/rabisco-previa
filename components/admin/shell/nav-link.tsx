"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Item fixo da barra lateral (Início), com o mesmo destaque dos clientes.
export function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-10 items-center gap-2.5 rounded-md px-3 text-[14px] transition-colors duration-(--dur-fast) hover:bg-hover ${
        active ? "bg-active font-semibold" : ""
      }`}
    >
      {active && (
        <span aria-hidden="true" className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-brand-2" />
      )}
      <span className="flex w-6 justify-center text-fg-muted">{icon}</span>
      {children}
    </Link>
  );
}
